import Phaser from 'phaser';
import { MOSQUITO_STATES, MOSQUITO_TYPES } from '../Mosquito.js';
import { VariantMosquito, VARIANT_STATES, moveTowards } from './VariantMosquito.js';

export class BabyMosquito extends VariantMosquito {
  constructor(scene) {
    super(scene);
    this.type = MOSQUITO_TYPES.BABY;
    this.groupMembers = [];
  }

  startAttack({ spawnPos, targetPos, callbacks }) {
    const angle = Phaser.Math.Angle.Between(spawnPos.x, spawnPos.y, targetPos.x, targetPos.y);
    this.launch(
      spawnPos,
      { x: Math.cos(angle) * this.config.groupMovementSpeed, y: Math.sin(angle) * this.config.groupMovementSpeed },
      0,
      callbacks
    );
  }

  launch(position, velocity, delay, callbacks) {
    this.state = VARIANT_STATES.LAUNCHING;
    this.x = position.x;
    this.y = position.y;
    this.launchVelocity = velocity;
    this.menuTarget = callbacks.menuTarget;
    this.container.setVisible(true);
    this.activationTimer = this.scene.time.delayedCall(delay * 1000, () => {
      if (this.state !== VARIANT_STATES.LAUNCHING) return;
      this.state = VARIANT_STATES.GROUPING;
      this.targetLeg = this.scene.mosquitoManager?.environment.getNearestLeg(this);
      this.callbacks = callbacks;
    });
  }

  update(delta) {
    if (this.state === VARIANT_STATES.LAUNCHING) {
      const seconds = delta / 1000;
      this.x += this.launchVelocity.x * seconds;
      this.y += this.launchVelocity.y * seconds;
      this.container.setPosition(this.x, this.y);
      return;
    }
    if (this.state !== VARIANT_STATES.GROUPING && this.state !== VARIANT_STATES.DISPERSING) return;
    const environment = this.scene.mosquitoManager.environment;
    if (!environment.isValidLeg(this.targetLeg)) this.targetLeg = environment.getNearestLeg(this);
    const target = this.state === VARIANT_STATES.GROUPING
      ? (this.menuTarget || environment.getLegCenter(this.targetLeg))
      : this.attackPosition;
    const speed = this.state === VARIANT_STATES.GROUPING
      ? this.config.groupMovementSpeed
      : this.config.movementSpeed;
    const distance = moveTowards(this, target, speed * delta / 1000);
    if (this.state === VARIANT_STATES.GROUPING &&
      distance <= this.config.dispersionTriggerDistance) {
      this.state = VARIANT_STATES.DISPERSING;
      this.attackPosition = environment.getRandomAttackPosition(this.targetLeg, this.config);
    } else if (this.state === VARIANT_STATES.DISPERSING &&
      distance <= this.config.minimumAttackPositionSpacing) {
      if (this.callbacks.onTargetReached) {
        this.callbacks.onTargetReached(this);
        return;
      }
      this.state = MOSQUITO_STATES.FEEDING;
      this.beginFeeding(this.attackPosition, this.callbacks.onDamage);
      this.callbacks.onBite?.(this);
    }
  }

  kill(source) {
    if (this.activationTimer) this.activationTimer.remove();
    super.kill(source);
  }
}
