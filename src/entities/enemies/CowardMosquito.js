import Phaser from 'phaser';
import { MOSQUITO_TYPES } from '../Mosquito.js';
import { VariantMosquito, VARIANT_STATES, moveTowards } from './VariantMosquito.js';

export class CowardMosquito extends VariantMosquito {
  constructor(scene) {
    super(scene);
    this.type = MOSQUITO_TYPES.COWARD;
    this.approachPath = [];
  }

  startAttack({ spawnPos, targetPos, manager, callbacks }) {
    const leg = manager.environment.getNearestLeg(spawnPos);
    this.initAttack(spawnPos, targetPos, leg, callbacks);
  }

  initAttack(spawn, target, leg, callbacks) {
    this.targetLeg = leg;
    this.callbacks = callbacks;
    this.state = VARIANT_STATES.NORMAL;
    this.onDeath = callbacks.onDeath;
    this.x = spawn.x;
    this.y = spawn.y;
    this.container.setVisible(true);
    this.attackTarget = target;
  }

  update(delta) {
    if (this.state === VARIANT_STATES.NORMAL) {
      this.approachPath.push({ x: this.x, y: this.y });
      const distance = moveTowards(this, this.attackTarget, this.config.movementSpeed * delta / 1000);
      if (distance < 18) {
        this.beginFeeding(this.attackTarget, this.callbacks.onDamage);
        this.callbacks.onBite?.(this);
      }
    } else if (this.state === VARIANT_STATES.ESCAPING) {
      const distance = moveTowards(this, this.escapeTarget, this.config.escapeSpeed * delta / 1000);
      if (distance < 20) {
        this.state = VARIANT_STATES.REAPPEARING;
        this.reappearanceTimer = this.scene.time.delayedCall(
          this.config.reappearanceDelay * 1000,
          () => this.reappear()
        );
      }
    }
  }

  takeDamage(amount, source) {
    const accepted = super.takeDamage(amount, source);
    if (accepted && this.state === VARIANT_STATES.NORMAL && this.health > 0) {
      this.stopFeeding();
      this.state = VARIANT_STATES.ESCAPING;
      const escapeAngle = Phaser.Math.Angle.Between(
        this.attackTarget.x,
        this.attackTarget.y,
        this.x,
        this.y
      );
      this.spawnBabies(this.scene.mosquitoManager, escapeAngle);
      this.escapeTarget = {
        x: this.x + Math.cos(escapeAngle) * this.config.escapeDistance,
        y: this.y + Math.sin(escapeAngle) * this.config.escapeDistance
      };
    }
    return accepted;
  }

  reappear() {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const edge = Phaser.Math.Between(0, 2);
    this.x = edge === 0 ? -this.config.reappearanceEntryMargin :
      edge === 1 ? width + this.config.reappearanceEntryMargin :
        Phaser.Math.Between(0, width);
    this.y = edge === 2 ? -this.config.reappearanceEntryMargin :
      Phaser.Math.Between(80, height - 80);
    this.attackTarget = this.scene.mosquitoManager.environment.getRandomSkinTarget();
    this.state = VARIANT_STATES.NORMAL;
    this.container.setVisible(true);
  }

  kill(source) {
    if (this.reappearanceTimer) this.reappearanceTimer.remove();
    super.kill(source);
  }
}
