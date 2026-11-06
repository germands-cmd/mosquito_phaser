import Phaser from "phaser";
import { Mosquito, MOSQUITO_STATES, MOSQUITO_TYPES } from "../entities/Mosquito.js";
import { getEnemyConfig, FORMATION_CONFIGS } from "../entities/enemyConfigs.js";
import { VFormation } from "../entities/formations/VFormation.js";
import { ColumnFormation } from "../entities/formations/ColumnFormation.js";
import { CircularFormation } from "../entities/formations/CircularFormation.js";
import { OscillatingSwarm } from "../entities/formations/OscillatingSwarm.js";
import {
  IncubatorMosquito,
  BabyMosquito,
  CowardMosquito,
  DrunkMosquito,
  HematophageMosquito,
  ZigzagMosquito
} from "../entities/EnemyVariants.js";
import { spawnBabies } from "../entities/enemies/VariantMosquito.js";
import { DIRECTIONS } from "../audio/AudioManager.js";
import { selectWeighted } from "../progression/WeightedSelection.js";
import { FORMATIONS } from "../progression/PhaseConfig.js";

export const SPAWN_KEYS = ["LEFT", "TOP_LEFT", "TOP", "TOP_RIGHT", "RIGHT"];

export const GAME_MODES = {
  AUDIO: "AUDIO",
  NO_AUDIO: "NO_AUDIO",
};

/**
 * MosquitoManager.js
 * Controls swarm attack lifecycles, wave generation (5 mosquitoes every 2.5s),
 * side-targeted leg diving (left side attacks left leg, right side attacks right leg),
 * multi-voice spatial audio synchronization, multi-target swatting, and object pooling.
 */
export class MosquitoManager {
  /**
   * @param {Phaser.Scene} scene
   * @param {import('../audio/AudioManager.js').AudioManager} audioManager
   * @param {import('../entities/Environment.js').Environment} environment
   * @param {Object} callbacks
   */
  constructor(scene, audioManager, environment, callbacks = {}) {
    this.scene = scene;
    this.audioManager = audioManager;
    this.environment = environment;
    this.scene.mosquitoManager = this;
    this.callbacks = callbacks;

    // Object pool for swarm entities
    this.mosquitoPool = [];
    this.pendingWarningTimers = new Set();
    this.waveTimer = null;
    this.phaseTimer = null;
    this.phaseTimerStartedAt = null;
    this.phaseTimeRemaining = null;
    this.phaseTimerPaused = false;
    this.hordeSchedules = [];
    this.hordePaused = false;
    this.phaseConfig = null;
    this.phaseExpired = false;
    this.phaseCompleted = false;
    this.activeEnemies = new Set();
    this.isRunning = false;

    // Swarm wave settings
    this.waveIntervalMs = 3000;
    this.waveSize = 3;

    this.mode = GAME_MODES.AUDIO;
    this.lastDirection = null;
    this.formations = new Set();
    this.nextTopFormationLeg = 'left';

    // Pre-populate pool with initial entities
    for (let i = 0; i < 15; i++) {
      this.mosquitoPool.push(this.createEnemy(MOSQUITO_TYPES.STANDARD));
    }

  }

  getEnemyConfig(type) {
    return getEnemyConfig(type);
  }

  getFormationSpawnPosition(dirData) {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const margin = 140;
    switch (dirData.name) {
      case "LEFT":
        return { x: -margin, y: Phaser.Math.Between(150, height - 150) };
      case "TOP_LEFT":
        return { x: -margin, y: -margin };
      case "TOP":
        return { x: Phaser.Math.Between(200, width - 200), y: -margin };
      case "TOP_RIGHT":
        return { x: width + margin, y: -margin };
      case "RIGHT":
        return { x: width + margin, y: Phaser.Math.Between(150, height - 150) };
      default:
        return { x: width / 2, y: -margin };
    }
  }

  getDirection(directionKey) {
    return DIRECTIONS[directionKey] || DIRECTIONS.TOP;
  }

