import Phaser from 'phaser';

/**
 * Swatter.js
 * Fly swatter controller with:
 * - Persistent dark semi-transparent shadow (exact aiming reference on floor/legs)
 * - Elevated swatter paddle & handle following cursor
 * - Punchy swat slam animation on left click
 * - Configurable collision hit radius
 */
export class Swatter {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} hitRadius
   */
  constructor(scene, hitRadius = 35) {
    this.scene = scene;
    this.hitRadius = hitRadius;

    this.isSwatting = false;
    this.cooldown = false;

    // Create container and graphics
    this.shadowGraphics = this.scene.add.graphics().setDepth(10);
    this.swatterContainer = this.scene.add.container(400, 350).setDepth(20);

    this.buildSwatterVisuals();

    // Default position
    this.x = 400;
    this.y = 350;
    this.updatePosition(this.x, this.y);
  }

  buildSwatterVisuals() {
    // 1. Swatter shadow (aiming indicator on ground/skin)
    this.drawShadow();

    // 2. Swatter physical paddle & handle
    const paddleGraphics = this.scene.add.graphics();

    // Swatter handle (plastic red/orange ribbed rod)
    paddleGraphics.fillStyle(0xcc3322, 1);
    paddleGraphics.fillRoundedRect(16, 20, 10, 80, 4);
    paddleGraphics.lineStyle(2, 0x4a0e08, 1);
    paddleGraphics.strokeRoundedRect(16, 20, 10, 80, 4);

    // Paddle wire/plastic mesh head (rectangular with rounded corners)
    paddleGraphics.fillStyle(0x2288dd, 0.85);
    paddleGraphics.fillRoundedRect(-32, -38, 64, 76, 10);
    paddleGraphics.lineStyle(3, 0x113366, 1);
    paddleGraphics.strokeRoundedRect(-32, -38, 64, 76, 10);

    // Grid lines for the swatter mesh
    paddleGraphics.lineStyle(1.5, 0x113366, 0.7);
    for (let gx = -24; gx <= 24; gx += 12) {
      paddleGraphics.lineBetween(gx, -36, gx, 36);
    }
    for (let gy = -30; gy <= 30; gy += 12) {
      paddleGraphics.lineBetween(-30, gy, 30, gy);
    }

    this.paddleGraphics = paddleGraphics;
    this.swatterContainer.add(paddleGraphics);

    // Initial offset to give illusion of height above the surface
    this.swatterContainer.setPosition(this.x + 18, this.y - 30);
  }

  drawShadow() {
    this.shadowGraphics.clear();

    // Dark semi-transparent mesh shadow showing exact impact area
    this.shadowGraphics.fillStyle(0x0a0505, 0.45);
    this.shadowGraphics.fillRoundedRect(this.x - 30, this.y - 35, 60, 70, 10);

    // Thin inner rim
    this.shadowGraphics.lineStyle(2, 0x000000, 0.6);
    this.shadowGraphics.strokeRoundedRect(this.x - 30, this.y - 35, 60, 70, 10);

    // Crosshairs / center aiming dot
    this.shadowGraphics.fillStyle(0xffffff, 0.5);
    this.shadowGraphics.fillCircle(this.x, this.y, 3);
  }

  /**
   * Updates swatter and shadow coordinates from pointer.
   * @param {number} x
   * @param {number} y
   */
  updatePosition(x, y) {
    this.x = Phaser.Math.Clamp(x, 20, this.scene.scale.width - 20);
    this.y = Phaser.Math.Clamp(y, 20, this.scene.scale.height - 20);

    this.drawShadow();

    if (!this.isSwatting) {
      // Elevated offset when idle
      this.swatterContainer.setPosition(this.x + 16, this.y - 28);
      this.swatterContainer.setScale(1.08);
      this.swatterContainer.setAngle(-5);
    }
  }

  /**
   * Executes a swat strike.
   * Calls onImpactCallback at the precise moment of surface contact.
   * @param {Function} onImpactCallback
   */
  strike(onImpactCallback) {
    if (this.cooldown) return;
    this.cooldown = true;
    this.isSwatting = true;

    // Fast, responsive strike tween: slams down directly onto shadow
    this.scene.tweens.add({
      targets: this.swatterContainer,
      x: this.x,
      y: this.y,
      scaleX: 0.95,
      scaleY: 0.95,
      angle: 0,
      duration: 65,
      ease: 'Quad.easeIn',
      onComplete: () => {
        // Execute impact callback right at contact
        if (onImpactCallback) {
          onImpactCallback(this.x, this.y, this.hitRadius);
        }

        // Slight squash and bounce back up
        this.scene.tweens.add({
          targets: this.swatterContainer,
          x: this.x + 16,
          y: this.y - 28,
          scaleX: 1.08,
          scaleY: 1.08,
          angle: -5,
          duration: 160,
          ease: 'Back.easeOut',
          onComplete: () => {
            this.isSwatting = false;
            this.cooldown = false;
          }
        });
      }
    });
  }

  /**
   * Checks if target is within hit radius.
   * @param {number} targetX
   * @param {number} targetY
   * @param {number} targetRadius
   * @returns {boolean}
   */
  checkHit(targetX, targetY, targetRadius = 10) {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
    return dist <= (this.hitRadius + targetRadius);
  }

  /**
   * Cleanup
   */
  destroy() {
    this.shadowGraphics.destroy();
    this.swatterContainer.destroy();
  }
}
