/**
 * Mighty Fish 主遊戲邏輯控制器 (Game Master)
 * 負責：
 * 1. 遊戲生命週期管理 (首頁、進行中、暫停、通關、結算)
 * 2. 題目輪播與教材題型控制 (Q&A 語音朗讀、動作音檔、字首音)
 * 3. 5 顆生命值系統、分數加乘與倒數計時器
 * 4. 三種操控模式 (滑鼠、平板觸控、AI 指尖辨識) 與速度倍率 (0.75x ~ 1.5x)
 * 5. 本機排行榜 (localStorage)
 */

class MightyFishGame {
  constructor() {
    // 遊戲參數與狀態
    this.lives = 5;
    this.maxLives = 5;
    this.score = 0;
    this.stageIndex = 0;
    this.correctCount = 0;
    this.totalQuestionsAnswered = 0;
    this.streak = 0;

    // 時間設定
    this.initialTime = 60; // 預設 60 秒
    this.remainingTime = 60;
    this.timerInterval = null;

    // 操控與物理參數
    this.controlMode = 'mouse'; // 'mouse' | 'touch' | 'video'
    this.speedMultiplier = 1.0;  // 0.75 | 1.0 | 1.25 | 1.5
    this.inputNormX = 0.5;
    this.inputNormY = 0.5;

    // 題庫資料
    this.questions = [];
    this.currentQuestion = null;
    this.isTransitioningQuestion = false;

    // 遊戲流程狀態
    this.gameState = 'READY'; // READY | LOADING_CAMERA | PLAYING | PAUSED | OVER

    // 核心系統
    this.ocean = null;
    this.handTracker = null;

    // DOM 快取
    this.dom = {};
  }

  /**
   * 初始化系統與 DOM 事件綁定
   */
  init() {
    this.cacheDom();
    this.bindEvents();
    this.loadSettings();

    // 建立 3D 海洋場景
    const oceanContainer = document.getElementById('webgl-container');
    this.ocean = new OceanScene(
      oceanContainer,
      (isCorrect, option) => this.handleGateHit(isCorrect, option),
      () => this.handleGateMiss()
    );

    // 建立視訊手勢辨識器
    this.setupHandTracker();

    // 載入與洗牌題庫
    this.prepareQuestions();

    // 渲染本機排行榜
    this.renderLeaderboard();

    // 啟動主渲染遊戲迴圈
    this.startRenderLoop();
  }

  cacheDom() {
    this.dom = {
      // 頂部題目高對比卡片
      questionCard: document.getElementById('question-card'),
      questionType: document.getElementById('question-type-badge'),
      questionEn: document.getElementById('question-en'),
      questionZh: document.getElementById('question-zh'),
      replayVoiceBtn: document.getElementById('replay-voice-btn'),

      // HUD 狀態欄
      scoreText: document.getElementById('hud-score'),
      heartsContainer: document.getElementById('hud-hearts'),
      timerText: document.getElementById('hud-timer'),
      stageText: document.getElementById('hud-stage'),
      speedBadge: document.getElementById('hud-speed-badge'),
      pauseBtn: document.getElementById('hud-pause-btn'),
      settingsBtn: document.getElementById('hud-settings-btn'),

      // 視訊鏡頭與 AI 監控面板
      videoPreviewBox: document.getElementById('video-preview-box'),
      handVideo: document.getElementById('hand-video'),
      handCanvas: document.getElementById('hand-canvas'),
      handStatusBadge: document.getElementById('hand-status-badge'),
      fallbackMouseBtn: document.getElementById('fallback-mouse-btn'),

      // 提示與回饋橫幅
      feedbackBanner: document.getElementById('feedback-banner'),
      loadingOverlay: document.getElementById('loading-overlay'),
      loadingMsg: document.getElementById('loading-msg'),

      // 彈跳視窗模組
      startModal: document.getElementById('start-modal'),
      startPlayBtn: document.getElementById('start-play-btn'),
      startSettingsBtn: document.getElementById('start-settings-btn'),
      summaryMode: document.getElementById('summary-mode'),
      summarySpeed: document.getElementById('summary-speed'),
      summaryTime: document.getElementById('summary-time'),
      settingsModal: document.getElementById('settings-modal'),
      saveSettingsBtn: document.getElementById('save-settings-btn'),
      saveAndStartBtn: document.getElementById('save-and-start-btn'),
      closeSettingsBtn: document.getElementById('close-settings-btn'),

      // 遊戲結束結算視窗
      gameOverModal: document.getElementById('game-over-modal'),
      finalScore: document.getElementById('final-score'),
      finalStages: document.getElementById('final-stages'),
      finalAccuracy: document.getElementById('final-accuracy'),
      playerNameInput: document.getElementById('player-name-input'),
      saveRankBtn: document.getElementById('save-rank-btn'),
      playAgainBtn: document.getElementById('play-again-btn'),
      leaderboardList: document.getElementById('leaderboard-list')
    };
  }

