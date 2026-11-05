export class PhaseResultsOverlay {
  constructor(scene, callbacks = {}) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.container = scene.add.container(0, 0).setDepth(50).setVisible(false);
    this.build();
  }

  build() {
    const { width, height } = this.scene.scale;
    const center = width / 2;
    const dim = this.scene.add.graphics();
    dim.fillStyle(0x0e0806, 0.94);
    dim.fillRect(0, 0, width, height);
    this.container.add(dim);
    this.title = this.scene.add.text(center, 170, "", {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: "58px",
      color: "#f0d7bf"
    }).setOrigin(0.5);
    this.stats = this.scene.add.text(center, 290, "", {
      fontFamily: "sans-serif",
      fontSize: "24px",
      color: "#e5d0be",
      align: "center"
    }).setOrigin(0.5);
    this.container.add([this.title, this.stats]);
    this.next = this.createButton(center, 430, "NEXT PHASE", () => this.callbacks.onNext?.());
    this.menu = this.createButton(center, 510, "MAIN MENU", () => this.callbacks.onMenu?.());
  }

  createButton(x, y, label, onClick) {
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x942216, 1);
    bg.fillRoundedRect(x - 145, y - 28, 290, 56, 10);
    bg.lineStyle(2, 0xffeedd, 1);
    bg.strokeRoundedRect(x - 145, y - 28, 290, 56, 10);
    const text = this.scene.add.text(x, y, label, {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: "24px",
      color: "#ffffff"
    }).setOrigin(0.5);
    const zone = this.scene.add.zone(x, y, 290, 56).setInteractive({ cursor: "pointer" });
    zone.on("pointerdown", onClick);
    this.container.add([bg, text, zone]);
    return { bg, text, zone };
  }

  show({ phaseId, eliminated, bites, final = false }) {
    this.title.setText(final ? "GAME COMPLETE" : `PHASE ${phaseId} COMPLETE`);
    this.stats.setText(`Mosquitoes eliminated: ${eliminated}\nMosquito bites received: ${bites}`);
    this.next.bg.setVisible(!final);
    this.next.text.setVisible(!final);
    this.next.zone.setVisible(!final);
    this.container.setVisible(true);
  }

  hide() {
    this.container.setVisible(false);
  }

  destroy() {
    this.container.destroy();
  }
}