  getFormationTargetLeg(directionKey) {
    if (directionKey === 'LEFT' || directionKey === 'TOP_LEFT') {
      return 'left';
    }
    if (directionKey === 'RIGHT' || directionKey === 'TOP_RIGHT') {
      return 'right';
    }
    const targetLeg = this.nextTopFormationLeg;
    this.nextTopFormationLeg = targetLeg === 'left' ? 'right' : 'left';
    return targetLeg;
  }

  spawnVFormation(directionKey = "TOP") {
    if (!this.isRunning) return;
    new VFormation(this, directionKey, FORMATION_CONFIGS.V).start();
  }

  spawnColumnFormation(directionKey = "TOP") {
    if (!this.isRunning) return;
    new ColumnFormation(this, directionKey, FORMATION_CONFIGS.COLUMN).start();
  }

  spawnCircularFormation(directionKey = "TOP") {
    if (!this.isRunning) return;
    new CircularFormation(this, directionKey, FORMATION_CONFIGS.CIRCULAR).start();
  }

  spawnOscillatingSwarm(directionKey = "TOP") {
    if (!this.isRunning) return;
    new OscillatingSwarm(
      this,
      directionKey,
      FORMATION_CONFIGS.OSCILLATING_SWARM
    ).start();
  }

  createEnemy(type) {
    const constructors = {
      [MOSQUITO_TYPES.STANDARD]: Mosquito,
      [MOSQUITO_TYPES.INCUBATOR]: IncubatorMosquito,
      [MOSQUITO_TYPES.BABY]: BabyMosquito,
      [MOSQUITO_TYPES.COWARD]: CowardMosquito,
      [MOSQUITO_TYPES.DRUNK]: DrunkMosquito,
      [MOSQUITO_TYPES.HEMATOPHAGE]: HematophageMosquito,
      [MOSQUITO_TYPES.ZIGZAG]: ZigzagMosquito
    };
    const enemy = new (constructors[type] || Mosquito)(this.scene);
    enemy.configure(getEnemyConfig(type));
    return enemy;
  }

  setMode(mode) {
    this.mode = mode;
  }

  /**
   * Retrieves an inactive mosquito from the pool or instantiates a new one.
   * @returns {Mosquito}
   */
  getAvailableMosquito(type = MOSQUITO_TYPES.STANDARD) {
    let mosquito = this.mosquitoPool.find(
      (m) =>
        m.type === type &&
        (m.state === MOSQUITO_STATES.INACTIVE ||
          m.state === MOSQUITO_STATES.DEAD),
    );
    if (!mosquito) {
      mosquito = this.createEnemy(type);
      this.mosquitoPool.push(mosquito);
    }
    mosquito.configure(getEnemyConfig(type));
    return mosquito;
  }

  /**
   * Starts the wave generator: 5 mosquitoes every 2.5 seconds.
   */
  start(phaseConfig = null) {
    this.stopSpawning();
    this.phaseConfig = phaseConfig;
    this.phaseExpired = false;
    this.phaseCompleted = false;
    this.phaseTimerStartedAt = null;
    this.phaseTimeRemaining = null;
    this.phaseTimerPaused = false;
    this.hordeSchedules = [];
    this.hordePaused = false;
    this.isRunning = true;

    const config = phaseConfig || {
      initialSpawnDelayMs: 0,
      durationMs: Number.POSITIVE_INFINITY,
      normalSpawn: { intervalMs: this.waveIntervalMs, mosquitoesPerWave: this.waveSize },
      hordes: [],
    };
    this.waveIntervalMs = config.normalSpawn.intervalMs;
    this.waveSize = config.normalSpawn.mosquitoesPerWave;

    const initialDelay = Math.max(0, config.initialSpawnDelayMs || 0);
    this.scene.time.delayedCall(initialDelay, () => {
      if (!this.isRunning || this.phaseExpired) return;
      this.startPhaseSpawning(config);
    });
  }

