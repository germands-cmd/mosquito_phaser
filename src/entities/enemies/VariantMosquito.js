import Phaser from 'phaser';
import { Mosquito, MOSQUITO_TYPES } from '../Mosquito.js';

export const VARIANT_STATES = {
  LAUNCHING: 'LAUNCHING',
  GROUPING: 'GROUPING',
  DISPERSING: 'DISPERSING',
  NORMAL: 'NORMAL',
  ESCAPING: 'ESCAPING',
  REAPPEARING: 'REAPPEARING',
  DRUNK_MOVING: 'DRUNK_MOVING',
  SEARCHING: 'SEARCHING',
  PARASITIC: 'PARASITIC',
  ZIGZAG_MOVING: 'ZIGZAG_MOVING',
  ZIGZAG_PAUSED: 'ZIGZAG_PAUSED'
};

export function moveTowards(entity, target, distance) {
  const angle = Phaser.Math.Angle.Between(entity.x, entity.y, target.x, target.y);
  entity.x += Math.cos(angle) * distance;
  entity.y += Math.sin(angle) * distance;
  entity.container.setPosition(entity.x, entity.y).setRotation(angle);
  return Phaser.Math.Distance.Between(entity.x, entity.y, target.x, target.y);
}

export function reachTarget(entity, callbacks) {
  if (callbacks?.onTargetReached) {
    callbacks.onTargetReached(entity);
    return true;
  }
  return false;
}

export function spawnBabies(manager, source, launchAngle, config) {
  const count = Phaser.Math.Between(config.minBabiesSpawned, config.maxBabiesSpawned);
  for (let i = 0; i < count; i++) {
    const baby = manager.getAvailableMosquito(MOSQUITO_TYPES.BABY);
    const angle = launchAngle + Phaser.Math.FloatBetween(
      -config.babyLaunchConeAngle / 2,
      config.babyLaunchConeAngle / 2
    );
    const callbacks = manager.getVariantCallbacks(baby);
    baby.launch(
      { x: source.x, y: source.y },
      {
        x: Math.cos(angle) * config.babyLaunchSpeed,
        y: Math.sin(angle) * config.babyLaunchSpeed
      },
      Phaser.Math.FloatBetween(
        config.babyActivationDelay.min,
        config.babyActivationDelay.max
      ),
      callbacks
    );
    baby.onDeath = callbacks.onDeath;
  }
}

export class VariantMosquito extends Mosquito {
  configure(config) {
    super.configure(config);
    this.config = config;
    return this;
  }

  isVulnerable() {
    return this.isAlive() && this.state !== VARIANT_STATES.REAPPEARING;
  }

  isSwattable() {
    return this.isVulnerable();
  }

  beginFeeding(target, onDamage) {
    this.targetPosition = { ...target };
    this.container.setPosition(this.x, this.y);
    this.startFeeding(onDamage);
  }

  spawnBabies(manager, launchAngle) {
    spawnBabies(manager, this, launchAngle, this.config);
  }

  deactivate() {
    this.activationTimer?.remove();
    this.reappearanceTimer?.remove();
    this.activationTimer = null;
    this.reappearanceTimer = null;
    this.menuTarget = null;
    super.deactivate();
  }
}