  setupHandTracker() {
    this.handTracker = new HandTracker({
      videoElement: this.dom.handVideo,
      canvasElement: this.dom.handCanvas,
      statusBadge: this.dom.handStatusBadge,
      containerElement: this.dom.videoPreviewBox,
      onTrackingUpdate: (nx, ny, isDetected) => {
        if (this.controlMode === 'video' && isDetected) {
          this.inputNormX = nx;
          this.inputNormY = ny;
        }
      },
      onStatusChange: (status, message) => {
        if (status === 'loading') {
          this.showLoadingOverlay(true, message);
          if (this.ocean) this.ocean.setPaused(true);
        } else if (status === 'ready' || status === 'tracking') {
          this.showLoadingOverlay(false);
          if (this.gameState === 'PLAYING' && this.ocean) {
            this.ocean.setPaused(false);
          }
        }
      },
      onFallbackRequired: (errMsg) => {
        this.showLoadingOverlay(false);
        alert(errMsg);
        this.switchControlMode('mouse');
      }
    });
  }

  bindEvents() {
    // 1. 開始遊戲按鈕 (解鎖音效限制並開始)
    this.dom.startPlayBtn.addEventListener('click', () => {
      FishSound.unlockAudio();
      this.startGame();
    });

    // 1b. 首頁進入設定按鈕
    if (this.dom.startSettingsBtn) {
      this.dom.startSettingsBtn.addEventListener('click', () => {
        this.openSettings(true);
      });
    }

    // 1c. 設定頁「完成設定並開始遊戲」按鈕
    if (this.dom.saveAndStartBtn) {
      this.dom.saveAndStartBtn.addEventListener('click', () => {
        this.saveAndStartGame();
      });
    }

    // 2. 語音重播按鈕
    this.dom.replayVoiceBtn.addEventListener('click', () => {
      this.replayCurrentQuestionAudio();
    });

    // 3. 設定按鈕與模態框
    this.dom.settingsBtn.addEventListener('click', () => this.openSettings(false));
    this.dom.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
    this.dom.saveSettingsBtn.addEventListener('click', () => this.saveSettings());

    // 4. 改用游標備援按鈕
    this.dom.fallbackMouseBtn.addEventListener('click', () => {
      this.switchControlMode('mouse');
    });

    // 5. 重新開始與儲存排行按鈕
    this.dom.playAgainBtn.addEventListener('click', () => this.startGame());
    this.dom.saveRankBtn.addEventListener('click', () => this.saveScoreToLeaderboard());

    // 6. 滑鼠操控監聽
    window.addEventListener('mousemove', (e) => {
      if (this.controlMode === 'mouse' && this.gameState === 'PLAYING') {
        this.inputNormX = Math.min(1, Math.max(0, e.clientX / window.innerWidth));
        this.inputNormY = Math.min(1, Math.max(0, 1.0 - (e.clientY / window.innerHeight)));
      }
    });

    // 7. 觸控操控監聽 (行動裝置與平板)
    window.addEventListener('touchmove', (e) => {
      if (this.controlMode === 'touch' && this.gameState === 'PLAYING' && e.touches.length > 0) {
        const touch = e.touches[0];
        this.inputNormX = Math.min(1, Math.max(0, touch.clientX / window.innerWidth));
        this.inputNormY = Math.min(1, Math.max(0, 1.0 - (touch.clientY / window.innerHeight)));
      }
    }, { passive: false });

    // 8. 暫停按鈕
    this.dom.pauseBtn.addEventListener('click', () => {
      if (this.gameState === 'PLAYING') {
        this.pauseGame();
      } else if (this.gameState === 'PAUSED') {
        this.resumeGame();
      }
    });

    // 9. 解鎖音效 (首次任何點擊皆喚醒 AudioContext)
    window.addEventListener('pointerdown', () => FishSound.unlockAudio(), { once: true });
  }

