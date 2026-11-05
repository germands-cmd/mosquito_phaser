export class TestMode {
  constructor(scene) {
    this.scene = scene;
    this.enabled = false;
  }

  toggle() {
    if (this.scene.gameState !== "PLAYING") return;
    this.enabled = !this.enabled;
    if (this.enabled) this.scene.mosquitoManager.stopSpawning();
    else this.scene.mosquitoManager.start(this.scene.mosquitoManager.phaseConfig);
  }
}
