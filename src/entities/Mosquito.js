import Phaser from 'phaser';

export const MOSQUITO_STATES = {
  INACTIVE: 'INACTIVE',
  WARNING: 'WARNING',
  DIVING: 'DIVING',
  BITING: 'BITING',
  DEAD: 'DEAD'
};

/**
 * Mosquito.js
 * Individual mosquito entity:
 * - Procedural comic-style vector sprite (proboscis, elongated abdomen, thorax, fluttering wings)
 * - Rotates so proboscis strictly faces trajectory
 * - Handles dive tween and collision state
 */
export class Mosquito {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.state = MOSQUITO_STATES.INACTIVE;

    this.x = -100;
    this.y = -100;
    this.radius = 12; // Collision radius

    this.container = this.scene.add.container(-100, -100).setDepth(15).setVisible(false);
    this.buildGraphics();

    // Wing flap tween
    this.wingFlapTween = this.scene.tweens.add({
      targets: [this.wingLeft, this.wingRight],
      scaleY: 0.25,
      yoyo: true,
      repeat: -1,
      duration: 35
    });

    this.diveTween = null;
  }

  buildGraphics() {
    const g = this.scene.add.graphics();

    // Proboscis (needle pointing to the right / 0 rads)
    g.lineStyle(2, 0x111111, 1);
    g.lineBetween(8, 0, 18, 0);

    // Legs (thin angled lines)
    g.lineStyle(1.5, 0x1a1a1a, 0.9);
    // Front legs
    g.lineBetween(4, -2, 8, -8);
    g.lineBetween(4, 2, 8, 8);
    // Mid legs
    g.lineBetween(0, -2, 2, -10);
    g.lineBetween(0, 2, 2, 10);
    // Back legs
    g.lineBetween(-4, -2, -8, -9);
    g.lineBetween(-4, 2, -8, 9);

    // Dark body segments
    // Thorax
    g.fillStyle(0x2d241e, 1);
    g.fillEllipse(3, 0, 9, 6);
    g.lineStyle(1.5, 0x0f0b08, 1);
    g.strokeEllipse(3, 0, 9, 6);

    // Abdomen (striped elongated comic style)
    g.fillStyle(0x423226, 1);
    g.fillEllipse(-5, 0, 12, 5);
    g.lineStyle(1.5, 0x0f0b08, 1);
    g.strokeEllipse(-5, 0, 12, 5);

    // Abdomen light stripes
    g.lineStyle(1, 0x8a725e, 0.85);
    g.lineBetween(-4, -2, -4, 2);
    g.lineBetween(-7, -2, -7, 2);

    // Head
    g.fillStyle(0x1a1410, 1);
    g.fillCircle(7, 0, 3);

    // Eyes (tiny red specks)
    g.fillStyle(0xaa2211, 1);
    g.fillCircle(8, -1.5, 1);
    g.fillCircle(8, 1.5, 1);

    this.container.add(g);

    // Wings (translucent with dark vein outlines)
    this.wingLeft = this.scene.add.graphics();
    this.wingLeft.fillStyle(0xd5e8f0, 0.65);
    this.wingLeft.fillEllipse(1, -7, 10, 5);
    this.wingLeft.lineStyle(1, 0x688999, 0.8);
    this.wingLeft.strokeEllipse(1, -7, 10, 5);
    this.container.add(this.wingLeft);

    this.wingRight = this.scene.add.graphics();
    this.wingRight.fillStyle(0xd5e8f0, 0.65);
    this.wingRight.fillEllipse(1, 7, 10, 5);
    this.wingRight.lineStyle(1, 0x688999, 0.8);
    this.wingRight.strokeEllipse(1, 7, 10, 5);
    this.container.add(this.wingRight);
  }

  /**
   * Starts attack dive from spawn point to skin target point.
   * @param {{x: number, y: number}} spawnPos
   * @param {{x: number, y: number}} targetPos
   * @param {number} diveDurationMs (400 - 900ms)
   * @param {Function} onReachTarget
   */
  startDive(spawnPos, targetPos, diveDurationMs, onReachTarget) {
    this.state = MOSQUITO_STATES.DIVING;
    this.x = spawnPos.x;
    this.y = spawnPos.y;
    this.container.setPosition(this.x, this.y);
    this.container.setVisible(true);

    // Point proboscis toward target
    const angle = Phaser.Math.Angle.Between(spawnPos.x, spawnPos.y, targetPos.x, targetPos.y);
    this.container.setRotation(angle);

    // Fast direct dive
    this.diveTween = this.scene.tweens.add({
      targets: this,
      x: targetPos.x,
      y: targetPos.y,
      duration: diveDurationMs,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        this.container.setPosition(this.x, this.y);
      },
      onComplete: () => {
        if (this.state === MOSQUITO_STATES.DIVING) {
          this.state = MOSQUITO_STATES.BITING;
          if (onReachTarget) {
            onReachTarget(targetPos.x, targetPos.y);
          }
        }
      }
    });
  }

  /**
   * Mark as dead and hide.
   */
  kill() {
    this.state = MOSQUITO_STATES.DEAD;
    if (this.diveTween) {
      this.diveTween.stop();
      this.diveTween = null;
    }
    this.container.setVisible(false);
  }

  /**
   * Deactivate and reset.
   */
  deactivate() {
    this.state = MOSQUITO_STATES.INACTIVE;
    if (this.diveTween) {
      this.diveTween.stop();
      this.diveTween = null;
    }
    this.container.setVisible(false);
  }

  destroy() {
    if (this.wingFlapTween) this.wingFlapTween.stop();
    if (this.diveTween) this.diveTween.stop();
    this.container.destroy();
  }
}
