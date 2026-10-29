import Phaser from 'phaser';

export const MOSQUITO_STATES = {
  INACTIVE: 'INACTIVE',
  WARNING: 'WARNING',
  DIVING: 'DIVING',
  FEEDING: 'FEEDING',
  BITING: 'FEEDING', // Backwards-compatible alias
  DEAD: 'DEAD'
};

/**
 * Mosquito.js
 * Individual mosquito entity:
 * - Procedural comic-style vector sprite (proboscis, elongated abdomen, thorax, fluttering wings)
 * - Rotates so proboscis strictly faces trajectory
 * - Handles dive tween and collision state
 * - Supports associated buzz voice handle for multi-mosquito swarm sound management
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
    this.buzzHandle = null; // Associated audio voice handle

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
    this.feedingDamageTimer = null;
    this.wingTwitchTimer = null;
    this.wingTwitchTween = null;
    this.feedingTickCount = 0; // Tracks how many damage ticks have fired for this feeding session
  }

  /**
   * Returns true if mosquito is currently vulnerable to player swats or abilities.
   * Both diving mosquitoes and attached feeding mosquitoes can be killed.
   * @returns {boolean}
   */
  isSwattable() {
    return this.state === MOSQUITO_STATES.DIVING || this.state === MOSQUITO_STATES.FEEDING;
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
    this.stopFeeding();
    this.state = MOSQUITO_STATES.DIVING;
    this.x = spawnPos.x;
    this.y = spawnPos.y;
    this.container.setPosition(this.x, this.y);
    this.container.setVisible(true);

    // Resume normal flight wing-flapping animation
    if (this.wingFlapTween && this.wingFlapTween.isPaused()) {
      this.wingFlapTween.resume();
    }

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
          if (onReachTarget) {
            onReachTarget(targetPos.x, targetPos.y);
          }
        }
      }
    });
  }

  /**
   * Puts mosquito into feeding state attached to the player's leg:
   * - Ceases continuous buzzing audio completely
   * - Stops high-speed flight wing flap
   * - Starts gentle, randomized wing micro-movements
   * - Deals 1 discrete damage every full second until swatted/killed
   * @param {Function} onDamageTick - Callback invoked every full 1000ms
   */
  startFeeding(onDamageTick) {
    this.stopFeeding();
    this.state = MOSQUITO_STATES.FEEDING;

    // 1. Stop high-speed flight wing flap and return wings to resting scale
    if (this.wingFlapTween) {
      this.wingFlapTween.pause();
    }
    if (this.wingLeft && this.wingRight) {
      this.wingLeft.setScale(1, 1).setAngle(0);
      this.wingRight.setScale(1, 1).setAngle(0);
    }

    // 2. Stop buzzing sound completely while feeding
    if (this.buzzHandle) {
      if (typeof this.buzzHandle.stop === 'function') {
        this.buzzHandle.stop();
      }
      this.buzzHandle = null;
    }

    // 3. Start subtle, gentle randomized wing twitch loop
    this.scheduleWingTwitch();

    // 4. Start discrete 1-second damage interval timer
    this.feedingTickCount = 0;
    this.feedingDamageTimer = this.scene.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.state === MOSQUITO_STATES.FEEDING && onDamageTick) {
          this.feedingTickCount++;
          onDamageTick(this, this.feedingTickCount);
        }
      }
    });
  }

  /**
   * Schedules a subtle, natural wing twitch after a randomized delay.
   */
  scheduleWingTwitch() {
    if (this.state !== MOSQUITO_STATES.FEEDING) return;

    const delayMs = Phaser.Math.Between(700, 2200);
    this.wingTwitchTimer = this.scene.time.delayedCall(delayMs, () => {
      if (this.state !== MOSQUITO_STATES.FEEDING) return;
      this.executeSubtleWingTwitch();
      this.scheduleWingTwitch();
    });
  }

  /**
   * Executes a brief, delicate wing micro-movement that looks organic and soft.
   */
  executeSubtleWingTwitch() {
    if (this.state !== MOSQUITO_STATES.FEEDING) return;
    if (!this.wingLeft || !this.wingRight) return;

    if (this.wingTwitchTween) {
      this.wingTwitchTween.stop();
    }

    const twitchDuration = Phaser.Math.Between(80, 130);
    const scaleDip = Phaser.Math.FloatBetween(0.82, 0.88);

    this.wingTwitchTween = this.scene.tweens.add({
      targets: [this.wingLeft, this.wingRight],
      scaleY: scaleDip,
      yoyo: true,
      duration: twitchDuration,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (this.wingLeft && this.wingRight) {
          this.wingLeft.setScale(1, 1);
          this.wingRight.setScale(1, 1);
        }
      }
    });
  }

  /**
   * Stops feeding timers, twitches, and clears references.
   */
  stopFeeding() {
    if (this.feedingDamageTimer) {
      this.feedingDamageTimer.remove();
      this.feedingDamageTimer = null;
    }
    if (this.wingTwitchTimer) {
      this.wingTwitchTimer.remove();
      this.wingTwitchTimer = null;
    }
    if (this.wingTwitchTween) {
      this.wingTwitchTween.stop();
      this.wingTwitchTween = null;
    }
    if (this.wingLeft && this.wingRight) {
      this.wingLeft.setScale(1, 1).setAngle(0);
      this.wingRight.setScale(1, 1).setAngle(0);
    }
    this.feedingTickCount = 0;
  }

  /**
   * Mark as dead and hide. Stops any feeding, buzzing, and tweens.
   */
  kill() {
    this.stopFeeding();
    this.state = MOSQUITO_STATES.DEAD;
    if (this.diveTween) {
      this.diveTween.stop();
      this.diveTween = null;
    }
    if (this.buzzHandle) {
      if (typeof this.buzzHandle.stop === 'function') {
        this.buzzHandle.stop();
      }
      this.buzzHandle = null;
    }
    this.container.setVisible(false);
  }

  /**
   * Deactivate and reset for pooling. Stops any feeding and buzzing.
   */
  deactivate() {
    this.stopFeeding();
    this.state = MOSQUITO_STATES.INACTIVE;
    if (this.diveTween) {
      this.diveTween.stop();
      this.diveTween = null;
    }
    if (this.buzzHandle) {
      if (typeof this.buzzHandle.stop === 'function') {
        this.buzzHandle.stop();
      }
      this.buzzHandle = null;
    }
    this.container.setVisible(false);
  }

  destroy() {
    this.deactivate();
    if (this.wingFlapTween) this.wingFlapTween.stop();
    this.container.destroy();
  }
}
