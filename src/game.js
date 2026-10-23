import Phaser from 'phaser';
import GameScene from './scenes/GameScene.js';

/**
 * Phaser 3 Game Configuration for "Mosquito"
 */
const config = {
  type: Phaser.AUTO,
  width: 1376,
  height: 768,
  parent: 'juego',
  backgroundColor: '#1a100a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [GameScene]
};

new Phaser.Game(config);
