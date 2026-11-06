import Phaser from "phaser";
import { BaseAbility } from "../BaseAbility.js";
import { THUNDERSTORM_CONFIG } from "./config.js";

function createConfig(config) {
  const settings = { ...THUNDERSTORM_CONFIG, ...config };
  if (!Number.isFinite(settings.cooldownMs) || settings.cooldownMs < 250 || settings.cooldownMs > 5000) {
    throw new RangeError("Thunderstorm cooldownMs must be between 250 and 5000.");
  }
  for (const key of [
    "lightningSpeed",
    "lightningVisualDurationMs",
    "lightningWidth",
    "lightningCoreWidth",
    "lightningMidWidth",
    "lightningGlowWidth",
    "lightningJitter",
    "impactShakeDurationMs",
    "sparkCountPerHit",
    "sparkSpeed",
    "sparkVisualDurationMs",
    "sparkSearchRadius",
    "sparkWidth",
    "sparkCoreWidth",
    "sparkMidWidth",
    "sparkGlowWidth",
    "sparkJitter",
    "impactShakeIntensity",
    "thunderVolume",
  ]) {
    if (!Number.isFinite(settings[key]) || settings[key] <= 0) {
      throw new RangeError(`Thunderstorm ${key} must be a positive number.`);
    }
  }
  if (!Number.isInteger(settings.sparkCountPerHit) || settings.sparkCountPerHit !== 3) {
    throw new RangeError("Thunderstorm must generate exactly 3 sparks per hit.");
  }
  if (!Number.isInteger(settings.lightningBranchCount) || settings.lightningBranchCount < 1) {
    throw new RangeError("Thunderstorm lightningBranchCount must be a positive integer.");
  }
  if (settings.impactShakeIntensity > 1 || settings.thunderVolume > 1) {
    throw new RangeError("Thunderstorm impactShakeIntensity and thunderVolume must not exceed 1.");
  }
  for (const key of [
    "lightningGlowColor",
    "lightningColor",
    "lightningCoreColor",
    "lightningAccentColor",
    "impactFlashColor",
    "impactRingColor",
  ]) {
    if (!Number.isInteger(settings[key]) || settings[key] < 0 || settings[key] > 0xffffff) {
      throw new RangeError(`Thunderstorm ${key} must be a 24-bit integer.`);
    }
  }
  if (
    !Array.isArray(settings.sparkColors) ||
    settings.sparkColors.length !== 2 ||
    settings.sparkColors.some((color) => !Number.isInteger(color) || color < 0 || color > 0xffffff)
  ) {
    throw new RangeError("Thunderstorm sparkColors must contain two 24-bit colors.");
  }

  return settings;
}

export class ThunderstormAbility extends BaseAbility {
  constructor(config = {}) {
    const settings = createConfig(config);
    super({
      id: "THUNDERSTORM",
      name: "Thunderstorm",
      iconSymbol: "⚡",
      color: "#397f90",
    });
    this.config = settings;
    this.cooldownMs = settings.cooldownMs;
    this.cooldownReadyAt = 0;
  }

  selectStrikeTargets(mosquitoManager, width, height) {
    const candidates = mosquitoManager.mosquitoPool.filter((enemy) =>
      enemy.isAlive() &&
      enemy.isSwattable() &&
      enemy.x >= 0 &&
      enemy.x <= width &&
      enemy.y >= 0 &&
      enemy.y <= height
    );
    return Phaser.Utils.Array.Shuffle(candidates).slice(0, 3);
  }

