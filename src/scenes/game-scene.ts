import Phaser from 'phaser';
import { GRID_SIZE } from '../game-config';
import type { GameAction } from '../game/action';
import { DEMO_MAP, DEMO_MAP_ROWS, PLAYER_START } from '../game/demo-map';
import { advanceTime, applyAction, createGameState, type GameState } from '../game/game-state';
import type { Direction, GridPosition } from '../game/grid';

const MOVE_DURATION_MS = 110;
const FLOOR_COLOR = 0x24212e;
const WALL_COLOR = 0x51485d;
const WALL_EDGE_COLOR = 0x766981;
const PLAYER_COLOR = 0xd9b6a3;

type MovementKeys = Readonly<{
  up: Phaser.Input.Keyboard.Key[];
  down: Phaser.Input.Keyboard.Key[];
  left: Phaser.Input.Keyboard.Key[];
  right: Phaser.Input.Keyboard.Key[];
}>;

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private gameState: GameState = createGameState(PLAYER_START);
  private movementKeys!: MovementKeys;
  private isMoving = false;
  private mapOrigin = { x: 0, y: 0 };

  constructor() {
    super('game');
  }

  create(): void {
    this.mapOrigin = {
      x: Math.floor((this.scale.width - DEMO_MAP.width * GRID_SIZE) / 2),
      y: Math.floor((this.scale.height - DEMO_MAP.height * GRID_SIZE) / 2),
    };

    this.drawMap();
    this.createPlayer();
    this.createInstructions();
    this.createKeyboardControls();
  }

  update(time: number): void {
    if (this.isMoving) return;

    this.gameState = advanceTime(this.gameState, time);
    const direction = this.readDirection();
    if (direction) this.dispatch({ type: 'move', direction });
  }

  private drawMap(): void {
    const graphics = this.add.graphics();

    DEMO_MAP_ROWS.forEach((row, y) => {
      [...row].forEach((tile, x) => {
        const pixelX = this.mapOrigin.x + x * GRID_SIZE;
        const pixelY = this.mapOrigin.y + y * GRID_SIZE;

        graphics.fillStyle(tile === '#' ? WALL_COLOR : FLOOR_COLOR);
        graphics.fillRect(pixelX, pixelY, GRID_SIZE, GRID_SIZE);
        graphics.lineStyle(1, tile === '#' ? WALL_EDGE_COLOR : 0x302b3b, 0.75);
        graphics.strokeRect(pixelX, pixelY, GRID_SIZE, GRID_SIZE);
      });
    });
  }

  private createPlayer(): void {
    const pixel = this.gridToPixel(this.gameState.player);
    this.player = this.add
      .rectangle(pixel.x, pixel.y, GRID_SIZE - 10, GRID_SIZE - 10, PLAYER_COLOR)
      .setStrokeStyle(2, 0xf1ded2)
      .setDepth(1);
  }

  private createInstructions(): void {
    this.add
      .text(this.scale.width / 2, 12, 'ARROW KEYS / WASD  ·  MOVE', {
        color: '#aaa1b5',
        fontFamily: 'monospace',
        fontSize: '14px',
        letterSpacing: 2,
      })
      .setOrigin(0.5, 0);
  }

  private createKeyboardControls(): void {
    if (!this.input.keyboard) throw new Error('키보드 입력을 초기화할 수 없습니다.');

    const cursors = this.input.keyboard.createCursorKeys();
    const wasd = this.input.keyboard.addKeys('W,A,S,D') as Record<
      'W' | 'A' | 'S' | 'D',
      Phaser.Input.Keyboard.Key
    >;

    this.movementKeys = {
      up: [cursors.up, wasd.W],
      down: [cursors.down, wasd.S],
      left: [cursors.left, wasd.A],
      right: [cursors.right, wasd.D],
    };
  }

  private readDirection(): Direction | undefined {
    const directions: readonly Direction[] = ['up', 'down', 'left', 'right'];
    return directions.find((direction) =>
      this.movementKeys[direction].some((key) => Phaser.Input.Keyboard.JustDown(key)),
    );
  }

  private dispatch(action: GameAction): void {
    const result = applyAction(this.gameState, action, DEMO_MAP);
    this.gameState = result.state;
    if (!result.changed) return;

    const pixel = this.gridToPixel(this.gameState.player);
    this.isMoving = true;

    this.tweens.add({
      targets: this.player,
      x: pixel.x,
      y: pixel.y,
      duration: MOVE_DURATION_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.isMoving = false;
      },
    });
  }

  private gridToPixel(position: GridPosition): GridPosition {
    return {
      x: this.mapOrigin.x + position.x * GRID_SIZE + GRID_SIZE / 2,
      y: this.mapOrigin.y + position.y * GRID_SIZE + GRID_SIZE / 2,
    };
  }
}
