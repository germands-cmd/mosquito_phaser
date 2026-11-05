import Phaser from "phaser";

/**
 * PauseOverlay.js
 * Manages the in-game pause screen overlay and ESC keyboard toggle.
 */
export class PauseOverlay {
  /**
   * @param {Phaser.Scene} scene
   * @param {Object} callbacks
   * @param {Function} callbacks.onResume
   * @param {Function} callbacks.onRestart
   * @param {Function} callbacks.onMenu
   */
  constructor(scene, callbacks = {}) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.container = this.scene.add
      .container(0, 0)
      .setDepth(45)
      .setVisible(false);

    this.build();
    this.setupKeyboard();
  }

  build() {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const cx = width / 2;

    // Semi-transparent black background
    const dim = this.scene.add.graphics();
    dim.fillStyle(0x0e0806, 0.88);
    dim.fillRect(0, 0, width, height);
    this.container.add(dim);

    // Title
    const title = this.scene.add
      .text(cx, 210, "PAUSED", {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: "60px",
        color: "#f0dfce",
        stroke: "#1a0806",
        strokeThickness: 6,
        resolution: 2,
      })
      .setOrigin(0.5);
    this.container.add(title);

    // Resume instruction label
    const resumeLabel = this.scene.add
      .text(cx, 275, "Press ESC to resume", {
        fontFamily: "sans-serif",
        fontSize: "16px",
        color: "#c4b3a4",
        letterSpacing: 1,
        resolution: 2,
      })
      .setOrigin(0.5);
    this.container.add(resumeLabel);

    // Restart button
    const restartBtn = this.createButton(cx, 350, 220, 50, "RESTART", () => {
      this.callbacks.onRestart?.();
    });
    this.container.add(restartBtn);

    // Main menu button
    const menuBtn = this.createButton(cx, 420, 220, 50, "MAIN MENU", () => {
      this.callbacks.onMenu?.();
    });
    this.container.add(menuBtn);
  }

  createButton(cx, cy, w, h, text, onClick) {
    const container = this.scene.add.container(cx, cy);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x942216, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    bg.lineStyle(2, 0xffeedd, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    container.add(bg);

    const txt = this.scene.add
      .text(0, 0, text, {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: "22px",
        color: "#ffffff",
        resolution: 2,
      })
      .setOrigin(0.5);
    container.add(txt);

    const zone = this.scene.add
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

  setupKeyboard() {
    this.scene.input.keyboard.on("keydown-ESC", () => {
      this.callbacks.onToggle?.();
    });
  }

  show() {
    this.container.setVisible(true);
  }

  hide() {
    this.container.setVisible(false);
  }

  isVisible() {
    return this.container.visible;
  }

  destroy() {
    this.container.destroy();
  }
}