  executeEffect({ scene, mosquitoManager, strikeTargets, audioManager, onComplete }) {
    const targets = strikeTargets ||
      this.selectStrikeTargets(mosquitoManager, scene.scale.width, scene.scale.height);
    if (targets.length === 0) {
      onComplete?.();
      return;
    }

    const effects = [];
    let remainingStrikes = targets.length;
    const onStrikeImpact = () => {
      remainingStrikes--;
      if (remainingStrikes === 0) {
        scene.cameras.main.shake(
          this.config.impactShakeDurationMs,
          this.config.impactShakeIntensity
        );
        audioManager?.playThunderstormImpact?.(this.config.thunderVolume);
      }
    };

    for (const enemy of targets) {
      const impact = { x: enemy.x, y: enemy.y };
      effects.push((complete) => this.animateLightningStrike(scene, impact, () => {
        onStrikeImpact();
        complete();
      }));

      if (!enemy.isSwattable()) continue;
      const damaged = enemy.takeDamage(1, "thunderstorm");
      if (!damaged) continue;
      mosquitoManager.callbacks.onHit?.(impact.x, impact.y);

      for (let index = 0; index < this.config.sparkCountPerHit; index++) {
        const sparkTarget = this.selectSparkTarget(mosquitoManager, enemy);
        if (sparkTarget) {
          effects.push((complete) => this.animateSpark(
            scene,
            mosquitoManager,
            impact,
            sparkTarget,
            index,
            complete
          ));
        }
      }
    }

    if (effects.length === 0) {
      onComplete?.();
      return;
    }

    let remainingEffects = effects.length;
    const completeEffect = () => {
      remainingEffects--;
      if (remainingEffects === 0) onComplete?.();
    };
    effects.forEach((startEffect) => startEffect(completeEffect));
  }

  selectSparkTarget(mosquitoManager, sourceEnemy) {
    const candidates = mosquitoManager.mosquitoPool.filter((enemy) =>
      enemy !== sourceEnemy &&
      enemy.isAlive() &&
      enemy.isSwattable() &&
      Phaser.Math.Distance.Between(sourceEnemy.x, sourceEnemy.y, enemy.x, enemy.y) <=
        this.config.sparkSearchRadius
    );
    if (candidates.length === 0) return null;
    return candidates[Phaser.Math.Between(0, candidates.length - 1)];
  }

  animateLightningStrike(scene, impact, onComplete) {
    const graphics = scene.add.graphics().setDepth(24);
    const state = { progress: 0 };
    const segmentCount = 12;
    const points = Array.from({ length: segmentCount + 1 }, (_, index) => ({
      x: impact.x + (index === 0 || index === segmentCount
        ? 0
        : Phaser.Math.Between(-this.config.lightningJitter, this.config.lightningJitter)),
      y: impact.y * index / segmentCount,
    }));
    const branches = this.createLightningBranches(points);
    const durationMs = Math.max(
      20,
      Math.min(
        this.config.lightningVisualDurationMs,
        scene.scale.height / this.config.lightningSpeed * 1000
      )
    );
    scene.tweens.add({
      targets: state,
      progress: 1,
      duration: durationMs,
      ease: "Linear",
      onUpdate: () => {
        graphics.clear();
        graphics.lineStyle(this.config.lightningGlowWidth, this.config.lightningGlowColor, 0.24);
        this.drawLightningPath(graphics, points, branches, state.progress);
        graphics.lineStyle(this.config.lightningMidWidth, this.config.lightningColor, 0.8);
        this.drawLightningPath(graphics, points, branches, state.progress);
        graphics.lineStyle(this.config.lightningWidth, this.config.lightningColor, 1);
        this.drawLightningPath(graphics, points, branches, state.progress);
        graphics.lineStyle(this.config.lightningCoreWidth, this.config.lightningCoreColor, 1);
        this.drawLightningPath(graphics, points, branches, state.progress);
        graphics.lineStyle(3, this.config.lightningAccentColor, 0.95);
        this.drawLightningBranches(graphics, branches, state.progress);
      },
      onComplete: () => {
        graphics.destroy();
        this.animateImpactBurst(scene, impact);
        onComplete();
      },
    });
  }

  createLightningBranches(points) {
    const segmentCount = points.length - 1;
    return Array.from({ length: this.config.lightningBranchCount }, (_, index) => {
      const pointIndex = Math.floor((index + 1) * segmentCount / (this.config.lightningBranchCount + 1));
      const origin = points[pointIndex];
      const direction = index % 2 === 0 ? -1 : 1;
      return {
        origin,
        end: {
          x: origin.x + direction * this.config.lightningJitter * 2.2,
          y: Math.min(
            points[segmentCount].y,
            origin.y + Math.max(12, points[segmentCount].y * 0.12)
          ),
        },
        startProgress: pointIndex / segmentCount,
      };
    });
  }