  /**
   * 隨機載入並洗牌教材題庫
   */
  prepareQuestions() {
    let rawList = [];
    if (typeof P1_FISH_QUESTIONS !== 'undefined' && Array.isArray(P1_FISH_QUESTIONS)) {
      rawList = P1_FISH_QUESTIONS;
    } else if (typeof P1_QUESTIONS_DATA !== 'undefined' && Array.isArray(P1_QUESTIONS_DATA)) {
      rawList = P1_QUESTIONS_DATA;
    } else if (typeof window !== 'undefined' && Array.isArray(window.P1_FISH_QUESTIONS)) {
      rawList = window.P1_FISH_QUESTIONS;
    } else if (typeof window !== 'undefined' && Array.isArray(window.P1_QUESTIONS_DATA)) {
      rawList = window.P1_QUESTIONS_DATA;
    }

    if (rawList.length > 0) {
      this.questions = rawList.map(q => {
        const normalizedOptions = q.options.map(opt => {
          if (typeof opt === 'string') {
            return {
              text: opt,
              isCorrect: opt === q.correct,
              zh: q.optionsZh && q.optionsZh[opt] ? q.optionsZh[opt] : ""
            };
          }
          return {
            text: opt.text || "",
            isCorrect: opt.isCorrect !== undefined ? opt.isCorrect : (opt.text === q.correct),
            zh: opt.zh || ""
          };
        });
        return {
          ...q,
          options: normalizedOptions
        };
      }).sort(() => Math.random() - 0.5);
    } else {
      console.error("找不到 P1 題庫資料！");
      this.questions = [];
    }
  }

  /**
   * 開始新遊戲
   */
  async startGame() {
    this.lives = this.maxLives;
    this.score = 0;
    this.stageIndex = 0;
    this.correctCount = 0;
    this.totalQuestionsAnswered = 0;
    this.streak = 0;
    this.remainingTime = this.initialTime;
    this.isTransitioningQuestion = false;

    this.prepareQuestions();
    this.updateHud();

    // 隱藏開始、設定與結算畫面
    this.dom.startModal.style.display = 'none';
    this.dom.settingsModal.style.display = 'none';
    this.dom.gameOverModal.style.display = 'none';

    // 若設定為視訊辨識，先初始化攝影機
    if (this.controlMode === 'video') {
      this.gameState = 'LOADING_CAMERA';
      await this.handTracker.start();
    }

    this.gameState = 'PLAYING';
    if (this.ocean) this.ocean.setPaused(false);

    // 啟動倒數計時器
    this.startTimer();

    // 載入第一題
    this.nextQuestion();
  }

  /**
   * 計時器控制
   */
  startTimer() {
    clearInterval(this.timerInterval);
    if (this.initialTime <= 0) {
      this.dom.timerText.textContent = '無限';
      return;
    }

    this.dom.timerText.textContent = `${this.remainingTime}s`;
    this.timerInterval = setInterval(() => {
      if (this.gameState !== 'PLAYING') return;

      this.remainingTime--;
      this.dom.timerText.textContent = `${this.remainingTime}s`;

      if (this.remainingTime <= 10) {
        this.dom.timerText.classList.add('timer-warning');
      } else {
        this.dom.timerText.classList.remove('timer-warning');
      }

      if (this.remainingTime <= 0) {
        clearInterval(this.timerInterval);
        this.triggerGameOver('時間到！');
      }
    }, 1000);
  }

