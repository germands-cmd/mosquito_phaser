import Phaser from 'phaser';
import { BaseAbility } from './BaseAbility.js';
import { MOSQUITO_STATES } from '../entities/Mosquito.js';

/**
 * PressureBombAbility.js
 * Ability A: Pressure Bomb
 * Produces an expanding comic shockwave around the swatter impact point,
 * obliterating all diving mosquitoes caught in its blast radius.
 */
export class PressureBombAbility extends BaseAbility {
  constructor(config = {}) {
    super({
      id: 'PRESSURE_BOMB',
      name: 'Pressure Bomb',
      slotKey: '1',
      iconSymbol: '💥',
      sequenceLength: config.sequenceLength || 4,
      color: '#ff5522'
    });

    // Configurable gameplay parameters
    this.blastRadius = config.blastRadius || 240;
    this.expansionDurationMs = config.expansionDurationMs || 360;
  }

  /**
   * Returns empowered parameter overrides for frenzy mode.
   * - blastRadius ×1.5 (larger area)
   * - expansionDurationMs ×0.75 (snappier animation during the multi-hit frenzy)
   *
   * @param {number} [factor=1.5]
   * @returns {Object}
   */
  getEmpoweredConfig(factor = 1.5) {
    return {
      blastRadius:         Math.round(this.blastRadius * factor),
      expansionDurationMs: Math.round(this.expansionDurationMs * 0.75),
    };
  }

  /**
   * @param {Object} context
   * @param {Object} [overrides={}]
   */
  executeEffect(
    { scene, impactX, impactY, hitRadius, hitMosquitoes, mosquitoManager, audioManager, onComplete },
    overrides = {}
  ) {
    const blastRadius = overrides.blastRadius ?? this.blastRadius;
    const expansionDurationMs = overrides.expansionDurationMs ?? this.expansionDurationMs;

    // 1. Play procedural bomb explosion sound
    if (audioManager && audioManager.playPressureBomb) {
      audioManager.playPressureBomb();
    }

    // 2. High-impact camera shake
    scene.cameras.main.shake(180, 0.016);

    // 3. Spawn expanding shockwave graphics
    const shockwaveGraphics = scene.add.graphics().setDepth(22);

    // Flash burst at impact center
    const burstFlash = scene.add.circle(impactX, impactY, 25, 0xffeedd, 0.9).setDepth(23);
    scene.tweens.add({
      targets: burstFlash,
      scale: 2.2,
      alpha: 0,
      duration: 180,
      ease: 'Quad.easeOut',
      onComplete: () => burstFlash.destroy()
    });

    // 4. Find all vulnerable mosquitoes (diving or feeding) caught within shockwave blast radius
    const victims = [];
    if (mosquitoManager && mosquitoManager.mosquitoPool) {
      for (const m of mosquitoManager.mosquitoPool) {
        if (m.isSwattable ? m.isSwattable() : m.state === MOSQUITO_STATES.DIVING) {
          const dist = Phaser.Math.Distance.Between(impactX, impactY, m.x, m.y);
          if (dist <= blastRadius + m.radius) {
            victims.push(m);
          }
        }
      }
    }

    // Process casualties: kill and trigger onHit callback for blood/score
    for (const m of victims) {
      const vx = m.x;
      const vy = m.y;
      m.kill();
      if (mosquitoManager.callbacks && mosquitoManager.callbacks.onHit) {
        mosquitoManager.callbacks.onHit(vx, vy);
      }
    }

    // 5. Animate expanding shockwave ring
    const animState = { radius: 10, alpha: 0.95 };
    scene.tweens.add({
      targets: animState,
      radius: blastRadius,
      alpha: 0,
      duration: expansionDurationMs,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        shockwaveGraphics.clear();

        // Outer bright pressure ring
        shockwaveGraphics.lineStyle(6, 0xff7733, animState.alpha);
        shockwaveGraphics.strokeCircle(impactX, impactY, animState.radius);

        // Inner white comic shock contour
        shockwaveGraphics.lineStyle(2.5, 0xffffff, animState.alpha * 0.85);
        shockwaveGraphics.strokeCircle(impactX, impactY, Math.max(0, animState.radius - 8));

        // Subtle warm glow fill
        shockwaveGraphics.fillStyle(0xff4411, animState.alpha * 0.15);
        shockwaveGraphics.fillCircle(impactX, impactY, animState.radius);
      },
      onComplete: () => {
        shockwaveGraphics.destroy();
        if (onComplete) {
          onComplete();
        }
      }
    });
  }
}
