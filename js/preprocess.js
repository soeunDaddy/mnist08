/**
 * AI Handwriting Studio - Image Preprocessing Pipeline
 * Handles Bounding Box detection, Center-of-Mass centering, 28x28 MNIST scaling,
 * and high-contrast normalization for Tesseract OCR.
 */

class ImagePreprocessor {
  /**
   * Finds the bounding box of drawn pixels on a canvas
   */
  static getBoundingBox(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let totalMass = 0;
    let sumX = 0;
    let sumY = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const alpha = data[idx + 3];
        // If pixel is drawn (alpha > 20 or non-white if white bg)
        if (alpha > 20) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;

          totalMass += alpha;
          sumX += x * alpha;
          sumY += y * alpha;
        }
      }
    }

    if (maxX === -1) {
      return null; // Empty canvas
    }

    const comX = sumX / totalMass;
    const comY = sumY / totalMass;

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      comX,
      comY
    };
  }

  /**
   * Preprocesses canvas into 28x28 grayscale array formatted for MNIST models.
   * Matches standard MNIST: 20x20 scaled character centered by center of mass in 28x28 grid.
   */
  static preprocessForMNIST(sourceCanvas, targetPreviewCanvas = null) {
    const bbox = this.getBoundingBox(sourceCanvas);
    if (!bbox) {
      return null;
    }

    // Create temporary offscreen canvas for cropping
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = bbox.width;
    cropCanvas.height = bbox.height;
    const cropCtx = cropCanvas.getContext('2d');
    cropCtx.drawImage(
      sourceCanvas,
      bbox.minX, bbox.minY, bbox.width, bbox.height,
      0, 0, bbox.width, bbox.height
    );

    // Create 28x28 final processing canvas
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = 28;
    finalCanvas.height = 28;
    const finalCtx = finalCanvas.getContext('2d');

    // Fill with black background
    finalCtx.fillStyle = '#000000';
    finalCtx.fillRect(0, 0, 28, 28);

    // Calculate scale to fit inside 20x20 box
    const maxDim = Math.max(bbox.width, bbox.height);
    const scale = 20 / maxDim;
    const scaledW = Math.round(bbox.width * scale);
    const scaledH = Math.round(bbox.height * scale);

    // Center inside 28x28
    const dx = Math.round((28 - scaledW) / 2);
    const dy = Math.round((28 - scaledH) / 2);

    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';
    finalCtx.drawImage(cropCanvas, 0, 0, bbox.width, bbox.height, dx, dy, scaledW, scaledH);

    // Center of Mass refinement
    const imgData28 = finalCtx.getImageData(0, 0, 28, 28);
    const data28 = imgData28.data;

    let mass = 0;
    let cx = 0;
    let cy = 0;

    for (let y = 0; y < 28; y++) {
      for (let x = 0; x < 28; x++) {
        const idx = (y * 28 + x) * 4;
        // Invert check or brightness: stroke color is white or colored on dark canvas
        const brightness = Math.max(data28[idx], data28[idx + 1], data28[idx + 2], data28[idx + 3]);
        if (brightness > 30) {
          mass += brightness;
          cx += x * brightness;
          cy += y * brightness;
        }
      }
    }

    if (mass > 0) {
      cx /= mass;
      cy /= mass;
      const shiftX = Math.round(13.5 - cx);
      const shiftY = Math.round(13.5 - cy);

      if (Math.abs(shiftX) <= 3 && Math.abs(shiftY) <= 3 && (shiftX !== 0 || shiftY !== 0)) {
        const shiftedCanvas = document.createElement('canvas');
        shiftedCanvas.width = 28;
        shiftedCanvas.height = 28;
        const shiftedCtx = shiftedCanvas.getContext('2d');
        shiftedCtx.fillStyle = '#000000';
        shiftedCtx.fillRect(0, 0, 28, 28);
        shiftedCtx.drawImage(finalCanvas, shiftX, shiftY);

        finalCtx.drawImage(shiftedCanvas, 0, 0);
      }
    }

    // Generate normalized float array [0, 1] for 28x28
    const finalData = finalCtx.getImageData(0, 0, 28, 28).data;
    const inputTensor = new Float32Array(28 * 28);

    for (let i = 0; i < 28 * 28; i++) {
      const r = finalData[i * 4];
      const g = finalData[i * 4 + 1];
      const b = finalData[i * 4 + 2];
      const a = finalData[i * 4 + 3];
      // Convert to normalized brightness [0.0 ~ 1.0]
      const brightness = ((r * 0.299 + g * 0.587 + b * 0.114) * (a / 255)) / 255.0;
      inputTensor[i] = brightness;
    }

    // Render to preview canvas if provided
    if (targetPreviewCanvas) {
      const prevCtx = targetPreviewCanvas.getContext('2d');
      prevCtx.fillStyle = '#000000';
      prevCtx.fillRect(0, 0, targetPreviewCanvas.width, targetPreviewCanvas.height);
      prevCtx.imageSmoothingEnabled = false;
      prevCtx.drawImage(finalCanvas, 0, 0, targetPreviewCanvas.width, targetPreviewCanvas.height);
    }

    return {
      tensor: inputTensor,
      canvas28: finalCanvas,
      bbox: bbox
    };
  }

  /**
   * Prepares high-contrast image on clean white background with black ink for OCR engines.
   */
  static preprocessForOCR(sourceCanvas) {
    const bbox = this.getBoundingBox(sourceCanvas);
    if (!bbox) return null;

    // Add padding around bounding box
    const pad = 24;
    const targetW = bbox.width + pad * 2;
    const targetH = bbox.height + pad * 2;

    const ocrCanvas = document.createElement('canvas');
    ocrCanvas.width = Math.max(targetW, 100);
    ocrCanvas.height = Math.max(targetH, 100);
    const ocrCtx = ocrCanvas.getContext('2d');

    // Fill with crisp white background
    ocrCtx.fillStyle = '#FFFFFF';
    ocrCtx.fillRect(0, 0, ocrCanvas.width, ocrCanvas.height);

    // Draw ink
    const offsetX = Math.round((ocrCanvas.width - bbox.width) / 2);
    const offsetY = Math.round((ocrCanvas.height - bbox.height) / 2);

    // We make sure ink is drawn in crisp dark/black for best OCR
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = bbox.width;
    tempCanvas.height = bbox.height;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.drawImage(
      sourceCanvas,
      bbox.minX, bbox.minY, bbox.width, bbox.height,
      0, 0, bbox.width, bbox.height
    );

    const imgData = tempCtx.getImageData(0, 0, bbox.width, bbox.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha > 30) {
        // Force pure black stroke with smooth alpha
        data[i] = 0;     // R
        data[i + 1] = 0; // G
        data[i + 2] = 0; // B
      } else {
        data[i + 3] = 0;
      }
    }
    tempCtx.putImageData(imgData, 0, 0);

    ocrCtx.drawImage(tempCanvas, offsetX, offsetY);

    return ocrCanvas;
  }
}

window.ImagePreprocessor = ImagePreprocessor;
