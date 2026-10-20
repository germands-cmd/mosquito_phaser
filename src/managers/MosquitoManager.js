import Phaser from 'phaser';
import { Mosquito, MOSQUITO_STATES } from '../entities/Mosquito.js';
import { DIRECTIONS } from '../audio/AudioManager.js';

export const SPAWN_KEYS = ['LEFT', 'TOP_LEFT', 'TOP', 'TOP_RIGHT', 'RIGHT'];

export const GAME_MODES = {
  AUDIO: 'AUDIO',
  NO_AUDIO: 'NO_AUDIO'
};

export const SPEED_LEVELS = {
  VERY_SLOW: { key: 'VERY_SLOW', label: 'Very Slow', minMs: 1400, maxMs: 1800 },
  SLOW: { key: 'SLOW', label: 'Slow', minMs: 1000, maxMs: 1300 },
  NORMAL: { key: 'NORMAL', label: 'Normal', minMs: 750, maxMs: 1000 },
  FAST: { key: 'FAST', label: 'Fast', minMs: 480, maxMs: 800 }, // Baseline
  SUPER_FAST: { key: 'SUPER_FAST', label: 'Super Fast', minMs: 280, maxMs: 420 }
};

export const SPEED_KEYS = ['VERY_SLOW', 'SLOW', 'NORMAL', 'FAST', 'SUPER_FAST'];