  /**
   * 推進至下一題
   */
  nextQuestion() {
    if (this.gameState !== 'PLAYING' || this.lives <= 0) return;

    this.isTransitioningQuestion = false;
    this.stageIndex++;

    // 題庫循環洗牌
    const qIndex = (this.stageIndex - 1) % this.questions.length;
    if (qIndex === 0 && this.stageIndex > 1) {
      this.questions.sort(() => Math.random() - 0.5);
    }

    this.currentQuestion = this.questions[qIndex];
    this.updateHud();

    // 1. 更新題目卡片 (大尺寸白色文字、文字陰影、深色高對比)
    this.renderQuestionCard(this.currentQuestion);

    // 2. 3D 海底世界生成三路答案圓形光圈
    this.ocean.spawnQuestionGates(this.currentQuestion);

    // 3. 每關開始時自動播放題目語音
    setTimeout(() => {
      if (this.gameState === 'PLAYING') {
        FishSound.playQuestionAudio(this.currentQuestion);
      }
    }, 350);
  }

  /**
   * 渲染題目資訊卡片 (深色高對比、大尺寸字體、陰影)
   */
  renderQuestionCard(qData) {
    this.dom.questionEn.textContent = qData.questionEn || "";
    this.dom.questionZh.textContent = qData.questionZh || "";

    // 題型分類徽章標籤
    let typeLabel = "Q&A 問答";
    if (qData.type === "ACTION") typeLabel = "動物動作";
    if (qData.type === "PHONICS") typeLabel = "自然發音首字音";
    this.dom.questionType.textContent = typeLabel;

    // 卡片淡入動效
    gsap.fromTo(this.dom.questionCard,
      { y: -30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.45, ease: "power2.out" }
    );
  }

  /**
   * 重播當前題目的語音
   */
  replayCurrentQuestionAudio() {
    if (this.currentQuestion) {
      FishSound.playQuestionAudio(this.currentQuestion);
      // 按鈕波紋動畫
      gsap.to(this.dom.replayVoiceBtn, { scale: 1.25, duration: 0.15, yoyo: true, repeat: 1 });
    }
  }

  /**
   * 撞擊答案圈判定回呼
   * @param {boolean} isCorrect - 是否碰觸正確答案
   * @param {Object} option - 選項資料
   */
  handleGateHit(isCorrect, option) {
    if (this.isTransitioningQuestion) return;
    this.isTransitioningQuestion = true;
    this.totalQuestionsAnswered++;

    // 只有大魚吃小魚時，才是唸出小魚身上文字的語音！
    const optionText = typeof option === 'string' ? option : (option.text || '');
    if (optionText) {
      FishSound.speakOptionText(optionText);
    }

    if (isCorrect) {
      // 答對邏輯：
      this.correctCount++;
      this.streak++;

      // 計分機制：基礎 100 分 + 連勝加成 + 速度倍率加成
      const speedBonus = Math.round(this.ocean.fish.speed * 20);
      const streakBonus = Math.min(this.streak * 10, 50);
      const earned = Math.round((100 + speedBonus + streakBonus) * this.speedMultiplier);
      this.score += earned;

      // 播放 660Hz -> 880Hz 上行音效
      FishSound.playCorrectSound();

      // 顯示加分動態橫幅
      this.showFeedbackBanner(true, `+${earned} PERFECT!`, optionText);
    } else {
      // 答錯邏輯：
      this.streak = 0;
      this.lives--;

      // 播放 220Hz -> 150Hz 低沉錯誤音效
      FishSound.playWrongSound();

      // 顯示錯誤警示橫幅
      this.showFeedbackBanner(false, `OOPS! 扣除 1 顆生命`, `正確答案是: ${this.getCorrectAnswerText()}`);
    }

    this.updateHud();

    // 檢查遊戲是否結束 (錯五題扣光五顆心)
    if (this.lives <= 0) {
      setTimeout(() => this.triggerGameOver('生命值已耗盡！'), 1300);
      return;
    }

    // 1.5 秒後推進下一題，讓玩家清晰聆聽小魚身上被吃到的單字語音
    setTimeout(() => {
      if (this.gameState === 'PLAYING') {
        this.nextQuestion();
      }
    }, 1500);
  }

  /**
   * 錯過所有光圈 (未游進任何一圈)
   */
  handleGateMiss() {
    if (this.isTransitioningQuestion) return;
    this.isTransitioningQuestion = true;
    this.totalQuestionsAnswered++;
    this.streak = 0;
    this.lives--;

    FishSound.playWrongSound();
    this.showFeedbackBanner(false, '錯過了答案小魚！', `正確答案是: ${this.getCorrectAnswerText()}`);
    this.updateHud();

    if (this.lives <= 0) {
      setTimeout(() => this.triggerGameOver('生命值已耗盡！'), 1200);
      return;
    }

    setTimeout(() => {
      if (this.gameState === 'PLAYING') {
        this.nextQuestion();
      }
    }, 1300);
  }