  startPhaseSpawning(config) {
    this.spawnWave(this.waveSize);
    this.waveTimer = this.scene.time.addEvent({
      delay: this.waveIntervalMs,
      callback: () => {
        if (this.isRunning && !this.phaseExpired) this.spawnWave(this.waveSize);
      },
      loop: true
    });
    if (Number.isFinite(config.durationMs)) {
      this.phaseTimeRemaining = config.durationMs;
      this.resumePhaseTimer();
    }
    this.hordeSchedules = config.hordes.map((horde) => {
      const schedule = {
        horde,
        remainingMs: horde.triggerTimeMs,
        timer: null,
        startedAt: null,
        triggered: false,
        preparationTimer: null,
        durationTimer: null,
      };
      this.scheduleHorde(schedule);
      return schedule;
    });
  }

  scheduleHorde(schedule) {
    schedule.startedAt = this.scene.time.now;
    schedule.timer = this.scene.time.delayedCall(
      schedule.remainingMs,
      () => {
        schedule.timer = null;
        schedule.startedAt = null;
        schedule.remainingMs = 0;
        this.startHorde(schedule);
      }
    );
  }

  startHorde(schedule) {
    if (!this.isRunning || this.phaseExpired) return;
    schedule.triggered = true;
    this.pausePhaseTimer();
    this.pauseHordeTimers();
    this.stopNormalSpawning();
    schedule.preparationTimer = this.scene.time.delayedCall(
      schedule.horde.preparationDurationMs,
      () => {
        schedule.preparationTimer = null;
        if (!this.isRunning || this.phaseExpired) return;
        this.waveTimer = this.scene.time.addEvent({
          delay: schedule.horde.intervalMs,
          callback: () => {
            if (this.isRunning && !this.phaseExpired) {
              this.spawnWave(schedule.horde.mosquitoesPerWave);
            }
          },
          loop: true
        });
        schedule.durationTimer = this.scene.time.delayedCall(schedule.horde.durationMs, () => {
          schedule.durationTimer = null;
          if (this.waveTimer) {
            this.waveTimer.remove();
            this.waveTimer = null;
          }
          if (!this.phaseExpired && this.isRunning) {
            this.waveTimer = this.scene.time.addEvent({
              delay: this.waveIntervalMs,
              callback: () => {
                if (this.isRunning && !this.phaseExpired) this.spawnWave(this.waveSize);
              },
              loop: true
            });
            this.resumeHordeTimers();
            this.resumePhaseTimer();
          }
        });
      }
    );
  }

  pauseHordeTimers() {
    if (this.hordePaused) return;
    this.hordePaused = true;
    for (const schedule of this.hordeSchedules) {
      if (schedule.triggered || !schedule.timer) continue;
      schedule.remainingMs = Math.max(
        0,
        schedule.remainingMs - (this.scene.time.now - schedule.startedAt)
      );
      schedule.timer.remove();
      schedule.timer = null;
      schedule.startedAt = null;
    }
  }

  resumeHordeTimers() {
    if (!this.hordePaused) return;
    this.hordePaused = false;
    for (const schedule of this.hordeSchedules) {
      if (schedule.triggered || schedule.timer) continue;
      this.scheduleHorde(schedule);
    }
  }

  stopNormalSpawning() {
    if (this.waveTimer) {
      this.waveTimer.remove();
      this.waveTimer = null;
    }
  }

  expirePhase() {
    if (this.phaseExpired) return;
    this.phaseExpired = true;
    this.stopSpawning();
    this.callbacks.onPhaseExpired?.();
    this.checkPhaseCompletion();
  }

  stopSpawning() {
    this.stopNormalSpawning();
    if (this.phaseTimer) {
      this.phaseTimer.remove();
      this.phaseTimer = null;
    }
    this.phaseTimerStartedAt = null;
    this.phaseTimerPaused = false;
    for (const schedule of this.hordeSchedules) {
      schedule.timer?.remove();
      schedule.preparationTimer?.remove();
      schedule.durationTimer?.remove();
    }
    this.hordeSchedules = [];
    this.hordePaused = false;
  }

