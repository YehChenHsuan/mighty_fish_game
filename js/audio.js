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

    // 取得預先合成之音檔映射
    if (!this._audioMap) {
      this._audioMap = {
        "Can the fish swim?": "assets/audios/tts/fish_q_0_471140c9.mp3",
        "Can the rabbit soar?": "assets/audios/tts/fish_q_1_3525a6ee.mp3",
        "Can the frog jump?": "assets/audios/tts/fish_q_2_e5629d65.mp3",
        "Can the rooster climb?": "assets/audios/tts/fish_q_3_590a5ffd.mp3",
        "Can the horse hop?": "assets/audios/tts/fish_q_4_afc922ac.mp3",
        "Can the eagle soar?": "assets/audios/tts/fish_q_5_1451f627.mp3",
        "Can you swim like a fish?": "assets/audios/tts/fish_q_6_3116249f.mp3",
        "Can you fly like an owl?": "assets/audios/tts/fish_q_7_f6645683.mp3",
        "Kim has a fish. The fish can swim.": "assets/audios/tts/fish_q_8_bf988ec1.mp3",
        "Diego has a dog. The dog can run.": "assets/audios/tts/fish_q_9_a6e0fa9d.mp3",
        "Josh has a frog. The frog can jump.": "assets/audios/tts/fish_q_10_ee898c42.mp3",
        "Ted has a rabbit. The rabbit can hop.": "assets/audios/tts/fish_q_11_a728c2d6.mp3",
        "Zac has a duck. The duck can walk.": "assets/audios/tts/fish_q_12_c0a9589b.mp3",
        "Paul has an owl. The owl can fly.": "assets/audios/tts/fish_q_13_4b6345a4.mp3",
        "Which word begins with Ff?": "assets/audios/tts/fish_q_14_df26cd7a.mp3",
        "Which word begins with Dd?": "assets/audios/tts/fish_q_15_c3b2467a.mp3",
        "Which word begins with Rr?": "assets/audios/tts/fish_q_16_885e3837.mp3",
        "Which word begins with Hh?": "assets/audios/tts/fish_q_17_996a745d.mp3",
        "Which word begins with Ss?": "assets/audios/tts/fish_q_18_0adb0cd4.mp3",
        "Which word begins with Jj?": "assets/audios/tts/fish_q_19_493d82c4.mp3",
        "Which word begins with Kk?": "assets/audios/tts/fish_q_20_dd0ff653.mp3",
        "walk": "assets/audios/tts/fish_opt_46f96315.mp3",
        "sun": "assets/audios/tts/fish_opt_ebd556e6.mp3",
        "fish": "assets/audios/tts/fish_opt_83e4a96a.mp3",
        "sing": "assets/audios/tts/fish_opt_db853ec3.mp3",
        "swim": "assets/audios/tts/fish_opt_539125fd.mp3",
        "climb": "assets/audios/tts/fish_opt_28b3da6a.mp3",
        "dance": "assets/audios/tts/fish_opt_3355d92c.mp3",
        "dish": "assets/audios/tts/fish_opt_d51f95cd.mp3",
        "hop": "assets/audios/tts/fish_opt_5f67b284.mp3",
        "foot": "assets/audios/tts/fish_opt_d8735f74.mp3",
        "frog": "assets/audios/tts/fish_opt_938c2cc0.mp3",
        "hat": "assets/audios/tts/fish_opt_46b5e59b.mp3",
        "rabbit": "assets/audios/tts/fish_opt_a51e47f6.mp3",
        "it swim.": "assets/audios/tts/fish_opt_5aa154ce.mp3",
        "I walk.": "assets/audios/tts/fish_opt_3d4bd5ab.mp3",
        "duck": "assets/audios/tts/fish_opt_36846677.mp3",
        "day": "assets/audios/tts/fish_opt_628b7db0.mp3",
        "I can't.": "assets/audios/tts/fish_opt_325e73b1.mp3",
        "face": "assets/audios/tts/fish_opt_d5ca3224.mp3",
        "jump": "assets/audios/tts/fish_opt_ba535ef5.mp3",
        "it hop.": "assets/audios/tts/fish_opt_1d260211.mp3",
        "dog": "assets/audios/tts/fish_opt_06d80eb0.mp3",
        "No": "assets/audios/tts/fish_opt_bafd7322.mp3",
        "fly": "assets/audios/tts/fish_opt_af17bc3b.mp3",
        "it run.": "assets/audios/tts/fish_opt_173c981a.mp3",
        "I can.": "assets/audios/tts/fish_opt_34fcead7.mp3",
        "Yes": "assets/audios/tts/fish_opt_93cba074.mp3",
        "horse": "assets/audios/tts/fish_opt_f1bdf5ed.mp3",
        "red": "assets/audios/tts/fish_opt_bda9643a.mp3",
        "kite": "assets/audios/tts/fish_opt_4781ac92.mp3",
        "it fly.": "assets/audios/tts/fish_opt_c62d88b9.mp3",
        "it soar.": "assets/audios/tts/fish_opt_41c0103b.mp3",
        "run": "assets/audios/tts/fish_opt_a53108f7.mp3",
        "soar": "assets/audios/tts/fish_opt_fafb0bd4.mp3",
        "it can.": "assets/audios/tts/fish_opt_3527b362.mp3",
        "I fly.": "assets/audios/tts/fish_opt_f231cf0f.mp3",
        "kiss": "assets/audios/tts/fish_opt_4188679c.mp3",
        "it can't.": "assets/audios/tts/fish_opt_5483eef4.mp3",
        "juice": "assets/audios/tts/fish_opt_57f7e96f.mp3",
        "Yes, it can.": "assets/audios/tts/fish_opt_3527b362.mp3",
        "No, it can't.": "assets/audios/tts/fish_opt_5483eef4.mp3",
        "Yes, I can.": "assets/audios/tts/fish_opt_34fcead7.mp3",
        "No, I can't.": "assets/audios/tts/fish_opt_325e73b1.mp3"
      };
    }

    const audioPath = this._audioMap[clean] || this._audioMap[clean.replace(/,\s*/g, ' ')];
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
      const fb = `P1_flashcards_audios/P1_${clean.toLowerCase()}.mp3`;
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
