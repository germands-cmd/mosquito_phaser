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
import { PauseOverlay } from "../ui/overlays/PauseOverlay.js";
import { GameOverOverlay } from "../ui/overlays/GameOverOverlay.js";
import { PhaseResultsOverlay } from "../ui/overlays/PhaseResultsOverlay.js";
import { AbilitySelectionOverlay } from "../ui/overlays/AbilitySelectionOverlay.js";
import { getRandomAbilityOptions } from "../abilities/AbilityRegistry.js";
import { PHASE_CONFIGS } from "../progression/PhaseConfig.js";
import { createBloodSplat } from "../effects/BloodSplat.js";

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
    this.gameState = GAME_STATES.PLAYING;
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

    // 6. Gameplay overlays
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

    this.phaseResultsOverlay = new PhaseResultsOverlay(this, {
      onNext: () => this.startNextPhase(),
      onMenu: () => this.goToMainMenu(),
    });

    this.abilitySelectionOverlay = new AbilitySelectionOverlay(this, {
      onConfirm: (abilityDef) => this.handleAbilitySelected(abilityDef),
    });
    this.transitionOverlay = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000)
      .setOrigin(0)
      .setDepth(100)
      .setAlpha(0);

    // 7. Input Wiring
    this.setupInputHandlers();
    this.abilityManager?.resetRun();
    this.startPhase(0);
    this.fadeFromBlack();
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
    // Keep the complete health/stress/ability HUD group 20px above the screen edge.
    // The stress frame extends 5px below the health bar.
    const barY = this.scale.height - 49;
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
    });

    this.input.on("pointerdown", (pointer) => {
      if (pointer.button !== 0) return;
      if (this.abilitySelectionOverlay?.isVisible()) return;
      this.audio.prime();

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
          } else {
            this.audio.playSwatHit();
          }
        });
      }
    });

    // Stress frenzy activation
    this.input.keyboard.on("keydown-SPACE", () => {
      if (this.gameState === GAME_STATES.PLAYING) {
        this.abilityManager.activateFrenzy();
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
    this.fadeToBlack(() => {
      this.gameState = GAME_STATES.PLAYING;
      this.phaseTransitioning = false;
      this.phaseResultsOverlay.hide();
      this.pauseOverlay.hide();
      this.gameOverOverlay.hide();
      this.abilitySelectionOverlay?.hide();

      this.abilityManager?.resetRun();
      this.mosquitoManager.setMode(this.currentMode);
      this.startPhase(0);
      this.fadeFromBlack();
    });
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

    this.currentPhaseConfig = config;
    this.promptAbilitySelection();
  }

  promptAbilitySelection() {
    const equippedIds = this.abilityManager ? this.abilityManager.getEquippedAbilityIds() : [];
    const options = getRandomAbilityOptions(equippedIds, 3);
    this.abilitySelectionOverlay.show({
      phaseNumber: this.phaseIndex + 1,
      options,
    });
  }

  handleAbilitySelected(abilityDef) {
    if (abilityDef && typeof abilityDef.createInstance === "function") {
      const instance = abilityDef.createInstance();
      // Override the class-hardcoded iconSymbol with the registry's (supports raw SVG)
      if (abilityDef.iconSymbol !== undefined) {
        instance.iconSymbol = abilityDef.iconSymbol;
      }
      this.abilityManager?.equipAbility(instance);
    }
    this.abilitySelectionOverlay.hide();
    if (this.currentPhaseConfig) {
      this.mosquitoManager.start(this.currentPhaseConfig);
    }
  }

  completePhase() {
    if (this.phaseTransitioning || this.gameState !== GAME_STATES.PLAYING) return;
    this.phaseTransitioning = true;
    this.mosquitoManager.stopSpawning();
    this.gameState = GAME_STATES.READY;
    this.fadeToBlack(() => {
      this.phaseResultsOverlay.show({
        phaseId: this.phaseIndex + 1,
        eliminated: this.phaseEliminated,
        bites: this.phaseBites,
        final: this.phaseIndex === PHASE_CONFIGS.length - 1,
      });
      this.fadeFromBlack();
    });
  }

  startNextPhase() {
    if (!this.phaseTransitioning || this.phaseIndex >= PHASE_CONFIGS.length - 1) return;
    this.fadeToBlack(() => {
      this.phaseResultsOverlay.hide();
      this.phaseTransitioning = false;
      this.gameState = GAME_STATES.PLAYING;
      this.startPhase(this.phaseIndex + 1);
      this.fadeFromBlack();
    });
  }

  fadeToBlack(onComplete) {
    this.transitionOverlay?.setAlpha(0);
    this.transitionTween?.stop();
    this.transitionTween = this.tweens.add({
      targets: this.transitionOverlay,
      alpha: 1,
      duration: 450,
      ease: "Sine.easeInOut",
      onComplete,
    });
  }

  fadeFromBlack(onComplete) {
    this.transitionTween?.stop();
    this.transitionOverlay?.setAlpha(1);
    this.transitionTween = this.tweens.add({
      targets: this.transitionOverlay,
      alpha: 0,
      duration: 450,
      ease: "Sine.easeInOut",
      onComplete,
    });
  }

  restartGame() {
    this.gameOverOverlay.hide();
    this.pauseOverlay.hide();
    this.abilitySelectionOverlay?.hide();
    this.clearBloodSplats();
    this.environment.reset();
    this.visualHelp.hideAll();
    this.abilityManager?.resetRun();
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
    this.abilitySelectionOverlay?.hide();
    this.abilityManager?.resetRun();
    this.restartGame();
  }

  goToMainMenu() {
    this.time.paused = false;
    this.tweens.resumeAll();
    this.audio.resume();
    this.pauseOverlay.hide();
    this.gameOverOverlay.hide();
    this.phaseResultsOverlay.hide();
    this.abilitySelectionOverlay?.hide();
    this.phaseTransitioning = false;
    this.mosquitoManager.stop();
    this.audio.stopAllMosquitoBuzzes();
    this.clearBloodSplats();
    this.environment.reset();
    this.visualHelp.hideAll();
    this.abilityManager?.resetRun();
    this.health = this.maxHealth;
    this.bloodHealthBar?.reset();
    this.transitionOverlay.setAlpha(0);
    this.transitionTween?.stop();
    this.transitionTween = this.tweens.add({
      targets: this.transitionOverlay,
      alpha: 1,
      duration: 450,
      ease: "Sine.easeInOut",
      onComplete: () => {
      this.scene.start("main-menu");
      },
    });
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
    createBloodSplat(this, this.bloodSplatters, x, y);
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
    if (this.gameState === GAME_STATES.PLAYING &&
        this.abilityManager &&
        !this.abilityManager.isFrenzyActive()) {
      const wasAlreadyFull = this.abilityManager.stressSystem.isFull();
      this.abilityManager.stressSystem.onBite();
      this._onStressChanged(wasAlreadyFull);
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
    this.pauseOverlay?.destroy();
    this.gameOverOverlay?.destroy();
    this.phaseResultsOverlay?.destroy();
    this.abilitySelectionOverlay?.destroy();
    this.transitionTween?.stop();
    this.transitionOverlay?.destroy();
    this.bloodHealthBar?.destroy();
    this.abilityManager?.destroy();
    this.mosquitoManager?.destroy();
    this.swatter?.destroy();
    this.environment?.destroy();
    this.audio?.destroy();
  }
}
