import Phaser from "phaser";
import backgroundLegsImg from "../../assets/background_legs.jpg";
import { AudioManager, DIRECTIONS } from "../audio/AudioManager.js";
import { Environment } from "../entities/Environment.js";
import { Swatter } from "../entities/Swatter.js";
import {
  MosquitoManager,
  GAME_MODES,
} from "../managers/MosquitoManager.js";
import { AbilityManager } from "../abilities/AbilityManager.js";
import { BloodHealthBar } from "../ui/BloodHealthBar.js";
import { VisualHelpIndicator } from "../ui/VisualHelpIndicator.js";
import { ReadyOverlay } from "../ui/overlays/ReadyOverlay.js";
import { PauseOverlay } from "../ui/overlays/PauseOverlay.js";
import { GameOverOverlay } from "../ui/overlays/GameOverOverlay.js";
import { DebugOverlay } from "../ui/overlays/DebugOverlay.js";
import { PhaseResultsOverlay } from "../ui/overlays/PhaseResultsOverlay.js";
import { PHASE_CONFIGS } from "../progression/PhaseConfig.js";

export const GAME_STATES = {
  READY: "READY",
  PLAYING: "PLAYING",
  PAUSED: "PAUSED",
  GAME_OVER: "GAME_OVER",
};

/**
 * GameScene.js
 * Primary scene orchestrating gameplay, audio, environment, swarm manager,
 * active abilities, and UI overlays.
 */
