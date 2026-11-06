import Phaser from 'phaser';
import { MOSQUITO_STATES, MOSQUITO_TYPES } from '../Mosquito.js';

export class OscillatingSwarm {
  constructor(manager, directionKey, config) {
    this.manager = manager;
    this.config = config;
    this.directionKey = directionKey;
    this.members = [];
    this.active = true;
    this.position = null;
    this.direction = null;
    this.targetLeg = null;
  }

  start() {
    const directionData = this.manager.getDirection(this.directionKey);
    const spawn = this.manager.getFormationSpawnPosition(directionData);
    this.targetLeg = this.manager.getFormationTargetLeg(this.directionKey);
    const angle = Phaser.Math.Angle.Between(
      spawn.x,
      spawn.y,
      this.manager.environment.getLegCenter(this.targetLeg).x,
      this.manager.environment.getLegCenter(this.targetLeg).y
    );
    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
    const side = { x: -direction.y, y: direction.x };
    const count = Phaser.Math.RND.pick(this.config.groupSizeOptions);
    const speed = this.manager.getEnemyConfig(MOSQUITO_TYPES.STANDARD).movementSpeed;
    const spawnOffsets = this.getCompactOffsets(count);
    const targets = Array.from({ length: count }, () =>
      this.manager.environment.getRandomSkinTarget(this.targetLeg)
    );
    const averageDistance = targets.reduce(
      (total, target) => total + Phaser.Math.Distance.Between(
        spawn.x,
        spawn.y,
        target.x,
        target.y
      ),
      0
    ) / count;
    const synchronizedDuration = Math.max(
      this.config.minimumTravelDurationMs,
      averageDistance / speed * 1000
    );

    this.position = { ...spawn };
    this.direction = direction;
    for (let index = 0; index < count; index++) {
      const member = this.manager.getAvailableMosquito(MOSQUITO_TYPES.STANDARD);
      member.formationOwner = this;
      const target = targets[index];
      const offset = spawnOffsets[index];
      const speedMultiplier = Phaser.Math.FloatBetween(
        this.config.minSpeedMultiplier,
        this.config.maxSpeedMultiplier
      );
      const distance = Phaser.Math.Distance.Between(
        spawn.x,
        spawn.y,
        target.x,
        target.y
      );
      const baseDuration = distance / (speed * speedMultiplier) * 1000;
      const halfWindow = this.config.arrivalWindowMs / 2;

      member.state = MOSQUITO_STATES.DIVING;
      member.oscillatingSwarmState = {
        elapsed: 0,
        origin: {
          x: spawn.x + side.x * offset.x + direction.x * offset.y,
          y: spawn.y + side.y * offset.x + direction.y * offset.y
        },
        target,
        duration: Phaser.Math.Clamp(
          baseDuration,
          synchronizedDuration - halfWindow,
          synchronizedDuration + halfWindow
        ),
        amplitude: Phaser.Math.FloatBetween(
          this.config.minOscillationAmplitude,
          this.config.maxOscillationAmplitude
        ),
        frequency: Phaser.Math.FloatBetween(
          this.config.minOscillationFrequency,
          this.config.maxOscillationFrequency
        ),
        phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
        direction: Phaser.Math.RND.pick([-1, 1]),
        speedMultiplier
      };
      member.resumeFlightAnimation();
      member.x = member.oscillatingSwarmState.origin.x;
      member.y = member.oscillatingSwarmState.origin.y;
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

  getCompactOffsets(count) {
    const radius = this.config.initialSpacing;
    return Array.from({ length: count }, (_, index) => {
      const angle = index * 2.399963;
      const distance = radius * Math.sqrt(index / Math.max(1, count - 1));
      return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance
      };
    });
  }

  update(delta) {
    if (!this.active) return;
    let remaining = 0;
    for (const member of this.members) {
      if (!member.isAlive()) continue;
      const state = member.oscillatingSwarmState;
      if (!state) continue;
      if (member.isElectrocuted()) {
        remaining++;
        continue;
      }
      state.elapsed += delta;
      const progress = Math.min(1, state.elapsed / state.duration);
      const smoothProgress = progress * progress * (3 - 2 * progress);
      const lateral = {
        x: -this.direction.y,
        y: this.direction.x
      };
      const wave = Math.sin(
        state.elapsed / 1000 * state.frequency * Math.PI * 2 + state.phase
      );
      const amplitude = state.amplitude * (1 - smoothProgress);
      member.x = Phaser.Math.Linear(state.origin.x, state.target.x, smoothProgress) +
        lateral.x * wave * amplitude * state.direction;
      member.y = Phaser.Math.Linear(state.origin.y, state.target.y, smoothProgress) +
        lateral.y * wave * amplitude * state.direction;

      const tangent = this.getTangent(state, smoothProgress, wave, amplitude);
      member.container.setPosition(member.x, member.y)
        .setRotation(Math.atan2(tangent.y, tangent.x));
      if (progress >= 1) {
        this.releaseMember(member);
      } else {
        remaining++;
      }
    }

    if (remaining === 0) {
      this.active = false;
      this.manager.formations.delete(this);
    }
  }

  getTangent(state, progress, wave, amplitude) {
    const forward = {
      x: state.target.x - state.origin.x,
      y: state.target.y - state.origin.y
    };
    const lateral = { x: -this.direction.y, y: this.direction.x };
    return {
      x: forward.x - lateral.x * wave * amplitude,
      y: forward.y - lateral.y * wave * amplitude
    };
  }

  releaseMember(member) {
    const state = member.oscillatingSwarmState;
    if (!state || state.released) return;
    if (member.isElectrocuted()) {
      member.pendingFormationRelease = this;
      return;
    }
    member.formationOwner = null;
    member.pendingFormationRelease = null;
    state.released = true;
    if (member.buzzHandle) {
      member.buzzHandle.stop();
      member.buzzHandle = null;
    }
    member.startCurvedAttack({
      spawnPos: { x: member.x, y: member.y },
      targetPos: state.target,
      diveDurationMs: this.config.finalAttackDurationMs,
      curveDirection: state.direction,
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
      member.oscillatingSwarmState = null;
    }
    this.manager.formations.delete(this);
  }
}
