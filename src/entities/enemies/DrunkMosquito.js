import Phaser from 'phaser';
import { MOSQUITO_TYPES } from '../Mosquito.js';
import {
  VariantMosquito,
  VARIANT_STATES,
  spawnBabies,
  reachTarget
} from './VariantMosquito.js';

export class DrunkMosquito extends VariantMosquito {
  constructor(scene) {
    super(scene);
    this.type = MOSQUITO_TYPES.DRUNK;
    this.elapsed = 0;
    this.oscillationPhase = 0;
  }

  startAttack({ spawnPos, targetPos, callbacks }) {
    this.callbacks = callbacks;
    this.onDeath = callbacks.onDeath;
    this.attackTarget = targetPos;
    this.elapsed = 0;
    this.oscillationPhase = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.x = spawnPos.x;
    this.y = spawnPos.y;
    this.state = VARIANT_STATES.DRUNK_MOVING;
    this.container.setVisible(true);
  }

  update(delta) {
    if (this.state !== VARIANT_STATES.DRUNK_MOVING) return;

    const seconds = delta / 1000;
    this.elapsed += seconds;
    const angle = Phaser.Math.Angle.Between(
      this.x,
      this.y,
      this.attackTarget.x,
      this.attackTarget.y
    );
    const forward = { x: Math.cos(angle), y: Math.sin(angle) };
    const lateral = { x: -forward.y, y: forward.x };
    const wave = Math.sin(
      this.elapsed * this.config.oscillationFrequency + this.oscillationPhase
    );
    const velocity = {
      x: forward.x * this.config.movementSpeed + lateral.x * wave * this.config.oscillationSpeed,
      y: forward.y * this.config.movementSpeed + lateral.y * wave * this.config.oscillationSpeed
    };

    this.x += velocity.x * seconds;
    this.y += velocity.y * seconds;
    this.container.setPosition(this.x, this.y)
      .setRotation(Math.atan2(velocity.y, velocity.x));

    if (Phaser.Math.Distance.Between(this.x, this.y, this.attackTarget.x, this.attackTarget.y) < 18) {
      if (reachTarget(this, this.callbacks)) {
        return;
      }
      this.beginFeeding(this.attackTarget, this.callbacks.onDamage);
      this.callbacks.onBite?.(this);
    }
  }

  onKilled(manager) {
    const damageNearby = this.deathSource !== 'drunk-explosion';
    this.triggerDeathEffect(manager, damageNearby);
  }

  triggerDeathEffect(manager, damageNearby) {
    manager.callbacks.onAreaEffect?.(
      this.x,
      this.y,
      this.config.explosionRadius,
      this.config.explosionColor
    );

    spawnBabies(
      manager,
      this,
      Phaser.Math.FloatBetween(0, Math.PI * 2),
      this.config
    );

    if (!damageNearby) return;

    const eligible = manager.mosquitoPool.filter((mosquito) =>
      mosquito !== this &&
      mosquito.isAlive() &&
      mosquito.type !== MOSQUITO_TYPES.BABY
    );
    const victims = eligible.filter((mosquito) =>
      Phaser.Math.Distance.Between(this.x, this.y, mosquito.x, mosquito.y) <=
      this.config.explosionRadius
    );

    for (const victim of victims) {
      this.killFromExplosion(manager, victim);
    }

    if (victims.length < this.config.minimumExplosionVictims) {
      const additionalVictims = Phaser.Utils.Array.Shuffle(
        eligible.filter((mosquito) => !victims.includes(mosquito))
      );
      for (const victim of additionalVictims) {
        if (victims.length >= this.config.minimumExplosionVictims) break;
        if (!victim.isAlive()) continue;
        victims.push(victim);
        this.killFromExplosion(manager, victim);
      }
    }
  }

  killFromExplosion(manager, victim) {
    if (!victim.isAlive() || victim.type === MOSQUITO_TYPES.BABY) return;
    victim.deathSource = 'drunk-explosion';
    victim.kill('drunk-explosion');
    if (victim.type !== MOSQUITO_TYPES.DRUNK) {
      this.spawnVictimBabies(manager, victim);
    }
  }

  spawnVictimBabies(manager, victim) {
    spawnBabies(
      manager,
      victim,
      Phaser.Math.FloatBetween(0, Math.PI * 2),
      this.config
    );
  }
}
