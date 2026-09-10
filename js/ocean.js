/**
 * Mighty Fish 3D 海底世界場景與答案光圈通道管理器 (Ocean & Gate System)
 * 負責：Three.js 3D 渲染器、動態光照、海洋粒子流動、三路圓形答案光圈生成、即時碰撞判定與特效
 */

class OceanScene {
  constructor(containerElement, onHitCallback, onMissCallback) {
    this.container = containerElement;
    this.onHit = onHitCallback; // (isCorrect, optionData) => {}
    this.onMiss = onMissCallback; // () => {}

    // Three.js 核心組件
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    // 實體參照
    this.fish = null;
    this.particles = [];
    this.particleGroup = new THREE.Group();
    this.gateGroup = null; // 當前題目的一組 3 個光圈 (Group)
    this.gates = []; // [ { group, ringMesh, discMesh, canvas, texture, option, isCorrect, hit } ]
    this.burstParticles = [];

    // 狀態
    this.activeQuestion = null;
    this.isGateActive = false;
    this.hasResolvedCurrentGate = false;
    this.isPaused = false;

    this.init();
  }

  init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // 1. 建立 3D 場景與海洋霧氣效果 (深水藍漸層)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a2238);
    this.scene.fog = new THREE.FogExp2(0x0a2238, 0.0016);

    // 2. 攝影機配置 (透視投影)
    this.camera = new THREE.PerspectiveCamera(60, width / height, 1, 2000);
    this.camera.position.set(0, 0, 480);
    this.camera.lookAt(0, 0, 0);

    // 3. WebGL 渲染器 (平滑抗鋸齒、陰影映射)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 4. 光照配置 (呈現深海光斑與高對比立體感)
    this.setupLights();

    // 5. 魚角色加入場景
    this.fish = new MightyFish();
    this.scene.add(this.fish.threeGroup);

    // 6. 海底前進動態粒子系統 (流光氣泡與浮游物)
    this.setupParticles();

    // 7. 答案光圈母容器
    this.gateParentGroup = new THREE.Group();
    this.scene.add(this.gateParentGroup);

    // 8. 視窗縮放監聽
    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupLights() {
    // 環境光：柔和的深海藍色
    const ambientLight = new THREE.AmbientLight(0x2d5982, 0.9);
    this.scene.add(ambientLight);

    // 半球光：模擬海面光照與深海反光
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x02192e, 0.85);
    hemiLight.position.set(0, 250, 0);
    this.scene.add(hemiLight);

    // 主平行光：模擬水面灑落之陽光，投射銳利陰影
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(120, 280, 200);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 800;
    dirLight.shadow.camera.left = -300;
    dirLight.shadow.camera.right = 300;
    dirLight.shadow.camera.top = 300;
    dirLight.shadow.camera.bottom = -300;
    this.scene.add(dirLight);

