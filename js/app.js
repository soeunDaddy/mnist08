/**
 * AI Handwriting Studio - Main Application Controller
 * Connects Canvas, Neural MNIST, Universal OCR, TTS, UI interactions,
 * Sentence Notepad, History tracking, and Keyboard shortcuts.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --------------------------------------------------------------------------
  // 1. Component Initialization
  // --------------------------------------------------------------------------
  const canvas = new HandwritingCanvas('paint-canvas');
  const previewCanvas = document.getElementById('preview-canvas');

  let currentMode = 'digit'; // 'digit' | 'korean'
  let historyList = [];
  let latestResult = null;

  // --------------------------------------------------------------------------
  // 2. DOM Element Selectors
  // --------------------------------------------------------------------------
  // Mode switch buttons
  const modeDigitBtn = document.getElementById('mode-digit');
  const modeKoreanBtn = document.getElementById('mode-korean');
  const currentModeBadge = document.getElementById('current-mode-badge');
  const engineStatusText = document.getElementById('engine-status-text');
  const presetChipsContainer = document.getElementById('preset-chips');

  // Toolbar & Canvas controls
  const toolPenBtn = document.getElementById('tool-pen');
  const toolEraserBtn = document.getElementById('tool-eraser');
  const brushSizeSlider = document.getElementById('brush-size-slider');
  const brushSizeText = document.getElementById('brush-size-text');
  const btnUndo = document.getElementById('btn-undo');
  const btnGridToggle = document.getElementById('btn-grid-toggle');
  const btnClear = document.getElementById('btn-clear');
  const btnRecognize = document.getElementById('btn-recognize');
  const canvasStatus = document.getElementById('canvas-status');

  // Result views
  const resultPlaceholder = document.getElementById('result-placeholder');
  const resultLoading = document.getElementById('result-loading');
  const resultContent = document.getElementById('result-content');
  const loadingTitle = document.getElementById('loading-title');
  const loadingDetail = document.getElementById('loading-detail');
  const loadingProgressFill = document.getElementById('loading-progress-fill');

  const mainResultChar = document.getElementById('main-result-char');
  const mainConfidenceBadge = document.getElementById('main-confidence-badge');
  const mainResultDesc = document.getElementById('main-result-desc');
  const candidatesList = document.getElementById('candidates-list');

  // Result Action buttons
  const btnTtsSpeak = document.getElementById('btn-tts-speak');
  const btnCopyChar = document.getElementById('btn-copy-char');
  const btnAddToNotepad = document.getElementById('btn-add-to-notepad');
  const btnSaveImage = document.getElementById('btn-save-image');

  // Notepad elements
  const notepadTextarea = document.getElementById('notepad-textarea');
  const notepadCharCount = document.getElementById('notepad-char-count');
  const btnNotepadTts = document.getElementById('btn-notepad-tts');
  const btnNotepadCopy = document.getElementById('btn-notepad-copy');
  const btnNotepadClear = document.getElementById('btn-notepad-clear');
  const btnKeySpace = document.getElementById('btn-key-space');
  const btnKeyBackspace = document.getElementById('btn-key-backspace');
  const btnKeyEnter = document.getElementById('btn-key-enter');

  // History elements
  const historyScrollTrack = document.getElementById('history-scroll-track');
  const historyCount = document.getElementById('history-count');
  const btnClearHistory = document.getElementById('btn-clear-history');

  // Header & Theme / Sound / Modal
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const soundToggleBtn = document.getElementById('sound-toggle-btn');
  const helpBtn = document.getElementById('help-btn');
  const helpModal = document.getElementById('help-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalOkBtn = document.getElementById('modal-ok-btn');
  const toastContainer = document.getElementById('toast-container');

  // --------------------------------------------------------------------------
  // 3. Mode Management & Preset Chips
  // --------------------------------------------------------------------------
  const presets = {
    digit: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    korean: ['한', '글', '안', '녕', 'AI', 'LOVE', '산', '꿈', 'A', 'K', '가']
  };

  function updatePresets() {
    presetChipsContainer.innerHTML = '';
    const list = presets[currentMode] || [];
    list.forEach(item => {
      const chip = document.createElement('button');
      chip.className = 'preset-chip';
      chip.textContent = item;
      chip.title = `'${item}' 예시 도화지에 쓰기`;
      chip.addEventListener('click', () => {
        if (window.soundManager) window.soundManager.playPop();
        canvas.drawPreset(item);
        showToast(`예시 '${item}' 필기가 도화지에 생성되었습니다.`, 'info');
      });
      presetChipsContainer.appendChild(chip);
    });
  }

  function setMode(mode) {
    currentMode = mode;
    if (window.soundManager) window.soundManager.playClick();

    if (mode === 'digit') {
      modeDigitBtn.classList.add('active');
      modeDigitBtn.setAttribute('aria-selected', 'true');
      modeKoreanBtn.classList.remove('active');
      modeKoreanBtn.setAttribute('aria-selected', 'false');

      currentModeBadge.textContent = '숫자 고속 모드 (0~9)';
      engineStatusText.textContent = '숫자 전용 초정밀 딥러닝 모델 대기 중';
      showToast('🔢 [숫자 전용 (0~9)] 모드로 전환되었습니다.', 'info');
    } else {
      modeKoreanBtn.classList.add('active');
      modeKoreanBtn.setAttribute('aria-selected', 'true');
      modeDigitBtn.classList.remove('active');
      modeDigitBtn.setAttribute('aria-selected', 'false');

      currentModeBadge.textContent = '한글 & 영문 범용 AI 모드';
      engineStatusText.textContent = '한글·영문 고정밀 AI 엔진 & OCR 분석 대기 중';
      showToast('🇰🇷 [한글 · 영문 범용] 모드로 전환되었습니다. 한글/알파벳을 써보세요!', 'info');

      // Pre-warm OCR worker in background if available
      if (window.ocrEngine) {
        window.ocrEngine.initWorker();
      }
    }

    updatePresets();
  }

  modeDigitBtn.addEventListener('click', () => setMode('digit'));
  modeKoreanBtn.addEventListener('click', () => setMode('korean'));

  // --------------------------------------------------------------------------
  // 4. Toolbar Controls (Pen, Eraser, Size, Undo, Grid, Clear)
  // --------------------------------------------------------------------------
  toolPenBtn.addEventListener('click', () => {
    canvas.setTool('pen');
    toolPenBtn.classList.add('active');
    toolEraserBtn.classList.remove('active');
    if (window.soundManager) window.soundManager.playClick();
  });

  toolEraserBtn.addEventListener('click', () => {
    canvas.setTool('eraser');
    toolEraserBtn.classList.add('active');
    toolPenBtn.classList.remove('active');
    if (window.soundManager) window.soundManager.playClick();
  });

  brushSizeSlider.addEventListener('input', (e) => {
    const size = parseInt(e.target.value, 10);
    canvas.setBrushSize(size);
    brushSizeText.textContent = `굵기: ${size}px`;
  });

  btnUndo.addEventListener('click', () => {
    if (window.soundManager) window.soundManager.playClick();
    const undone = canvas.undo();
    if (undone) {
      showToast('이전 획을 취소했습니다.', 'info');
    }
  });

  btnGridToggle.addEventListener('click', () => {
    if (window.soundManager) window.soundManager.playClick();
    const isActive = canvas.toggleGrid();
    btnGridToggle.classList.toggle('active', isActive);
  });

  btnClear.addEventListener('click', () => {
    if (window.soundManager) window.soundManager.playClear();
    canvas.clearCanvas(true);
    showToast('도화지를 깨끗하게 비웠습니다.', 'info');
  });

  // --------------------------------------------------------------------------
  // 5. Recognition Engine Orchestration
  // --------------------------------------------------------------------------
  async function performRecognition() {
    if (canvas.isEmpty()) {
      if (window.soundManager) window.soundManager.playBeep(300, 0.15, 'sawtooth');
      showToast('도화지에 글씨를 먼저 작성해 주세요!', 'error');
      return;
    }

    // Set UI to loading state
    resultPlaceholder.style.display = 'none';
    resultContent.style.display = 'none';
    resultLoading.style.display = 'flex';
    loadingProgressFill.style.width = '20%';

    if (canvasStatus) canvasStatus.textContent = '분석 진행 중...';

    const startTime = performance.now();

    try {
      if (currentMode === 'digit') {
        // --- Digit Recognition Pipeline (Fast MNIST) ---
        loadingTitle.textContent = '숫자 AI 딥러닝 모델 분석 중...';
        loadingDetail.textContent = '윤곽선 및 28x28 Center-of-Mass 정규화';
        loadingProgressFill.style.width = '60%';

        // Artificial micro-delay for smooth animation
        await new Promise(r => setTimeout(r, 120));

        const preprocessed = ImagePreprocessor.preprocessForMNIST(canvas.canvas, previewCanvas);
        if (!preprocessed) {
          throw new Error('전처리 실패');
        }

        loadingProgressFill.style.width = '90%';
        const result = window.mnistModel.predict(preprocessed.tensor);

        const duration = Math.round(performance.now() - startTime);
        displayResult({
          char: result.prediction,
          confidence: result.confidence,
          verdict: `숫자 '${result.prediction}'`,
          candidates: result.candidates,
          engine: `초고속 딥러닝 (${duration}ms)`,
          thumbnailUrl: preprocessed.canvas28.toDataURL()
        });

      } else {
        // --- Universal Korean/English AI & OCR Pipeline ---
        loadingTitle.textContent = '한글 & 영문 AI 분석 중...';
        loadingDetail.textContent = '문자 획 구조 및 기하학적 특징 추출 중';
        loadingProgressFill.style.width = '40%';

        const ocrCanvas = ImagePreprocessor.preprocessForOCR(canvas.canvas);

        // Also render 28x28 mini preview
        ImagePreprocessor.preprocessForMNIST(canvas.canvas, previewCanvas);

        const ocrResult = await window.ocrEngine.recognize(ocrCanvas, (p) => {
          if (p.progress) {
            loadingProgressFill.style.width = `${p.progress}%`;
          }
          if (p.message) {
            loadingDetail.textContent = p.message;
          }
        });

        const duration = Math.round(performance.now() - startTime);
        const charText = ocrResult.text || '?';

        displayResult({
          char: charText,
          confidence: ocrResult.confidence,
          verdict: ocrResult.verdict || `글자 '${charText}'`,
          candidates: ocrResult.candidates || [{ text: charText, confidence: ocrResult.confidence }],
          engine: `${ocrResult.engine} (${duration}ms)`,
          thumbnailUrl: ocrCanvas.toDataURL()
        });
      }

      if (window.soundManager) window.soundManager.playSuccess();
      if (canvasStatus) canvasStatus.textContent = '판독 완료';

    } catch (err) {
      console.error('Recognition error:', err);
      resultLoading.style.display = 'none';
      resultPlaceholder.style.display = 'flex';
      showToast('글자 인식 중 오류가 발생했습니다. 다시 시도해 주세요.', 'error');
      if (canvasStatus) canvasStatus.textContent = '준비 완료';
    }
  }

  function displayResult(data) {
    latestResult = data;
    resultLoading.style.display = 'none';
    resultContent.style.display = 'flex';

    mainResultChar.textContent = data.char;
    mainConfidenceBadge.textContent = `${data.confidence}% 일치`;
    mainResultDesc.textContent = data.verdict;

    // Render candidate probability bars
    candidatesList.innerHTML = '';
    if (data.candidates && data.candidates.length > 0) {
      data.candidates.forEach(cand => {
        const text = cand.digit || cand.text;
        const pct = cand.percent || cand.confidence || '0.0';

        const row = document.createElement('div');
        row.className = 'candidate-row';
        row.innerHTML = `
          <span class="candidate-char">${text}</span>
          <div class="candidate-bar-bg">
            <div class="candidate-bar-fill" style="width: ${pct}%"></div>
          </div>
          <span class="candidate-percent">${pct}%</span>
        `;
        candidatesList.appendChild(row);
      });
    }

    // Save to history
    addHistoryItem(data);
  }

  btnRecognize.addEventListener('click', performRecognition);

  // --------------------------------------------------------------------------
  // 6. Result Action Buttons (TTS, Copy, Add to Notepad, Save PNG)
  // --------------------------------------------------------------------------
  btnTtsSpeak.addEventListener('click', () => {
    if (!latestResult || !latestResult.char) return;
    if (window.soundManager) window.soundManager.playClick();
    window.ttsManager.speak(latestResult.char);
    showToast(`'${latestResult.char}' 발음을 재생합니다.`, 'info');
  });

  btnCopyChar.addEventListener('click', () => {
    if (!latestResult || !latestResult.char) return;
    navigator.clipboard.writeText(latestResult.char).then(() => {
      if (window.soundManager) window.soundManager.playPop();
      showToast(`'${latestResult.char}' 클립보드에 복사 완료!`, 'success');
    }).catch(() => {
      showToast('클립보드 복사 실패', 'error');
    });
  });

  btnAddToNotepad.addEventListener('click', () => {
    if (!latestResult || !latestResult.char) return;
    appendToNotepad(latestResult.char);
    if (window.soundManager) window.soundManager.playPop();
    showToast(`메모장에 '${latestResult.char}' 추가 완료!`, 'success');
  });

  btnSaveImage.addEventListener('click', () => {
    const success = canvas.downloadAsPNG(`handwriting_${Date.now()}.png`);
    if (success) {
      if (window.soundManager) window.soundManager.playSuccess();
      showToast('손글씨 그림이 저장되었습니다.', 'success');
    } else {
      showToast('도화지가 비어 있어 저장할 수 없습니다.', 'error');
    }
  });

  // --------------------------------------------------------------------------
  // 7. Sentence Accumulator Notepad
  // --------------------------------------------------------------------------
  function updateNotepadCount() {
    const text = notepadTextarea.value;
    notepadCharCount.textContent = `${text.length}자`;
  }

  function appendToNotepad(str) {
    notepadTextarea.value += str;
    updateNotepadCount();
    notepadTextarea.scrollTop = notepadTextarea.scrollHeight;
  }

  notepadTextarea.addEventListener('input', updateNotepadCount);

  btnKeySpace.addEventListener('click', () => {
    appendToNotepad(' ');
    if (window.soundManager) window.soundManager.playClick();
  });

  btnKeyBackspace.addEventListener('click', () => {
    const val = notepadTextarea.value;
    if (val.length > 0) {
      notepadTextarea.value = val.slice(0, -1);
      updateNotepadCount();
      if (window.soundManager) window.soundManager.playClick();
    }
  });

  btnKeyEnter.addEventListener('click', () => {
    appendToNotepad('\n');
    if (window.soundManager) window.soundManager.playClick();
  });

  btnNotepadTts.addEventListener('click', () => {
    const text = notepadTextarea.value.trim();
    if (!text) {
      showToast('메모장에 읽을 문장이 없습니다.', 'error');
      return;
    }
    if (window.soundManager) window.soundManager.playClick();
    window.ttsManager.speak(text);
    showToast('문장 전체 발음을 재생합니다.', 'info');
  });

  btnNotepadCopy.addEventListener('click', () => {
    const text = notepadTextarea.value;
    if (!text) {
      showToast('복사할 문장이 없습니다.', 'error');
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      if (window.soundManager) window.soundManager.playPop();
      showToast('메모장 전체 내용이 복사되었습니다!', 'success');
    });
  });

  btnNotepadClear.addEventListener('click', () => {
    notepadTextarea.value = '';
    updateNotepadCount();
    if (window.soundManager) window.soundManager.playClear();
    showToast('메모장을 비웠습니다.', 'info');
  });

  // --------------------------------------------------------------------------
  // 8. History Management
  // --------------------------------------------------------------------------
  function loadHistory() {
    try {
      const saved = localStorage.getItem('hw_studio_history');
      if (saved) {
        historyList = JSON.parse(saved);
      }
    } catch (e) {
      historyList = [];
    }
    renderHistory();
  }

  function saveHistory() {
    try {
      localStorage.setItem('hw_studio_history', JSON.stringify(historyList.slice(0, 15)));
    } catch (e) {}
  }

  function addHistoryItem(item) {
    historyList.unshift({
      char: item.char,
      confidence: item.confidence,
      thumbnailUrl: item.thumbnailUrl,
      timestamp: Date.now()
    });
    if (historyList.length > 15) historyList.pop();
    saveHistory();
    renderHistory();
  }

  function renderHistory() {
    historyCount.textContent = `${historyList.length}건`;
    historyScrollTrack.innerHTML = '';

    if (historyList.length === 0) {
      historyScrollTrack.innerHTML = `
        <div class="history-empty">
          <span>인식 기록이 이곳에 저장됩니다.</span>
        </div>
      `;
      return;
    }

    historyList.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'history-card';
      card.title = `클릭하여 메모장에 '${item.char}' 추가`;

      const thumbImg = item.thumbnailUrl ? `<img src="${item.thumbnailUrl}" class="history-thumb" alt="thumb">` : '';
      card.innerHTML = `
        ${thumbImg}
        <span class="history-char">${item.char}</span>
        <span class="history-conf">${item.confidence}%</span>
      `;

      card.addEventListener('click', () => {
        appendToNotepad(item.char);
        if (window.soundManager) window.soundManager.playPop();
        showToast(`메모장에 '${item.char}' 추가되었습니다.`, 'info');
      });

      historyScrollTrack.appendChild(card);
    });
  }

  btnClearHistory.addEventListener('click', () => {
    historyList = [];
    saveHistory();
    renderHistory();
    if (window.soundManager) window.soundManager.playClear();
    showToast('인식 기록을 모두 삭제했습니다.', 'info');
  });

  // --------------------------------------------------------------------------
  // 9. Theme, Sound & Guide Modal Controls
  // --------------------------------------------------------------------------
  function initTheme() {
    const savedTheme = localStorage.getItem('hw_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('hw_theme', newTheme);
    if (window.soundManager) window.soundManager.playClick();
    showToast(`${newTheme === 'dark' ? '다크' : '라이트'} 모드로 전환되었습니다.`, 'info');
  });

  function updateSoundButton() {
    if (window.soundManager.enabled) {
      soundToggleBtn.classList.remove('sound-muted');
      soundToggleBtn.title = '효과음 켜짐 (클릭하여 음소거)';
    } else {
      soundToggleBtn.classList.add('sound-muted');
      soundToggleBtn.title = '효과음 꺼짐 (클릭하여 켜기)';
    }
  }

  soundToggleBtn.addEventListener('click', () => {
    const isEnabled = window.soundManager.toggleSound();
    updateSoundButton();
    showToast(isEnabled ? '효과음이 켜졌습니다.' : '효과음이 꺼졌습니다.', 'info');
  });

  // Guide Modal
  helpBtn.addEventListener('click', () => {
    helpModal.style.display = 'flex';
    if (window.soundManager) window.soundManager.playClick();
  });

  function closeModal() {
    helpModal.style.display = 'none';
    if (window.soundManager) window.soundManager.playClick();
  }

  modalCloseBtn.addEventListener('click', closeModal);
  modalOkBtn.addEventListener('click', closeModal);
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) closeModal();
  });

  // --------------------------------------------------------------------------
  // 10. Toast Notification System
  // --------------------------------------------------------------------------
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    else if (type === 'error') iconClass = 'fa-triangle-exclamation';

    toast.innerHTML = `
      <i class="fa-solid ${iconClass}"></i>
      <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2800);
  }

  // --------------------------------------------------------------------------
  // 11. Global Keyboard Shortcuts
  // --------------------------------------------------------------------------
  window.addEventListener('keydown', (e) => {
    // Ctrl + Enter : Recognize
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      performRecognition();
    }
    // Ctrl + Z : Undo
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && document.activeElement !== notepadTextarea) {
      e.preventDefault();
      btnUndo.click();
    }
    // Alt + C : Clear Canvas
    else if (e.altKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      btnClear.click();
    }
  });

  // --------------------------------------------------------------------------
  // Initial Boot
  // --------------------------------------------------------------------------
  initTheme();
  updateSoundButton();
  updatePresets();
  loadHistory();
});
