import Phaser from "phaser";

/**
 * VisualHelpIndicator.js
 * Manages the pooled visual warning badges ("Little Red Help") for No-Audio mode,
 * alerting the player to incoming mosquitoes from screen perimeters.
 */
export class VisualHelpIndicator {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} [poolSize=15]
   */
  constructor(scene, poolSize = 15) {
    this.scene = scene;
    this.poolSize = poolSize;
    this.pool = [];
    this.createPool();
  }

  createPool() {
    for (let i = 0; i < this.poolSize; i++) {
      const container = this.scene.add.container(0, 0).setDepth(25).setVisible(false);

      const pulse = this.scene.add.graphics();
      pulse.fillStyle(0xff1122, 0.4);
      pulse.fillCircle(0, 0, 24);
      container.add(pulse);

      const icon = this.scene.add.graphics();
      icon.fillStyle(0xd91424, 0.95);
      icon.fillCircle(0, 0, 16);
      icon.lineStyle(3, 0xffffff, 1);
      icon.strokeCircle(0, 0, 16);
      container.add(icon);

      const text = this.scene.add
        .text(0, 0, "!", {
          fontFamily: '"Impact", "Arial Black", sans-serif',
          fontSize: "20px",
          color: "#ffffff",
        })
        .setOrigin(0.5);
      container.add(text);

      this.scene.tweens.add({
        targets: container,
        scaleX: 1.25,
        scaleY: 1.25,
        yoyo: true,
        repeat: -1,
        duration: 220,
      });

      this.pool.push(container);
    }
  }

  show(dirData, spawnPos, durationSec) {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
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

    const container = this.pool.find((c) => !c.visible) || this.pool[0];
    container.setPosition(x, y);
    container.setVisible(true);

    this.scene.time.delayedCall(durationSec * 1000, () => {
      container.setVisible(false);
    });
  }

  hideAll() {
    for (const c of this.pool) {
      c.setVisible(false);
    }
  }

  destroy() {
    for (const c of this.pool) {
      c.destroy();
    }
    this.pool = [];
  }
}