    // 側邊補光：打亮魚身腹部與答案光圈
    const pointLight = new THREE.PointLight(0x38bdf8, 1.2, 700);
    pointLight.position.set(-150, -100, 150);
    this.scene.add(pointLight);
  }

  /**
   * 建立前進感粒子系統（向左流動，速度與魚速同步）
   */
  setupParticles() {
    this.scene.add(this.particleGroup);
    const particleGeom = new THREE.BoxGeometry(3, 3, 3);
    const particleMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.65
    });

    const count = 160;
    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(particleGeom, particleMat);
      p.position.set(
        (Math.random() - 0.5) * 1100,
        (Math.random() - 0.5) * 550,
        (Math.random() - 0.5) * 300
      );
      p.speedRatio = 0.6 + Math.random() * 0.8;
      p.scale.setScalar(0.7 + Math.random() * 1.5);
      this.particles.push(p);
      this.particleGroup.add(p);
    }
  }

  /**
   * 載入題目並生成 3 個圓形答案通道 (三路分佈：上、中、下)
   * @param {Object} questionData - 題目資料物件
   */
  /**
   * 載入題目並生成 3 隻迎面游來的 2.5D 答案小魚 (水平錯位拉開左右距離)
   * @param {Object} questionData - 題目資料物件
   */
  spawnQuestionGates(questionData) {
    this.clearGates();

    this.activeQuestion = questionData;
    this.isGateActive = true;
    this.hasResolvedCurrentGate = false;

    this.gateGroup = new THREE.Group();
    // 初始位置在畫面右側較遠處 (X=780)，提供充分的閱讀與反應空間
    this.gateGroup.position.set(780, 0, 0);

    // 隨機打亂答案選項位置
    const shuffledOptions = [...questionData.options].sort(() => Math.random() - 0.5);

    // 三條通道的 Y 軸分佈 (Top: +125, Mid: 0, Bottom: -125)
    const laneY = [125, 0, -125];

    // 水平錯位陣列 (0, 110, 220)：拉開左右魚群的水平距離，不再重疊擠在一起
    const shuffledOffsetsX = [0, 110, 220].sort(() => Math.random() - 0.5);

    shuffledOptions.forEach((opt, idx) => {
      const gateObj = this.createSingle2DFish(opt, laneY[idx], shuffledOffsetsX[idx], idx);
      this.gates.push(gateObj);
      this.gateGroup.add(gateObj.group);
    });

    this.gateParentGroup.add(this.gateGroup);
  }

  /**
   * 建立單隻 2.5D 萌系造型答案魚 (圓滾滾可愛身形，魚腹直接印製特大清晰文字)
   */
  createSingle2DFish(optionData, yPos, offsetX, index) {
    const group = new THREE.Group();
    group.position.set(offsetX, yPos, 0);

    // 三路水道之實心暖色系萌魚底色 (徹底脫離深海藍色，視覺鮮明吸睛)
    // 上：草莓珊瑚紅、中：熱力暖澄金、下：夢幻羅蘭紫
    const laneColors = [
      {
        fill: '#e11d48',
        fillGrad: '#f43f5e',
        border: '#ffffff',
        borderGlow: '#fda4af',
        badgeBg: '#9f1239',
        blush: 'rgba(255, 255, 255, 0.45)'
      },
      {
        fill: '#ea580c',
        fillGrad: '#f97316',
        border: '#ffffff',
        borderGlow: '#fed7aa',
        badgeBg: '#9a3412',
        blush: 'rgba(255, 255, 255, 0.45)'
      },
      {
        fill: '#7c3aed',
        fillGrad: '#9333ea',
        border: '#ffffff',
        borderGlow: '#e9d5ff',
        badgeBg: '#581c87',
        blush: 'rgba(255, 255, 255, 0.45)'
      }
    ];
    const themeColor = laneColors[index % laneColors.length];

    // 高解析度動態畫布 (1180 x 560)
    const canvas = document.createElement('canvas');
    canvas.width = 1180;
    canvas.height = 560;
    const ctx = canvas.getContext('2d');
    const labelLetter = String.fromCharCode(65 + index); // 'A', 'B', 'C'

    const redraw = (state = 'normal') => {
      this.draw2DFishCanvas(ctx, canvas, labelLetter, optionData, themeColor, state);
    };

    // 初始繪製超萌造型
    redraw('normal');

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;

    // 2.5D 魚身平面模型 (寬 138, 高 66，小巧精緻可愛，不佔據過多海底畫面)
    const geom = new THREE.PlaneGeometry(138, 66);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });
    const fishMesh = new THREE.Mesh(geom, mat);
    group.add(fishMesh);

    return {
      group,
      fishMesh,
      geom,
      mat,
      canvas,
      ctx,
      texture,
      redraw,
      option: optionData,
      isCorrect: optionData.isCorrect === true,
      laneY: yPos,
      baseY: yPos,
      localX: offsetX,
      hit: false,
      swimAngle: Math.random() * Math.PI * 2
    };
  }

  /**
   * 繪製超萌 2.5D 可愛小胖魚輪廓與魚腹特大白色文字
   * 特色：
   * 1. 具備鮮豔實心底色（不與海洋藍同色），在深海中極致鮮明！
   * 2. 魚腹文字特大純白色 (#ffffff)，搭配深色微透膠囊底襯與陰影描邊，無比清晰顯眼！
   */
  draw2DFishCanvas(ctx, canvas, label, optionData, themeColor, state = 'normal') {
    const w = canvas.width;
    const h = canvas.height;
    const cy = h / 2;
    const mouthX = 58;
    const tailJuncX = w - 215;
    const tailTipTopX = w - 38;
    const tailTipBotX = w - 38;
    const tailNotchX = w - 118;

    ctx.clearRect(0, 0, w, h);
    ctx.save();

    // 1. 繪製圓滾滾萌系小胖魚外輪廓路徑
    ctx.beginPath();
    // 從左側圓潤嘴部出發
    ctx.moveTo(mouthX, cy);
    // 前額與背鰭弧線
    ctx.bezierCurveTo(w * 0.22, 42, w * 0.38, 30, w * 0.50, 18);
    ctx.bezierCurveTo(w * 0.64, 32, w * 0.74, 40, tailJuncX, cy - 26);
    // 荷葉波浪雙叉尾鰭 (上尾葉)
    ctx.bezierCurveTo(w - 130, 48, w - 85, 36, tailTipTopX, 48);
    // 尾鰭中心柔和內凹
    ctx.bezierCurveTo(w - 70, cy - 40, w - 95, cy - 15, tailNotchX, cy);
    // 尾鰭中心延伸向下尾葉
    ctx.bezierCurveTo(w - 95, cy + 15, w - 70, cy + 40, tailTipBotX, h - 48);
    // 下尾柄與圓潤小胖肚
    ctx.bezierCurveTo(w - 85, h - 36, w - 130, h - 48, tailJuncX, cy + 26);
    ctx.bezierCurveTo(w * 0.74, h - 38, w * 0.54, h - 22, w * 0.34, h - 32);
    ctx.bezierCurveTo(w * 0.20, h - 42, mouthX + 24, cy + 28, mouthX, cy);
    ctx.closePath();

    // 2. 魚身實心底色填充 (非海洋藍！超高對比度暖色系)
    let fillStyle, strokeStyle;
    if (state === 'correct') {
      // 答對變璀璨翡翠綠
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#10b981');
      grad.addColorStop(1, '#059669');
      fillStyle = grad;
      strokeStyle = '#ffffff';
    } else if (state === 'wrong') {
      // 答錯變警示緋紅
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#ef4444');
      grad.addColorStop(1, '#b91c1c');
      fillStyle = grad;
      strokeStyle = '#ffffff';
    } else {
      // 平常：實心暖色漸層底色
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, themeColor.fillGrad);
      grad.addColorStop(1, themeColor.fill);
      fillStyle = grad;
      strokeStyle = themeColor.border;
    }

    ctx.fillStyle = fillStyle;
    ctx.fill();

    // 亮白/霓虹外框
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 10;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // 3. 萌系面部特徵
    const eyeCenterX = mouthX + 96;
    const eyeCenterY = cy - 38;

    // 水汪汪卡通大眼
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eyeCenterX, eyeCenterY, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // 黑曜瞳孔
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(eyeCenterX - 4, eyeCenterY, 14, 0, Math.PI * 2);
    ctx.fill();

    // 雙層萌系反光星芒點
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eyeCenterX - 8, eyeCenterY - 5, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeCenterX + 2, eyeCenterY + 4, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 粉白腮紅 (Blush)
    ctx.save();
    ctx.fillStyle = themeColor.blush;
    ctx.beginPath();
    ctx.ellipse(eyeCenterX + 6, cy + 22, 18, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 嘴唇與微笑
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(mouthX + 16, cy + 8, 10, 0.1 * Math.PI, 0.85 * Math.PI, false);
    ctx.stroke();

    // 嘴邊俏皮氣泡
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mouthX - 16, cy - 24, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(mouthX - 32, cy - 50, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 4. 魚腹核心文字呈現 (無透明黑底，1.5 倍特大純白字體 + 14px 濃郁深色外框描邊 + 立體陰影)
    const textCenterX = w * 0.51;

    // (A) 序號膠囊徽章 [ A ] / [ B ] / [ C ] (1.5 倍大：50px，直接繪製於鮮豔魚身)
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 50px "Outfit", "Segoe UI", sans-serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(8, 14, 24, 0.96)';
    ctx.strokeText(`[ ${label} ]`, textCenterX, cy - 116);
    ctx.fillText(`[ ${label} ]`, textCenterX, cy - 116);
    ctx.restore();

    // (B) 核心英文答案 (純白 #ffffff 1.5 倍特大粗體 + 14px 極致深黑立體描邊，直接襯托於鮮豔魚腹)
    const mainText = optionData.text || "";
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';

    ctx.shadowColor = 'rgba(0, 0, 0, 0.98)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;

    // 1.5 倍大尺寸：短單字 142px，中長句 118px，長句 100px
    let fontSize = 100;
    if (mainText.length <= 8) {
      fontSize = 142; // 短單字 1.5 倍大 (如 swim, walk, duck, hop, sun, kite, fox)
    } else if (mainText.length <= 15) {
      fontSize = 118; // 中長句型 1.5 倍大 (如 Yes, it can. / No, it can't.)
    } else {
      fontSize = 100;
    }

    ctx.font = `bold ${fontSize}px "Outfit", "Fredoka", sans-serif`;

    // 寬度限制保護：若句子較長，自動微調避免文字溢出魚身邊界
    const maxAllowedWidth = 780;
    while (fontSize > 54 && ctx.measureText(mainText).width > maxAllowedWidth) {
      fontSize -= 4;
      ctx.font = `bold ${fontSize}px "Outfit", "Fredoka", sans-serif`;
    }

    // 垂直座標微調：若有中文提示主字微偏上，無中文提示時完全居中
    const hasZh = !!optionData.zh;
    const textY = hasZh ? cy - 8 : cy + 10;

    // 14px 濃郁深黑描邊，搭配 1.5 倍特大純白字體
    ctx.lineWidth = 14;
    ctx.strokeStyle = 'rgba(6, 12, 22, 0.98)';
    ctx.strokeText(mainText, textCenterX, textY);
    ctx.fillText(mainText, textCenterX, textY);
    ctx.restore();

    // (C) 中文提示 (1.5 倍大：44px * 1.5 = 66px，純白色清楚呈現)
    if (optionData.zh) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 3;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.98)';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 66px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
      ctx.lineWidth = 9;
      ctx.strokeStyle = 'rgba(6, 12, 22, 0.98)';
      ctx.strokeText(optionData.zh, textCenterX, cy + 104);
      ctx.fillText(optionData.zh, textCenterX, cy + 104);
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * 清除當前答案小魚群組
   */
  clearGates() {
    if (this.gateGroup) {
      this.gateParentGroup.remove(this.gateGroup);
      this.gates.forEach(g => {
        if (g.mat) g.mat.dispose();
        if (g.geom) g.geom.dispose();
        if (g.texture) g.texture.dispose();
      });
      this.gateGroup = null;
      this.gates = [];
    }
    this.isGateActive = false;
  }

  /**
   * 逐幀物理更新與碰撞判定
   */
  update(normX, normY) {
    if (this.isPaused) return;

    const delta = Math.min(this.clock.getDelta(), 0.1);

    // 1. 更新玩家魚游動位置、色彩與身形
    if (this.fish) {
      this.fish.update(normX, normY, delta);
    }

    // 2. 海洋氣泡粒子向左串流 (速度隨魚游速動態加成)
    const particleSpeed = (this.fish.speed > 0.02 ? 220 + this.fish.speed * 200 : 30) * delta;
    this.particles.forEach(p => {
      p.position.x -= particleSpeed * p.speedRatio;
      if (p.position.x < -550) {
        p.position.x = 550;
        p.position.y = (Math.random() - 0.5) * 550;
      }
    });

    // 3. 爆炸粒子特效更新
    this.updateBurstParticles(delta);

    // 4. 對向 2.5D 答案小魚推進與碰撞檢測
    if (this.isGateActive && this.gateGroup) {
      const speedFactor = this.fish ? (this.fish.speedFactor || 1.0) : 1.0;
      const playerSpeed = this.fish ? this.fish.speed : 1.0;

      // 當玩家左移到底 (playerSpeed <= 0.02) 時，游動相對速度完全為 0 (完全暫停等待玩家思考)
      // 當玩家鼠標向右移動衝刺時，游動相對速度迅猛激增，消除游動過久的等待感
      let baseSwim = 0;
      if (playerSpeed > 0.02) {
        baseSwim = 45 + playerSpeed * 45 + Math.pow(playerSpeed, 1.8) * 22;
      }
      const gateSpeed = baseSwim * speedFactor * delta;
      this.gateGroup.position.x -= gateSpeed;

      // 逐隻更新 2.5D 答案小魚的微幅泳姿與浮沉
      this.gates.forEach(gate => {
        if (playerSpeed > 0.02) {
          gate.swimAngle += delta * 6.5;
        } else {
          gate.swimAngle += delta * 1.5;
        }

        if (!gate.hit) {
          // 微幅水中上下浮沉與微俯仰擺動
          gate.group.position.y = gate.baseY + Math.sin(gate.swimAngle * 0.6) * 5;
          if (gate.fishMesh) {
            gate.fishMesh.rotation.z = Math.sin(gate.swimAngle * 0.8) * 0.04;
          }
        }
      });

      // 玩家魚座標
      const fishX = this.fish.pos.x;
      const fishY = this.fish.pos.y;

      // 當對向小魚進入碰撞範圍時檢測
      if (!this.hasResolvedCurrentGate) {
        let closestGate = null;
        let minDistance = 999;

        this.gates.forEach(gate => {
          // 計算每條魚在世界的 X 座標 (包含水平錯位 localX)
          const currentFishWorldX = this.gateGroup.position.x + gate.localX;
          const distX = Math.abs(currentFishWorldX - fishX);
          const distY = Math.abs(fishY - gate.group.position.y);

          // 當 X 軸靠近且 Y 軸重疊時
          if (distX < 65 && distY < 52) {
            const dist = Math.hypot(distX, distY);
            if (dist < minDistance) {
              minDistance = dist;
              closestGate = gate;
            }
          }
        });

        if (closestGate) {
          this.triggerGateHit(closestGate);
        }
      }

      // 若所有答案魚游過畫面左側且尚未被碰觸 (Miss)
      const furthestFishWorldX = this.gateGroup.position.x + 220;
      if (!this.hasResolvedCurrentGate && furthestFishWorldX < -340) {
        this.hasResolvedCurrentGate = true;
        if (this.onMiss) {
          this.onMiss();
        }
      }

      // 當離開視線時清理
      if (this.gateGroup.position.x < -600) {
        this.clearGates();
      }
    }

    // 5. 渲染 3D 畫面
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * 魚碰到對向 2.5D 答案魚後立即判定：
   * 正確：答案小魚變身翡翠綠、放大歡呼、播放正確音效、增加分數、迸發金色粒子。
   * 錯誤：答案小魚變身警示紅、劇烈震盪、播放錯誤音效、扣除生命。
   */
  triggerGateHit(gate) {
    if (this.hasResolvedCurrentGate) return;
    this.hasResolvedCurrentGate = true;
    gate.hit = true;

    if (gate.isCorrect) {
      // 1. 正確反饋：即時重繪 2.5D 魚身為璀璨翡翠綠
      gate.redraw('correct');
      gate.texture.needsUpdate = true;

      // 翡翠綠與金色星芒爆發粒子
      this.createBurst(this.fish.pos.x + 30, gate.group.position.y, 0x10b981, 32);
      this.createBurst(this.fish.pos.x + 30, gate.group.position.y, 0xfacc15, 18);

      // 小魚歡騰放大與躍動
      gsap.to(gate.group.scale, {
        x: 1.35,
        y: 1.35,
        duration: 0.35,
        ease: "back.out(2)",
        yoyo: true,
        repeat: 1
      });

      if (this.onHit) {
        this.onHit(true, gate.option);
      }
    } else {
      // 2. 錯誤反饋：即時重繪 2.5D 魚身為刺目警示紅
      gate.redraw('wrong');
      gate.texture.needsUpdate = true;

      // 紅色警示碎裂粒子
      this.createBurst(this.fish.pos.x + 30, gate.group.position.y, 0xef4444, 34);

      // 小魚劇烈顫抖
      gsap.to(gate.group.position, {
        x: "+=14",
        duration: 0.06,
        yoyo: true,
        repeat: 5,
        ease: "power1.inOut"
      });

      if (this.onHit) {
        this.onHit(false, gate.option);
      }
    }
  }

  /**
   * 撞擊點光芒碎裂粒子特效
   */
  createBurst(x, y, colorHex, count = 20) {
    const burstGeom = new THREE.BoxGeometry(4.5, 4.5, 4.5);
    const burstMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 1.0
    });

    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(burstGeom, burstMat.clone());
      p.position.set(x, y, 0);

      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 220;
      p.velX = Math.cos(angle) * speed;
      p.velY = Math.sin(angle) * speed;
      p.velZ = (Math.random() - 0.5) * 120;
      p.life = 0.7; // 存活 0.7 秒
      p.maxLife = p.life;

      this.scene.add(p);
      this.burstParticles.push(p);
    }
  }

  updateBurstParticles(delta) {
    for (let i = this.burstParticles.length - 1; i >= 0; i--) {
      const p = this.burstParticles[i];
      p.position.x += p.velX * delta;
      p.position.y += p.velY * delta;
      p.position.z += p.velZ * delta;
      p.life -= delta;

      const progress = p.life / p.maxLife;
      p.material.opacity = Math.max(0, progress);
      p.scale.setScalar(progress);

      if (p.life <= 0) {
        this.scene.remove(p);
        p.geometry.dispose();
        p.material.dispose();
        this.burstParticles.splice(i, 1);
      }
    }
  }

  setPaused(paused) {
    this.isPaused = paused;
  }

  onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}
