import Phaser from "phaser";
import {
  GAME_MODES,
} from "../../managers/MosquitoManager.js";

/**
 * ReadyOverlay.js
 * Manages the main menu / ready title screen:
 * - Mode selection (Audio Mode vs Visual Assistance)
 * - Animated START GAME button
 */
export class ReadyOverlay {
  /**
   * @param {Phaser.Scene} scene
   * @param {Object} options
   * @param {string} [options.defaultMode=GAME_MODES.AUDIO]
   * @param {Function} options.onStart
   */
  constructor(scene, options = {}) {
    this.scene = scene;
    this.currentMode = options.defaultMode || GAME_MODES.AUDIO;
    this.onStart = options.onStart;

    this.container = this.scene.add.container(0, 0).setDepth(40);
    this.build();
  }

  build() {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const cx = width / 2;

    const dim = this.scene.add.graphics();
    dim.fillStyle(0x0e0806, 0.88);
    dim.fillRect(0, 0, width, height);
    this.container.add(dim);

    // Title
    const title = this.scene.add
      .text(cx, 160, "MOSQUITO", {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: "76px",
        color: "#d94b36",
        stroke: "#1a0806",
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.container.add(title);

    // Version in bottom-left corner
    const versionTag = this.scene.add
      .text(24, height - 20, "v1.2", {
        fontFamily: "sans-serif",
        fontSize: "14px",
        fontWeight: "bold",
        color: "#8c7762",
        letterSpacing: 2,
      })
      .setOrigin(0, 1);
    this.container.add(versionTag);

    // 1. Mode Selection Container (Audio vs No-Audio)
    const modeLabel = this.scene.add
      .text(cx, 270, "SELECT MODE:", {
        fontFamily: '"Arial Black", sans-serif',
        fontSize: "13px",
        color: "#dec5ab",
      })
      .setOrigin(0.5);
    this.container.add(modeLabel);

    this.btnModeAudio = this.createSegmentButton(
      cx - 145,
      302,
      135,
      38,
      "Audio Mode",
      this.currentMode === GAME_MODES.AUDIO,
      () => this.setGameMode(GAME_MODES.AUDIO)
    );
    this.btnModeVisual = this.createSegmentButton(
      cx + 10,
      302,
      155,
      38,
      "No Audio (Help)",
      this.currentMode === GAME_MODES.NO_AUDIO,
      () => this.setGameMode(GAME_MODES.NO_AUDIO)
    );
    this.container.add([
      this.btnModeAudio.container,
      this.btnModeVisual.container,
    ]);

    // 2. START BUTTON
    const btnBg = this.scene.add.graphics();
    btnBg.fillStyle(0xc23b28, 1);
    btnBg.fillRoundedRect(cx - 120, 510, 240, 56, 10);
    btnBg.lineStyle(3, 0xffeedd, 1);
    btnBg.strokeRoundedRect(cx - 120, 510, 240, 56, 10);
    this.container.add(btnBg);

    const btnText = this.scene.add
      .text(cx, 538, "START GAME", {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: "26px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    this.container.add(btnText);

    const hitZone = this.scene.add
      .zone(cx, 538, 240, 56)
      .setInteractive({ cursor: "pointer" });
    this.container.add(hitZone);

    hitZone.on("pointerdown", () => {
      if (this.onStart) {
        this.onStart(this.currentMode);
      }
    });

    this.scene.tweens.add({
      targets: [btnText],
      scale: 1.05,
      yoyo: true,
      repeat: -1,
      duration: 650,
    });
  }

  createSegmentButton(x, y, w, h, label, active, onClick) {
    const container = this.scene.add.container(x, y);
    const bg = this.scene.add.graphics();
    container.add(bg);

    const text = this.scene.add
      .text(w / 2, h / 2, label, {
        fontFamily: "sans-serif",
        fontSize: "13px",
        fontWeight: "bold",
        color: active ? "#ffffff" : "#a89480",
      })
      .setOrigin(0.5);
    container.add(text);

    const zone = this.scene.add
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
    const container = this.scene.add.container(x, y);
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x352117, 1);
    bg.fillCircle(0, 0, 20);
    bg.lineStyle(2, 0x5a3928, 1);
    bg.strokeCircle(0, 0, 20);
    container.add(bg);

    const txt = this.scene.add
      .text(0, 0, symbol, {
        fontFamily: "sans-serif",
        fontSize: "16px",
        color: "#f0dfce",
      })
      .setOrigin(0.5);
    container.add(txt);

    const zone = this.scene.add
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
