import Phaser from 'phaser';
import { Mosquito, MOSQUITO_STATES, MOSQUITO_TYPES } from './Mosquito.js';

export const VARIANT_STATES = {
  LAUNCHING: 'LAUNCHING',
  GROUPING: 'GROUPING',
  DISPERSING: 'DISPERSING',
  NORMAL: 'NORMAL',
  ESCAPING: 'ESCAPING',
  REAPPEARING: 'REAPPEARING',
  SEARCHING: 'SEARCHING',
  PARASITIC: 'PARASITIC',
  ZIGZAG_MOVING: 'ZIGZAG_MOVING',
  ZIGZAG_PAUSED: 'ZIGZAG_PAUSED'
};

function moveTowards(entity, target, distance) {
  const angle = Phaser.Math.Angle.Between(entity.x, entity.y, target.x, target.y);
  entity.x += Math.cos(angle) * distance;
  entity.y += Math.sin(angle) * distance;
  entity.container.setPosition(entity.x, entity.y).setRotation(angle);
  return Phaser.Math.Distance.Between(entity.x, entity.y, target.x, target.y);
}

class VariantMosquito extends Mosquito {
  configure(config) {
    super.configure(config);
    this.config = config;
    return this;
  }

  isVulnerable() {
    return this.isAlive() && this.state !== VARIANT_STATES.PARASITIC &&
      this.state !== VARIANT_STATES.REAPPEARING;
  }

  isSwattable() {
    return this.isVulnerable() || this.state === VARIANT_STATES.PARASITIC;
  }

  beginFeeding(target, onDamage) {
    this.targetPosition = { ...target };
    this.container.setPosition(this.x, this.y);
    this.startFeeding(onDamage);
  }

  deactivate() {
    this.activationTimer?.remove();
    this.reappearanceTimer?.remove();
    this.activationTimer = null;
    this.reappearanceTimer = null;
    super.deactivate();
  }
}

export class IncubatorMosquito extends VariantMosquito {
  constructor(scene) {
    super(scene);
    this.type = MOSQUITO_TYPES.INCUBATOR;
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
          callbacks.onReach(this);
          this.beginFeeding(target, callbacks.onDamage);
        }
      }
    });
  }
}

export class BabyMosquito extends VariantMosquito {
  constructor(scene) {
    super(scene);
    this.type = MOSQUITO_TYPES.BABY;
    this.groupMembers = [];
  }

  launch(position, velocity, delay, callbacks) {
    this.state = VARIANT_STATES.LAUNCHING;
    this.x = position.x;
    this.y = position.y;
    this.launchVelocity = velocity;
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
      ? environment.getLegCenter(this.targetLeg)
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

export class CowardMosquito extends VariantMosquito {
  constructor(scene) {
    super(scene);
    this.type = MOSQUITO_TYPES.COWARD;
    this.approachPath = [];
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
      const angle = Phaser.Math.Angle.Between(this.attackTarget.x, this.attackTarget.y, this.x, this.y);
      this.escapeTarget = {
        x: this.x + Math.cos(angle) * this.config.escapeDistance,
        y: this.y + Math.sin(angle) * this.config.escapeDistance
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

export class ParasiteMosquito extends VariantMosquito {
  constructor(scene) {
    super(scene);
    this.type = MOSQUITO_TYPES.PARASITE;
    this.host = null;
  }

  initAttack(spawn, callbacks) {
    this.callbacks = callbacks;
    this.onDeath = callbacks.onDeath;
    this.x = spawn.x;
    this.y = spawn.y;
    this.state = VARIANT_STATES.SEARCHING;
    this.container.setVisible(true);
  }

  findHost() {
    const candidates = this.scene.mosquitoManager.mosquitoPool.filter(
      m => m !== this && m.isAlive() && m.type !== MOSQUITO_TYPES.PARASITE &&
        m.type !== MOSQUITO_TYPES.BABY
    );
    return candidates
      .filter(m => Phaser.Math.Distance.Between(this.x, this.y, m.x, m.y) <= this.config.hostDetectionRange)
      .sort((a, b) => Phaser.Math.Distance.Between(this.x, this.y, a.x, a.y) -
        Phaser.Math.Distance.Between(this.x, this.y, b.x, b.y))[0] || null;
  }

  update(delta) {
    if (this.state === MOSQUITO_STATES.FEEDING && this.host && !this.host.isAlive()) {
      this.stopFeeding();
      this.host = null;
      this.targetLeg = this.scene.mosquitoManager.environment.getNearestLeg(this);
      this.state = VARIANT_STATES.BITING;
    }
    if (this.state === VARIANT_STATES.SEARCHING) {
      if (!this.host) this.host = this.findHost();
      if (!this.host) {
        this.targetLeg = this.scene.mosquitoManager.environment.getNearestLeg(this);
        this.state = VARIANT_STATES.BITING;
        return;
      }
      const distance = moveTowards(this, this.host, this.config.searchMovementSpeed * delta / 1000);
      if (distance <= this.config.attachmentRange) {
        this.state = VARIANT_STATES.PARASITIC;
        this.container.setPosition(this.host.x + this.config.attachmentPositionOffset.x,
          this.host.y + this.config.attachmentPositionOffset.y);
      }
    } else if (this.state === VARIANT_STATES.PARASITIC) {
      if (!this.host?.isAlive()) {
        this.host = null;
        this.state = VARIANT_STATES.SEARCHING;
        return;
      }
      this.x = this.host.x + this.config.attachmentPositionOffset.x;
      this.y = this.host.y + this.config.attachmentPositionOffset.y;
      this.container.setPosition(this.x, this.y).setRotation(this.host.container.rotation);
      if (this.host.state === MOSQUITO_STATES.FEEDING) {
        this.targetLeg = this.scene.mosquitoManager.environment.getOppositeLeg(this.host.targetLeg);
        this.host = null;
        this.state = VARIANT_STATES.BITING;
      }
    } else if (this.state === VARIANT_STATES.BITING) {
      if (!this.scene.mosquitoManager.environment.isValidLeg(this.targetLeg)) {
        this.targetLeg = this.scene.mosquitoManager.environment.getNearestLeg(this);
      }
      const target = this.scene.mosquitoManager.environment.getLegCenter(
        this.targetLeg
      );
      if (moveTowards(this, target, this.config.movementSpeed * delta / 1000) < 18) {
        this.beginFeeding(target, this.callbacks.onDamage);
        this.callbacks.onBite?.(this);
      }
    }
  }

  takeDamage(amount, source) {
    if (this.state === VARIANT_STATES.PARASITIC) {
      this.host = null;
      this.state = VARIANT_STATES.SEARCHING;
      return true;
    }
    return super.takeDamage(amount, source);
  }
}

export class ZigzagMosquito extends VariantMosquito {
  constructor(scene) {
    super(scene);
    this.type = MOSQUITO_TYPES.ZIGZAG;
    this.lateralSign = 1;
    this.segmentRemaining = 0;
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
