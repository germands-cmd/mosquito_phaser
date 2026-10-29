import Phaser from "phaser";
import backgroundLegsImg from "../../assets/background_legs.jpg";
import { AudioManager, DIRECTIONS } from "../audio/AudioManager.js";
import { Environment } from "../entities/Environment.js";
import { Swatter } from "../entities/Swatter.js";
import {
  MosquitoManager,
  GAME_MODES,
  DIFFICULTY_KEYS,
  DIFFICULTY_LEVELS,
} from "../managers/MosquitoManager.js";
import { AbilityManager } from "../abilities/AbilityManager.js";
import { BloodHealthBar } from "../ui/BloodHealthBar.js";

export const GAME_STATES = {
  READY: "READY",
  PLAYING: "PLAYING",
  PAUSED: "PAUSED",
  GAME_OVER: "GAME_OVER",
};

/**
 * GameScene.js
 * Primary scene orchestrating gameplay, Web Audio directional anticipation,
 * Version 1.1 Visual Assistance Mode (No-Audio), Version 1.2 difficulty selection (Easy/Normal/Hard),
 * comic visual presentation with photo-comic leg background, swarm waves (5 mosquitos every 2.5s),
 * multi-target swatting, feedback particles, compact bottom-center HUD, ESC pause menu, and dev debug tools.
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
    this.damagePerBite = 4;
    this.bites = 0;
    this.swats = 0;
    this.debugMode = false;
    this.debugInfo = { direction: "None", duration: "0s" };

    // Version 1.1 / 1.2 Settings
    this.currentMode = GAME_MODES.AUDIO;
    this.difficultyIndex = 1; // Default: 'NORMAL' in ['EASY', 'NORMAL', 'HARD']

    // 1. Initialize Audio Engine
    this.audio = new AudioManager();

    // 2. Build Environment (Background image, Legs Polygon Colliders with numbered IDs)
    this.environment = new Environment(
      this,
      this.scale.width,
      this.scale.height,
    );

    // 3. Blood Splatter Decals Graphics (on ground/legs)
    this.splatterGraphics = this.add.graphics().setDepth(4);

    // 4. Generate Particle Texture for Blood Splats
    if (!this.textures.exists("blood_dot")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x850d18, 1);
      g.fillCircle(4, 4, 4);
      g.generateTexture("blood_dot", 8, 8);
      g.destroy();
    }

    // Blood particle emitter
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

    // 5. Visual Assistance Indicators Pool ("Little Red Help" for No-Audio Mode)
    this.createVisualHelpIndicator();

    // 6. Fly Swatter Controller
    this.swatter = new Swatter(this, 36);

    // 7. Mosquito Swarm Manager (5 mosquitoes every 2.5s)
    this.mosquitoManager = new MosquitoManager(
      this,
      this.audio,
      this.environment,
      {
        onHit: (x, y) => this.handleMosquitoHit(x, y),
        onBite: (x, y, mosquito) => this.handleMosquitoBite(x, y, mosquito),
        onFeedingDamage: (mosquito, tickCount) => this.handleFeedingDamage(mosquito, tickCount),
        onWarningStart: (dirData, durationSec) => {
          this.debugInfo = {
            direction: dirData.name,
            duration: `${durationSec.toFixed(1)}s`,
          };
          if (this.debugMode) {
            this.updateDebugOverlay();
          }
        },
        onVisualWarning: (dirData, spawnPos, durationSec, mosquito) => {
          this.showVisualHelp(dirData, spawnPos, durationSec);
        },
        onWarningEnd: () => {
          this.hideVisualHelp();
        },
      },
    );

    // 8. HUD & Overlays
    this.createHUD();
    this.createReadyOverlay();
    this.createPauseOverlay();
    this.createGameOverOverlay();
    this.createDebugOverlay();

    // 8b. Active Ability System
    this.abilityManager = new AbilityManager(
      this,
      this.audio,
      this.mosquitoManager,
      this.swatter,
    );

    // 9. Pointer / Input Listeners
    this.input.on("pointermove", (pointer) => {
      if (this.gameState === GAME_STATES.PAUSED) return;
      this.swatter.updatePosition(pointer.worldX, pointer.worldY);
      if (this.debugMode) {
        this.updateDebugOverlay(pointer.worldX, pointer.worldY);
      }
    });

    this.input.on("pointerdown", (pointer) => {
      if (pointer.button !== 0) return; // Left-click only

      // Suppress swat strikes while typing the ability sequence
      if (this.abilityManager && this.abilityManager.isInvulnerable()) {
        return;
      }

      if (this.gameState === GAME_STATES.PLAYING) {
        this.swatter.strike((impactX, impactY, hitRadius) => {
          // Identify any direct hits on vulnerable mosquitoes (diving or feeding)
          const hitMosquitoes = [];
          for (const m of this.mosquitoManager.mosquitoPool) {
            if (m.isSwattable()) {
              const dist = Phaser.Math.Distance.Between(
                impactX,
                impactY,
                m.x,
                m.y,
              );
              if (dist <= hitRadius + m.radius) {
                hitMosquitoes.push(m);
              }
            }
          }

          // Active Ability Payoff hook: trigger prepared effect if applicable
          const abilityTriggered = this.abilityManager.handleSwatImpact(
            impactX,
            impactY,
            hitRadius,
            hitMosquitoes,
          );

          if (!abilityTriggered) {
            const hit = this.mosquitoManager.trySwat(
              impactX,
              impactY,
              hitRadius,
            );
            if (!hit) {
              this.audio.playSwatMiss();
              // Miss resets the stress streak
              if (this.abilityManager) {
                this.abilityManager.stressSystem.onMiss();
              }
            }
          }
        });
      }
    });

    // Disable browser context menu
    this.input.mouse?.disableContextMenu();

    // 10. Keyboard Debug & Pause Controls
    this.setupDebugKeys();
  }

  /**
   * Creates an indicator pool for No-Audio mode to alert the player
   * of incoming mosquitoes from various directions simultaneously.
   */
  createVisualHelpIndicator() {
    this.visualHelpPool = [];
    for (let i = 0; i < 15; i++) {
      const container = this.add.container(0, 0).setDepth(25).setVisible(false);

      const pulse = this.add.graphics();
      pulse.fillStyle(0xff1122, 0.4);
      pulse.fillCircle(0, 0, 24);
      container.add(pulse);

      const icon = this.add.graphics();
      icon.fillStyle(0xd91424, 0.95);
      icon.fillCircle(0, 0, 16);
      icon.lineStyle(3, 0xffffff, 1);
      icon.strokeCircle(0, 0, 16);
      container.add(icon);

      const text = this.add
        .text(0, 0, "!", {
          fontFamily: '"Impact", "Arial Black", sans-serif',
          fontSize: "20px",
          color: "#ffffff",
        })
        .setOrigin(0.5);
      container.add(text);

      this.tweens.add({
        targets: container,
        scaleX: 1.25,
        scaleY: 1.25,
        yoyo: true,
        repeat: -1,
        duration: 220,
      });

      this.visualHelpPool.push(container);
    }
  }

  showVisualHelp(dirData, spawnPos, durationSec) {
    const width = this.scale.width;
    const height = this.scale.height;
    let x = width / 2;
    let y = 50;

    switch (dirData.name) {
      case "LEFT":
        x = 35;
        y = Phaser.Math.Clamp(spawnPos.y, 80, height - 80);
        break;
      case "TOP_LEFT":
        x = 45;
        y = 45;
        break;
      case "TOP":
        x = Phaser.Math.Clamp(spawnPos.x, 150, width - 150);
        y = 35;
        break;
      case "TOP_RIGHT":
        x = width - 45;
        y = 45;
        break;
      case "RIGHT":
        x = width - 35;
        y = Phaser.Math.Clamp(spawnPos.y, 80, height - 80);
        break;
    }

    const container =
      this.visualHelpPool.find((c) => !c.visible) || this.visualHelpPool[0];
    container.setPosition(x, y);
    container.setVisible(true);

    this.time.delayedCall(durationSec * 1000, () => {
      container.setVisible(false);
    });
  }

  hideVisualHelp() {
    if (this.visualHelpPool) {
      for (const c of this.visualHelpPool) {
        c.setVisible(false);
      }
    }
  }

  /**
   * Version 1.3: Bottom-center bubbling Blood Health Bar.
   */
  createHUD() {
    const width = this.scale.width;
    const height = this.scale.height;
    const cx = width / 2;

    const hudW = 320;
    const hudH = 38;
    const hudX = cx - hudW / 2;
    const hudY = height - 52;

    // Bottom Blood Health Bar (with bubbling liquid animation and trailing damage ghost)
    this.bloodHealthBar = new BloodHealthBar(
      this,
      hudX,
      hudY,
      hudW,
      hudH,
      this.maxHealth,
    );
  }

  /**
   * Version 1.2: Main Menu overlay with instructions removed,
   * version moved to bottom-left, and difficulty selection.
   */
  createReadyOverlay() {
    this.readyContainer = this.add.container(0, 0).setDepth(40);
    const width = this.scale.width;
    const height = this.scale.height;
    const cx = width / 2;

    const dim = this.add.graphics();
    dim.fillStyle(0x0e0806, 0.88);
    dim.fillRect(0, 0, width, height);
    this.readyContainer.add(dim);

    // Title
    const title = this.add
      .text(cx, 160, "MOSQUITO", {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: "76px",
        color: "#d94b36",
        stroke: "#1a0806",
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.readyContainer.add(title);

    // Version in bottom-left corner
    const versionTag = this.add
      .text(24, height - 20, "v1.2", {
        fontFamily: "sans-serif",
        fontSize: "14px",
        fontWeight: "bold",
        color: "#8c7762",
        letterSpacing: 2,
      })
      .setOrigin(0, 1);
    this.readyContainer.add(versionTag);

    // 1. Mode Selection Container (Audio vs No-Audio)
    const modeLabel = this.add
      .text(cx, 270, "SELECT MODE:", {
        fontFamily: '"Arial Black", sans-serif',
        fontSize: "13px",
        color: "#dec5ab",
      })
      .setOrigin(0.5);
    this.readyContainer.add(modeLabel);

    // Mode Buttons
    this.btnModeAudio = this.createSegmentButton(
      cx - 145,
      302,
      135,
      38,
      "Audio Mode",
      true,
      () => {
        this.setGameMode(GAME_MODES.AUDIO);
      },
    );
    this.btnModeVisual = this.createSegmentButton(
      cx + 10,
      302,
      155,
      38,
      "No Audio (Help)",
      false,
      () => {
        this.setGameMode(GAME_MODES.NO_AUDIO);
      },
    );
    this.readyContainer.add([
      this.btnModeAudio.container,
      this.btnModeVisual.container,
    ]);

    // 2. Difficulty Selection Container (Easy, Normal, Hard)
    const diffLabel = this.add
      .text(cx, 380, "DIFFICULTY:", {
        fontFamily: '"Arial Black", sans-serif',
        fontSize: "13px",
        color: "#dec5ab",
      })
      .setOrigin(0.5);
    this.readyContainer.add(diffLabel);

    // Difficulty Selector Row: [◀]  [ DIFFICULTY: NORMAL ]  [▶]
    this.diffDisplayBg = this.add.graphics();
    this.readyContainer.add(this.diffDisplayBg);

    this.diffText = this.add
      .text(cx, 422, "DIFFICULTY: NORMAL", {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: "22px",
        color: "#f5efe6",
      })
      .setOrigin(0.5);
    this.readyContainer.add(this.diffText);

    this.btnDiffPrev = this.createArrowButton(cx - 170, 422, "◀", () =>
      this.cycleDifficulty(-1),
    );
    this.btnDiffNext = this.createArrowButton(cx + 170, 422, "▶", () =>
      this.cycleDifficulty(1),
    );
    this.readyContainer.add([this.btnDiffPrev, this.btnDiffNext]);

    this.updateDifficultyDisplay();

    // -------------------------------------------------------------
    // START BUTTON
    // -------------------------------------------------------------
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xc23b28, 1);
    btnBg.fillRoundedRect(cx - 120, 510, 240, 56, 10);
    btnBg.lineStyle(3, 0xffeedd, 1);
    btnBg.strokeRoundedRect(cx - 120, 510, 240, 56, 10);
    this.readyContainer.add(btnBg);

    const btnText = this.add
      .text(cx, 538, "START GAME", {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: "26px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    this.readyContainer.add(btnText);

    const hitZone = this.add
      .zone(cx, 538, 240, 56)
      .setInteractive({ cursor: "pointer" });
    this.readyContainer.add(hitZone);

    hitZone.on("pointerdown", () => {
      this.startGame();
    });

    this.tweens.add({
      targets: [btnText],
      scale: 1.05,
      yoyo: true,
      repeat: -1,
      duration: 650,
    });
  }

  /**
   * Version 1.2: Pause Menu Overlay
   */
  createPauseOverlay() {
    this.pauseContainer = this.add
      .container(0, 0)
      .setDepth(45)
      .setVisible(false);
    const width = this.scale.width;
    const height = this.scale.height;
    const cx = width / 2;

    // Semi-transparent black background
    const dim = this.add.graphics();
    dim.fillStyle(0x0e0806, 0.88);
    dim.fillRect(0, 0, width, height);
    this.pauseContainer.add(dim);

    // Title
    const title = this.add
      .text(cx, 210, "PAUSED", {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: "60px",
        color: "#f0dfce",
        stroke: "#1a0806",
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    this.pauseContainer.add(title);

    // Resume instruction label
    const resumeLabel = this.add
      .text(cx, 275, "Press ESC to resume", {
        fontFamily: "sans-serif",
        fontSize: "16px",
        color: "#c4b3a4",
        letterSpacing: 1,
      })
      .setOrigin(0.5);
    this.pauseContainer.add(resumeLabel);

    // Restart button
    const restartBtn = this.createMenuButton(
      cx,
      350,
      220,
      50,
      "RESTART",
      () => {
        this.restartFromPause();
      },
    );
    this.pauseContainer.add(restartBtn);

    // Main menu button
    const menuBtn = this.createMenuButton(cx, 420, 220, 50, "MAIN MENU", () => {
      this.goToMainMenu();
    });
    this.pauseContainer.add(menuBtn);
  }

  createMenuButton(cx, cy, w, h, text, onClick) {
    const container = this.add.container(cx, cy);

    const bg = this.add.graphics();
    bg.fillStyle(0x942216, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    bg.lineStyle(2, 0xffeedd, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    container.add(bg);

    const txt = this.add
      .text(0, 0, text, {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: "22px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    container.add(txt);

    const zone = this.add
      .zone(0, 0, w, h)
      .setInteractive({ cursor: "pointer" });
    zone.on("pointerdown", onClick);
    zone.on("pointerover", () => {
      bg.clear();
      bg.fillStyle(0xb22d20, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
      bg.lineStyle(2, 0xffffff, 1);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    });
    zone.on("pointerout", () => {
      bg.clear();
      bg.fillStyle(0x942216, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
      bg.lineStyle(2, 0xffeedd, 1);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    });
    container.add(zone);

    return container;
  }

  pauseGame() {
    if (this.gameState !== GAME_STATES.PLAYING) return;
    this.gameState = GAME_STATES.PAUSED;
    this.time.paused = true;
    this.tweens.pauseAll();
    this.audio.pause();
    this.pauseContainer.setVisible(true);
  }

  resumeGame() {
    if (this.gameState !== GAME_STATES.PAUSED) return;
    this.gameState = GAME_STATES.PLAYING;
    this.pauseContainer.setVisible(false);
    this.time.paused = false;
    this.tweens.resumeAll();
    this.audio.resume();
  }

  restartFromPause() {
    this.time.paused = false;
    this.tweens.resumeAll();
    this.audio.resume();
    this.pauseContainer.setVisible(false);
    this.abilityManager?.reset();
    this.restartGame();
  }

  goToMainMenu() {
    this.time.paused = false;
    this.tweens.resumeAll();
    this.audio.resume();
    this.pauseContainer.setVisible(false);
    this.gameOverContainer.setVisible(false);
    this.mosquitoManager.stop();
    this.audio.stopAllMosquitoBuzzes();
    this.splatterGraphics.clear();
    this.environment.reset();
    this.hideVisualHelp();
    this.abilityManager?.reset();
    this.health = this.maxHealth;
    this.bloodHealthBar?.reset();
    this.gameState = GAME_STATES.READY;
    this.readyContainer.setVisible(true);
    this.updateHUD();
  }

  createSegmentButton(x, y, w, h, label, active, onClick) {
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    container.add(bg);

    const text = this.add
      .text(w / 2, h / 2, label, {
        fontFamily: "sans-serif",
        fontSize: "13px",
        fontWeight: "bold",
        color: active ? "#ffffff" : "#a89480",
      })
      .setOrigin(0.5);
    container.add(text);

    const zone = this.add
      .zone(w / 2, h / 2, w, h)
      .setInteractive({ cursor: "pointer" });
    container.add(zone);

    zone.on("pointerdown", onClick);

    const render = (isActive) => {
      bg.clear();
      if (isActive) {
        bg.fillStyle(0x942f20, 1);
        bg.fillRoundedRect(0, 0, w, h, 6);
        bg.lineStyle(2, 0xffbb99, 1);
        bg.strokeRoundedRect(0, 0, w, h, 6);
        text.setColor("#ffffff");
      } else {
        bg.fillStyle(0x271912, 0.9);
        bg.fillRoundedRect(0, 0, w, h, 6);
        bg.lineStyle(1.5, 0x4a2e1d, 1);
        bg.strokeRoundedRect(0, 0, w, h, 6);
        text.setColor("#a89480");
      }
    };

    render(active);
    return { container, render };
  }

  createArrowButton(x, y, symbol, onClick) {
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(0x352117, 1);
    bg.fillCircle(0, 0, 20);
    bg.lineStyle(2, 0x5a3928, 1);
    bg.strokeCircle(0, 0, 20);
    container.add(bg);

    const txt = this.add
      .text(0, 0, symbol, {
        fontFamily: "sans-serif",
        fontSize: "16px",
        color: "#f0dfce",
      })
      .setOrigin(0.5);
    container.add(txt);

    const zone = this.add
      .zone(0, 0, 40, 40)
      .setInteractive({ cursor: "pointer" });
    zone.on("pointerdown", onClick);
    container.add(zone);

    return container;
  }

  setGameMode(mode) {
    this.currentMode = mode;
    this.btnModeAudio.render(mode === GAME_MODES.AUDIO);
    this.btnModeVisual.render(mode === GAME_MODES.NO_AUDIO);
  }

  cycleDifficulty(delta) {
    this.difficultyIndex =
      (this.difficultyIndex + delta + DIFFICULTY_KEYS.length) %
      DIFFICULTY_KEYS.length;
    this.updateDifficultyDisplay();
  }

  updateDifficultyDisplay() {
    const currentKey = DIFFICULTY_KEYS[this.difficultyIndex];
    const diffData = DIFFICULTY_LEVELS[currentKey];
    const cx = this.scale.width / 2;

    this.diffText.setText(`DIFFICULTY: ${diffData.label.toUpperCase()}`);

    this.diffDisplayBg.clear();
    this.diffDisplayBg.fillStyle(0x24150e, 0.95);
    this.diffDisplayBg.fillRoundedRect(cx - 130, 400, 260, 44, 8);
    this.diffDisplayBg.lineStyle(2, 0x523321, 1);
    this.diffDisplayBg.strokeRoundedRect(cx - 130, 400, 260, 44, 8);
  }

  createGameOverOverlay() {
    this.gameOverContainer = this.add
      .container(0, 0)
      .setDepth(45)
      .setVisible(false);
    const width = this.scale.width;
    const height = this.scale.height;
    const cx = width / 2;

    const dim = this.add.graphics();
    dim.fillStyle(0x1a0505, 0.92);
    dim.fillRect(0, 0, width, height);
    this.gameOverContainer.add(dim);

    const title = this.add
      .text(cx, 210, "EATEN ALIVE!", {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: "68px",
        color: "#e62e2e",
        stroke: "#2e0505",
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.gameOverContainer.add(title);

    this.gameOverStats = this.add
      .text(cx, 310, "You swatted 0 mosquitoes.", {
        fontFamily: "sans-serif",
        fontSize: "22px",
        color: "#e5d0be",
      })
      .setOrigin(0.5);
    this.gameOverContainer.add(this.gameOverStats);

    // Retry Button
    const retryBg = this.add.graphics();
    retryBg.fillStyle(0x942216, 1);
    retryBg.fillRoundedRect(cx - 120, 410, 240, 56, 10);
    retryBg.lineStyle(3, 0xffeedd, 1);
    retryBg.strokeRoundedRect(cx - 120, 410, 240, 56, 10);
    this.gameOverContainer.add(retryBg);

    const retryText = this.add
      .text(cx, 438, "TRY AGAIN", {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: "26px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    this.gameOverContainer.add(retryText);

    const retryZone = this.add
      .zone(cx, 438, 240, 56)
      .setInteractive({ cursor: "pointer" });
    this.gameOverContainer.add(retryZone);

    retryZone.on("pointerdown", () => {
      this.restartGame();
    });
  }

  createDebugOverlay() {
    this.debugContainer = this.add
      .container(16, 68)
      .setDepth(35)
      .setVisible(false);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRoundedRect(0, 0, 340, 180, 6);
    this.debugContainer.add(bg);

    this.debugText = this.add.text(12, 10, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#33ff33",
      lineSpacing: 4,
    });
    this.debugContainer.add(this.debugText);
    this.updateDebugOverlay();
  }

  updateDebugOverlay(mouseX = this.input.x, mouseY = this.input.y) {
    if (!this.debugText) return;
    const diffKey = DIFFICULTY_KEYS[this.difficultyIndex];
    const mx = Math.round(mouseX || 0);
    const my = Math.round(mouseY || 0);
    const activeCount = this.mosquitoManager
      ? this.mosquitoManager.getActiveCount()
      : 0;
    this.debugText.setText(
      `[DEBUG MODE (D to toggle)]\n` +
        `Mouse (X, Y)     : ${mx}, ${my}\n` +
        `Active Mosquitos : ${activeCount}\n` +
        `Wave Interval    : 2.5s (5 per wave)\n` +
        `Left Leg Points  : 0 - 14 (Cyan)\n` +
        `Right Leg Points : 0 - 14 (Magenta)\n` +
        `Mode             : ${this.currentMode}\n` +
        `Difficulty       : ${DIFFICULTY_LEVELS[diffKey]?.label}\n` +
        `Force Keys       : 6:L 7:TL 8:T 9:TR 0:R\nAbilities        : [1] Bomb, [2] Transfusion (Inputs: Q, W, E, R)`,
    );
  }

  setupDebugKeys() {
    // ESC to toggle pause / resume
    this.input.keyboard.on("keydown-ESC", () => {
      if (this.gameState === GAME_STATES.PLAYING) {
        this.pauseGame();
      } else if (this.gameState === GAME_STATES.PAUSED) {
        this.resumeGame();
      }
    });

    // D to toggle debug overlay and collider outlines
    this.input.keyboard.on("keydown-D", () => {
      this.debugMode = !this.debugMode;
      this.debugContainer.setVisible(this.debugMode);
      this.environment.setDebugVisible(this.debugMode);
      this.updateDebugOverlay();

      if (this.gameState === GAME_STATES.READY) {
        this.readyContainer.setVisible(!this.debugMode);
      }
    });

    // Space key to start game directly from ready menu
    this.input.keyboard.on("keydown-SPACE", () => {
      if (this.gameState === GAME_STATES.READY) {
        this.startGame();
      }
    });

    // Keyboard capture to avoid browser scrolling on arrow keys
    if (this.input.keyboard) {
      this.input.keyboard.addCapture([
        "Q",
        "W",
        "E",
        "R",
        "UP",
        "DOWN",
        "LEFT",
        "RIGHT",
        "ONE",
        "TWO",
      ]);
    }

    // Active Ability Activation Keys (1 and 2, including Numpad)
    ["ONE", "NUMPAD_ONE"].forEach((key) => {
      this.input.keyboard.on(`keydown-${key}`, () => {
        if (this.gameState === GAME_STATES.PLAYING) {
          this.abilityManager.activateSlot(0); // Pressure Bomb
        }
      });
    });
    ["TWO", "NUMPAD_TWO"].forEach((key) => {
      this.input.keyboard.on(`keydown-${key}`, () => {
        if (this.gameState === GAME_STATES.PLAYING) {
          this.abilityManager.activateSlot(1); // Reverse Transfusion
        }
      });
    });

    // Ergonomic Q, W, E, R Keys for Ability Sequence Input
    ["Q", "W", "E", "R"].forEach((key) => {
      this.input.keyboard.on(`keydown-${key}`, () => {
        if (this.gameState === GAME_STATES.PLAYING) {
          this.abilityManager.handleDirectionInput(key);
        }
      });
    });

    // 6-0 keys to force specific attack directions for testing (moved from 1-5)
    this.input.keyboard.on("keydown-SIX", () => {
      if (this.gameState === GAME_STATES.PLAYING)
        this.mosquitoManager.triggerAttack("LEFT");
    });
    this.input.keyboard.on("keydown-SEVEN", () => {
      if (this.gameState === GAME_STATES.PLAYING)
        this.mosquitoManager.triggerAttack("TOP_LEFT");
    });
    this.input.keyboard.on("keydown-EIGHT", () => {
      if (this.gameState === GAME_STATES.PLAYING)
        this.mosquitoManager.triggerAttack("TOP");
    });
    this.input.keyboard.on("keydown-NINE", () => {
      if (this.gameState === GAME_STATES.PLAYING)
        this.mosquitoManager.triggerAttack("TOP_RIGHT");
    });
    this.input.keyboard.on("keydown-ZERO", () => {
      if (this.gameState === GAME_STATES.PLAYING)
        this.mosquitoManager.triggerAttack("RIGHT");
    });
  }

  startGame() {
    this.audio.init();
    this.gameState = GAME_STATES.PLAYING;
    this.readyContainer.setVisible(false);
    this.pauseContainer.setVisible(false);
    this.hideVisualHelp();
    this.bites = 0;
    this.swats = 0;
    this.health = this.maxHealth;
    this.bloodHealthBar?.reset();

    // Apply configured settings to mosquito manager
    const currentDiffKey = DIFFICULTY_KEYS[this.difficultyIndex];
    this.mosquitoManager.setMode(this.currentMode);
    this.mosquitoManager.setDifficulty(currentDiffKey);

    this.updateHUD();
    this.mosquitoManager.start();
  }

  restartGame() {
    this.gameOverContainer.setVisible(false);
    this.pauseContainer.setVisible(false);
    this.splatterGraphics.clear();
    this.environment.reset();
    this.hideVisualHelp();
    this.abilityManager?.reset();
    this.health = this.maxHealth;
    this.bloodHealthBar?.reset();
    this.startGame();
  }

  handleMosquitoHit(x, y) {
    this.swats++;
    this.updateHUD();

    // 1. Blood splatter dots on floor/skin
    this.drawBloodSplat(x, y);

    // 2. Burst blood particles
    this.bloodEmitter.emitParticleAt(x, y, 16);

    // 3. Screen shake
    this.cameras.main.shake(120, 0.008);

    // 4. Feed stress system (only when not triggered by an ability effect)
    if (this.abilityManager && !this.abilityManager.isFrenzyActive()) {
      const wasAlreadyFull = this.abilityManager.stressSystem.isFull();
      this.abilityManager.stressSystem.onHit();
      this._onStressChanged(wasAlreadyFull);
    }
  }

  drawBloodSplat(x, y) {
    this.splatterGraphics.fillStyle(0x780d16, 0.85);
    this.splatterGraphics.fillCircle(x, y, Phaser.Math.Between(6, 11));
    const droplets = Phaser.Math.Between(4, 8);
    for (let i = 0; i < droplets; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.Between(10, 24);
      const rad = Phaser.Math.Between(2, 4);
      this.splatterGraphics.fillCircle(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
        rad,
      );
    }
  }

  handleMosquitoBite(x, y, mosquito) {
    if (this.abilityManager && this.abilityManager.isInvulnerable()) {
      return; // Player invulnerable while entering sequence!
    }

    this.bites++;

    // Note: visual flash is deferred to first feeding damage tick (handleFeedingDamage)
    // so feedback only triggers after real damage is confirmed.

    // Stress hook on initial bite (+0 per user test request)
    const stressGainOnBite = 0;
    if (stressGainOnBite > 0 && this.abilityManager) {
      const wasAlreadyFull = this.abilityManager.stressSystem.isFull();
      this.abilityManager.stressSystem.stress = Math.min(
        this.abilityManager.stressSystem.maxStress,
        this.abilityManager.stressSystem.stress + stressGainOnBite
      );
      this._onStressChanged(wasAlreadyFull);
    }
  }

  /**
   * Called every full second that a mosquito is attached and feeding on the player.
   * Deals 1 discrete damage per full second.
   * @param {import('../entities/Mosquito.js').Mosquito} mosquito
   * @param {number} tickCount - Number of damage ticks fired by this mosquito (1-based)
   */
  handleFeedingDamage(mosquito, tickCount) {
    if (this.gameState !== GAME_STATES.PLAYING) return;
    if (this.abilityManager && this.abilityManager.isInvulnerable()) return;

    // Deduct 1 HP per full second
    this.health = Math.max(0, this.health - 1);
    this.bloodHealthBar.setHealth(this.health, this.maxHealth);

    // Soft damage flash feedback — very subtle pale red wash
    this.cameras.main.flash(200, 55, 8, 8, false);

    // Stress hook on feeding tick (+0 per user test request)
    const stressGainOnTick = 0;
    if (stressGainOnTick > 0 && this.abilityManager) {
      const wasAlreadyFull = this.abilityManager.stressSystem.isFull();
      this.abilityManager.stressSystem.stress = Math.min(
        this.abilityManager.stressSystem.maxStress,
        this.abilityManager.stressSystem.stress + stressGainOnTick
      );
      this._onStressChanged(wasAlreadyFull);
    }

    if (this.health <= 0) {
      this.triggerGameOver();
    }
  }

  /**
   * Called after every stress change (hit or bite).
   * Updates the stress bar UI and plays the full-charge sound/feedback
   * exactly once when the bar crosses 100%.
   * @param {boolean} wasAlreadyFull - Whether the bar was already full before this event
   */
  _onStressChanged(wasAlreadyFull) {
    const ss = this.abilityManager.stressSystem;
    this.abilityManager.ui.updateStressBar(ss.getRatio(), false);
    if (!wasAlreadyFull && ss.isFull()) {
      this.audio.playStressFull?.();
      this.abilityManager.ui.showStressFullFeedback();
    }
  }

  triggerGameOver() {
    this.gameState = GAME_STATES.GAME_OVER;
    this.hideVisualHelp();
    this.abilityManager?.reset();
    this.mosquitoManager.stop();
    this.audio.stopAllMosquitoBuzzes();

    this.gameOverStats.setText(
      `You managed to swat ${this.swats} mosquito${this.swats === 1 ? "" : "es"}`,
    );
    this.gameOverContainer.setVisible(true);
  }

  updateHUD() {
    // HUD is driven directly by bloodHealthBar and abilityUI
  }

  update(time, delta) {
    if (this.bloodHealthBar) {
      this.bloodHealthBar.update(delta);
    }
    if (this.abilityManager) {
      this.abilityManager.update(time, delta);
    }
  }

  shutdown() {
    if (this.bloodHealthBar) {
      this.bloodHealthBar.destroy();
    }
    if (this.abilityManager) {
      this.abilityManager.destroy();
    }
    this.hideVisualHelp();
    this.mosquitoManager.destroy();
    this.swatter.destroy();
    this.environment.destroy();
    this.audio.destroy();
  }
}
