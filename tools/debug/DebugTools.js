import { DebugHud } from "./hud/DebugHud.js";
import { EnemyTests } from "./enemy-tests/EnemyTests.js";
import { FormationTests } from "./formations/FormationTests.js";
import { PhaseTests } from "./phases/PhaseTests.js";
import { TestMode } from "./test-mode/TestMode.js";
import { ColliderDebug } from "./colliders/ColliderDebug.js";

export class DebugTools {
  constructor(scene) {
    this.scene = scene;
    this.phaseTransitioning = false;
    this.testMode = new TestMode(scene);
    scene.debugTools = this;
    this.hud = new DebugHud(scene);
    this.colliders = new ColliderDebug(scene);
    this.enemyTests = new EnemyTests(scene, this.testMode);
    this.formationTests = new FormationTests(scene, this.testMode);
    this.phaseTests = new PhaseTests(scene);
    this.bind("keydown-D", () => this.toggleHud());
    this.bind("keydown-T", () => this.testMode.toggle());
    this.scene.input.keyboard?.addCapture([
      "D", "T",
      "NUMPAD_ONE", "NUMPAD_TWO", "NUMPAD_THREE",
      "NUMPAD_FOUR", "NUMPAD_FIVE", "NUMPAD_SIX", "NUMPAD_SEVEN",
      "V", "C", "O", "B", "F1", "F2", "F3", "F4", "F5",
    ]);
    this.bind("pointermove", (pointer) => {
      if (this.hud.enabled) this.hud.update(pointer.worldX, pointer.worldY);
    }, scene.input);
  }

  bind(event, handler, emitter = this.scene.input.keyboard) {
    emitter?.on(event, handler);
    (this.handlers ??= []).push([emitter, event, handler]);
  }

  toggleHud() {
    this.hud.toggle();
    this.colliders.setVisible(this.hud.enabled);
  }

  destroy() {
    for (const [emitter, event, handler] of this.handlers ?? []) {
      emitter?.off(event, handler);
    }
    this.hud.destroy();
    this.colliders.destroy();
    this.enemyTests.destroy();
    this.formationTests.destroy();
    this.phaseTests.destroy();
    delete this.scene.debugTools;
  }
}
