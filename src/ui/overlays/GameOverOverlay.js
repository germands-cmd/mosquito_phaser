import Phaser from "phaser";

/**
 * GameOverOverlay.js
 * Manages the game over / casualty screen, final score statistics, and replay button.
 */
export class GameOverOverlay {
  /**
   * @param {Phaser.Scene} scene
   * @param {Object} callbacks
   * @param {Function} callbacks.onRetry
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
  }

  build() {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const cx = width / 2;

    const dim = this.scene.add.graphics();
    dim.fillStyle(0x1a0505, 0.92);
    dim.fillRect(0, 0, width, height);
    this.container.add(dim);

    const title = this.scene.add
      .text(cx, 210, "EATEN ALIVE!", {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: "68px",
        color: "#e62e2e",
        stroke: "#2e0505",
        strokeThickness: 8,
        resolution: 2,
      })
      .setOrigin(0.5);
    this.container.add(title);

    this.statsText = this.scene.add
      .text(cx, 310, "You swatted 0 mosquitoes.", {
        fontFamily: "sans-serif",
        fontSize: "22px",
        color: "#e5d0be",
        resolution: 2,
      })
      .setOrigin(0.5);
    this.container.add(this.statsText);

    // Retry Button
    const retryBg = this.scene.add.graphics();
    retryBg.fillStyle(0x942216, 1);
    retryBg.fillRoundedRect(cx - 120, 410, 240, 56, 10);
    retryBg.lineStyle(3, 0xffeedd, 1);
    retryBg.strokeRoundedRect(cx - 120, 410, 240, 56, 10);
    this.container.add(retryBg);

    const retryText = this.scene.add
      .text(cx, 438, "TRY AGAIN", {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: "26px",
        color: "#ffffff",
        resolution: 2,
      })
      .setOrigin(0.5);
    this.container.add(retryText);

    const retryZone = this.scene.add
      .zone(cx, 438, 240, 56)
      .setInteractive({ cursor: "pointer" });
    this.container.add(retryZone);

    retryZone.on("pointerdown", () => {
      this.callbacks.onRetry?.();
    });
  }

  show(swatsCount) {
    this.statsText.setText(
      `You managed to swat ${swatsCount} mosquito${swatsCount === 1 ? "" : "es"}`
    );
    this.container.setVisible(true);
  }

  hide() {
    this.container.setVisible(false);
  }

  destroy() {
    this.container.destroy();
  }
}