  getCorrectAnswerText() {
    if (!this.currentQuestion) return '';
    const correct = this.currentQuestion.options.find(o => o.isCorrect);
    return correct ? `${correct.text} (${correct.zh || ''})` : '';
  }

  /**
   * 畫面中央彈跳回饋橫幅
   */
  showFeedbackBanner(isSuccess, mainMsg, subMsg) {
    const banner = this.dom.feedbackBanner;
    banner.className = `feedback-banner ${isSuccess ? 'banner-success' : 'banner-danger'}`;
    banner.innerHTML = `
      <div class="feedback-title">${mainMsg}</div>
      <div class="feedback-sub">${subMsg}</div>
    `;

    gsap.killTweensOf(banner);
    gsap.fromTo(banner,
      { scale: 0.7, opacity: 0, y: -20 },
      { scale: 1, opacity: 1, y: 0, duration: 0.35, ease: "back.out(1.7)" }
    );

    gsap.to(banner, {
      opacity: 0,
      scale: 0.9,
      y: -30,
      delay: 1.1,
      duration: 0.25,
      ease: "power2.in"
    });
  }

  /**
   * 更新 HUD 狀態數據 (生命值 5 顆心、分數、關卡、速度)
   */
  updateHud() {
    // 1. 分數動畫
    this.dom.scoreText.textContent = this.score;

    // 2. 關卡計數
    this.dom.stageText.textContent = `第 ${this.stageIndex} 關`;

    // 3. 渲染 5 顆愛心生命值 (❤️ / 🤍)
    let heartsHtml = '';
    for (let i = 0; i < this.maxLives; i++) {
      if (i < this.lives) {
        heartsHtml += '<span class="heart-icon active">❤️</span>';
      } else {
        heartsHtml += '<span class="heart-icon lost">🤍</span>';
      }
    }
    this.dom.heartsContainer.innerHTML = heartsHtml;

    // 4. 速度倍率顯示
    this.dom.speedBadge.textContent = `${this.speedMultiplier}× 速度`;

    // 同步魚的物理速度係數
    if (this.ocean && this.ocean.fish) {
      this.ocean.fish.setSpeedFactor(this.speedMultiplier);
    }
  }

