import Phaser from 'phaser';

/**
 * BloodHealthBar.js
 * Liquid blood health bar with procedural animated bubbles,
 * trailing damage ghost bar, critical health pulse, and comic-style frame.
 */
export class BloodHealthBar {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x - Left coordinate
   * @param {number} y - Top coordinate
   * @param {number} [width=320]
   * @param {number} [height=38]
   * @param {number} [maxHealth=100]
   */
  constructor(scene, x, y, width = 320, height = 38, maxHealth = 100) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.targetRatio = 1.0;
    this.displayedRatio = 1.0;
    this.ghostRatio = 1.0; // Trailing damage ghost fill

    // Liquid inner bounds (inset by padding)
    this.padX = 4;
    this.padY = 4;
    this.innerW = this.width - this.padX * 2;
    this.innerH = this.height - this.padY * 2;

    // Bubbles simulation pool
    this.bubbles = [];
    this.bubbleCount = 18;
    this.agitationTimer = 0; // Agitation boost after taking damage
    this.timeAccumulator = 0;

    // Critical pulse tween tracking
    this.isCritical = false;
    this.pulseAlpha = 1.0;

    this.createDisplayObjects();
    this.initBubbles();
    this.redraw();
  }

  createDisplayObjects() {
    this.container = this.scene.add.container(0, 0).setDepth(30);

    // 1. Outer dark comic frame
    this.frameGraphics = this.scene.add.graphics();
    this.container.add(this.frameGraphics);

    // 2. Liquid fill graphics (ghost bar + blood liquid + bubbles)
    this.liquidGraphics = this.scene.add.graphics();
    this.container.add(this.liquidGraphics);

    // 3. Centered Health text (only numbers: e.g., "100 / 100")
    const centerY = this.y + this.height / 2;
    this.hpText = this.scene.add.text(this.x + this.width / 2, centerY, '100 / 100', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '16px',
      color: '#ffffff',
      stroke: '#2b0404',
      strokeThickness: 3
    }).setOrigin(0.5);
    this.container.add(this.hpText);

    // Render static frame
    this.renderFrame();
  }

  renderFrame() {
    const g = this.frameGraphics;
    g.clear();

    // Dark crimson/charcoal chassis
    g.fillStyle(0x130707, 0.94);
    g.fillRoundedRect(this.x, this.y, this.width, this.height, 8);

    // Inner bevel / track groove
    g.fillStyle(0x220909, 1);
    g.fillRoundedRect(
      this.x + this.padX,
      this.y + this.padY,
      this.innerW,
      this.innerH,
      6
    );

    // Outer comic border with subtle blood-red sheen
    g.lineStyle(2, 0x4a1414, 0.95);
    g.strokeRoundedRect(this.x, this.y, this.width, this.height, 8);

    // Highlights along top border edge
    g.lineStyle(1, 0x732222, 0.7);
    g.lineBetween(this.x + 8, this.y + 1, this.x + this.width - 8, this.y + 1);
  }

  initBubbles() {
    this.bubbles = [];
    for (let i = 0; i < this.bubbleCount; i++) {
      this.bubbles.push(this.createBubble(true));
    }
  }

  createBubble(randomY = false) {
    const startY = randomY
      ? Phaser.Math.Between(4, Math.max(6, this.innerH - 2))
      : this.innerH - 2;

    return {
      relX: Math.random(), // 0..1 fraction across filled width
      y: startY,
      radius: Phaser.Math.FloatBetween(1.6, 3.6),
      speedY: Phaser.Math.FloatBetween(22, 44), // px per second
      wobbleSpeed: Phaser.Math.FloatBetween(2.5, 6.0),
      wobbleOffset: Math.random() * Math.PI * 2,
      wobbleAmp: Phaser.Math.FloatBetween(2.0, 5.0),
      alpha: Phaser.Math.FloatBetween(0.45, 0.85),
      color: Math.random() > 0.35 ? 0xff4d4d : 0xff9999
    };
  }

  /**
   * Sets current health and smoothly updates the bar.
   * @param {number} current
   * @param {number} [max=100]
   */
  setHealth(current, max = 100) {
    this.maxHealth = max;
    const oldHealth = this.health;
    this.health = Phaser.Math.Clamp(current, 0, max);
    this.targetRatio = this.health / this.maxHealth;

    // If damage taken, trigger agitation (boiling burst)
    if (this.health < oldHealth) {
      this.agitationTimer = 650; // 650ms agitated boil
      this.spawnAgitationBubbles(6);

      // Micro flash effect on text
      this.hpText.setColor('#ffaaaa');
      this.scene.time.delayedCall(160, () => {
        if (this.hpText?.active) {
          this.hpText.setColor('#ffffff');
        }
      });
    }

    this.isCritical = this.health > 0 && (this.health / this.maxHealth) <= 0.25;
    this.hpText.setText(`${Math.round(this.health)} / ${this.maxHealth}`);
  }

  spawnAgitationBubbles(count) {
    for (let i = 0; i < count; i++) {
      const b = this.createBubble(false);
      b.speedY *= 1.8;
      b.radius = Phaser.Math.FloatBetween(2.0, 4.2);
      this.bubbles.push(b);
    }
    // Limit bubble pool size to avoid overflow
    while (this.bubbles.length > 28) {
      this.bubbles.shift();
    }
  }

  /**
   * Frame update for smooth liquid lerp, bubbles, and damage ghost trail.
   * @param {number} deltaMs
   */
  update(deltaMs) {
    const dt = deltaMs / 1000;
    this.timeAccumulator += dt;

    if (this.agitationTimer > 0) {
      this.agitationTimer = Math.max(0, this.agitationTimer - deltaMs);
    }

    // 1. Lerp displayed ratio towards target ratio (liquid drain)
    this.displayedRatio += (this.targetRatio - this.displayedRatio) * Math.min(1, dt * 10);

    // 2. Trailing damage ghost bar (lags behind for punchy feedback)
    if (this.ghostRatio > this.displayedRatio) {
      this.ghostRatio -= dt * 0.45;
      if (this.ghostRatio < this.displayedRatio) {
        this.ghostRatio = this.displayedRatio;
      }
    } else {
      this.ghostRatio = this.displayedRatio;
    }

    // 3. Update bubbles
    const fillWidth = Math.max(0, this.innerW * this.displayedRatio);
    const speedMult = this.agitationTimer > 0 ? 2.2 : (this.isCritical ? 1.5 : 1.0);

    for (let i = 0; i < this.bubbles.length; i++) {
      const b = this.bubbles[i];
      b.y -= b.speedY * speedMult * dt;

      // Surface pop or above liquid: respawn at bottom
      if (b.y <= 2) {
        // Recycle bubble
        b.y = this.innerH - 2;
        b.relX = Math.random();
        b.radius = Phaser.Math.FloatBetween(1.6, 3.6);
        b.speedY = Phaser.Math.FloatBetween(22, 44);
      }
    }

    // 4. Critical pulsation
    if (this.isCritical) {
      this.pulseAlpha = 0.75 + Math.sin(this.timeAccumulator * 8) * 0.25;
      this.hpText.setColor('#ff4444');
    } else {
      this.pulseAlpha = 1.0;
    }

    this.redraw();
  }

  redraw() {
    const g = this.liquidGraphics;
    g.clear();

    const originX = this.x + this.padX;
    const originY = this.y + this.padY;
    const maxW = this.innerW;
    const h = this.innerH;

    const currentW = Math.max(0, maxW * this.displayedRatio);
    const ghostW = Math.max(0, maxW * this.ghostRatio);

    if (ghostW <= 0) return;

    // A. Damage ghost bar (lagging amber/white slice)
    if (ghostW > currentW) {
      g.fillStyle(0xff8844, 0.85);
      g.fillRoundedRect(originX, originY, ghostW, h, 5);
    }

    if (currentW <= 0) return;

    // B. Blood Liquid Body
    // Base rich crimson
    g.fillStyle(0x940a14, this.pulseAlpha);
    g.fillRoundedRect(originX, originY, currentW, h, 5);

    // Deeper bottom shadow for liquid depth
    g.fillStyle(0x520308, 0.6 * this.pulseAlpha);
    g.fillRect(originX, originY + h - 5, currentW, 5);

    // Glossy top specular line (translucent white/crimson)
    g.lineStyle(1.5, 0xff7788, 0.55 * this.pulseAlpha);
    g.lineBetween(originX + 2, originY + 2, originX + Math.max(2, currentW - 4), originY + 2);

    // C. Bubbles inside blood
    for (const b of this.bubbles) {
      // Calculate world X within current fill width
      const wobble = Math.sin(this.timeAccumulator * b.wobbleSpeed + b.wobbleOffset) * b.wobbleAmp;
      const bx = originX + b.relX * currentW + wobble;
      const by = originY + b.y;

      // Ensure bubble is strictly within current blood pool boundaries
      if (bx >= originX + 2 && bx <= originX + currentW - 2 && by >= originY + 2 && by <= originY + h - 2) {
        g.fillStyle(b.color, b.alpha * this.pulseAlpha);
        g.fillCircle(bx, by, b.radius);

        // Tiny specular highlight dot on larger bubbles
        if (b.radius > 2.5) {
          g.fillStyle(0xffffff, b.alpha * 0.9 * this.pulseAlpha);
          g.fillCircle(bx - b.radius * 0.3, by - b.radius * 0.3, Math.max(0.6, b.radius * 0.25));
        }
      }
    }
  }

  /**
   * Resets health bar back to 100%.
   */
  reset() {
    this.health = this.maxHealth;
    this.targetRatio = 1.0;
    this.displayedRatio = 1.0;
    this.ghostRatio = 1.0;
    this.agitationTimer = 0;
    this.isCritical = false;
    this.pulseAlpha = 1.0;
    this.hpText.setText(`${this.maxHealth} / ${this.maxHealth}`);
    this.hpText.setColor('#ffffff');
    this.initBubbles();
    this.redraw();
  }

  destroy() {
    if (this.container) {
      this.container.destroy();
    }
  }
}
