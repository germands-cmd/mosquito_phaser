import Phaser from 'phaser';
import { MOSQUITO_STATES, MOSQUITO_TYPES } from '../Mosquito.js';

export class CircularFormation {
  constructor(manager, directionKey, config) {
    this.manager = manager;
    this.config = config;
    this.directionKey = directionKey;
    this.members = [];
    this.active = true;
    this.position = null;
    this.direction = null;
    this.released = false;
  }

  start() {
    const directionData = this.manager.getDirection(this.directionKey);
    const spawn = this.manager.getFormationSpawnPosition(directionData);
    const targetLeg = this.manager.getFormationTargetLeg(this.directionKey);
    this.targetLeg = targetLeg;
    const target = this.manager.environment.getLegCenter(targetLeg);
    const angle = Phaser.Math.Angle.Between(spawn.x, spawn.y, target.x, target.y);
    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
    const side = { x: -direction.y, y: direction.x };
    const count = Phaser.Math.RND.pick(this.config.groupSizeOptions);

    this.position = { ...spawn };
    this.direction = direction;
    for (let index = 0; index < count; index++) {
      const circleAngle = (index / count) * Math.PI * 2;
      const offset = {
        x: side.x * Math.cos(circleAngle) * this.config.radius +
          direction.x * Math.sin(circleAngle) * this.config.radius,
        y: side.y * Math.cos(circleAngle) * this.config.radius +
          direction.y * Math.sin(circleAngle) * this.config.radius
      };
      const member = this.manager.getAvailableMosquito(MOSQUITO_TYPES.STANDARD);
      member.formationOwner = this;
      member.state = MOSQUITO_STATES.DIVING;
      member.resumeFlightAnimation();
      member.x = spawn.x + offset.x;
      member.y = spawn.y + offset.y;
      member.formationOffset = offset;
      member.container.setPosition(member.x, member.y)
        .setRotation(angle)
        .setVisible(true);
      member.onDeath = this.manager.getVariantCallbacks(member).onDeath;
      if (this.manager.mode === 'AUDIO') {
        member.buzzHandle = this.manager.audioManager.startMosquitoBuzz(
          directionData,
          1.5
        );
      }
      this.members.push(member);
    }

    this.manager.formations.add(this);
  }

  update(delta) {
    if (!this.active) return;
    const seconds = delta / 1000;
    const movementSpeed = this.manager
      .getEnemyConfig(MOSQUITO_TYPES.STANDARD).movementSpeed;
    this.position.x += this.direction.x * movementSpeed * seconds;
    this.position.y += this.direction.y * movementSpeed * seconds;

    for (const member of this.members) {
      if (!member.isAlive()) continue;
      if (this.released) continue;
      if (member.isElectrocuted()) continue;
      member.x = this.position.x + member.formationOffset.x;
      member.y = this.position.y + member.formationOffset.y;
      member.container.setPosition(member.x, member.y)
        .setRotation(Math.atan2(this.direction.y, this.direction.x));
    }

    const target = this.manager.environment.getLegCenter(
      this.targetLeg
    );
    if (!this.released &&
      Phaser.Math.Distance.Between(this.position.x, this.position.y, target.x, target.y) <=
      this.config.arrivalDistance) {
      this.releaseMembers();
    }
  }

  releaseMembers() {
    if (this.released) return;
    this.released = true;
    this.active = false;

    this.members.forEach(member => this.releaseMember(member));

    this.manager.formations.delete(this);
  }

  releaseMember(member) {
    if (!member.isAlive()) return;
    if (member.isElectrocuted()) {
      member.pendingFormationRelease = this;
      return;
    }
    member.formationOwner = null;
    member.pendingFormationRelease = null;
    if (member.buzzHandle) {
      member.buzzHandle.stop();
      member.buzzHandle = null;
    }
    const target = this.manager.environment.getRandomSkinTarget(this.targetLeg);
    const distance = Phaser.Math.Distance.Between(member.x, member.y, target.x, target.y);
    member.startCurvedAttack({
      spawnPos: { x: member.x, y: member.y },
      targetPos: target,
      diveDurationMs: Math.max(450, distance / member.config.movementSpeed * 1000),
      curveDirection: member.formationOffset.x < 0 ? -1 : 1,
      initialDirection: this.direction,
      manager: this.manager,
      callbacks: this.manager.getVariantCallbacks(member)
    });
  }

  stop() {
    this.active = false;
    for (const member of this.members) {
      member.formationOwner = null;
      member.pendingFormationRelease = null;
      if (member.buzzHandle) {
        member.buzzHandle.stop();
        member.buzzHandle = null;
      }
    }
    this.manager.formations.delete(this);
  }
}
