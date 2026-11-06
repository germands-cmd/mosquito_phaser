import Phaser from "phaser";
import { BaseAbility } from "../BaseAbility.js";
import { MOSQUITO_TYPES } from "../../entities/Mosquito.js";
import { LIGHTNING_PULSE_CONFIG } from "./config.js";

function createConfig(config) {
  const settings = { ...LIGHTNING_PULSE_CONFIG, ...config };
  if (!Number.isInteger(settings.maxCharges) || settings.maxCharges < 1) {
    throw new RangeError("Lightning Pulse maxCharges must be a positive integer.");
  }
  if (!Number.isFinite(settings.rechargeMs) || settings.rechargeMs <= 0) {
    throw new RangeError("Lightning Pulse rechargeMs must be a positive number.");
  }
  if (
    !Number.isFinite(settings.explosionRadiusMultiplier) ||
    settings.explosionRadiusMultiplier < 0.85 ||
    settings.explosionRadiusMultiplier > 0.9
  ) {
    throw new RangeError("Lightning Pulse radius must be 10–15% smaller than Drunk Mosquito's radius.");
  }
  if (
    !Number.isFinite(settings.shockwaveOpacity) ||
    settings.shockwaveOpacity < 0 ||
    settings.shockwaveOpacity > 1
  ) {
    throw new RangeError("Lightning Pulse shockwaveOpacity must be between 0 and 1.");
  }

  for (const key of [
    "shockwaveDurationMs",
    "shockwaveLineWidth",
    "sparkCount",
    "sparkDurationMs",
    "sparkLength",
    "sparkJitter",
    "glowLineWidth",
    "coreLineWidth",
  ]) {
    if (!Number.isFinite(settings[key]) || settings[key] <= 0) {
      throw new RangeError(`Lightning Pulse ${key} must be a positive number.`);
    }
  }
  if (!Number.isInteger(settings.sparkCount)) {
    throw new RangeError("Lightning Pulse sparkCount must be a positive integer.");
  }

  return settings;
}

export class LightningPulseAbility extends BaseAbility {
  constructor(config = {}) {
    const settings = createConfig(config);
    super({
      id: "LIGHTNING_PULSE",
      name: "Lightning Pulse",
      iconSymbol: "⚡",
      color: "#13dff2",
    });

    this.config = settings;
    this.maxCharges = settings.maxCharges;
    this.charges = settings.maxCharges;
    this.rechargeElapsedMs = 0;
    this.activationType = "status";
  }

  executeEffect() {
    throw new Error("Lightning Pulse is activated by the shared Electrocution status event.");
  }

  tryActivate(centerEnemy, mosquitoManager) {
    if (this.charges <= 0 || !centerEnemy?.isAlive()) return false;
    const drunkRadius = mosquitoManager.getEnemyConfig(MOSQUITO_TYPES.DRUNK).explosionRadius;
    if (!Number.isFinite(drunkRadius) || drunkRadius <= 0) {
      throw new Error("Drunk Mosquito explosionRadius must be a positive number.");
    }
    const radius = drunkRadius * this.config.explosionRadiusMultiplier;
    const targets = mosquitoManager.mosquitoPool.filter((enemy) =>
      enemy !== centerEnemy &&
      enemy.isSwattable() &&
      Phaser.Math.Distance.Between(centerEnemy.x, centerEnemy.y, enemy.x, enemy.y) <= radius
    );
    if (targets.length === 0) return false;

    this.charges--;
    this.createExplosion(centerEnemy.scene, centerEnemy.x, centerEnemy.y, radius);
    for (const enemy of targets) {
      const hitX = enemy.x;
      const hitY = enemy.y;
      const damaged = enemy.takeDamage(1, "lightning-pulse");
      if (damaged) mosquitoManager.callbacks.onHit?.(hitX, hitY);
    }
    return true;
  }

  update(delta) {
    if (this.charges >= this.maxCharges) {
      this.rechargeElapsedMs = 0;
      return;
    }
    this.rechargeElapsedMs += delta;
    while (this.rechargeElapsedMs >= this.config.rechargeMs && this.charges < this.maxCharges) {
      this.rechargeElapsedMs -= this.config.rechargeMs;
      this.charges++;
    }
    if (this.charges === this.maxCharges) this.rechargeElapsedMs = 0;
  }

  getChargeProgress() {
    if (this.charges === this.maxCharges) return 1;
    const nextChargeProgress = this.rechargeElapsedMs / this.config.rechargeMs;
    return (this.charges + nextChargeProgress) / this.maxCharges;
  }

  createExplosion(scene, x, y, radius) {
    const shockwave = scene.add.graphics().setDepth(23);
    const shockState = { radius: 8, alpha: this.config.shockwaveOpacity };
    scene.tweens.add({
      targets: shockState,
      radius,
      alpha: 0,
      duration: this.config.shockwaveDurationMs,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        shockwave.clear();
        shockwave.lineStyle(this.config.shockwaveLineWidth, this.config.glowColor, shockState.alpha);
        shockwave.strokeCircle(x, y, shockState.radius);
      },
      onComplete: () => shockwave.destroy(),
    });

    const sparks = Array.from({ length: this.config.sparkCount }, () => ({
      angle: Phaser.Math.FloatBetween(0, Math.PI * 2),
      length: Phaser.Math.FloatBetween(this.config.sparkLength * 0.65, this.config.sparkLength),
      jitter: Phaser.Math.FloatBetween(-this.config.sparkJitter, this.config.sparkJitter),
    }));
    const sparkGraphics = scene.add.graphics().setDepth(24);
    const sparkState = { progress: 0, alpha: 1 };
    scene.tweens.add({
      targets: sparkState,
      progress: 1,
      alpha: 0,
      duration: this.config.sparkDurationMs,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        sparkGraphics.clear();
        const innerRadius = sparkState.progress * radius * 0.55;
        const outerRadius = sparkState.progress * radius;
        for (const spark of sparks) {
          const startX = x + Math.cos(spark.angle) * innerRadius;
          const startY = y + Math.sin(spark.angle) * innerRadius;
          const endX = x + Math.cos(spark.angle) * Math.min(radius, outerRadius + spark.length);
          const endY = y + Math.sin(spark.angle) * Math.min(radius, outerRadius + spark.length);
          const middleX = (startX + endX) / 2 + Math.cos(spark.angle + Math.PI / 2) * spark.jitter;
          const middleY = (startY + endY) / 2 + Math.sin(spark.angle + Math.PI / 2) * spark.jitter;

          sparkGraphics.lineStyle(this.config.glowLineWidth, this.config.glowColor, sparkState.alpha * 0.8);
          sparkGraphics.lineBetween(startX, startY, endX, endY);
          sparkGraphics.lineStyle(this.config.coreLineWidth, this.config.coreColor, sparkState.alpha);
          sparkGraphics.beginPath();
          sparkGraphics.moveTo(startX, startY);
          sparkGraphics.lineTo(middleX, middleY);
          sparkGraphics.lineTo(endX, endY);
          sparkGraphics.strokePath();
        }
      },
      onComplete: () => sparkGraphics.destroy(),
    });
  }
}