  drawLightningPath(graphics, points, branches, progress) {
    const segmentCount = points.length - 1;
    for (let index = 0; index < segmentCount; index++) {
      const segmentProgress = Phaser.Math.Clamp(progress * segmentCount - index, 0, 1);
      if (segmentProgress === 0) break;
      const start = points[index];
      const end = points[index + 1];
      graphics.lineBetween(
        start.x,
        start.y,
        Phaser.Math.Linear(start.x, end.x, segmentProgress),
        Phaser.Math.Linear(start.y, end.y, segmentProgress)
      );
      if (segmentProgress < 1) break;
    }
    this.drawLightningBranches(graphics, branches, progress);
  }

  drawLightningBranches(graphics, branches, progress) {
    for (const branch of branches) {
      const branchProgress = Phaser.Math.Clamp((progress - branch.startProgress) / 0.12, 0, 1);
      if (branchProgress === 0) continue;
      graphics.lineBetween(
        branch.origin.x,
        branch.origin.y,
        Phaser.Math.Linear(branch.origin.x, branch.end.x, branchProgress),
        Phaser.Math.Linear(branch.origin.y, branch.end.y, branchProgress)
      );
    }
  }

  animateImpactBurst(scene, impact) {
    const flash = scene.add.circle(
      impact.x,
      impact.y,
      24,
      this.config.impactFlashColor,
      0.95
    ).setDepth(26);
    scene.tweens.add({
      targets: flash,
      scale: 3.2,
      alpha: 0,
      duration: 180,
      ease: "Quad.easeOut",
      onComplete: () => flash.destroy(),
    });

    const ring = scene.add.graphics().setDepth(26);
    ring.lineStyle(8, this.config.impactRingColor, 0.95);
    ring.strokeCircle(0, 0, 24);
    ring.setPosition(impact.x, impact.y);
    ring.setScale(0.35);
    scene.tweens.add({
      targets: ring,
      scale: 3.5,
      alpha: 0,
      duration: 260,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });
  }

  animateSpark(scene, mosquitoManager, start, target, sparkIndex, onComplete) {
    const graphics = scene.add.graphics().setDepth(25);
    const state = { progress: 0 };
    const color = this.config.sparkColors[sparkIndex % this.config.sparkColors.length];
    const initialDistance = Phaser.Math.Distance.Between(start.x, start.y, target.x, target.y);
    const durationMs = Math.max(
      20,
      Math.min(
        this.config.sparkVisualDurationMs,
        initialDistance / this.config.sparkSpeed * 1000
      )
    );

    scene.tweens.add({
      targets: state,
      progress: 1,
      duration: durationMs,
      ease: "Linear",
      onUpdate: () => {
        const endX = Phaser.Math.Linear(start.x, target.x, state.progress);
        const endY = Phaser.Math.Linear(start.y, target.y, state.progress);
        const bendX = (start.x + endX) / 2 + this.config.sparkJitter * (sparkIndex % 2 ? 1 : -1);
        const bendY = (start.y + endY) / 2 - this.config.sparkJitter;
        graphics.clear();
        graphics.lineStyle(this.config.sparkGlowWidth, color, 0.22);
        graphics.lineBetween(start.x, start.y, endX, endY);
        graphics.lineStyle(this.config.sparkMidWidth, color, 0.6);
        graphics.lineBetween(start.x, start.y, endX, endY);
        graphics.lineStyle(this.config.sparkWidth, color, 0.95);
        graphics.lineBetween(start.x, start.y, endX, endY);
        graphics.lineStyle(this.config.sparkCoreWidth, this.config.lightningCoreColor, 1);
        graphics.beginPath();
        graphics.moveTo(start.x, start.y);
        graphics.lineTo(bendX, bendY);
        graphics.lineTo(endX, endY);
        graphics.strokePath();
      },
      onComplete: () => {
        graphics.destroy();
        const stillValid = target.isAlive() && target.isSwattable() &&
          mosquitoManager.mosquitoPool.includes(target);
        if (stillValid) target.applyElectrocution();
        onComplete();
      },
    });
  }
}
