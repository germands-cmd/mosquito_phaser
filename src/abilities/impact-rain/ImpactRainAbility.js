import Phaser from "phaser";
import { BaseAbility } from "../BaseAbility.js";
import { IMPACT_RAIN_CONFIG } from "./config.js";

function createConfig(config) {
  const settings = { ...IMPACT_RAIN_CONFIG, ...config };
  if (!Number.isFinite(settings.cooldownMs) || settings.cooldownMs < 250 || settings.cooldownMs > 5000) {
    throw new RangeError("Impact Rain cooldownMs must be between 250 and 5000.");
  }
  if (settings.impactCount !== 3) {
    throw new RangeError("Impact Rain must generate exactly 3 additional impacts.");
  }
  for (const key of ["impactIntervalMs", "minimumImpactDistance", "impactVisualDurationMs"]) {
    if (!Number.isFinite(settings[key]) || settings[key] <= 0) {
      throw new RangeError(`Impact Rain ${key} must be a positive number.`);
    }
  }
  for (const key of ["impactFlashColor", "impactRingColor"]) {
    if (!Number.isInteger(settings[key]) || settings[key] < 0 || settings[key] > 0xffffff) {
      throw new RangeError(`Impact Rain ${key} must be a 24-bit integer.`);
    }
  }
  return settings;
}

export class ImpactRainAbility extends BaseAbility {
  constructor(config = {}) {
    const settings = createConfig(config);
    super({
      id: "IMPACT_RAIN",
      name: "Impact Rain",
      iconSymbol: "🌧️",
      color: "#45b1ff",
    });
    this.config = settings;
    this.cooldownMs = settings.cooldownMs;
    this.cooldownReadyAt = 0;
    this.pendingTimers = new Set();
  }

  executeEffect({
    scene,
    hitRadius,
    mosquitoManager,
    audioManager,
    replicatedAbility,
    onComplete,
  }) {
    const selectedPositions = [];
    let remainingImpacts = this.config.impactCount;
    const finishImpact = () => {
      remainingImpacts--;
      if (remainingImpacts === 0) onComplete?.();
    };

    for (let index = 0; index < this.config.impactCount; index++) {
      const timer = scene.time.delayedCall(this.config.impactIntervalMs * (index + 1), () => {
        this.pendingTimers.delete(timer);
        const target = this.selectTarget(
          mosquitoManager,
          scene.scale.width,
          scene.scale.height,
          selectedPositions
        );
        if (!target) {
          finishImpact();
          return;
        }

        const impactX = target.x;
        const impactY = target.y;
        selectedPositions.push({ x: impactX, y: impactY, enemy: target });
        this.createImpactVisual(scene, impactX, impactY);

        const hitMosquitoes = mosquitoManager.getSwattableHits(impactX, impactY, hitRadius);
        if (hitMosquitoes.length === 0 || !mosquitoManager.trySwat(impactX, impactY, hitRadius)) {
          finishImpact();
          return;
        }

        if (!replicatedAbility) {
          finishImpact();
          return;
        }

        replicatedAbility.executeEffect({
          scene,
          impactX,
          impactY,
          hitRadius,
          hitMosquitoes: hitMosquitoes.filter((enemy) => enemy.isAlive() && enemy.isSwattable()),
          mosquitoManager,
          audioManager,
          onComplete: finishImpact,
        });
      });
      this.pendingTimers.add(timer);
    }
  }

  selectTarget(mosquitoManager, width, height, selectedPositions) {
    const candidates = mosquitoManager.mosquitoPool.filter((enemy) =>
      enemy.isAlive() &&
      enemy.isSwattable() &&
      enemy.x >= 0 &&
      enemy.x <= width &&
      enemy.y >= 0 &&
      enemy.y <= height
    );
    if (candidates.length === 0) return null;

    const spacedCandidates = candidates.filter((enemy) =>
      selectedPositions.every((position) =>
        Phaser.Math.Distance.Between(position.x, position.y, enemy.x, enemy.y) >=
          this.config.minimumImpactDistance
      )
    );
    const alreadySelected = new Set(selectedPositions.map(({ enemy }) => enemy));
    const distinctCandidates = candidates.filter((enemy) => !alreadySelected.has(enemy));
    const availableTargets = spacedCandidates.length > 0
      ? spacedCandidates
      : (distinctCandidates.length > 0 ? distinctCandidates : candidates);
    return Phaser.Utils.Array.Shuffle([...availableTargets])[0] ?? null;
  }

  createImpactVisual(scene, x, y) {
    const flash = scene.add.circle(x, y, 18, this.config.impactFlashColor, 0.85).setDepth(22);
    scene.tweens.add({
      targets: flash,
      scale: 2.8,
      alpha: 0,
      duration: this.config.impactVisualDurationMs,
      ease: "Quad.easeOut",
      onComplete: () => flash.destroy(),
    });

    const ring = scene.add.graphics().setDepth(22);
    ring.lineStyle(5, this.config.impactRingColor, 0.9);
    ring.strokeCircle(0, 0, 18);
    ring.setPosition(x, y);
    ring.setScale(0.35);
    scene.tweens.add({
      targets: ring,
      scale: 2.8,
      alpha: 0,
      duration: this.config.impactVisualDurationMs,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });
  }

  cancelPendingImpacts() {
    for (const timer of this.pendingTimers) timer.remove();
    this.pendingTimers.clear();
  }
}