export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "game" });
  }

  preload() {
    this.load.image("background_legs", backgroundLegsImg);
  }

  create() {
    this.gameState = GAME_STATES.READY;
    this.maxHealth = 100;
    this.health = 100;
    this.swats = 0;
    this.phaseIndex = 0;
    this.phaseEliminated = 0;
    this.phaseBites = 0;
    this.phaseTransitioning = false;
    this.currentMode = GAME_MODES.AUDIO;

    // 1. Core Systems
    this.audio = new AudioManager();
    this.environment = new Environment(this, this.scale.width, this.scale.height);
    this.bloodSplatters = [];
    this.initBloodParticles();

    // 2. Visual Assistance Indicators (No-Audio Mode)
    this.visualHelp = new VisualHelpIndicator(this);

    // 3. Player Fly Swatter
    this.swatter = new Swatter(this, 36);

    // 4. Mosquito Swarm Manager
    this.mosquitoManager = new MosquitoManager(
      this,
      this.audio,
      this.environment,
      {
        onHit: (x, y) => this.handleMosquitoHit(x, y),
        onBite: (x, y, mosquito) => this.handleMosquitoBite(x, y, mosquito),
        onFeedingDamage: (mosquito, tickCount, damage) =>
          this.handleFeedingDamage(mosquito, tickCount, damage),
        onAreaEffect: (x, y, radius, color) =>
          this.showMosquitoExplosion(x, y, radius, color),
        onWarningStart: (dirData, durationSec) => {
          this.debugOverlay.setDebugInfo(dirData.name, `${durationSec.toFixed(1)}s`);
        },
        onVisualWarning: (dirData, spawnPos, durationSec) => {
          this.visualHelp.show(dirData, spawnPos, durationSec);
        },
        onWarningEnd: () => {
          this.visualHelp.hideAll();
        },
        onEnemyEliminated: () => {
          this.phaseEliminated++;
        },
        onPhaseComplete: () => this.completePhase(),
      }
    );

    // 5. In-Game HUD & Ability System
    this.createHUD();
    this.abilityManager = new AbilityManager(
      this,
      this.audio,
      this.mosquitoManager,
      this.swatter
    );

    // 6. UI Overlays
    this.readyOverlay = new ReadyOverlay(this, {
      defaultMode: this.currentMode,
      onStart: (mode) => {
        this.currentMode = mode;
        this.startGame();
      },
    });

    this.pauseOverlay = new PauseOverlay(this, {
      onToggle: () => {
        if (this.gameState === GAME_STATES.PLAYING) this.pauseGame();
        else if (this.gameState === GAME_STATES.PAUSED) this.resumeGame();
      },
      onResume: () => this.resumeGame(),
      onRestart: () => this.restartFromPause(),
      onMenu: () => this.goToMainMenu(),
    });

    this.gameOverOverlay = new GameOverOverlay(this, {
      onRetry: () => this.restartGame(),
      onMenu: () => this.goToMainMenu(),
    });

    this.debugOverlay = new DebugOverlay(this);
    this.phaseResultsOverlay = new PhaseResultsOverlay(this, {
      onNext: () => this.startNextPhase(),
      onMenu: () => this.goToMainMenu(),
    });

    // 7. Input Wiring
    this.setupInputHandlers();
  }

  initBloodParticles() {
    if (!this.textures.exists("blood_dot")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x850d18, 1);
      g.fillCircle(4, 4, 4);
      g.generateTexture("blood_dot", 8, 8);
      g.destroy();
    }

    this.bloodEmitter = this.add
      .particles(0, 0, "blood_dot", {
        speed: { min: 80, max: 240 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.2, end: 0 },
        alpha: { start: 1, end: 0.2 },
        lifespan: { min: 250, max: 500 },
        gravityY: 120,
        emitting: false,
      })
      .setDepth(18);
  }

  createHUD() {
    const barWidth = 340;
    const barHeight = 24;
    const barX = (this.scale.width - barWidth) / 2;
    const barY = this.scale.height - 38;
    this.bloodHealthBar = new BloodHealthBar(
      this,
      barX,
      barY,
      barWidth,
      barHeight,
      this.maxHealth
    );
  }

  setupInputHandlers() {
    this.input.mouse?.disableContextMenu();

    this.input.on("pointermove", (pointer) => {
      if (this.gameState === GAME_STATES.PAUSED) return;
      this.swatter.updatePosition(pointer.worldX, pointer.worldY);
      if (this.debugOverlay.isEnabled) {
        this.debugOverlay.update(pointer.worldX, pointer.worldY);
      }
    });

    this.input.on("pointerdown", (pointer) => {
      if (pointer.button !== 0) return;
      if (this.abilityManager && this.abilityManager.isInvulnerable()) return;

      if (this.gameState === GAME_STATES.PLAYING) {
        this.swatter.strike((impactX, impactY, hitRadius) => {
          const hitMosquitoes = this.mosquitoManager.getSwattableHits(
            impactX,
            impactY,
            hitRadius
          );

          const abilityTriggered = this.abilityManager.handleSwatImpact(
            impactX,
            impactY,
            hitRadius,
            hitMosquitoes
          );

          if (!abilityTriggered) {
            const hit = this.mosquitoManager.trySwat(impactX, impactY, hitRadius);
            if (!hit) {
              this.audio.playSwatMiss();
              this.abilityManager?.stressSystem.onMiss();
            }
          }
        });
      }
    });

    // Active Ability Activation Keys (1 and 2)
    this.input.keyboard.on("keydown-ONE", () => {
      if (this.gameState === GAME_STATES.PLAYING) {
        this.abilityManager.activateSlot(0);
      }
    });
    this.input.keyboard.on("keydown-TWO", () => {
      if (this.gameState === GAME_STATES.PLAYING) {
        this.abilityManager.activateSlot(1);
      }
    });

    // Q, W, E, R for Ability Sequence Input
    ["Q", "W", "E", "R"].forEach((key) => {
      this.input.keyboard.on(`keydown-${key}`, () => {
        if (this.gameState === GAME_STATES.PLAYING) {
          this.abilityManager.handleDirectionInput(key);
        }
      });
    });
  }

  // -------------------------------------------------------------
  // GAME STATE MANAGEMENT
  // -------------------------------------------------------------
  startGame() {
    this.audio.init();
    this.gameState = GAME_STATES.PLAYING;
    this.phaseTransitioning = false;
    this.phaseResultsOverlay.hide();
    this.readyOverlay.hide();
    this.pauseOverlay.hide();
    this.gameOverOverlay.hide();

    this.mosquitoManager.setMode(this.currentMode);
    this.startPhase(0);
  }

  startPhase(index) {
    const config = PHASE_CONFIGS[index];
    if (!config) {
      this.completePhase();
      return;
    }
    this.phaseIndex = index;
    this.phaseEliminated = 0;
    this.phaseBites = 0;
    this.swats = 0;
    this.health = this.maxHealth;
    this.bloodHealthBar.setHealth(this.health, this.maxHealth);
    this.abilityManager?.reset();
    this.environment.reset();
    this.visualHelp.hideAll();
    this.mosquitoManager.stop();
    this.mosquitoManager.setMode(this.currentMode);
    this.mosquitoManager.start(config);
  }

  completePhase() {
    if (this.phaseTransitioning || this.gameState !== GAME_STATES.PLAYING) return;
    this.phaseTransitioning = true;
    this.mosquitoManager.stopSpawning();
    this.gameState = GAME_STATES.READY;
    this.cameras.main.fadeOut(900, 0, 0, 0);
    this.time.delayedCall(900, () => {
      this.phaseResultsOverlay.show({
        phaseId: this.phaseIndex + 1,
        eliminated: this.phaseEliminated,
        bites: this.phaseBites,
        final: this.phaseIndex === PHASE_CONFIGS.length - 1,
      });
    });
  }

  startNextPhase() {
    if (!this.phaseTransitioning || this.phaseIndex >= PHASE_CONFIGS.length - 1) return;
    this.phaseResultsOverlay.hide();
    this.cameras.main.fadeIn(900, 0, 0, 0);
    this.time.delayedCall(900, () => {
      this.phaseTransitioning = false;
      this.gameState = GAME_STATES.PLAYING;
      this.startPhase(this.phaseIndex + 1);
    });
  }

  restartGame() {
    this.gameOverOverlay.hide();
    this.pauseOverlay.hide();
    this.clearBloodSplats();
    this.environment.reset();
    this.visualHelp.hideAll();
    this.abilityManager?.reset();
    this.health = this.maxHealth;
    this.bloodHealthBar?.reset();
    this.startGame();
  }

  pauseGame() {
    if (this.gameState !== GAME_STATES.PLAYING) return;
    this.gameState = GAME_STATES.PAUSED;
    this.time.paused = true;
    this.tweens.pauseAll();
    this.audio.pause();
    this.pauseOverlay.show();
  }

  resumeGame() {
    if (this.gameState !== GAME_STATES.PAUSED) return;
    this.gameState = GAME_STATES.PLAYING;
    this.pauseOverlay.hide();
    this.time.paused = false;
    this.tweens.resumeAll();
    this.audio.resume();
  }

  restartFromPause() {
    this.time.paused = false;
    this.tweens.resumeAll();
    this.audio.resume();
    this.pauseOverlay.hide();
    this.abilityManager?.reset();
    this.restartGame();
  }

  goToMainMenu() {
    this.time.paused = false;
    this.tweens.resumeAll();
    this.audio.resume();
    this.pauseOverlay.hide();
    this.gameOverOverlay.hide();
    this.phaseResultsOverlay.hide();
    this.phaseTransitioning = false;
    this.mosquitoManager.stop();
    this.audio.stopAllMosquitoBuzzes();
    this.clearBloodSplats();
    this.environment.reset();
    this.visualHelp.hideAll();
    this.abilityManager?.reset();
    this.health = this.maxHealth;
    this.bloodHealthBar?.reset();
    this.gameState = GAME_STATES.READY;
    this.readyOverlay.show();
  }

  triggerGameOver() {
    this.gameState = GAME_STATES.GAME_OVER;
    this.visualHelp.hideAll();
    this.abilityManager?.reset();
    this.mosquitoManager.stop();
    this.audio.stopAllMosquitoBuzzes();
    this.gameOverOverlay.show(this.swats);
  }

  // -------------------------------------------------------------
  // GAMEPLAY FEEDBACK & DECALS
  // -------------------------------------------------------------
  handleMosquitoHit(x, y) {
    this.swats++;

    // 1. Blood splatter decal on floor/skin (disappears after 3-5s)
    this.drawBloodSplat(x, y);

    // 2. Burst blood particles
    this.bloodEmitter.emitParticleAt(x, y, 16);

    // 3. Screen shake
    this.cameras.main.shake(120, 0.008);

    // 4. Feed stress system (if not in frenzy)
    if (this.abilityManager && !this.abilityManager.isFrenzyActive()) {
      const wasAlreadyFull = this.abilityManager.stressSystem.isFull();
      this.abilityManager.stressSystem.onHit();
      this._onStressChanged(wasAlreadyFull);
    }
  }

  drawBloodSplat(x, y) {
    const splat = this.add.graphics().setDepth(4);
    splat.fillStyle(0x780d16, 0.85);
    splat.fillCircle(x, y, Phaser.Math.Between(6, 11));
    const droplets = Phaser.Math.Between(4, 8);
    for (let i = 0; i < droplets; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.Between(10, 24);
      const rad = Phaser.Math.Between(2, 4);
      splat.fillCircle(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
        rad
      );
    }

    this.bloodSplatters.push(splat);

    const lifespanMs = Phaser.Math.Between(3000, 5000);
    splat.fadeTween = this.tweens.add({
      targets: splat,
      alpha: 0,
      delay: lifespanMs,
      duration: 600,
      ease: "Linear",
      onComplete: () => {
        const idx = this.bloodSplatters.indexOf(splat);
        if (idx !== -1) {
          this.bloodSplatters.splice(idx, 1);
        }
        splat.destroy();
      },
    });
  }

  showMosquitoExplosion(x, y, radius, color = 0xa51628) {
    const explosion = this.add.graphics().setDepth(22);
    const state = { radius: Math.max(12, radius * 0.2), alpha: 0.9 };
    this.bloodEmitter.emitParticleAt(x, y, 28);
    this.tweens.add({
      targets: state,
      radius,
      alpha: 0,
      duration: 260,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        explosion.clear();
        explosion.fillStyle(color, state.alpha * 0.28);
        explosion.fillCircle(x, y, state.radius);
        explosion.lineStyle(7, color, state.alpha);
        explosion.strokeCircle(x, y, state.radius);
      },
      onComplete: () => explosion.destroy(),
    });
  }

  clearBloodSplats() {
    if (this.bloodSplatters) {
      for (const splat of this.bloodSplatters) {
        if (splat.fadeTween) {
          splat.fadeTween.stop();
        }
        splat.destroy();
      }
      this.bloodSplatters = [];
    }
  }

  handleMosquitoBite(x, y, mosquito) {
    if (this.gameState === GAME_STATES.PLAYING) {
      this.phaseBites++;
    }
    if (this.abilityManager && this.abilityManager.isInvulnerable()) {
      return;
    }
  }

  handleFeedingDamage(mosquito, tickCount, damage = 1) {
    if (this.gameState !== GAME_STATES.PLAYING) return;
    if (this.abilityManager && this.abilityManager.isInvulnerable()) return;

    this.health = Math.max(0, this.health - damage);
    this.bloodHealthBar.setHealth(this.health, this.maxHealth);

    // Subtle pale red damage flash
    this.cameras.main.flash(200, 55, 8, 8, false);

    if (this.health <= 0) {
      this.triggerGameOver();
    }
  }

  _onStressChanged(wasAlreadyFull) {
    if (!this.abilityManager) return;
    const ss = this.abilityManager.stressSystem;
    this.abilityManager.ui?.updateStressBar(ss.getRatio(), false);
    if (!wasAlreadyFull && ss.isFull()) {
      this.audio.playStressFull?.();
      this.abilityManager.ui?.showStressFullFeedback();
    }
  }

  // -------------------------------------------------------------
  // UPDATE & SHUTDOWN
  // -------------------------------------------------------------
  update(time, delta) {
    if (this.mosquitoManager) {
      this.mosquitoManager.update(time, delta);
    }
    if (this.bloodHealthBar) {
      this.bloodHealthBar.update(delta);
    }
    if (this.abilityManager) {
      this.abilityManager.update(time, delta);
    }
  }

  shutdown() {
    this.clearBloodSplats();
    this.visualHelp?.destroy();
    this.readyOverlay?.destroy();
    this.pauseOverlay?.destroy();
    this.gameOverOverlay?.destroy();
    this.phaseResultsOverlay?.destroy();
    this.debugOverlay?.destroy();
    this.bloodHealthBar?.destroy();
    this.abilityManager?.destroy();
    this.mosquitoManager?.destroy();
    this.swatter?.destroy();
    this.environment?.destroy();
    this.audio?.destroy();
  }
}