  pausePhaseTimer() {
    if (!this.phaseTimer || this.phaseTimerPaused) return;
    this.phaseTimeRemaining = Math.max(
      0,
      this.phaseTimeRemaining - (this.scene.time.now - this.phaseTimerStartedAt)
    );
    this.phaseTimer.remove();
    this.phaseTimer = null;
    this.phaseTimerStartedAt = null;
    this.phaseTimerPaused = true;
  }

  resumePhaseTimer() {
    if (
      !Number.isFinite(this.phaseTimeRemaining) ||
      this.phaseExpired ||
      !this.isRunning
    ) {
      return;
    }
    if (this.phaseTimeRemaining <= 0) {
      this.expirePhase();
      return;
    }
    this.phaseTimerPaused = false;
    this.phaseTimerStartedAt = this.scene.time.now;
    this.phaseTimer = this.scene.time.delayedCall(
      this.phaseTimeRemaining,
      () => {
        this.phaseTimer = null;
        this.phaseTimerStartedAt = null;
        this.phaseTimeRemaining = 0;
        this.expirePhase();
      }
    );
  }

  checkPhaseCompletion() {
    if (!this.phaseExpired || this.phaseCompleted) return;
    if (this.activeEnemies.size === 0 && this.getActiveCount() === 0) {
      this.phaseCompleted = true;
      this.callbacks.onPhaseComplete?.();
    }
  }

  /**
   * Stops active attacks, wave timer, warning timers, and buzz voices.
   */
  stop() {
    this.isRunning = false;
    this.stopSpawning();

    for (const timer of this.pendingWarningTimers) {
      timer.remove();
    }
    this.pendingWarningTimers.clear();

    for (const m of this.mosquitoPool) {
      m.deactivate();
    }
    for (const formation of this.formations) {
      formation.stop();
    }
    this.formations.clear();
    this.activeEnemies.clear();

    this.audioManager.stopAllMosquitoBuzzes();

    if (this.callbacks.onWarningEnd) {
      this.callbacks.onWarningEnd();
    }
  }

  /**
   * Spawns a simultaneous wave of mosquitoes.
   * @param {number} count - Number of mosquitoes in this wave (default 5)
   */
  spawnWave(count = 5) {
    if (!this.isRunning) return;

    const firstType = this.selectWaveType();
    const formation = firstType === MOSQUITO_TYPES.STANDARD && this.phaseConfig &&
      selectWeighted(this.phaseConfig.formationWeights);
    if (formation && formation !== "individual" && count > 0) {
      const directionKey = Phaser.Math.RND.pick(SPAWN_KEYS);
      const formationSpawners = {
        [FORMATIONS.V]: () => this.spawnVFormation(directionKey),
        [FORMATIONS.COLUMN]: () => this.spawnColumnFormation(directionKey),
        [FORMATIONS.CIRCULAR]: () => this.spawnCircularFormation(directionKey),
        [FORMATIONS.OSCILLATING_SWARM]: () => this.spawnOscillatingSwarm(directionKey)
      };
      formationSpawners[formation]?.();
      return;
    }

    for (let i = 0; i < count; i++) {
      const randomKey = Phaser.Math.RND.pick(SPAWN_KEYS);
      this.spawnSingleMosquito(
        randomKey,
        i === 0 ? firstType : this.selectWaveType()
      );
    }
  }

  selectWaveType() {
    if (!this.phaseConfig) return MOSQUITO_TYPES.STANDARD;
    const selected = selectWeighted(this.phaseConfig?.enemyWeights);
    if (!selected) {
      console.error("No valid enemy weights configured; skipping spawn.");
      return null;
    }
    return selected;
  }

