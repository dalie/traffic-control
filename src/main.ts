import 'phaser';

import { SimpleRoadScene } from './scenes/SimpleRoadScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'gamediv',
  backgroundColor: '#508040',
  physics: {
    default: 'arcade',
    arcade: {
      debug: true,
    },
  },
  scene: [SimpleRoadScene],
  scale: {
    parent: 'gamediv',
    mode: Phaser.Scale.FIT,
    width: 1920,
    height: 1080,
  },
};

const game = new Phaser.Game(config);
