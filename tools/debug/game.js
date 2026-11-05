import Phaser from "phaser";
import GameScene from "../../src/scenes/GameScene.js";
import { DebugTools } from "./DebugTools.js";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: 1376,
  height: 768,
  parent: "juego",
  backgroundColor: "#1a100a",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [GameScene],
});

const attachTools = () => {
  const scene = game.scene.getScene("game");
  if (scene?.sys?.isActive()) new DebugTools(scene);
  else setTimeout(attachTools, 50);
};

attachTools();
