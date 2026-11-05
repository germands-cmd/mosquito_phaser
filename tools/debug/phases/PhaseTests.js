import { PHASE_CONFIGS } from "../../../src/progression/PhaseConfig.js";

export class PhaseTests {
  constructor(scene) {
    this.scene = scene;
    this.handlers = [];
    ["F1", "F2", "F3", "F4", "F5"].forEach((key, index) => {
      this.bind(`keydown-${key}`, () => this.start(index));
    });
  }

  bind(event, handler) {
    this.scene.input.keyboard?.on(event, handler);
    this.handlers.push([event, handler]);
  }

  start(index) {
    if (!PHASE_CONFIGS[index] || this.scene.debugTools.phaseTransitioning) return;
    this.scene.debugTools.phaseTransitioning = true;
    this.scene.fadeToBlack(() => {
      this.scene.phaseResultsOverlay.hide();
      this.scene.readyOverlay.hide();
      this.scene.pauseOverlay.hide();
      this.scene.gameOverOverlay.hide();
      this.scene.phaseTransitioning = false;
      this.scene.gameState = "PLAYING";
      this.scene.audio.init();
      this.scene.mosquitoManager.setMode(this.scene.currentMode);
      this.scene.startPhase(index);
      this.scene.debugTools.phaseTransitioning = false;
      this.scene.fadeFromBlack();
    });
  }

  destroy() {
    for (const [event, handler] of this.handlers) {
      this.scene.input.keyboard?.off(event, handler);
    }
  }
}
