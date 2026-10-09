/**
 * AI Handwriting Studio - Text-to-Speech (TTS) Engine
 * Reads aloud Korean, English, and digits naturally via Web Speech API.
 */

class TTSManager {
  constructor() {
    this.synth = window.speechSynthesis || null;
    this.voices = [];
    this.isSpeaking = false;

    if (this.synth) {
      this.loadVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
  }

  isKorean(text) {
    return /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text);
  }

  isEnglish(text) {
    return /[a-zA-Z]/.test(text);
  }

  speak(text) {
    if (!this.synth || !text || text.trim() === '') return;

    // Cancel any ongoing speech
    this.synth.cancel();

    const cleanText = text.trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);

    utterance.rate = 0.95; // Natural clear pace
    utterance.pitch = 1.0;

    // Find best voice
    if (this.voices.length > 0) {
      if (this.isKorean(cleanText)) {
        const korVoice = this.voices.find(v => v.lang.startsWith('ko') || v.lang.includes('KR'));
        if (korVoice) utterance.voice = korVoice;
        utterance.lang = 'ko-KR';
      } else if (this.isEnglish(cleanText)) {
        const engVoice = this.voices.find(v => v.lang.startsWith('en') || v.lang.includes('US') || v.lang.includes('GB'));
        if (engVoice) utterance.voice = engVoice;
        utterance.lang = 'en-US';
      } else {
        // Numbers or symbols - default to Korean
        const korVoice = this.voices.find(v => v.lang.startsWith('ko') || v.lang.includes('KR'));
        if (korVoice) utterance.voice = korVoice;
        utterance.lang = 'ko-KR';
      }
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
    };

    utterance.onend = () => {
      this.isSpeaking = false;
    };

    utterance.onerror = (e) => {
      console.warn('TTS Error:', e);
      this.isSpeaking = false;
    };

    this.synth.speak(utterance);
  }
}

// Global TTS instance
window.ttsManager = new TTSManager();
