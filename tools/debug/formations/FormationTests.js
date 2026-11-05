export class FormationTests {
  constructor(scene, testMode) {
    this.scene = scene;
    this.testMode = testMode;
    this.handlers = [];
    for (const [key, spawn] of [
      ["V", "spawnVFormation"],
      ["C", "spawnColumnFormation"],
      ["O", "spawnCircularFormation"],
      ["B", "spawnOscillatingSwarm"],
    ]) {
      this.bind(`keydown-${key}`, () => {
        if (this.scene.gameState === "PLAYING" && this.testMode.enabled) {
          this.scene.mosquitoManager[spawn]("TOP");
        }
      });
    }
  }

  bind(event, handler) {
    this.scene.input.keyboard?.on(event, handler);
    this.handlers.push([event, handler]);
  }

  destroy() {
    for (const [event, handler] of this.handlers) {
      this.scene.input.keyboard?.off(event, handler);
    }
  }
}
