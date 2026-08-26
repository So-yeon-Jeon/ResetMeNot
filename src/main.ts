import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './game-config';
import './style.css';

class BootstrapScene extends Phaser.Scene {
  constructor() {
    super('bootstrap');
  }

  create(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.add
      .text(centerX, centerY - 24, 'RESET ME NOT', {
        color: '#efe9dc',
        fontFamily: 'Georgia, serif',
        fontSize: '40px',
        letterSpacing: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY + 30, 'The world remembers.', {
        color: '#938ba5',
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#111019',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootstrapScene],
};

new Phaser.Game(config);