/**
 * MosquitoManager.js
 * Controls attack lifecycles, directional audio synchronization,
 * visual assistance indicators (No-Audio mode), speed scaling, and hit interception.
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

    this.mosquito = new Mosquito(this.scene);
    this.warningTimer = null;
    this.cooldownTimer = null;
    this.isRunning = false;

    this.mode = GAME_MODES.AUDIO;
    this.speedLevel = 'FAST';

    this.currentDirection = null;
  }

  setMode(mode) {
    this.mode = mode;
  }

  setSpeed(speedKey) {
    if (SPEED_LEVELS[speedKey]) {
      this.speedLevel = speedKey;
    }
  }

  /**
   * Starts the automatic mosquito attack scheduler.
   */
  start() {
    this.isRunning = true;
    this.scheduleNextAttack(1000);
  }

  /**
   * Stops active attacks and timers.
   */
  stop() {
    this.isRunning = false;
    if (this.warningTimer) {
      this.warningTimer.remove();
      this.warningTimer = null;
    }
    if (this.cooldownTimer) {
      this.cooldownTimer.remove();
      this.cooldownTimer = null;
    }
    this.audioManager.stopMosquitoBuzz();
    this.mosquito.deactivate();

    if (this.callbacks.onWarningEnd) {
      this.callbacks.onWarningEnd();
    }
  }

  /**
   * Schedules next attack after a delay.
   * @param {number} delayMs
   */
  scheduleNextAttack(delayMs = 1500) {
    if (!this.isRunning) return;

    if (this.cooldownTimer) {
      this.cooldownTimer.remove();
    }

    this.cooldownTimer = this.scene.time.delayedCall(delayMs, () => {
      if (!this.isRunning) return;
      const randomKey = Phaser.Math.RND.pick(SPAWN_KEYS);
      this.triggerAttack(randomKey);
    });
  }

  /**
   * Triggers an attack from a specific direction.
   * @param {string} directionKey - One of 'LEFT', 'TOP_LEFT', 'TOP', 'TOP_RIGHT', 'RIGHT'
   */
  triggerAttack(directionKey) {
    if (!this.isRunning) return;

    // If currently diving, don't interrupt
    if (this.mosquito.state === MOSQUITO_STATES.DIVING) return;

    // Clean any prior pending warning
    if (this.warningTimer) {
      this.warningTimer.remove();
      this.warningTimer = null;
    }
    this.audioManager.stopMosquitoBuzz();
    this.mosquito.deactivate();

    if (this.callbacks.onWarningEnd) {
      this.callbacks.onWarningEnd();
    }

    const dirData = DIRECTIONS[directionKey] || DIRECTIONS.TOP;
    this.currentDirection = dirData;

    // Warning duration: randomized between 2.0 and 3.8s as specified in DESIGN.md
    const warningDurationSec = Phaser.Math.FloatBetween(2.0, 3.8);
    const spawnPos = this.getSpawnPosition(dirData);

    // Notify scene of warning start (for debug display)
    if (this.callbacks.onWarningStart) {
      this.callbacks.onWarningStart(dirData, warningDurationSec);
    }

    // Audio vs No-Audio logic:
    if (this.mode === GAME_MODES.AUDIO) {
      // Single source of truth: spatial audio starts with matching direction
      this.audioManager.startMosquitoBuzz(dirData, warningDurationSec);
    } else {
      // No-audio version: show little red helper indicator on screen
      if (this.callbacks.onVisualWarning) {
        this.callbacks.onVisualWarning(dirData, spawnPos, warningDurationSec);
      }
    }

    // Schedule dive right at completion of warning period
    this.warningTimer = this.scene.time.delayedCall(warningDurationSec * 1000, () => {
      this.warningTimer = null;
      if (this.callbacks.onWarningEnd) {
        this.callbacks.onWarningEnd();
      }
      if (!this.isRunning) return;
      this.executeDive(dirData, spawnPos);
    });
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
      case 'LEFT':
        return { x: -25, y: Phaser.Math.Between(150, 580) };
      case 'TOP_LEFT':
        return { x: -20, y: Phaser.Math.Between(-20, 80) };
      case 'TOP':
        return { x: Phaser.Math.Between(200, width - 200), y: -25 };
      case 'TOP_RIGHT':
        return { x: width + 20, y: Phaser.Math.Between(-20, 80) };
      case 'RIGHT':
        return { x: width + 25, y: Phaser.Math.Between(150, 580) };
      default:
        return { x: width / 2, y: -25 };
    }
  }

  /**
   * Launches the dive towards skin.
   * @param {Object} dirData
   * @param {{x: number, y: number}} spawnPos
   */
  executeDive(dirData, spawnPos) {
    const targetPos = this.environment.getRandomSkinTarget();

    // Scale dive duration based on selected speed level
    const speedConfig = SPEED_LEVELS[this.speedLevel] || SPEED_LEVELS.FAST;
    const diveDurationMs = Phaser.Math.Between(speedConfig.minMs, speedConfig.maxMs);

    this.mosquito.startDive(spawnPos, targetPos, diveDurationMs, (biteX, biteY) => {
      // Mosquito reached skin without being swatted
      this.audioManager.stopMosquitoBuzz();
      this.audioManager.playBite();
      this.environment.addBiteMark(biteX, biteY);

      if (this.callbacks.onBite) {
        this.callbacks.onBite(biteX, biteY);
      }

      this.mosquito.deactivate();

      // Schedule next attack if game is still active
      if (this.isRunning) {
        this.scheduleNextAttack(Phaser.Math.Between(1200, 2200));
      }
    });
  }

  /**
   * Attempt to swat the mosquito.
   * @param {number} swatX
   * @param {number} swatY
   * @param {number} hitRadius
   * @returns {boolean} True if hit
   */
  trySwat(swatX, swatY, hitRadius) {
    if (this.mosquito.state === MOSQUITO_STATES.DIVING) {
      const dist = Phaser.Math.Distance.Between(swatX, swatY, this.mosquito.x, this.mosquito.y);
      if (dist <= (hitRadius + this.mosquito.radius)) {
        // Successful hit!
        const hitX = this.mosquito.x;
        const hitY = this.mosquito.y;

        this.mosquito.kill();
        this.audioManager.stopMosquitoBuzz();
        this.audioManager.playSwatHit();

        if (this.callbacks.onWarningEnd) {
          this.callbacks.onWarningEnd();
        }

        if (this.callbacks.onHit) {
          this.callbacks.onHit(hitX, hitY);
        }

        // Schedule next attack
        if (this.isRunning) {
          this.scheduleNextAttack(Phaser.Math.Between(1000, 2000));
        }

        return true;
      }
    }
    return false;
  }

  destroy() {
    this.stop();
    this.mosquito.destroy();
  }
}
