/**
 * AI Handwriting Studio - Interactive Smart Canvas Manager
 * Smooth quadratic brush strokes, touch & stylus support, undo stack,
 * eraser tool, guide grid, and preset stroke renderer.
 */

class HandwritingCanvas {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    this.wrapper = document.getElementById('canvas-wrapper');
    this.watermark = document.getElementById('canvas-watermark');
    this.gridOverlay = document.getElementById('grid-overlay');

    // Drawing States
    this.isDrawing = false;
    this.currentTool = 'pen'; // 'pen' | 'eraser'
    this.brushSize = 24;
    this.penColor = '#FFFFFF';
    this.points = [];

    // Undo History Stack (Max 25 states)
    this.undoStack = [];
    this.maxUndoSteps = 25;

    this.initCanvas();
    this.bindEvents();
    this.saveState(); // Save initial blank state
  }

  initCanvas() {
    this.canvas.width = 480;
    this.canvas.height = 480;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.clearCanvas(false);
  }

  clearCanvas(saveUndo = true) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.watermark) {
      this.watermark.classList.remove('hidden');
    }
    if (saveUndo) {
      this.saveState();
    }
  }

  setTool(tool) {
    this.currentTool = tool;
  }

  setBrushSize(size) {
    this.brushSize = Math.max(4, Math.min(60, size));
  }

  toggleGrid() {
    if (this.gridOverlay) {
      const active = this.gridOverlay.classList.toggle('active');
      return active;
    }
    return false;
  }

  saveState() {
    try {
      const imgData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      this.undoStack.push(imgData);
      if (this.undoStack.length > this.maxUndoSteps) {
        this.undoStack.shift();
      }
    } catch (e) {
      console.warn('Canvas saveState error:', e);
    }
  }

  undo() {
    if (this.undoStack.length > 1) {
      this.undoStack.pop(); // Remove current state
      const prevState = this.undoStack[this.undoStack.length - 1];
      this.ctx.putImageData(prevState, 0, 0);

      // Check if canvas is empty
      if (this.isEmpty()) {
        if (this.watermark) this.watermark.classList.remove('hidden');
      } else {
        if (this.watermark) this.watermark.classList.add('hidden');
      }
      return true;
    } else if (this.undoStack.length === 1) {
      this.clearCanvas(false);
      return true;
    }
    return false;
  }

  isEmpty() {
    const data = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 20) return false;
    }
    return true;
  }

  getCoordinates(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  startDrawing(e) {
    e.preventDefault();
    this.isDrawing = true;
    this.points = [];

    if (this.wrapper) this.wrapper.classList.add('drawing');
    if (this.watermark) this.watermark.classList.add('hidden');

    const pos = this.getCoordinates(e);
    this.points.push(pos);

    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, this.brushSize / 2, 0, Math.PI * 2);

    if (this.currentTool === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.fillStyle = '#000000';
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.fillStyle = this.penColor;
    }
    this.ctx.fill();

    if (window.soundManager) {
      // Audio feedback when starting stroke
      window.soundManager.ensureContext();
    }
  }

  draw(e) {
    if (!this.isDrawing) return;
    e.preventDefault();

    const pos = this.getCoordinates(e);
    this.points.push(pos);

    if (this.points.length < 2) return;

    if (this.currentTool === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.lineWidth = this.brushSize * 1.5;
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = this.penColor;
      this.ctx.lineWidth = this.brushSize;
    }

    // Smooth quadratic curve interpolation
    const len = this.points.length;
    const p1 = this.points[len - 2];
    const p2 = this.points[len - 1];

    const midPoint = {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2
    };

    this.ctx.beginPath();
    if (len === 2) {
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(midPoint.x, midPoint.y);
    } else {
      const prevMid = {
        x: (this.points[len - 3].x + p1.x) / 2,
        y: (this.points[len - 3].y + p1.y) / 2
      };
      this.ctx.moveTo(prevMid.x, prevMid.y);
      this.ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
    }
    this.ctx.stroke();
  }

  stopDrawing(e) {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.points = [];

    if (this.wrapper) this.wrapper.classList.remove('drawing');

    // Reset composite operation
    this.ctx.globalCompositeOperation = 'source-over';

    // Save history point
    this.saveState();

    // Check if user erased everything
    if (this.isEmpty()) {
      if (this.watermark) this.watermark.classList.remove('hidden');
    }
  }

  bindEvents() {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
    window.addEventListener('mousemove', (e) => this.draw(e));
    window.addEventListener('mouseup', (e) => this.stopDrawing(e));

    // Touch events
    this.canvas.addEventListener('touchstart', (e) => this.startDrawing(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.draw(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this.stopDrawing(e), { passive: false });
    this.canvas.addEventListener('touchcancel', (e) => this.stopDrawing(e), { passive: false });
  }

  /**
   * Draws realistic sample presets for instant user testing
   */
  drawPreset(presetKey) {
    this.clearCanvas(false);
    if (this.watermark) this.watermark.classList.add('hidden');

    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.strokeStyle = this.penColor;
    this.ctx.lineWidth = 26;

    const drawSmoothPath = (pts) => {
      if (pts.length < 2) return;
      this.ctx.beginPath();
      this.ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        this.ctx.lineTo(pts[i][0], pts[i][1]);
      }
      this.ctx.stroke();
    };

    switch (presetKey) {
      case '0':
        this.ctx.beginPath();
        this.ctx.ellipse(240, 240, 95, 145, 0, 0, Math.PI * 2);
        this.ctx.stroke();
        break;

      case '3':
        drawSmoothPath([[160, 140], [290, 140], [230, 220], [300, 260], [280, 330], [170, 340]]);
        break;

      case '7':
        drawSmoothPath([[150, 130], [330, 130], [200, 360]]);
        break;

      case '8':
        this.ctx.beginPath();
        this.ctx.ellipse(240, 175, 75, 65, 0, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.ellipse(240, 295, 90, 80, 0, 0, Math.PI * 2);
        this.ctx.stroke();
        break;

      case '한':
        // ㅎ
        this.ctx.beginPath();
        this.ctx.moveTo(210, 120); this.ctx.lineTo(270, 120); this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(180, 155); this.ctx.lineTo(300, 155); this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.ellipse(240, 205, 35, 30, 0, 0, Math.PI * 2); this.ctx.stroke();
        // ㅏ
        this.ctx.beginPath();
        this.ctx.moveTo(340, 110); this.ctx.lineTo(340, 350); this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(340, 220); this.ctx.lineTo(380, 220); this.ctx.stroke();
        // ㄴ
        this.ctx.beginPath();
        this.ctx.moveTo(190, 280); this.ctx.lineTo(190, 350); this.ctx.lineTo(300, 350); this.ctx.stroke();
        break;

      case '글':
        // ㄱ
        this.ctx.beginPath();
        this.ctx.moveTo(180, 140); this.ctx.lineTo(290, 140); this.ctx.lineTo(290, 200); this.ctx.stroke();
        // ㅡ
        this.ctx.beginPath();
        this.ctx.moveTo(150, 240); this.ctx.lineTo(330, 240); this.ctx.stroke();
        // ㄹ
        drawSmoothPath([[180, 280], [290, 280], [290, 310], [180, 310], [180, 350], [290, 350]]);
        break;

      case 'AI':
        // A
        drawSmoothPath([[170, 340], [220, 130], [270, 340]]);
        drawSmoothPath([[190, 260], [250, 260]]);
        // I
        drawSmoothPath([[320, 140], [320, 340]]);
        break;

      case 'LOVE':
        this.ctx.font = 'bold 84px Outfit, sans-serif';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('LOVE', 240, 240);
        break;

      default:
        // Default text rendering onto canvas
        this.ctx.font = 'bold 130px Pretendard, sans-serif';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(presetKey, 240, 240);
        break;
    }

    this.saveState();
  }

  /**
   * Downloads the user's handwritten artwork as a PNG file
   */
  downloadAsPNG(filename = 'my_handwriting.png') {
    if (this.isEmpty()) return false;

    // Create a clean styled export image
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 600;
    exportCanvas.height = 600;
    const expCtx = exportCanvas.getContext('2d');

    // Dark sleek backdrop with subtle gradient
    const grad = expCtx.createLinearGradient(0, 0, 600, 600);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#020617');
    expCtx.fillStyle = grad;
    expCtx.fillRect(0, 0, 600, 600);

    // Draw ink
    expCtx.drawImage(this.canvas, 60, 60, 480, 480);

    // Add watermark badge
    expCtx.font = '600 14px Outfit, Pretendard, sans-serif';
    expCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    expCtx.textAlign = 'right';
    expCtx.fillText('AI Handwriting Studio', 560, 570);

    const dataUrl = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  }
}

window.HandwritingCanvas = HandwritingCanvas;
