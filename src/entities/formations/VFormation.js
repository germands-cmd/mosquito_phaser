import Phaser from 'phaser';
import { MOSQUITO_STATES, MOSQUITO_TYPES } from '../Mosquito.js';

export class VFormation {
  constructor(manager, directionKey, config) {
    this.manager = manager;
    this.config = config;
    this.directionKey = directionKey;
    this.members = [];
    this.active = true;
    this.targetLeg = null;
    this.position = null;
    this.direction = null;
    this.releasedMembers = new Set();
  }

  start() {
    const directionData = this.manager.getDirection(this.directionKey);
    const spawn = this.manager.getFormationSpawnPosition(directionData);
    const targetLeg = this.manager.getFormationTargetLeg(this.directionKey);
    const target = this.manager.environment.getLegCenter(targetLeg);
    const travelAngle = Phaser.Math.Angle.Between(spawn.x, spawn.y, target.x, target.y);
    const side = { x: -Math.sin(travelAngle), y: Math.cos(travelAngle) };
    const count = Phaser.Math.RND.pick(this.config.groupSizeOptions);
    const offsets = this.getOffsets(count);

    this.position = { ...spawn };
    this.direction = { x: Math.cos(travelAngle), y: Math.sin(travelAngle) };
    this.targetLeg = targetLeg;

    for (const offset of offsets) {
      const member = this.manager.getAvailableMosquito(MOSQUITO_TYPES.STANDARD);
      member.state = MOSQUITO_STATES.DIVING;
      member.resumeFlightAnimation();
      member.x = spawn.x + side.x * offset.x + this.direction.x * offset.y;
      member.y = spawn.y + side.y * offset.x + this.direction.y * offset.y;
      member.formationOffset = {
        x: side.x * offset.x + this.direction.x * offset.y,
        y: side.y * offset.x + this.direction.y * offset.y
      };
      member.container.setPosition(member.x, member.y).setVisible(true);
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

  getOffsets(count) {
    const offsets = [{ x: 0, y: 0 }];
    for (let i = 1; i < count; i++) {
      const rank = Math.ceil(i / 2);
      offsets.push({
        x: (i % 2 === 1 ? -1 : 1) * rank * this.config.spacing,
        y: rank * this.config.spacing
      });
    }
    return offsets;
  }

  update(delta) {
    if (!this.active) return;
    const seconds = delta / 1000;
    const movementSpeed = this.manager.getEnemyConfig(MOSQUITO_TYPES.STANDARD).movementSpeed;
    this.position.x += this.direction.x * movementSpeed * seconds;
    this.position.y += this.direction.y * movementSpeed * seconds;

    const target = this.manager.environment.getLegCenter(this.targetLeg);
    for (const member of this.members) {
      if (!member.isAlive()) continue;
      if (this.releasedMembers.has(member)) continue;
      member.x = this.position.x + member.formationOffset.x;
      member.y = this.position.y + member.formationOffset.y;
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
    this.releasedMembers.add(member);
    if (member.buzzHandle) {
      member.buzzHandle.stop();
      member.buzzHandle = null;
    }
    const attackTarget = this.manager.environment.getRandomSkinTarget(this.targetLeg);
    const distance = Phaser.Math.Distance.Between(
      member.x,
      member.y,
      attackTarget.x,
      attackTarget.y
    );
    const curveDirection = member.formationOffset.x < 0 ? -1 : 1;
    member.startCurvedAttack({
      spawnPos: { x: member.x, y: member.y },
      targetPos: attackTarget,
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
      if (member.buzzHandle) {
        member.buzzHandle.stop();
        member.buzzHandle = null;
      }
    }
    this.manager.formations.delete(this);
  }
}
