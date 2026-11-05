export class DebugHud {
  constructor(scene) {
    this.scene = scene;
    this.enabled = false;
    this.container = scene.add.container(16, 68).setDepth(35).setVisible(false);
    const background = scene.add.graphics();
    background.fillStyle(0x000000, 0.8);
    background.fillRoundedRect(0, 0, 340, 140, 6);
    this.container.add(background);
    this.text = scene.add.text(12, 10, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#33ff33",
      lineSpacing: 4,
    });
    this.container.add(this.text);
    this.update();
  }

  toggle() {
    this.enabled = !this.enabled;
    this.container.setVisible(this.enabled);
    this.update();
  }

  update(mouseX = this.scene.input.x, mouseY = this.scene.input.y) {
    const activeCount = this.scene.mosquitoManager?.getActiveCount() ?? 0;
    this.text.setText(
      `[DEBUG MODE (D to toggle)]\n` +
      `Mouse (X, Y)     : ${Math.round(mouseX || 0)}, ${Math.round(mouseY || 0)}\n` +
      `Active Mosquitos : ${activeCount}\n` +
      `Mode             : ${this.scene.currentMode}\n` +
      `Test Mode        : ${this.scene.debugTools?.testMode.enabled ? "ON" : "OFF"} (T)\n` +
      `Enemies          : Numpad 1-7\n` +
      `Formations       : V/C/O/B\n` +
      `Phases           : F1-F5`
    );
  }

  destroy() {
    this.container.destroy();
  }
}