  /**
   * Spawns an individual mosquito from a specific direction with warning and dive lifecycle.
   * @param {string} directionKey
   */
  spawnSingleMosquito(directionKey, type = MOSQUITO_TYPES.STANDARD) {
    if (!this.isRunning || !type) return;

    const mosquito = this.getAvailableMosquito(type);
    const dirData = DIRECTIONS[directionKey] || DIRECTIONS.TOP;
    this.lastDirection = dirData;

    // Warning duration between 1.2s and 1.8s to harmonize with the 2.5s wave interval
    const warningDurationSec = Phaser.Math.FloatBetween(1.2, 1.8);
    const spawnPos = this.getSpawnPosition(dirData);

    mosquito.state = MOSQUITO_STATES.WARNING;
    this.activeEnemies.add(mosquito);
    mosquito.x = spawnPos.x;
    mosquito.y = spawnPos.y;

    // Audio vs No-Audio logic:
    if (this.mode === GAME_MODES.AUDIO) {
      // Individual spatial buzz voice with radically reduced volume
      mosquito.buzzHandle = this.audioManager.startMosquitoBuzz(
        dirData,
        warningDurationSec,
      );
    } else {
      if (this.callbacks.onVisualWarning) {
        this.callbacks.onVisualWarning(
          dirData,
          spawnPos,
          warningDurationSec,
          mosquito,
        );
      }
    }

    // Schedule dive when warning completes
    const warningTimer = this.scene.time.delayedCall(
      warningDurationSec * 1000,
      () => {
        this.pendingWarningTimers.delete(warningTimer);
        if (!this.isRunning || mosquito.state !== MOSQUITO_STATES.WARNING)
          return;
        this.executeDive(mosquito, dirData, spawnPos);
      },
    );
    this.pendingWarningTimers.add(warningTimer);
  }

  /**
   * Calculates spawn coordinates on the screen perimeter according to direction.
   * Mosquitoes NEVER spawn from bottom edge.
   * @param {Object} dirData
   * @returns {{x: number, y: number}}
   */
  getSpawnPosition(dirData) {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    switch (dirData.name) {
      case "LEFT":
        return { x: -25, y: Phaser.Math.Between(150, 580) };
      case "TOP_LEFT":
        return { x: -20, y: Phaser.Math.Between(-20, 80) };
      case "TOP":
        return { x: Phaser.Math.Between(200, width - 200), y: -25 };
      case "TOP_RIGHT":
        return { x: width + 20, y: Phaser.Math.Between(-20, 80) };
      case "RIGHT":
        return { x: width + 25, y: Phaser.Math.Between(150, 580) };
      default:
        return { x: width / 2, y: -25 };
    }
  }

  /**
   * Launches the dive of a mosquito towards an exposed skin target on the legs.
   * Targets the leg on the same side of the screen as the mosquito's spawn point.
   * @param {Mosquito} mosquito
   * @param {Object} dirData
   * @param {{x: number, y: number}} spawnPos
   */
  executeDive(mosquito, dirData, spawnPos) {
    if (!this.isRunning) return;

    // Target the leg matching the spawn side of the screen
    // Left side (spawnPos.x < width / 2) -> Left leg (isRightLeg = false)
    // Right side (spawnPos.x >= width / 2) -> Right leg (isRightLeg = true)
    const isRightLeg = spawnPos.x >= this.scene.scale.width / 2;
    const targetPos = this.environment.getRandomSkinTarget(isRightLeg);

    // Scale dive duration based on selected speed level
    const distance = Phaser.Math.Distance.Between(
      spawnPos.x,
      spawnPos.y,
      targetPos.x,
      targetPos.y
    );
    const diveDurationMs = Math.max(450, distance / mosquito.config.movementSpeed * 1000);

    mosquito.startAttack({
      spawnPos,
      targetPos,
      diveDurationMs,
      manager: this,
      callbacks: this.getVariantCallbacks(mosquito)
    });
  }

