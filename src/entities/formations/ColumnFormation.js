import Phaser from 'phaser';
import { MOSQUITO_STATES, MOSQUITO_TYPES } from '../Mosquito.js';

export class ColumnFormation {
  constructor(manager, directionKey, config) {
    this.manager = manager;
    this.config = config;
    this.directionKey = directionKey;
    this.members = [];
    this.releasedMembers = new Set();
    this.active = true;
    this.position = null;
    this.direction = null;
    this.targetLeg = null;
  }

  start() {
    const directionData = this.manager.getDirection(this.directionKey);
    const spawn = this.manager.getFormationSpawnPosition(directionData);
    this.targetLeg = this.manager.getFormationTargetLeg(this.directionKey);
    const target = this.manager.environment.getLegCenter(this.targetLeg);
    const angle = Phaser.Math.Angle.Between(spawn.x, spawn.y, target.x, target.y);
    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
    const count = Phaser.Math.Between(
      this.config.minGroupSize,
      this.config.maxGroupSize
    );

    this.position = { ...spawn };
    this.direction = direction;
    for (let index = 0; index < count; index++) {
      const member = this.manager.getAvailableMosquito(MOSQUITO_TYPES.STANDARD);
      member.formationOwner = this;
      const offset = (index - (count - 1) / 2) * this.config.spacing;
      member.state = MOSQUITO_STATES.DIVING;
      member.resumeFlightAnimation();
      member.x = spawn.x + direction.x * offset;
      member.y = spawn.y + direction.y * offset;
      member.formationOffset = { x: 0, y: offset };
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
    const target = this.manager.environment.getLegCenter(this.targetLeg);
    const formationReachedTarget =
      Phaser.Math.Distance.Between(this.position.x, this.position.y, target.x, target.y) <=
      this.config.arrivalDistance;

    for (const member of this.members) {
      if (!member.isAlive() || this.releasedMembers.has(member)) continue;
      if (member.isElectrocuted()) {
        if (formationReachedTarget) member.pendingFormationRelease = this;
        continue;
      }
      if (member.pendingFormationRelease === this) {
        this.releaseMember(member);
        continue;
      }
      member.x = this.position.x + this.direction.x * member.formationOffset.y;
      member.y = this.position.y + this.direction.y * member.formationOffset.y;
      member.container.setPosition(member.x, member.y)
        .setRotation(Math.atan2(this.direction.y, this.direction.x));
      if (
        Phaser.Math.Distance.Between(member.x, member.y, target.x, target.y) <=
        this.config.arrivalDistance
      ) {
        this.releaseMember(member);
      }
    }

    if (this.members.every(member =>
      !member.isAlive() || this.releasedMembers.has(member)
    )) {
      this.active = false;
      this.manager.formations.delete(this);
    }
  }

  releaseMember(member) {
    if (this.releasedMembers.has(member) || !member.isAlive()) return;
    if (member.isElectrocuted()) {
      member.pendingFormationRelease = this;
      return;
    }
    member.formationOwner = null;
    member.pendingFormationRelease = null;
    this.releasedMembers.add(member);
    if (member.buzzHandle) {
      member.buzzHandle.stop();
      member.buzzHandle = null;
    }
    const target = this.manager.environment.getRandomSkinTarget(this.targetLeg);
    const distance = Phaser.Math.Distance.Between(member.x, member.y, target.x, target.y);
    const curveDirection = member.formationOffset.y < 0 ? -1 : 1;
    member.startCurvedAttack({
      spawnPos: { x: member.x, y: member.y },
      targetPos: target,
      diveDurationMs: Math.max(
        450,
        distance / member.config.movementSpeed * 1000
      ),
      curveDirection,
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
