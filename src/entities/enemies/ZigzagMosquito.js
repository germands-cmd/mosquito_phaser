import Phaser from 'phaser';
import { MOSQUITO_TYPES } from '../Mosquito.js';
import { VariantMosquito, VARIANT_STATES } from './VariantMosquito.js';

export class ZigzagMosquito extends VariantMosquito {
  constructor(scene) {
    super(scene);
    this.type = MOSQUITO_TYPES.ZIGZAG;
    this.lateralSign = 1;
    this.segmentRemaining = 0;
    this.isReplicationCopy = false;
  }

  configure(config) {
    super.configure(config);
    this.hasReplicated = this.isReplicationCopy;
    return this;
  }

  takeDamage(amount, source) {
    const accepted = super.takeDamage(amount, source);
    if (accepted && !this.isReplicationCopy && !this.hasReplicated && this.health > 0) {
      this.hasReplicated = true;
      const manager = this.scene.mosquitoManager;
      const copy = manager.getAvailableMosquito(MOSQUITO_TYPES.ZIGZAG);
      copy.isReplicationCopy = true;
      copy.startAttack({
        spawnPos: { x: this.x, y: this.y },
        manager,
        callbacks: manager.getVariantCallbacks(copy)
      });
      copy.health = 1;
    }
    return accepted;
  }

  startAttack({ spawnPos, manager, callbacks }) {
    const leg = manager.environment.getNearestLeg(spawnPos);
    this.initAttack(spawnPos, leg, callbacks);
  }

  initAttack(spawn, leg, callbacks) {
    this.callbacks = callbacks;
    this.onDeath = callbacks.onDeath;
    this.targetLeg = leg;
    this.x = spawn.x;
    this.y = spawn.y;
    this.state = VARIANT_STATES.ZIGZAG_MOVING;
    this.container.setVisible(true);
  }

  update(delta) {
    if (this.state === VARIANT_STATES.ZIGZAG_PAUSED) return;
    if (this.state === VARIANT_STATES.ZIGZAG_MOVING) {
      const environment = this.scene.mosquitoManager.environment;
      this.targetLeg = environment.getNearestLeg(this);
      const target = environment.getLegCenter(this.targetLeg);
      const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
      const forward = { x: Math.cos(angle), y: Math.sin(angle) };
      const lateral = { x: -forward.y * this.lateralSign, y: forward.x * this.lateralSign };
      const velocity = {
        x: (forward.x * this.config.forwardProgressFactor + lateral.x * 0.45) * this.config.fastMovementSpeed,
        y: (forward.y * this.config.forwardProgressFactor + lateral.y * 0.45) * this.config.fastMovementSpeed
      };
      this.x += velocity.x * delta / 1000;
      this.y += velocity.y * delta / 1000;
      this.container.setPosition(this.x, this.y).setRotation(Math.atan2(velocity.y, velocity.x));
      this.segmentRemaining -= delta / 1000;
      if (Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y) < 18) {
        this.beginFeeding(target, this.callbacks.onDamage);
        this.callbacks.onBite?.(this);
      } else if (this.segmentRemaining <= 0) {
        this.lateralSign *= -1;
        this.segmentRemaining = this.config.zigzagSegmentDuration;
        this.state = VARIANT_STATES.ZIGZAG_PAUSED;
        this.scene.time.delayedCall(
          Phaser.Math.FloatBetween(this.config.pauseDuration.min, this.config.pauseDuration.max) * 1000,
          () => { if (this.isAlive()) this.state = VARIANT_STATES.ZIGZAG_MOVING; }
        );
      }
    }
  }
}
