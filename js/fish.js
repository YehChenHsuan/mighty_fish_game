/**
 * Yakudoo Mighty Fish 3D 角色建構與物理游動動畫控制器
 * 忠實移植 Karim Maaloul 經典 3D 多邊形魚、尾鰭擺動動態、身形縮放與色彩插值變色 (藍->粉紅)
 */

class MightyFish {
  constructor() {
    this.threeGroup = new THREE.Group();

    // 核心運動學狀態
    this.pos = new THREE.Vector3(-180, 0, 0); // 魚在畫面左側游動
    this.targetY = 0;
    this.speed = 1.0;
    this.speedFactor = 1.0; // 使用者設定倍率 (0.75x ~ 1.5x)
    this.angleFin = 0;

    // 色彩過渡 (慢速: 晶亮水藍 0x00ceff -> 極速: 狂暴洋紅 0xff00e0)
    this.slowColor = new THREE.Color(0x00ceff);
    this.fastColor = new THREE.Color(0xff00b4);
    this.currentColor = new THREE.Color(0x00ceff);

    // 材質系統
    this.bodyMat = new THREE.MeshLambertMaterial({
      color: 0x00ceff,
      flatShading: true
    });
    this.whiteMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      flatShading: true
    });
    this.blackMat = new THREE.MeshLambertMaterial({
      color: 0x1e293b,
      flatShading: true
    });
    this.redMat = new THREE.MeshLambertMaterial({
      color: 0xf43f5e,
      flatShading: true
    });
    this.toothMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      flatShading: true
    });

    // 動畫關節參照
    this.body = null;
    this.tail = null;
    this.topFin = null;
    this.sideRightFin = null;
    this.sideLeftFin = null;
    this.rightEye = null;
    this.leftEye = null;

    this.buildFish();
  }

  buildFish() {
    // 1. 魚身本體 (Cube / Box 造型)
    const bodyGeom = new THREE.BoxGeometry(110, 110, 110);
    this.body = new THREE.Mesh(bodyGeom, this.bodyMat);
    this.body.position.set(0, 0, 0);
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.threeGroup.add(this.body);

    // 2. 魚尾 (Cylinder 錐體接關節)
    const tailGeom = new THREE.CylinderGeometry(0, 55, 60, 4, 1);
    this.tail = new THREE.Mesh(tailGeom, this.bodyMat);
    this.tail.position.set(-80, 0, 0);
    this.tail.rotation.z = -Math.PI / 2;
    this.tail.castShadow = true;
    this.threeGroup.add(this.tail);

    // 3. 背鰭 (Top Fin)
    const topFinGeom = new THREE.CylinderGeometry(0, 32, 35, 4, 1);
    this.topFin = new THREE.Mesh(topFinGeom, this.bodyMat);
    this.topFin.position.set(-20, 68, 0);
    this.topFin.rotation.z = -Math.PI / 3;
    this.topFin.castShadow = true;
    this.threeGroup.add(this.topFin);

    // 4. 左右胸鰭 (Pectoral Side Fins)
    const sideFinGeom = new THREE.CylinderGeometry(0, 26, 32, 4, 1);

    this.sideRightFin = new THREE.Mesh(sideFinGeom, this.bodyMat);
    this.sideRightFin.position.set(0, -15, 60);
    this.sideRightFin.rotation.x = Math.PI / 2.5;
    this.sideRightFin.rotation.z = -Math.PI / 4;
    this.threeGroup.add(this.sideRightFin);

    this.sideLeftFin = new THREE.Mesh(sideFinGeom, this.bodyMat);
    this.sideLeftFin.position.set(0, -15, -60);
    this.sideLeftFin.rotation.x = -Math.PI / 2.5;
    this.sideLeftFin.rotation.z = -Math.PI / 4;
    this.threeGroup.add(this.sideLeftFin);

    // 5. 大眼睛 (立體方塊與瞳孔)
    const eyeGeom = new THREE.BoxGeometry(38, 38, 10);
    const irisGeom = new THREE.BoxGeometry(16, 16, 10);

    // 右眼
    this.rightEye = new THREE.Mesh(eyeGeom, this.whiteMat);
    this.rightEye.position.set(28, 18, 56);
    this.rightEye.rotation.y = -0.15;
    const rightIris = new THREE.Mesh(irisGeom, this.blackMat);
    rightIris.position.set(5, -2, 4);
    this.rightEye.add(rightIris);
    this.threeGroup.add(this.rightEye);

    // 左眼
    this.leftEye = new THREE.Mesh(eyeGeom, this.whiteMat);
    this.leftEye.position.set(28, 18, -56);
    this.leftEye.rotation.y = 0.15;
    const leftIris = new THREE.Mesh(irisGeom, this.blackMat);
    leftIris.position.set(5, -2, -4);
    this.leftEye.add(leftIris);
    this.threeGroup.add(this.leftEye);

    // 6. 嘴唇與尖牙 (Lips & Teeth)
    const lipGeom = new THREE.BoxGeometry(20, 10, 114);
    const upperLip = new THREE.Mesh(lipGeom, this.redMat);
    upperLip.position.set(55, -20, 0);
    this.threeGroup.add(upperLip);

    const toothGeom = new THREE.ConeGeometry(8, 16, 3);
    for (let i = -2; i <= 2; i++) {
      const tooth = new THREE.Mesh(toothGeom, this.toothMat);
      tooth.position.set(58, -14, i * 22);
      tooth.rotation.z = Math.PI;
      this.threeGroup.add(tooth);
    }

    // 縮放並設定初始朝向 (魚面向右方游動前進)
    this.threeGroup.scale.set(0.7, 0.7, 0.7);
    this.threeGroup.position.copy(this.pos);
  }

  /**
   * 逐幀更新魚的位置、俯仰角度、尾巴擺動、背鰭胸鰭拍打與色彩變幻
   * @param {number} inputNormX - 歸一化水平位置 (0 最左慢速 ~ 1 最右極速)
   * @param {number} inputNormY - 歸一化垂直位置 (0 最下 ~ 1 最上)
   * @param {number} delta - 每幀時間差
   */
  update(inputNormX, inputNormY, delta) {
    // 1. 速度計算：左移到底 (inputNormX <= 0.08) 可完全暫停游動；向右加速大幅提升 (最高達 5.5 倍極速衝刺)
    let targetSpeed = 0;
    if (inputNormX <= 0.08) {
      targetSpeed = 0;
    } else {
      const t = (inputNormX - 0.08) / 0.92;
      // 強烈衝刺曲線：向右移動時加速更為迅猛暢快
      targetSpeed = Math.pow(t, 1.25) * 5.5;
    }
    const targetCalculatedSpeed = targetSpeed * this.speedFactor;
    // 快速平滑過渡 (加減速反應更敏捷迅速)
    this.speed += (targetCalculatedSpeed - this.speed) * 0.28;

    // 2. 垂直目標高度平滑跟隨 (-180 ~ +180)
    const targetY = (inputNormY - 0.5) * 360;
    this.pos.y += (targetY - this.pos.y) * 0.18;

    // 水平位置響應：左移靠後 (-220)，右移顯著前進衝刺 (-110)
    const targetX = -220 + inputNormX * 110;
    this.pos.x += (targetX - this.pos.x) * 0.24;

    this.threeGroup.position.set(this.pos.x, this.pos.y, 0);

    // 3. 俯仰角度 (Pitch)：魚向上游抬頭，向下游俯衝
    const targetRotZ = ((targetY - this.pos.y) / 360) * 0.55;
    this.threeGroup.rotation.z += (targetRotZ - this.threeGroup.rotation.z) * 0.18;

    // 微幅航向左右擺動 (Yaw)
    this.threeGroup.rotation.y = Math.sin(this.angleFin * 0.5) * 0.08;

    // 4. 尾巴與魚鰭拍動動畫
    if (this.speed > 0.02) {
      this.angleFin += this.speed * 0.14;
    } else {
      // 暫停時進行極微弱的靜態呼吸擺動
      this.angleFin += 0.03;
    }

    if (this.tail) {
      // 尾巴擺動幅度隨速度動態調整
      const baseWiggle = this.speed > 0.02 ? 0.35 + (this.speed / 3) * 0.35 : 0.08;
      const tailWiggle = Math.cos(this.angleFin) * baseWiggle;
      this.tail.rotation.y = tailWiggle;
    }

    if (this.topFin) {
      this.topFin.rotation.x = Math.cos(this.angleFin) * (this.speed > 0.02 ? 0.15 : 0.04);
    }

    if (this.sideRightFin && this.sideLeftFin) {
      const flapAmount = this.speed > 0.02 ? 0.45 : 0.12;
      const finFlap = Math.sin(this.angleFin) * flapAmount;
      this.sideRightFin.rotation.z = -Math.PI / 4 + finFlap;
      this.sideLeftFin.rotation.z = -Math.PI / 4 - finFlap;
    }

    // 5. 魚身擠壓與拉長 (Squash & Stretch)：越快身形越修長
    const s = Math.min(1, Math.max(0, (this.speed - 0.2) / 2.4));
    const sx = 0.7 * (1 + s * 0.35);
    const sy = 0.7 * (1 - s * 0.18);
    const sz = 0.7 * (1 - s * 0.18);
    this.threeGroup.scale.set(sx, sy, sz);

    // 6. 色彩平滑過渡：由水藍色漸變至洋紅粉色
    this.currentColor.lerpColors(this.slowColor, this.fastColor, s);
    this.bodyMat.color.copy(this.currentColor);

    // 7. 眼神動態：高速時眼神微瞇顯得兇猛衝刺
    if (this.rightEye && this.leftEye) {
      const eyeScaleY = 1 - s * 0.3;
      this.rightEye.scale.y = eyeScaleY;
      this.leftEye.scale.y = eyeScaleY;
    }
  }

  setSpeedFactor(factor) {
    this.speedFactor = factor;
  }
}