  /**
   * 遊戲結束結算
   */
  triggerGameOver(reason) {
    this.gameState = 'OVER';
    clearInterval(this.timerInterval);
    if (this.ocean) this.ocean.setPaused(true);

    // 結算統計數據
    const accuracy = this.totalQuestionsAnswered > 0
      ? Math.round((this.correctCount / this.totalQuestionsAnswered) * 100)
      : 0;

    this.dom.finalScore.textContent = this.score;
    this.dom.finalStages.textContent = `${this.stageIndex} 關 (答對 ${this.correctCount} 題)`;
    this.dom.finalAccuracy.textContent = `${accuracy}%`;

    this.dom.gameOverModal.style.display = 'flex';
    gsap.fromTo(this.dom.gameOverModal.querySelector('.modal-content'),
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.5)" }
    );
  }

  /**
   * 儲存本機排行榜 (依完成關卡數、答對題數與分數產生)
   */
  saveScoreToLeaderboard() {
    const playerName = (this.dom.playerNameInput.value.trim() || '勇敢小魚');
    const accuracy = this.totalQuestionsAnswered > 0
      ? Math.round((this.correctCount / this.totalQuestionsAnswered) * 100)
      : 0;

    const newRecord = {
      name: playerName,
      score: this.score,
      stages: this.stageIndex,
      correctCount: this.correctCount,
      accuracy: accuracy,
      date: new Date().toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    let ranks = [];
    try {
      const stored = localStorage.getItem('MIGHTY_FISH_LEADERBOARD');
      if (stored) ranks = JSON.parse(stored);
    } catch (e) {}

    ranks.push(newRecord);
    // 依分數與完成關卡數遞減排序
    ranks.sort((a, b) => b.score - a.score || b.stages - a.stages || b.correctCount - a.correctCount);
    // 保留前 10 名
    ranks = ranks.slice(0, 10);

    localStorage.setItem('MIGHTY_FISH_LEADERBOARD', JSON.stringify(ranks));
    this.renderLeaderboard();
    this.dom.saveRankBtn.disabled = true;
    this.dom.saveRankBtn.textContent = '已儲存！';
  }

  renderLeaderboard() {
    let ranks = [];
    try {
      const stored = localStorage.getItem('MIGHTY_FISH_LEADERBOARD');
      if (stored) ranks = JSON.parse(stored);
    } catch (e) {}

    if (ranks.length === 0) {
      this.dom.leaderboardList.innerHTML = '<div class="no-rank">尚無排行紀錄，快來挑戰首位勇者吧！</div>';
      return;
    }

    let html = `
      <table class="rank-table">
        <thead>
          <tr>
            <th>名次</th>
            <th>探險家</th>
            <th>得分</th>
            <th>通關數</th>
            <th>正確率</th>
            <th>時間</th>
          </tr>
        </thead>
        <tbody>
    `;

    ranks.forEach((r, idx) => {
      const medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `${idx + 1}`));
      html += `
        <tr>
          <td class="rank-num">${medal}</td>
          <td class="rank-name">${this.escapeHtml(r.name)}</td>
          <td class="rank-score">${r.score}</td>
          <td>${r.stages} 關</td>
          <td>${r.accuracy}%</td>
          <td class="rank-date">${r.date}</td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    this.dom.leaderboardList.innerHTML = html;
  }

  escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /**
   * 設定頁彈跳視窗操作
   * @param {boolean} fromStartScreen - 是否從遊戲首頁開啟
   */
  openSettings(fromStartScreen = false) {
    this.isSettingsFromStart = fromStartScreen || (this.gameState === 'READY');

    // 若從首頁開啟，暫時隱藏首頁視窗讓設定頁呈現
    if (this.isSettingsFromStart && this.dom.startModal) {
      this.dom.startModal.style.display = 'none';
    }

    this.dom.settingsModal.style.display = 'flex';

    // 依據進入時的場景調整按鈕文案與能見度
    if (this.isSettingsFromStart) {
      if (this.dom.closeSettingsBtn) this.dom.closeSettingsBtn.textContent = '返回首頁';
      if (this.dom.saveSettingsBtn) this.dom.saveSettingsBtn.textContent = '儲存設定';
      if (this.dom.saveAndStartBtn) {
        this.dom.saveAndStartBtn.style.display = 'block';
        this.dom.saveAndStartBtn.textContent = '🚀 完成設定並開始遊戲';
      }
    } else {
      if (this.dom.closeSettingsBtn) this.dom.closeSettingsBtn.textContent = '取消';
      if (this.dom.saveSettingsBtn) this.dom.saveSettingsBtn.textContent = '儲存並繼續遊戲';
      if (this.dom.saveAndStartBtn) {
        this.dom.saveAndStartBtn.style.display = 'none';
      }
    }

    // 同步當前設定到介面按鈕
    document.querySelectorAll('.control-mode-option').forEach(el => {
      el.classList.toggle('active', el.dataset.mode === this.controlMode);
    });
    document.querySelectorAll('.speed-option').forEach(el => {
      el.classList.toggle('active', parseFloat(el.dataset.speed) === this.speedMultiplier);
    });
    document.querySelectorAll('.timer-option').forEach(el => {
      el.classList.toggle('active', parseInt(el.dataset.time) === this.initialTime);
    });
  }

  closeSettings() {
    this.dom.settingsModal.style.display = 'none';
    // 若遊戲尚未開始且是從首頁進來，恢復首頁視窗
    if (this.gameState === 'READY' && this.dom.startModal) {
      this.dom.startModal.style.display = 'flex';
    }
  }

  saveSettings() {
    // 讀取所選控制模式
    const activeModeEl = document.querySelector('.control-mode-option.active');
    if (activeModeEl) {
      this.switchControlMode(activeModeEl.dataset.mode);
    }

    // 讀取所選速度倍率
    const activeSpeedEl = document.querySelector('.speed-option.active');
    if (activeSpeedEl) {
      this.speedMultiplier = parseFloat(activeSpeedEl.dataset.speed);
    }

    // 讀取倒數時間設定
    const activeTimeEl = document.querySelector('.timer-option.active');
    if (activeTimeEl) {
      this.initialTime = parseInt(activeTimeEl.dataset.time);
      if (this.gameState === 'READY') {
        this.remainingTime = this.initialTime;
      }
    }

    this.saveSettingsToStorage();
    this.updateHud();
    this.updateStartSettingsBadge();
    this.closeSettings();
  }

  /**
   * 完成設定並立即開始遊戲 (從首頁進設定時的一鍵啟動捷徑)
   */
  saveAndStartGame() {
    this.saveSettings();
    FishSound.unlockAudio();
    this.startGame();
  }

  /**
   * 更新首頁上的當前設定預覽摘要徽章
   */
  updateStartSettingsBadge() {
    if (!this.dom.summaryMode || !this.dom.summarySpeed || !this.dom.summaryTime) return;

    // 模式標籤
    const modeNames = {
      mouse: '🖱️ 滑鼠游標',
      touch: '📱 平板觸控',
      video: '📷 食指 AI 辨識'
    };
    this.dom.summaryMode.textContent = modeNames[this.controlMode] || this.controlMode;

    // 速度標籤
    const speedLabels = {
      0.7: '0.7× (悠閒慢速)',
      1.0: '1.0× (標準推薦)',
      1.3: '1.3× (進階挑戰)',
      1.6: '1.6× (極速考驗)'
    };
    this.dom.summarySpeed.textContent = speedLabels[this.speedMultiplier] || `${this.speedMultiplier}× 速度`;

    // 時間標籤
    this.dom.summaryTime.textContent = this.initialTime > 0 ? `${this.initialTime} 秒` : '無限時間';
  }

  switchControlMode(newMode) {
    this.controlMode = newMode;

    if (newMode === 'video') {
      if (!this.handTracker.isRunning) {
        this.handTracker.start();
      }
      this.dom.videoPreviewBox.style.display = 'block';
    } else {
      // 滑鼠或觸控模式：關閉攝影機並隱藏鏡像視訊窗
      this.handTracker.stop();
      this.dom.videoPreviewBox.style.display = 'none';
      this.showLoadingOverlay(false);
      if (this.gameState === 'PLAYING') {
        this.ocean.setPaused(false);
      }
    }
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('MIGHTY_FISH_CONFIG');
      if (saved) {
        const config = JSON.parse(saved);
        if (config.controlMode) this.controlMode = config.controlMode;
        if (config.speedMultiplier) this.speedMultiplier = config.speedMultiplier;
        if (config.initialTime !== undefined) this.initialTime = config.initialTime;
      }
    } catch (e) {}
    this.updateStartSettingsBadge();
  }

  saveSettingsToStorage() {
    const config = {
      controlMode: this.controlMode,
      speedMultiplier: this.speedMultiplier,
      initialTime: this.initialTime
    };
    localStorage.setItem('MIGHTY_FISH_CONFIG', JSON.stringify(config));
  }

  showLoadingOverlay(show, message = "") {
    if (show) {
      this.dom.loadingMsg.textContent = message;
      this.dom.loadingOverlay.style.display = 'flex';
    } else {
      this.dom.loadingOverlay.style.display = 'none';
    }
  }

  pauseGame() {
    this.gameState = 'PAUSED';
    if (this.ocean) this.ocean.setPaused(true);
    this.dom.pauseBtn.textContent = '▶️';
  }

  resumeGame() {
    this.gameState = 'PLAYING';
    if (this.ocean) this.ocean.setPaused(false);
    this.dom.pauseBtn.textContent = '⏸️';
  }

  /**
   * 主渲染物理迴圈 (RequestAnimationFrame)
   */
  startRenderLoop() {
    const loop = () => {
      requestAnimationFrame(loop);

      if (this.ocean) {
        // 將歸一化指標座標傳遞給 3D 海洋更新魚的物理姿態與碰撞
        this.ocean.update(this.inputNormX, this.inputNormY);
      }
    };
    requestAnimationFrame(loop);
  }
}

// 視窗載入完成後實例化遊戲
window.addEventListener('DOMContentLoaded', () => {
  window.mightyFishApp = new MightyFishGame();
  window.mightyFishApp.init();
});
