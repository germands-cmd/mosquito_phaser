import { MOSQUITO_TYPES } from "../../../src/entities/Mosquito.js";

const ENEMIES = [
  ["NUMPAD_ONE", MOSQUITO_TYPES.STANDARD],
  ["NUMPAD_TWO", MOSQUITO_TYPES.INCUBATOR],
  ["NUMPAD_THREE", MOSQUITO_TYPES.BABY],
  ["NUMPAD_FOUR", MOSQUITO_TYPES.COWARD],
  ["NUMPAD_FIVE", MOSQUITO_TYPES.DRUNK],
  ["NUMPAD_SIX", MOSQUITO_TYPES.HEMATOPHAGE],
  ["NUMPAD_SEVEN", MOSQUITO_TYPES.ZIGZAG],
];

export class EnemyTests {
  constructor(scene, testMode) {
    this.scene = scene;
    this.testMode = testMode;
    this.handlers = [];
    for (const [key, type] of ENEMIES) {
      this.bind(`keydown-${key}`, () => {
        if (this.scene.gameState === "PLAYING" && this.testMode.enabled) {
          this.scene.mosquitoManager.spawnSingleMosquito("TOP", type);
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
