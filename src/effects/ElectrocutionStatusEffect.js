export const ELECTROCUTION_APPLIED_EVENT = "enemy-electrocution-applied";

export const ELECTROCUTION_DEFAULTS = Object.freeze({
  durationMs: 2000,
  color: 0x7ae8e1,
  sparkIntervalMs: 90,
  sparkCount: 4,
  sparkRadius: 18,
  sparkLength: 8,
  lineWidth: 2,
  alpha: 0.95,
});

function validateConfig(config) {
  const settings = { ...ELECTROCUTION_DEFAULTS, ...config };
  const positiveValues = [
    "durationMs",
    "sparkIntervalMs",
    "sparkCount",
    "sparkRadius",
    "sparkLength",
    "lineWidth",
  ];

  for (const key of positiveValues) {
    if (!Number.isFinite(settings[key]) || settings[key] <= 0) {
      throw new RangeError(`Electrocution ${key} must be a positive number.`);
    }
  }
  if (!Number.isInteger(settings.sparkCount)) {
    throw new RangeError("Electrocution sparkCount must be an integer.");
  }
  if (!Number.isInteger(settings.color) || settings.color < 0 || settings.color > 0xffffff) {
    throw new RangeError("Electrocution color must be a 24-bit integer.");
  }
  if (!Number.isFinite(settings.alpha) || settings.alpha < 0 || settings.alpha > 1) {
    throw new RangeError("Electrocution alpha must be between 0 and 1.");
  }

  return settings;
}

export class ElectrocutionStatusEffect {
  constructor(enemy) {
    this.enemy = enemy;
    this.active = false;
    this.expirationTimer = null;
    this.sparkTimer = null;
    this.graphics = null;
    this.pausedTweens = [];
    this.pausedTimers = [];
    this.settings = ELECTROCUTION_DEFAULTS;
  }

  apply(config = {}) {
    const reapplied = this.active;
    this.settings = validateConfig({ ...this.settings, ...config });

    if (!this.active) {
      this.active = true;
      this.pauseEnemy();
      this.graphics = this.enemy.scene.add.graphics()
        .setDepth((this.enemy.container.depth || 15) + 1);
    }

    this.expirationTimer?.remove();
    this.expirationTimer = this.enemy.scene.time.delayedCall(
      this.settings.durationMs,
      () => this.clear()
    );

    this.sparkTimer?.remove();
    this.sparkTimer = this.enemy.scene.time.addEvent({
      delay: this.settings.sparkIntervalMs,
      loop: true,
      callback: () => this.drawSparks(),
    });
    this.drawSparks();

    this.enemy.scene.events.emit(ELECTROCUTION_APPLIED_EVENT, this.enemy, { reapplied });
    return true;
  }

  pauseEnemy() {
    for (const tween of [
      this.enemy.diveTween,
      this.enemy.wingFlapTween,
      this.enemy.wingTwitchTween,
    ]) {
      if (tween && !tween.isPaused()) {
        tween.pause();
        this.pausedTweens.push(tween);
      }
    }

    for (const timer of [
      this.enemy.activationTimer,
      this.enemy.reappearanceTimer,
      this.enemy.feedingDamageTimer,
      this.enemy.wingTwitchTimer,
    ]) {
      if (timer && !timer.paused) {
        timer.paused = true;
        this.pausedTimers.push(timer);
      }
    }
  }

  drawSparks() {
    if (!this.active || !this.enemy.isAlive() || !this.graphics) return;
    const { color, sparkCount, sparkRadius, sparkLength, lineWidth, alpha } = this.settings;
    const graphics = this.graphics;
    graphics.clear();
    graphics.lineStyle(lineWidth, color, alpha);

    for (let index = 0; index < sparkCount; index++) {
      const angle = Math.random() * Math.PI * 2;
      const startDistance = Math.random() * sparkRadius;
      const startX = this.enemy.x + Math.cos(angle) * startDistance;
      const startY = this.enemy.y + Math.sin(angle) * startDistance;
      const endX = startX + Math.cos(angle) * sparkLength;
      const endY = startY + Math.sin(angle) * sparkLength;
      const bendX = startX + Math.cos(angle + Math.PI / 3) * sparkLength * 0.55;
      const bendY = startY + Math.sin(angle + Math.PI / 3) * sparkLength * 0.55;
      graphics.beginPath();
      graphics.moveTo(startX, startY);
      graphics.lineTo(bendX, bendY);
      graphics.lineTo(endX, endY);
      graphics.strokePath();
    }
  }

  clear() {
    if (!this.active) return;
    this.active = false;
    this.expirationTimer?.remove();
    this.sparkTimer?.remove();
    this.expirationTimer = null;
    this.sparkTimer = null;
    this.graphics?.destroy();
    this.graphics = null;

    const enemyIsAlive = this.enemy.isAlive();
    if (enemyIsAlive) {
      for (const tween of this.pausedTweens) tween.resume();
      for (const timer of this.pausedTimers) timer.paused = false;
    }
    this.pausedTweens = [];
    this.pausedTimers = [];

    if (!enemyIsAlive) {
      this.enemy.pendingFormationRelease = null;
      return;
    }

    const formation = this.enemy.pendingFormationRelease;
    if (formation) {
      this.enemy.pendingFormationRelease = null;
      formation.releaseMember(this.enemy);
    }
  }
}
