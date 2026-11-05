import Phaser from 'phaser';
import GameScene from './scenes/GameScene.js';
import MainMenuScene from './scenes/MainMenuScene.js';

/**
 * Phaser 3 Game Configuration for "Mosquito"
 */
const config = {
  type: Phaser.AUTO,
  width: 1376,
  height: 768,
  parent: 'juego',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [MainMenuScene, GameScene]
};

new Phaser.Game(config);
