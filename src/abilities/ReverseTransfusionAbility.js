import Phaser from "phaser";
import { BaseAbility } from "./BaseAbility.js";
import { MOSQUITO_STATES } from "../entities/Mosquito.js";

/**
 * ReverseTransfusionAbility.js
 * Ability B: Reverse Transfusion
 * Triggers a chain reaction of crimson blood-energy arcs that jump between
 * nearby visible diving mosquitoes, eliminating them in sequence.
 */
export class ReverseTransfusionAbility extends BaseAbility {
  constructor(config = {}) {
    super({
      id: "REVERSE_TRANSFUSION",
      name: "Reverse Transfusion",
      slotKey: "2",
      iconSymbol: "⚡",
      sequenceLength: config.sequenceLength || 4,
      color: "#e6194b",
    });

    // Configurable parameters
    this.maxJumps = config.maxJumps || 5;
    this.maxJumpDistance = config.maxJumpDistance || 800;
    this.jumpStepDelayMs = config.jumpStepDelayMs || 90;
  }

  /**
   * Returns empowered parameter overrides for frenzy mode.
   * - maxJumps ×1.5 rounded (chain reaches more targets)
   * - maxJumpDistance ×1.5 (chain bridges larger gaps)
   *
   * jumpStepDelayMs is intentionally NOT empowered — it controls animation
   * pacing and shortening it would make individual zaps invisible.
   *
   * @param {number} [factor=1.5]
   * @returns {Object}
   */
  getEmpoweredConfig(factor = 1.5) {
    return {
      maxJumps:        Math.round(this.maxJumps * factor),
      maxJumpDistance: Math.round(this.maxJumpDistance * factor),
    };
  }

  /**
   * @param {Object} context
   * @param {Object} [overrides={}]
   */
  executeEffect(
    {
      scene,
      impactX,
      impactY,
      hitRadius,
      hitMosquitoes,
      mosquitoManager,
      audioManager,
      onComplete,
    },
    overrides = {}
  ) {
    const maxJumps = overrides.maxJumps ?? this.maxJumps;
    const maxJumpDistance = overrides.maxJumpDistance ?? this.maxJumpDistance;

    const width = scene.scale.width;
    const height = scene.scale.height;

    // Filter available diving mosquitoes currently visible on screen
    const isVisibleOnScreen = (m) => {
      return m.x >= 10 && m.x <= width - 10 && m.y >= 10 && m.y <= height - 10;
    };

    const isTargetable = (m) => {
      const swattable = m.isSwattable ? m.isSwattable() : m.state === MOSQUITO_STATES.DIVING;
      return swattable && isVisibleOnScreen(m);
    };

    const targetableMosquitoes = mosquitoManager.mosquitoPool.filter(isTargetable);

    // Identify starting point
    let currentTarget = null;
    if (hitMosquitoes && hitMosquitoes.length > 0) {
      currentTarget = hitMosquitoes[0];
    } else {
      // If direct hit was missed or already dead, find closest visible mosquito to impact
      let nearestDist = Infinity;
      for (const m of targetableMosquitoes) {
        const d = Phaser.Math.Distance.Between(impactX, impactY, m.x, m.y);
        if (d < nearestDist && d <= maxJumpDistance) {
          nearestDist = d;
          currentTarget = m;
        }
      }
    }

    if (!currentTarget) {
      // No targets available on screen: resolve immediately
      if (onComplete) onComplete();
      return;
    }

    const visited = new Set();
    visited.add(currentTarget);

    const beamGraphics = scene.add.graphics().setDepth(24);
    let jumpCount = 0;
    let prevPos = { x: currentTarget.x, y: currentTarget.y };

    const zapTarget = (targetMosquito, fromPos) => {
      jumpCount++;
      const toPos = { x: targetMosquito.x, y: targetMosquito.y };

      // Play audio & micro-shake
      if (audioManager && audioManager.playReverseTransfusionZap) {
        audioManager.playReverseTransfusionZap();
      }
      scene.cameras.main.shake(90, 0.008);

      // Kill mosquito and trigger callbacks
      targetMosquito.kill();
      if (mosquitoManager.callbacks && mosquitoManager.callbacks.onHit) {
        mosquitoManager.callbacks.onHit(toPos.x, toPos.y);
      }

      // Draw jagged lightning / blood beam between fromPos and toPos
      this.drawCrimsonBeam(beamGraphics, fromPos, toPos);

      prevPos = toPos;

      // Find next closest unvisited visible mosquito
      let nextTarget = null;
      let closestDist = Infinity;

      for (const m of mosquitoManager.mosquitoPool) {
        if (
          (m.isSwattable ? m.isSwattable() : m.state === MOSQUITO_STATES.DIVING) &&
          !visited.has(m) &&
          isVisibleOnScreen(m)
        ) {
          const dist = Phaser.Math.Distance.Between(
            prevPos.x,
            prevPos.y,
            m.x,
            m.y,
          );
          if (dist < closestDist && dist <= maxJumpDistance) {
            closestDist = dist;
            nextTarget = m;
          }
        }
      }

      if (nextTarget && jumpCount < maxJumps) {
        visited.add(nextTarget);
        scene.time.delayedCall(this.jumpStepDelayMs, () => {
          zapTarget(nextTarget, prevPos);
        });
      } else {
        // Fade out and cleanup beam graphics
        scene.tweens.add({
          targets: beamGraphics,
          alpha: 0,
          duration: 200,
          onComplete: () => {
            beamGraphics.destroy();
            if (onComplete) onComplete();
          },
        });
      }
    };

    // Begin chain at first target
    zapTarget(currentTarget, { x: impactX, y: impactY });
  }

  /**
   * Draws a stylised electric crimson beam with branches between two points.
   */
  drawCrimsonBeam(graphics, from, to) {
    const dist = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
    const steps = Math.max(3, Math.floor(dist / 35));

    // Outer crimson glow
    graphics.lineStyle(5, 0xa10241, 0.7);
    this.strokeJaggedLine(graphics, from, to, steps, 14);

    // Bright core white/yellow lightning line
    graphics.lineStyle(2, 0xe6194b, 0.95);
    this.strokeJaggedLine(graphics, from, to, steps, 8);
  }

  strokeJaggedLine(graphics, from, to, steps, jitter) {
    graphics.beginPath();
    graphics.moveTo(from.x, from.y);

    const dx = (to.x - from.x) / steps;
    const dy = (to.y - from.y) / steps;

    for (let i = 1; i < steps; i++) {
      const px = from.x + dx * i + Phaser.Math.Between(-jitter, jitter);
      const py = from.y + dy * i + Phaser.Math.Between(-jitter, jitter);
      graphics.lineTo(px, py);
    }

    graphics.lineTo(to.x, to.y);
    graphics.strokePath();
  }
}
