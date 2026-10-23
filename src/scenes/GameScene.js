import Phaser from 'phaser';
import backgroundLegsImg from '../../assets/background_legs.jpg';
import { AudioManager, DIRECTIONS } from '../audio/AudioManager.js';
import { Environment } from '../entities/Environment.js';
import { Swatter } from '../entities/Swatter.js';
import { MosquitoManager, GAME_MODES, SPEED_KEYS, SPEED_LEVELS } from '../managers/MosquitoManager.js';

export const GAME_STATES = {
  READY: 'READY',
  PLAYING: 'PLAYING',
  GAME_OVER: 'GAME_OVER'
};

/**
 * GameScene.js
 * Primary scene orchestrating gameplay, Web Audio directional anticipation,
 * Version 1.1 Visual Assistance Mode (No-Audio), speed selection (5 levels),
 * comic visual presentation with photo-comic leg background, swarm waves (5 mosquitos every 2.5s),
 * multi-target swatting, feedback particles, and dev debug tools.
 */
export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'game' });
  }

  preload() {
    this.load.image('background_legs', backgroundLegsImg);
  }

  create() {
    this.gameState = GAME_STATES.READY;
    this.maxBites = 3;
    this.bites = 0;
    this.swats = 0;
    this.debugMode = false;
    this.debugInfo = { direction: 'None', duration: '0s' };

    // Version 1.1 Settings
    this.currentMode = GAME_MODES.AUDIO;
    this.speedIndex = 3; // 'FAST' is index 3 in ['VERY_SLOW', 'SLOW', 'NORMAL', 'FAST', 'SUPER_FAST']

    // 1. Initialize Audio Engine
    this.audio = new AudioManager();

    // 2. Build Environment (Background image, Legs Polygon Colliders with numbered IDs)
    this.environment = new Environment(this, this.scale.width, this.scale.height);

    // 3. Blood Splatter Decals Graphics (on ground/legs)
    this.splatterGraphics = this.add.graphics().setDepth(4);

    // 4. Generate Particle Texture for Blood Splats
    if (!this.textures.exists('blood_dot')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x850d18, 1);
      g.fillCircle(4, 4, 4);
      g.generateTexture('blood_dot', 8, 8);
      g.destroy();
    }

    // Blood particle emitter
    this.bloodEmitter = this.add.particles(0, 0, 'blood_dot', {
      speed: { min: 80, max: 240 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0.2 },
      lifespan: { min: 250, max: 500 },
      gravityY: 120,
      emitting: false
    }).setDepth(18);

    // 5. Visual Assistance Indicators Pool ("Little Red Help" for No-Audio Mode)
    this.createVisualHelpIndicator();

    // 6. Fly Swatter Controller
    this.swatter = new Swatter(this, 36);

    // 7. Mosquito Swarm Manager (5 mosquitoes every 2.5s)
    this.mosquitoManager = new MosquitoManager(this, this.audio, this.environment, {
      onHit: (x, y) => this.handleMosquitoHit(x, y),
      onBite: (x, y) => this.handleMosquitoBite(x, y),
      onWarningStart: (dirData, durationSec) => {
        this.debugInfo = {
          direction: dirData.name,
          duration: `${durationSec.toFixed(1)}s`
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
      }
    });

    // 8. HUD & Overlays
    this.createHUD();
    this.createReadyOverlay();
    this.createGameOverOverlay();
    this.createDebugOverlay();

    // 9. Pointer / Input Listeners
    this.input.on('pointermove', (pointer) => {
      this.swatter.updatePosition(pointer.x, pointer.y);
      if (this.debugMode) {
        this.updateDebugOverlay(pointer.x, pointer.y);
      }
    });

    this.input.on('pointerdown', (pointer) => {
      if (pointer.button !== 0) return; // Left-click only

      if (this.gameState === GAME_STATES.PLAYING) {
        this.swatter.strike((impactX, impactY, hitRadius) => {
          const hit = this.mosquitoManager.trySwat(impactX, impactY, hitRadius);
          if (!hit) {
            this.audio.playSwatMiss();
          }
        });
      }
    });

    // Disable browser context menu
    this.input.mouse?.disableContextMenu();

    // 10. Keyboard Debug Controls
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

      const text = this.add.text(0, 0, '!', {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: '20px',
        color: '#ffffff'
      }).setOrigin(0.5);
      container.add(text);

      this.tweens.add({
        targets: container,
        scaleX: 1.25,
        scaleY: 1.25,
        yoyo: true,
        repeat: -1,
        duration: 220
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
      case 'LEFT':
        x = 35;
        y = Phaser.Math.Clamp(spawnPos.y, 80, height - 80);
        break;
      case 'TOP_LEFT':
        x = 45;
        y = 45;
        break;
      case 'TOP':
        x = Phaser.Math.Clamp(spawnPos.x, 150, width - 150);
        y = 35;
        break;
      case 'TOP_RIGHT':
        x = width - 45;
        y = 45;
        break;
      case 'RIGHT':
        x = width - 35;
        y = Phaser.Math.Clamp(spawnPos.y, 80, height - 80);
        break;
    }

    // Pick an available visual help container from pool
    const container = this.visualHelpPool.find(c => !c.visible) || this.visualHelpPool[0];
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

  createHUD() {
    this.hudContainer = this.add.container(0, 0).setDepth(30);
    const width = this.scale.width;

    // Top status banner background
    const bg = this.add.graphics();
    bg.fillStyle(0x18100c, 0.85);
    bg.fillRoundedRect(16, 12, width - 32, 44, 8);
    bg.lineStyle(2, 0x3d2817, 0.9);
    bg.strokeRoundedRect(16, 12, width - 32, 44, 8);
    this.hudContainer.add(bg);

    // Swats score text
    this.swatText = this.add.text(36, 24, 'SWATS: 0', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '20px',
      color: '#e5e0d8',
      stroke: '#111111',
      strokeThickness: 3
    });
    this.hudContainer.add(this.swatText);

    // Mode & Speed badge in middle
    this.modeBadge = this.add.text(width / 2, 26, '🎧 AUDIO  |  SPEED: FAST', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#ecd6c0'
    }).setOrigin(0.5, 0);
    this.hudContainer.add(this.modeBadge);

    // Bite counter text
    this.biteText = this.add.text(width - 36, 24, `BITES: 0 / ${this.maxBites}`, {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '20px',
      color: '#e64444',
      stroke: '#111111',
      strokeThickness: 3
    }).setOrigin(1, 0);
    this.hudContainer.add(this.biteText);
  }

  createReadyOverlay() {
    this.readyContainer = this.add.container(0, 0).setDepth(40);
    const width = this.scale.width;
    const height = this.scale.height;
    const cx = width / 2;

    const dim = this.add.graphics();
    dim.fillStyle(0x0e0806, 0.88);
    dim.fillRect(0, 0, width, height);
    this.readyContainer.add(dim);

    // Title & Version tag
    const title = this.add.text(cx, 110, 'MOSQUITO', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '72px',
      color: '#d94b36',
      stroke: '#1a0806',
      strokeThickness: 8
    }).setOrigin(0.5);
    this.readyContainer.add(title);

    const versionTag = this.add.text(cx, 155, 'v1.2 SWARM EDITION', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#a18b76',
      letterSpacing: 3
    }).setOrigin(0.5);
    this.readyContainer.add(versionTag);

    // Instruction Box
    const instructionBox = this.add.graphics();
    instructionBox.fillStyle(0x1a120e, 0.92);
    instructionBox.fillRoundedRect(cx - 240, 180, 480, 110, 10);
    instructionBox.lineStyle(2, 0x4a2e1d, 1);
    instructionBox.strokeRoundedRect(cx - 240, 180, 480, 110, 10);
    this.readyContainer.add(instructionBox);

    this.instructionsText = this.add.text(cx, 235,
      '1. Swarms of 5 mosquitoes attack every 2.5 seconds!\n' +
      '2. Move mouse to position the fly swatter shadow.\n' +
      '3. Left-click to smash mosquitoes before they land 3 bites!', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#decbb8',
      align: 'center',
      lineSpacing: 6
    }).setOrigin(0.5);
    this.readyContainer.add(this.instructionsText);

    // -------------------------------------------------------------
    // VERSION 1.1 CONFIGURATION CONTROLS
    // -------------------------------------------------------------

    // 1. Mode Selection Container (Audio vs No-Audio)
    const modeLabel = this.add.text(cx, 310, 'SELECT MODE:', {
      fontFamily: '"Arial Black", sans-serif',
      fontSize: '13px',
      color: '#dec5ab'
    }).setOrigin(0.5);
    this.readyContainer.add(modeLabel);

    // Mode Buttons
    this.btnModeAudio = this.createSegmentButton(cx - 145, 345, 135, 38, '🎧 Audio Mode', true, () => {
      this.setGameMode(GAME_MODES.AUDIO);
    });
    this.btnModeVisual = this.createSegmentButton(cx + 10, 345, 155, 38, '👁️ No Audio (Help)', false, () => {
      this.setGameMode(GAME_MODES.NO_AUDIO);
    });
    this.readyContainer.add([this.btnModeAudio.container, this.btnModeVisual.container]);

    // 2. Speed Selection Container (5 options)
    const speedLabel = this.add.text(cx, 400, 'MOSQUITO SPEED (5 OPTIONS):', {
      fontFamily: '"Arial Black", sans-serif',
      fontSize: '13px',
      color: '#dec5ab'
    }).setOrigin(0.5);
    this.readyContainer.add(speedLabel);

    // Speed Selector Row: [<]  [ SPEED: FAST ]  [>]
    this.speedDisplayBg = this.add.graphics();
    this.readyContainer.add(this.speedDisplayBg);

    this.speedText = this.add.text(cx, 442, 'SPEED: FAST', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '22px',
      color: '#f5efe6'
    }).setOrigin(0.5);
    this.readyContainer.add(this.speedText);

    this.btnSpeedPrev = this.createArrowButton(cx - 170, 442, '◀', () => this.cycleSpeed(-1));
    this.btnSpeedNext = this.createArrowButton(cx + 170, 442, '▶', () => this.cycleSpeed(1));
    this.readyContainer.add([this.btnSpeedPrev, this.btnSpeedNext]);

    this.updateSpeedDisplay();

    // -------------------------------------------------------------
    // START BUTTON
    // -------------------------------------------------------------
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xc23b28, 1);
    btnBg.fillRoundedRect(cx - 120, 520, 240, 56, 10);
    btnBg.lineStyle(3, 0xffeedd, 1);
    btnBg.strokeRoundedRect(cx - 120, 520, 240, 56, 10);
    this.readyContainer.add(btnBg);

    const btnText = this.add.text(cx, 548, 'START GAME', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '26px',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.readyContainer.add(btnText);

    const hitZone = this.add.zone(cx, 548, 240, 56).setInteractive({ cursor: 'pointer' });
    this.readyContainer.add(hitZone);

    hitZone.on('pointerdown', () => {
      this.startGame();
    });

    this.tweens.add({
      targets: [btnText],
      scale: 1.05,
      yoyo: true,
      repeat: -1,
      duration: 650
    });
  }

  createSegmentButton(x, y, w, h, label, active, onClick) {
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    container.add(bg);

    const text = this.add.text(w / 2, h / 2, label, {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      fontWeight: 'bold',
      color: active ? '#ffffff' : '#a89480'
    }).setOrigin(0.5);
    container.add(text);

    const zone = this.add.zone(w / 2, h / 2, w, h).setInteractive({ cursor: 'pointer' });
    container.add(zone);

    zone.on('pointerdown', onClick);

    const render = (isActive) => {
      bg.clear();
      if (isActive) {
        bg.fillStyle(0x942f20, 1);
        bg.fillRoundedRect(0, 0, w, h, 6);
        bg.lineStyle(2, 0xffbb99, 1);
        bg.strokeRoundedRect(0, 0, w, h, 6);
        text.setColor('#ffffff');
      } else {
        bg.fillStyle(0x271912, 0.9);
        bg.fillRoundedRect(0, 0, w, h, 6);
        bg.lineStyle(1.5, 0x4a2e1d, 1);
        bg.strokeRoundedRect(0, 0, w, h, 6);
        text.setColor('#a89480');
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

    const txt = this.add.text(0, 0, symbol, {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#f0dfce'
    }).setOrigin(0.5);
    container.add(txt);

    const zone = this.add.zone(0, 0, 40, 40).setInteractive({ cursor: 'pointer' });
    zone.on('pointerdown', onClick);
    container.add(zone);

    return container;
  }

  setGameMode(mode) {
    this.currentMode = mode;
    this.btnModeAudio.render(mode === GAME_MODES.AUDIO);
    this.btnModeVisual.render(mode === GAME_MODES.NO_AUDIO);
  }

  cycleSpeed(delta) {
    this.speedIndex = (this.speedIndex + delta + SPEED_KEYS.length) % SPEED_KEYS.length;
    this.updateSpeedDisplay();
  }

  updateSpeedDisplay() {
    const currentKey = SPEED_KEYS[this.speedIndex];
    const speedData = SPEED_LEVELS[currentKey];
    const cx = this.scale.width / 2;

    this.speedText.setText(`SPEED: ${speedData.label.toUpperCase()}`);

    this.speedDisplayBg.clear();
    this.speedDisplayBg.fillStyle(0x24150e, 0.95);
    this.speedDisplayBg.fillRoundedRect(cx - 130, 420, 260, 44, 8);
    this.speedDisplayBg.lineStyle(2, 0x523321, 1);
    this.speedDisplayBg.strokeRoundedRect(cx - 130, 420, 260, 44, 8);
  }

  createGameOverOverlay() {
    this.gameOverContainer = this.add.container(0, 0).setDepth(45).setVisible(false);
    const width = this.scale.width;
    const height = this.scale.height;
    const cx = width / 2;

    const dim = this.add.graphics();
    dim.fillStyle(0x1a0505, 0.92);
    dim.fillRect(0, 0, width, height);
    this.gameOverContainer.add(dim);

    const title = this.add.text(cx, 210, 'EATEN ALIVE!', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '68px',
      color: '#e62e2e',
      stroke: '#2e0505',
      strokeThickness: 8
    }).setOrigin(0.5);
    this.gameOverContainer.add(title);

    this.gameOverStats = this.add.text(cx, 310, 'You swatted 0 mosquitoes.', {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      color: '#e5d0be'
    }).setOrigin(0.5);
    this.gameOverContainer.add(this.gameOverStats);

    // Retry Button
    const retryBg = this.add.graphics();
    retryBg.fillStyle(0x942216, 1);
    retryBg.fillRoundedRect(cx - 120, 410, 240, 56, 10);
    retryBg.lineStyle(3, 0xffeedd, 1);
    retryBg.strokeRoundedRect(cx - 120, 410, 240, 56, 10);
    this.gameOverContainer.add(retryBg);

    const retryText = this.add.text(cx, 438, 'TRY AGAIN', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '26px',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.gameOverContainer.add(retryText);

    const retryZone = this.add.zone(cx, 438, 240, 56).setInteractive({ cursor: 'pointer' });
    this.gameOverContainer.add(retryZone);

    retryZone.on('pointerdown', () => {
      this.restartGame();
    });
  }

  createDebugOverlay() {
    this.debugContainer = this.add.container(16, 68).setDepth(35).setVisible(false);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRoundedRect(0, 0, 340, 180, 6);
    this.debugContainer.add(bg);

    this.debugText = this.add.text(12, 10, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#33ff33',
      lineSpacing: 4
    });
    this.debugContainer.add(this.debugText);
    this.updateDebugOverlay();
  }

  updateDebugOverlay(mouseX = this.input.x, mouseY = this.input.y) {
    if (!this.debugText) return;
    const speedKey = SPEED_KEYS[this.speedIndex];
    const mx = Math.round(mouseX || 0);
    const my = Math.round(mouseY || 0);
    const activeCount = this.mosquitoManager ? this.mosquitoManager.getActiveCount() : 0;
    this.debugText.setText(
      `[DEBUG MODE (D to toggle)]\n` +
      `Mouse (X, Y)     : ${mx}, ${my}\n` +
      `Active Mosquitos : ${activeCount}\n` +
      `Wave Interval    : 2.5s (5 per wave)\n` +
      `Left Leg Points  : 0 - 14 (Cyan)\n` +
      `Right Leg Points : 0 - 14 (Magenta)\n` +
      `Mode             : ${this.currentMode}\n` +
      `Speed Level      : ${SPEED_LEVELS[speedKey]?.label}\n` +
      `Force Keys       : 1:L 2:TL 3:T 4:TR 5:R`
    );
  }

  setupDebugKeys() {
    // D to toggle debug overlay and collider outlines
    this.input.keyboard.on('keydown-D', () => {
      this.debugMode = !this.debugMode;
      this.debugContainer.setVisible(this.debugMode);
      this.environment.setDebugVisible(this.debugMode);
      this.updateDebugOverlay();

      // In start menu (READY state), toggle start UI visibility so colliders are completely unobstructed
      if (this.gameState === GAME_STATES.READY) {
        this.readyContainer.setVisible(!this.debugMode);
      }
    });

    // Space key to start game directly
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.gameState === GAME_STATES.READY) {
        this.startGame();
      }
    });

    // 1-5 keys to force specific attack directions for testing
    this.input.keyboard.on('keydown-ONE', () => {
      if (this.gameState === GAME_STATES.PLAYING) this.mosquitoManager.triggerAttack('LEFT');
    });
    this.input.keyboard.on('keydown-TWO', () => {
      if (this.gameState === GAME_STATES.PLAYING) this.mosquitoManager.triggerAttack('TOP_LEFT');
    });
    this.input.keyboard.on('keydown-THREE', () => {
      if (this.gameState === GAME_STATES.PLAYING) this.mosquitoManager.triggerAttack('TOP');
    });
    this.input.keyboard.on('keydown-FOUR', () => {
      if (this.gameState === GAME_STATES.PLAYING) this.mosquitoManager.triggerAttack('TOP_RIGHT');
    });
    this.input.keyboard.on('keydown-FIVE', () => {
      if (this.gameState === GAME_STATES.PLAYING) this.mosquitoManager.triggerAttack('RIGHT');
    });
  }

  startGame() {
    this.audio.init();
    this.gameState = GAME_STATES.PLAYING;
    this.readyContainer.setVisible(false);
    this.hideVisualHelp();
    this.bites = 0;
    this.swats = 0;

    // Apply configured settings to mosquito manager
    const currentSpeedKey = SPEED_KEYS[this.speedIndex];
    this.mosquitoManager.setMode(this.currentMode);
    this.mosquitoManager.setSpeed(currentSpeedKey);

    this.updateHUD();
    this.mosquitoManager.start();
  }

  restartGame() {
    this.gameOverContainer.setVisible(false);
    this.splatterGraphics.clear();
    this.environment.reset();
    this.hideVisualHelp();
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
  }

  drawBloodSplat(x, y) {
    this.splatterGraphics.fillStyle(0x780d16, 0.85);
    this.splatterGraphics.fillCircle(x, y, Phaser.Math.Between(6, 11));
    const droplets = Phaser.Math.Between(4, 8);
    for (let i = 0; i < droplets; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.Between(10, 24);
      const rad = Phaser.Math.Between(2, 4);
      this.splatterGraphics.fillCircle(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, rad);
    }
  }

  handleMosquitoBite(x, y) {
    this.bites++;
    this.updateHUD();

    // Flash screen red
    this.cameras.main.flash(200, 180, 20, 20, false);

    if (this.bites >= this.maxBites) {
      this.triggerGameOver();
    }
  }

  triggerGameOver() {
    this.gameState = GAME_STATES.GAME_OVER;
    this.hideVisualHelp();
    this.mosquitoManager.stop();
    this.audio.stopAllMosquitoBuzzes();

    this.gameOverStats.setText(`You managed to swat ${this.swats} mosquito${this.swats === 1 ? '' : 'es'}.`);
    this.gameOverContainer.setVisible(true);
  }

  updateHUD() {
    this.swatText.setText(`SWATS: ${this.swats}`);
    this.biteText.setText(`BITES: ${this.bites} / ${this.maxBites}`);

    const modeStr = this.currentMode === GAME_MODES.AUDIO ? '🎧 AUDIO' : '👁️ VISUAL HELP';
    const currentSpeedKey = SPEED_KEYS[this.speedIndex];
    const speedLabel = SPEED_LEVELS[currentSpeedKey]?.label.toUpperCase();
    this.modeBadge.setText(`${modeStr}  |  SPEED: ${speedLabel}`);
  }

  shutdown() {
    this.hideVisualHelp();
    this.mosquitoManager.destroy();
    this.swatter.destroy();
    this.environment.destroy();
    this.audio.destroy();
  }
}
