/**
 * Mighty Fish 專屬音效與語音控制器 (Audio Controller)
 * 整合：Web Audio API (660->880Hz 上行音效、220->150Hz 低沉錯誤音)、Web Speech 完整問句朗讀與教材真人音檔
 */

class FishAudioController {
  constructor() {
    this.audioCtx = null;
    this.isMuted = false;
    this.voiceAudio = null;
    this.currentQuestion = null;

    // 延遲初始化 Web Audio
    this.initAudioContext();
  }

  initAudioContext() {
    if (!this.audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
  }

  /**
   * 解鎖並喚醒 AudioContext（於使用者點擊「開始遊戲」或點擊畫面時呼叫，規避行動瀏覽器限制）
   */
  unlockAudio() {
    this.initAudioContext();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopVoice();
    }
    return this.isMuted;
  }

  /**
   * 答對音效：明顯的上行音效（660Hz -> 880Hz 雙音和弦升調）
   */
  playCorrectSound() {
    if (this.isMuted) return;
    this.unlockAudio();
    if (!this.audioCtx) return;

    try {
      const t = this.audioCtx.currentTime;

      // 第一音：660Hz (E5)
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(660, t);
      gain1.gain.setValueAtTime(0.22, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(t);
      osc1.stop(t + 0.19);

      // 第二音：880Hz (A5) 上行
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, t + 0.12);
      gain2.gain.setValueAtTime(0.25, t + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(t + 0.12);
      osc2.stop(t + 0.43);
    } catch (e) {
      console.warn("Audio error:", e);
    }
  }

  /**
   * 答錯音效：明顯的低沉音效（220Hz -> 150Hz 下行滑音警示）
   */
  playWrongSound() {
    if (this.isMuted) return;
    this.unlockAudio();
    if (!this.audioCtx) return;

    try {
      const t = this.audioCtx.currentTime;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      // 220Hz (A3) 下滑至 150Hz (D3)
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.35);

      // 低通濾波降低尖銳感，呈現飽滿沉重警告
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, t);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(t);
      osc.stop(t + 0.4);
    } catch (e) {
      console.warn("Audio error:", e);
    }
  }

  /**
   * 水泡破裂音效 (穿過圓環時之水感微音效)
   */
  playBubblePop() {
    if (this.isMuted) return;
    this.unlockAudio();
    if (!this.audioCtx) return;

    try {
      const t = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.08);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(t);
      osc.stop(t + 0.11);
    } catch (e) {}
  }

  /**
   * 取得題目應朗讀之完整句子 (TTS)：
   * 1. 保證朗讀「整段題目內容」，絕不只唸單字。
   * 2. 若題目中包含底線 __ 的填空部分，直接將底線替換為正確答案唸出，畫面保持 __。
   * 3. 去除音標斜線符號 (例如 /f/, /dʒ/, /r/)，避免 TTS 唸出 slash。
   */
  getQuestionSpeechSentence(qData) {
    if (!qData) return "";

    // 優先使用 speechText，若無則使用 questionEn
    let text = qData.speechText || qData.questionEn || "";

    // 若文本中包含底線 _、__、___ 等，替換為正確答案唸出
    const correctWord = qData.correct || "";
    if (/_{1,}/.test(text)) {
      text = text.replace(/_{1,}/g, correctWord);
    } else if (qData.questionEn && /_{1,}/.test(qData.questionEn)) {
      text = qData.questionEn.replace(/_{1,}/g, correctWord);
    }

    // 移除音標符號 (例如 /r/, /dʒ/, /f/)，避免 TTS 唸出 slash
    text = text.replace(/\/[^/]+\//g, "").trim();
    // 整理連續空格
    text = text.replace(/\s+/g, " ");

    return text;
  }

  /**
   * 播放題目語音：
   * 所有題目一律使用 TTS 瀏覽器語音合成朗讀「整段題目完整英文內容」！
   * 若題目中含有底線 __，TTS 直接唸出答案，畫面依然只顯示 __。
   */
  playQuestionAudio(qData, onEnded = null) {
    if (this.isMuted || !qData) return;
    this.stopVoice();
    this.currentQuestion = qData;

    const sentence = this.getQuestionSpeechSentence(qData);
    if (!sentence) {
      if (onEnded) onEnded();
      return;
    }

    // 一律使用 TTS 朗讀完整題目英文內容
    this.speakFullSentence(sentence, () => {
      if (onEnded) onEnded();
    }, () => {
      // 若 Web Speech API 異常時備援
      if (qData.audioFallback) {
        this.playAudioFile(qData.audioFallback, onEnded);
      } else if (onEnded) {
        onEnded();
      }
    });
  }

  /**
   * 只有大魚吃小魚時，朗讀小魚身上文字的語音 (使用 Google Cloud Neural2 預錄音檔)
   */
  speakOptionText(text) {
    if (this.isMuted || !text) return;
    this.stopVoice();
    this.speakFullSentence(text);
  }

  /**
   * 使用預先合成之 Google Cloud Neural2 最高品質音檔播放完整句子或選項
   */
  speakFullSentence(text, onSuccess = null, onError = null) {
    if (this.isMuted || !text) {
      if (onSuccess) onSuccess();
      return;
    }
    this.stopVoice();

    const clean = text.trim();
    const map = window.SENTENCES_AUDIO_MAP || this._audioMap || {};
    const audioPath = map[clean] || map[clean.replace(/,\s*/g, ' ')];

    if (audioPath) {
      this.currentAudio = new Audio(audioPath);
      this.currentAudio.onended = () => { if (onSuccess) onSuccess(); };
      this.currentAudio.onerror = (e) => {
        if (onError) onError();
        else if (onSuccess) onSuccess();
      };
      this.currentAudio.play().catch(e => {
        if (onSuccess) onSuccess();
      });
    } else {
      // 嘗試找 flashcard 音檔
      const book = window.BOOK_ID || "P1";
      const fb = book + "_flashcards_audios/" + book + "_" + clean.toLowerCase() + ".mp3";
      this.playAudioFile(fb, onSuccess);
    }
  }

  /**
   * 播放教材音檔路徑 (HTML5 Audio)
   */
  playAudioFile(audioPath, onEnded = null) {
    try {
      this.stopVoice();
      const audio = new Audio(audioPath);
      this.voiceAudio = audio;
      audio.onended = () => {
        if (onEnded) onEnded();
      };
      audio.play().catch(err => {
        console.warn("Audio play prevented:", err);
        if (onEnded) onEnded();
      });
    } catch (e) {
      if (onEnded) onEnded();
    }
  }

  /**
   * 停止當前正在播放的語音
   */
  stopVoice() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.voiceAudio) {
      this.voiceAudio.pause();
      this.voiceAudio.currentTime = 0;
      this.voiceAudio = null;
    }
  }
}

// 匯出全域單例
const FishSound = new FishAudioController();
