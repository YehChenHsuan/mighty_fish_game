/**
 * Mighty Fish 視訊食指指尖 AI 辨識控制器 (MediaPipe Hands Controller)
 * 負責：
 * 1. 攝影機權限請求與視訊串流初始化
 * 2. 鏡像攝影機畫面渲染與食指指尖 (Landmark 8) 即時追蹤光點繪製
 * 3. 狀態管理：「攝影機/模型載入中 (遊戲暫停)」、「指尖追蹤中」、「未偵測到手勢」
 * 4. 異常與無攝影機時之「改用游標」無縫備援機制
 */

class HandTracker {
  constructor(options = {}) {
    this.videoElement = options.videoElement;
    this.canvasElement = options.canvasElement;
    this.ctx = this.canvasElement ? this.canvasElement.getContext('2d') : null;
    this.statusBadge = options.statusBadge;
    this.containerElement = options.containerElement;

    // 回呼函數
    this.onTrackingUpdate = options.onTrackingUpdate || null; // (normX, normY, isDetected) => {}
    this.onStatusChange = options.onStatusChange || null;     // (statusType, message) => {}
    this.onFallbackRequired = options.onFallbackRequired || null; // () => {}

    // MediaPipe 模組實體
    this.hands = null;
    this.camera = null;
    this.stream = null;

    // 狀態旗標
    this.isRunning = false;
    this.isModelLoaded = false;
    this.isHandDetected = false;
    this.lastNormX = 0.5;
    this.lastNormY = 0.5;
  }

  /**
   * 啟動攝影機與 MediaPipe 手勢模型
   */
  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // 1. 通知外部系統進入「載入中」狀態 (遊戲強制暫停、不可計時或移動)
    this.updateStatus('loading', '正在啟動攝影機並載入 AI 辨識模型...');

    try {
      // 檢查瀏覽器攝影機 API 支援
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('此瀏覽器或環境不支援 getUserMedia 視訊權限');
      }

      // 2. 檢查 MediaPipe Hands 全域函式庫是否已載入
      if (typeof Hands === 'undefined') {
        throw new Error('MediaPipe Hands 函式庫尚未載入');
      }

      // 3. 實例化 MediaPipe Hands
      this.hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.55,
        minTrackingConfidence: 0.55
      });

      this.hands.onResults((results) => this.onResults(results));

      // 4. 請求攝影機權限並啟動視訊串流
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      this.videoElement.srcObject = this.stream;
      await this.videoElement.play();

      // 5. 啟用 MediaPipe Camera 工具逐幀偵測
      if (typeof Camera !== 'undefined') {
        this.camera = new Camera(this.videoElement, {
          onFrame: async () => {
            if (this.isRunning && this.hands) {
              await this.hands.send({ image: this.videoElement });
            }
          },
          width: 640,
          height: 480
        });
        await this.camera.start();
      } else {
        // 自定義 requestVideoFrameCallback / requestAnimationFrame 輪詢備援
        this.startManualLoop();
      }

      // 標記模型載入與攝影機就緒
      this.isModelLoaded = true;
      if (this.containerElement) {
        this.containerElement.style.display = 'block';
      }
      this.updateStatus('ready', '🟢 指尖追蹤中');

    } catch (err) {
      console.error('視訊辨識啟動失敗:', err);
      this.handleError(err);
    }
  }

  /**
   * 手動幀監聽備援 (若 CDN 未含 CameraUtils)
   */
  startManualLoop() {
    const processFrame = async () => {
      if (!this.isRunning) return;
      if (this.videoElement.readyState >= 2 && this.hands) {
        await this.hands.send({ image: this.videoElement });
      }
      requestAnimationFrame(processFrame);
    };
    requestAnimationFrame(processFrame);
  }

  /**
   * MediaPipe 辨識結果回呼
   */
  onResults(results) {
    if (!this.isRunning) return;

    const canvas = this.canvasElement;
    const ctx = this.ctx;

    if (!canvas || !ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 繪製鏡像攝影機畫面 (水平翻轉，符合鏡子直覺)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // 判定是否偵測到手部關鍵點
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];

      // Landmark 8 為食指指尖 (INDEX_FINGER_TIP)
      const indexTip = landmarks[8];
      const wrist = landmarks[0];

      if (indexTip) {
        this.isHandDetected = true;

        // 計算鏡像後的座標：
        // 原始 indexTip.x: 0 (左) ~ 1 (右)
        // 鏡像後：使用者在鏡頭前向右移，畫面點也向右移
        const mirroredX = 1.0 - indexTip.x;
        // Y 軸：向上為 1.0 (高), 向下為 0.0 (低)
        const mirroredY = 1.0 - indexTip.y;

        // 平滑濾波 (低通平滑，防止指尖微顫)
        this.lastNormX += (mirroredX - this.lastNormX) * 0.45;
        this.lastNormY += (mirroredY - this.lastNormY) * 0.45;

        // 在鏡像畫布上繪製指尖追蹤光點
        const drawX = mirroredX * canvas.width;
        const drawY = indexTip.y * canvas.height;

        this.drawFingertipMarker(ctx, drawX, drawY);

        this.updateStatus('tracking', '🟢 指尖追蹤中');

        // 回傳歸一化座標至遊戲控制器
        if (this.onTrackingUpdate) {
          this.onTrackingUpdate(this.lastNormX, this.lastNormY, true);
        }
        return;
      }
    }

    // 未偵測到手部
    this.isHandDetected = false;
    this.updateStatus('searching', '🟡 請將食指伸入鏡頭畫面');
    if (this.onTrackingUpdate) {
      // 保持上一次位置以維持平穩游動
      this.onTrackingUpdate(this.lastNormX, this.lastNormY, false);
    }
  }

  /**
   * 繪製食指指尖科技光環與光點
   */
  drawFingertipMarker(ctx, x, y) {
    ctx.save();

    // 外圈光暈
    const gradient = ctx.createRadialGradient(x, y, 4, x, y, 22);
    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.9)');
    gradient.addColorStop(0.5, 'rgba(14, 165, 233, 0.5)');
    gradient.addColorStop(1, 'rgba(14, 165, 233, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    // 內圈實心亮點
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();

    // 標籤「食指」
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('INDEX', x + 12, y - 8);

    ctx.restore();
  }

  /**
   * 更新狀態標籤
   */
  updateStatus(state, message) {
    if (this.statusBadge) {
      this.statusBadge.textContent = message;
      this.statusBadge.className = `status-badge status-${state}`;
    }
    if (this.onStatusChange) {
      this.onStatusChange(state, message);
    }
  }

  /**
   * 錯誤處理與退回游標模式
   */
  handleError(err) {
    this.stop();
    const errMsg = '無法啟用視訊辨識 (可能無攝影機或拒絕權限)，請改用游標控制！';
    this.updateStatus('error', errMsg);

    if (this.onFallbackRequired) {
      this.onFallbackRequired(errMsg);
    }
  }

  /**
   * 停止追蹤並釋放攝影機資源
   */
  stop() {
    this.isRunning = false;
    this.isModelLoaded = false;
    this.isHandDetected = false;

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.camera) {
      this.camera.stop();
      this.camera = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    if (this.containerElement) {
      this.containerElement.style.display = 'none';
    }

    if (this.ctx && this.canvasElement) {
      this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    }
  }
}
