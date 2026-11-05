import Phaser from 'phaser';
import { MOSQUITO_STATES, MOSQUITO_TYPES } from '../Mosquito.js';
import { VariantMosquito } from './VariantMosquito.js';

export class IncubatorMosquito extends VariantMosquito {
  constructor(scene) {
    super(scene);
    this.type = MOSQUITO_TYPES.INCUBATOR;
  }

  startAttack({ spawnPos, targetPos, manager, callbacks }) {
    const leg = callbacks.menuTarget
      ? callbacks.menuTarget
      : manager.environment.getNearestLeg(spawnPos);
    this.initAttack(spawnPos, targetPos, leg, callbacks);
  }

  initAttack(spawn, target, leg, callbacks) {
    this.targetLeg = leg;
    this.onDeath = callbacks.onDeath;
    this.state = MOSQUITO_STATES.DIVING;
    this.x = spawn.x;
    this.y = spawn.y;
    this.container.setVisible(true);
    const distance = Phaser.Math.Distance.Between(spawn.x, spawn.y, target.x, target.y);
    const movementDuration = Math.max(450, distance / this.config.movementSpeed * 1000);
    this.diveTween = this.scene.tweens.add({
      targets: this,
      x: target.x,
      y: target.y,
      duration: movementDuration,
      ease: 'Linear',
      onUpdate: () => {
        this.container.setPosition(this.x, this.y);
        this.container.setRotation(
          Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y)
        );
      },
      onComplete: () => {
        if (this.state === MOSQUITO_STATES.DIVING) {
          if (callbacks.onTargetReached) {
            callbacks.onTargetReached(this);
            return;
          }
          callbacks.onReach(this);
          this.beginFeeding(target, callbacks.onDamage);
        }
      }
    });
  }

  onKilled(manager) {
    const leg = this.targetLeg || manager.environment.getNearestLeg(this);
    const legCenter = manager.environment.getLegCenter(leg);
    const centralAngle = Phaser.Math.Angle.Between(legCenter.x, legCenter.y, this.x, this.y);
    this.spawnBabies(manager, centralAngle);
  }
}
