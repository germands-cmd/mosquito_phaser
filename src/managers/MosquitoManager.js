import Phaser from "phaser";
import { Mosquito, MOSQUITO_STATES } from "../entities/Mosquito.js";
import { DIRECTIONS } from "../audio/AudioManager.js";

export const SPAWN_KEYS = ["LEFT", "TOP_LEFT", "TOP", "TOP_RIGHT", "RIGHT"];

export const GAME_MODES = {
  AUDIO: "AUDIO",
  NO_AUDIO: "NO_AUDIO",
};

export const DIFFICULTY_LEVELS = {
  EASY: { key: "EASY", label: "Easy", minMs: 5400, maxMs: 5800 },
  NORMAL: { key: "NORMAL", label: "Normal", minMs: 3800, maxMs: 4400 },
  HARD: { key: "HARD", label: "Hard", minMs: 2400, maxMs: 3000 },
};

export const DIFFICULTY_KEYS = ["EASY", "NORMAL", "HARD"];

// Aliases for backwards compatibility
export const SPEED_LEVELS = DIFFICULTY_LEVELS;
export const SPEED_KEYS = DIFFICULTY_KEYS;

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
    this.callbacks = callbacks; // onHit, onBite, onWarningStart, onVisualWarning, onWarningEnd

    // Object pool for swarm entities
    this.mosquitoPool = [];
    this.pendingWarningTimers = new Set();
    this.waveTimer = null;
    this.isRunning = false;

    // Swarm wave settings
    this.waveIntervalMs = 3000; // Wave every X seconds
    this.waveSize = 3; // X mosquitoes per wave

    this.mode = GAME_MODES.AUDIO;
    this.difficultyLevel = "NORMAL";
    this.speedLevel = "NORMAL";
    this.lastDirection = null;

    // Pre-populate pool with initial entities
    for (let i = 0; i < 15; i++) {
      this.mosquitoPool.push(new Mosquito(this.scene));
    }
  }

  setMode(mode) {
    this.mode = mode;
  }

  setDifficulty(diffKey) {
    if (DIFFICULTY_LEVELS[diffKey]) {
      this.difficultyLevel = diffKey;
      this.speedLevel = diffKey;
    }
  }

  setSpeed(speedKey) {
    this.setDifficulty(speedKey);
  }

  /**
   * Retrieves an inactive mosquito from the pool or instantiates a new one.
   * @returns {Mosquito}
   */
  getAvailableMosquito() {
    let mosquito = this.mosquitoPool.find(
      (m) =>
        m.state === MOSQUITO_STATES.INACTIVE ||
        m.state === MOSQUITO_STATES.DEAD,
    );
    if (!mosquito) {
      mosquito = new Mosquito(this.scene);
      this.mosquitoPool.push(mosquito);
    }
    return mosquito;
  }

  /**
   * Starts the wave generator: 5 mosquitoes every 2.5 seconds.
   */
  start() {
    this.isRunning = true;

    // Launch first wave immediately
    this.spawnWave(this.waveSize);

    // Continuous recurring wave timer every 2.5s
    if (this.waveTimer) {
      this.waveTimer.remove();
    }
    this.waveTimer = this.scene.time.addEvent({
      delay: this.waveIntervalMs,
      callback: () => {
        if (!this.isRunning) return;
        this.spawnWave(this.waveSize);
      },
      loop: true,
    });
  }

  /**
   * Stops active attacks, wave timer, warning timers, and buzz voices.
   */
  stop() {
    this.isRunning = false;

    if (this.waveTimer) {
      this.waveTimer.remove();
      this.waveTimer = null;
    }

    for (const timer of this.pendingWarningTimers) {
      timer.remove();
    }
    this.pendingWarningTimers.clear();

    for (const m of this.mosquitoPool) {
      m.deactivate();
    }

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

    for (let i = 0; i < count; i++) {
      const randomKey = Phaser.Math.RND.pick(SPAWN_KEYS);
      this.spawnSingleMosquito(randomKey);
    }
  }

  /**
   * Spawns an individual mosquito from a specific direction with warning and dive lifecycle.
   * @param {string} directionKey
   */
  spawnSingleMosquito(directionKey) {
    if (!this.isRunning) return;

    const mosquito = this.getAvailableMosquito();
    const dirData = DIRECTIONS[directionKey] || DIRECTIONS.TOP;
    this.lastDirection = dirData;

    // Warning duration between 1.2s and 1.8s to harmonize with the 2.5s wave interval
    const warningDurationSec = Phaser.Math.FloatBetween(1.2, 1.8);
    const spawnPos = this.getSpawnPosition(dirData);

    mosquito.state = MOSQUITO_STATES.WARNING;
    mosquito.x = spawnPos.x;
    mosquito.y = spawnPos.y;

    if (this.callbacks.onWarningStart) {
      this.callbacks.onWarningStart(dirData, warningDurationSec);
    }

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
   * Triggers a manual single mosquito attack for debug key tests (1-5).
   * @param {string} directionKey
   */
  triggerAttack(directionKey) {
    if (!this.isRunning) return;
    this.spawnSingleMosquito(directionKey);
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
    const diffConfig = DIFFICULTY_LEVELS[this.difficultyLevel] || DIFFICULTY_LEVELS.NORMAL;
    const diveDurationMs = Phaser.Math.Between(
      diffConfig.minMs,
      diffConfig.maxMs,
    );

    mosquito.startDive(spawnPos, targetPos, diveDurationMs, (biteX, biteY) => {
      // Mosquito reached skin without being swatted
      // Note: addBiteMark and playBite are deferred to first damage tick
      // so the visual only appears after actual damage is confirmed.

      if (this.callbacks.onBite) {
        this.callbacks.onBite(biteX, biteY, mosquito);
      }

      // Enter FEEDING state: attaches to leg and deals 1 damage every full second
      mosquito.startFeeding((m, tickCount) => {
        // On the very first tick, show bite mark and play bite sound
        if (tickCount === 1) {
          this.audioManager.playBite();
          this.environment.addBiteMark(biteX, biteY);
        }
        if (this.callbacks.onFeedingDamage) {
          this.callbacks.onFeedingDamage(m, tickCount);
        }
      });
    });
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
    const hitMosquitoes = [];

    for (const m of this.mosquitoPool) {
      if (m.isSwattable()) {
        const dist = Phaser.Math.Distance.Between(swatX, swatY, m.x, m.y);
        if (dist <= hitRadius + m.radius) {
          hitMosquitoes.push(m);
        }
      }
    }

    if (hitMosquitoes.length > 0) {
      for (const m of hitMosquitoes) {
        const hitX = m.x;
        const hitY = m.y;

        m.kill(); // stops its buzz voice and sets state to DEAD

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

  destroy() {
    this.stop();
    for (const m of this.mosquitoPool) {
      m.destroy();
    }
    this.mosquitoPool = [];
  }
}