  getVariantCallbacks(mosquito, options = {}) {
    return {
      duration: Phaser.Math.Between(400, 900),
      onReach: (m = mosquito) => this.callbacks.onBite?.(m.x, m.y, m),
      onBite: (m = mosquito) => this.callbacks.onBite?.(m.x, m.y, m),
      onDamage: (m, tickCount) => {
        if (tickCount === 1) {
          this.audioManager.playBite();
          const biteX = m.targetPosition ? m.targetPosition.x : m.x;
          const biteY = m.targetPosition ? m.targetPosition.y : m.y;
          this.environment.addBiteMark(biteX, biteY);
        }
        if (this.callbacks.onFeedingDamage) {
          this.callbacks.onFeedingDamage(m, tickCount, m.attackDamagePerSecond);
        }
      },
      onDeath: (m, source) => {
        this.handleEnemyDeath(m, source);
        options.onDeath?.(m, source);
        if (this.menuMode) this.menuOnDeath?.(m, source);
      },
      menuTarget: options.menuTarget ||
        (this.menuMode ? this.menuTargetFactory?.() : undefined),
      onTargetReached: options.onTargetReached ||
        (this.menuMode ? this.menuOnTargetReached : undefined)
    };
  }

  handleEnemyDeath(enemy, source) {
    this.activeEnemies.delete(enemy);
    this.callbacks.onEnemyEliminated?.(enemy, source);
    if (enemy.type !== MOSQUITO_TYPES.BABY) {
      const activeHematophages = this.mosquitoPool.filter(
        mosquito =>
          mosquito.isAlive() &&
          mosquito.type === MOSQUITO_TYPES.HEMATOPHAGE
      );
      for (const hematophage of activeHematophages) {
        spawnBabies(
          this,
          hematophage,
          Phaser.Math.FloatBetween(0, Math.PI * 2),
          hematophage.config
        );
      }
    }
    if (typeof enemy.onKilled === 'function') {
      enemy.onKilled(this, source);
    }
  }

  /**
   * Returns list of swattable mosquitoes within hit radius that are not shielded.
   * @param {number} swatX
   * @param {number} swatY
   * @param {number} hitRadius
   * @returns {Mosquito[]}
   */
  getSwattableHits(swatX, swatY, hitRadius) {
    const hitMosquitoes = [];
    for (const m of this.mosquitoPool) {
      if (m.isSwattable()) {
        const dist = Phaser.Math.Distance.Between(swatX, swatY, m.x, m.y);
        if (dist <= hitRadius + m.radius) {
          hitMosquitoes.push(m);
        }
      }
    }
    return hitMosquitoes;
  }

  /**
   * Attempt to swat mosquitoes within hit radius.
   * Multi-swat support: hits all mosquitoes inside the impact circle in a single slam!
   * @param {number} swatX
   * @param {number} swatY
   * @param {number} hitRadius
   * @returns {boolean} True if at least one mosquito was hit
   */
  trySwat(swatX, swatY, hitRadius) {
    const hitMosquitoes = this.getSwattableHits(swatX, swatY, hitRadius);

    if (hitMosquitoes.length > 0) {
      for (const m of hitMosquitoes) {
        const hitX = m.x;
        const hitY = m.y;

        m.takeDamage(1, 'swat');

        if (this.callbacks.onHit) {
          this.callbacks.onHit(hitX, hitY);
        }
      }

      this.audioManager.playSwatHit();
      return true;
    }

    return false;
  }

  /**
   * Returns the count of active mosquitoes currently in WARNING, DIVING, or FEEDING state.
   * @returns {number}
   */
  getActiveCount() {
    return this.mosquitoPool.filter(
      (m) =>
        m.state === MOSQUITO_STATES.WARNING ||
        m.state === MOSQUITO_STATES.DIVING ||
        m.state === MOSQUITO_STATES.FEEDING,
    ).length;
  }

  update(time, delta) {
    for (const formation of [...this.formations]) {
      formation.update(delta);
    }
    for (const enemy of this.mosquitoPool) {
      if (enemy.isAlive() && !enemy.isElectrocuted() &&
        typeof enemy.update === 'function') enemy.update(delta);
    }
    for (const enemy of this.mosquitoPool) {
      if (enemy.isAlive()) this.activeEnemies.add(enemy);
      else this.activeEnemies.delete(enemy);
    }
    this.checkPhaseCompletion();
  }

  destroy() {
    this.stop();
    for (const m of this.mosquitoPool) {
      m.destroy();
    }
    this.mosquitoPool = [];
  }
}
