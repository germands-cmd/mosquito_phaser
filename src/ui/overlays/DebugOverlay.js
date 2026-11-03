import Phaser from "phaser";
import { MOSQUITO_TYPES, MOSQUITO_VISUALS } from "../../entities/Mosquito.js";

/**
 * DebugOverlay.js
 * Manages the top-left developer debug information panel and keyboard shortcuts:
 * - D to toggle debug HUD and leg colliders
 * - T to toggle enemy test mode
 * - Numpad 1-7 to spawn specific enemy variants
 * - 6-0 to force specific spawn directions
 * - Space to fast-start game
 */
export class DebugOverlay {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.isEnabled = false;
    this.enemyTestMode = false;
    this.debugInfo = { direction: "None", duration: "0s" };

    this.container = this.scene.add
      .container(16, 68)
      .setDepth(35)
      .setVisible(false);

    this.build();
    this.setupShortcuts();
  }

  build() {
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRoundedRect(0, 0, 340, 180, 6);
    this.container.add(bg);

    this.debugText = this.scene.add.text(12, 10, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#33ff33",
      lineSpacing: 4,
    });
    this.container.add(this.debugText);
    this.update();
  }

  setDebugInfo(direction, duration) {
    this.debugInfo = { direction, duration };
    if (this.isEnabled) {
      this.update();
    }
  }

  update(mouseX = this.scene.input.x, mouseY = this.scene.input.y) {
    if (!this.debugText) return;
    const mx = Math.round(mouseX || 0);
    const my = Math.round(mouseY || 0);
    const activeCount = this.scene.mosquitoManager
      ? this.scene.mosquitoManager.getActiveCount()
      : 0;

    this.debugText.setText(
      `[DEBUG MODE (D to toggle)]\n` +
        `Mouse (X, Y)     : ${mx}, ${my}\n` +
        `Active Mosquitos : ${activeCount}\n` +
        `Wave Interval    : 2.5s (5 per wave)\n` +
        `Left Leg Points  : 0 - 14 (Cyan)\n` +
        `Right Leg Points : 0 - 14 (Magenta)\n` +
        `Mode             : ${this.scene.currentMode}\n` +
        `Force Keys       : 6:L 7:TL 8:T 9:TR 0:R, V:V, C:Column, O:Circle, B:Oscillating\n` +
        `Test Mode        : ${this.enemyTestMode ? "ON" : "OFF"} (T)\n` +
        `Enemy Tests      : Numpad 1:Std 2:Inc 3:Baby\n` +
        `                  4:Coward 5:Drunk 6:Hematophage 7:Zigzag\n` +
        `Abilities        : [1] Bomb, [2] Transfusion (Inputs: Q, W, E, R)`
    );
  }

  setupShortcuts() {
    const kb = this.scene.input.keyboard;
    if (!kb) return;

    // Keyboard capture to avoid browser scrolling
    kb.addCapture([
      "Q", "W", "E", "R",
      "UP", "DOWN", "LEFT", "RIGHT",
      "ONE", "TWO",
      "NUMPAD_ONE", "NUMPAD_TWO", "NUMPAD_THREE",
      "NUMPAD_FOUR", "NUMPAD_FIVE", "NUMPAD_SIX", "NUMPAD_SEVEN",
    ]);

    // D: Toggle debug overlay & collider visualizer
    kb.on("keydown-D", () => {
      this.toggleDebug();
    });

    // T: Toggle enemy test mode (pauses automatic waves)
    kb.on("keydown-T", () => {
      if (this.scene.gameState !== "PLAYING") return;
      this.enemyTestMode = !this.enemyTestMode;
      if (this.enemyTestMode) {
        this.scene.mosquitoManager.stop();
      } else {
        this.scene.mosquitoManager.start();
      }
      this.isEnabled = true;
      this.container.setVisible(true);
      this.update();
    });

    // SPACE: Quick-start from ready screen
    kb.on("keydown-SPACE", () => {
      if (this.scene.gameState === "READY") {
        this.scene.startGame();
      }
    });

    // Numpad 1-7: Spawn test enemies
    const testEnemies = [
      ["NUMPAD_ONE", MOSQUITO_TYPES.STANDARD],
      ["NUMPAD_TWO", MOSQUITO_TYPES.INCUBATOR],
      ["NUMPAD_THREE", MOSQUITO_TYPES.BABY],
      ["NUMPAD_FOUR", MOSQUITO_TYPES.COWARD],
      ["NUMPAD_FIVE", MOSQUITO_TYPES.DRUNK],
      ["NUMPAD_SIX", MOSQUITO_TYPES.HEMATOPHAGE],
      ["NUMPAD_SEVEN", MOSQUITO_TYPES.ZIGZAG],
    ];
    testEnemies.forEach(([key, type]) => {
      kb.on(`keydown-${key}`, () => {
        if (this.scene.gameState !== "PLAYING" || !this.enemyTestMode) return;
        this.scene.mosquitoManager.spawnTestEnemy(type, "TOP");
        this.setDebugInfo(MOSQUITO_VISUALS[type]?.label || type, "test");
      });
    });

    // 6-0: Force directional attacks
    kb.on("keydown-SIX", () => {
      if (this.scene.gameState === "PLAYING")
        this.scene.mosquitoManager.triggerAttack("LEFT");
    });
    kb.on("keydown-SEVEN", () => {
      if (this.scene.gameState === "PLAYING")
        this.scene.mosquitoManager.triggerAttack("TOP_LEFT");
    });
    kb.on("keydown-EIGHT", () => {
      if (this.scene.gameState === "PLAYING")
        this.scene.mosquitoManager.triggerAttack("TOP");
    });
    kb.on("keydown-NINE", () => {
      if (this.scene.gameState === "PLAYING")
        this.scene.mosquitoManager.triggerAttack("TOP_RIGHT");
    });
    kb.on("keydown-ZERO", () => {
      if (this.scene.gameState === "PLAYING")
        this.scene.mosquitoManager.triggerAttack("RIGHT");
    });
    kb.on("keydown-V", () => {
      if (this.scene.gameState === "PLAYING" && this.enemyTestMode) {
        this.scene.mosquitoManager.spawnVFormation("TOP");
      }
    });
    kb.on("keydown-C", () => {
      if (this.scene.gameState === "PLAYING" && this.enemyTestMode) {
        this.scene.mosquitoManager.spawnColumnFormation("TOP");
      }
    });
    kb.on("keydown-O", () => {
      if (this.scene.gameState === "PLAYING" && this.enemyTestMode) {
        this.scene.mosquitoManager.spawnCircularFormation("TOP");
      }
    });
    kb.on("keydown-B", () => {
      if (this.scene.gameState === "PLAYING" && this.enemyTestMode) {
        this.scene.mosquitoManager.spawnOscillatingSwarm("TOP");
      }
    });
  }

  toggleDebug() {
    this.isEnabled = !this.isEnabled;
    this.container.setVisible(this.isEnabled);
    this.scene.environment?.setDebugVisible(this.isEnabled);
    this.update();

    if (this.scene.gameState === "READY" && this.scene.readyOverlay) {
      this.scene.readyOverlay.container.setVisible(!this.isEnabled);
    }
  }

  show() {
    this.container.setVisible(true);
  }

  hide() {
    this.container.setVisible(false);
  }

  destroy() {
    this.container.destroy();
  }
}
