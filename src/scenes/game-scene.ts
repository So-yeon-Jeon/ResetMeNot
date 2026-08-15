import Phaser from 'phaser';
import { GRID_SIZE } from '../game-config';
import type { GameAction } from '../game/action';
import { DEMO_MAP, DEMO_MAP_ROWS, DEMO_OBJECTS, PLAYER_START } from '../game/demo-map';
import {
  advanceTime,
  applyAction,
  createGameState,
  restartChapter,
  type GameState,
} from '../game/game-state';
import type { Direction, GridPosition } from '../game/grid';

const MOVE_DURATION_MS = 110;
const FLOOR_COLOR = 0x24212e;
const WALL_COLOR = 0x51485d;
const WALL_EDGE_COLOR = 0x766981;
const PLAYER_COLOR = 0xd9b6a3;
const ECHO_COLOR = 0x73c8df;
const POCKET_WATCH_COLOR = 0xd8b65a;

type MovementKeys = Readonly<{
  up: Phaser.Input.Keyboard.Key[];
  down: Phaser.Input.Keyboard.Key[];
  left: Phaser.Input.Keyboard.Key[];
  right: Phaser.Input.Keyboard.Key[];
}>;

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private gameState: GameState = createGameState(PLAYER_START, {
    resetLimit: 3,
    objects: DEMO_OBJECTS,
  });
  private movementKeys!: MovementKeys;
  private resetKey!: Phaser.Input.Keyboard.Key;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private resetHud!: Phaser.GameObjects.Text;
  private phaseHud!: Phaser.GameObjects.Text;
  private echoSprites: Phaser.GameObjects.Rectangle[] = [];
  private objectSprites: Phaser.GameObjects.GameObject[] = [];
  private isMoving = false;
  private pendingReset = false;
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
    this.createObjects();
    this.createInstructions();
    this.createKeyboardControls();
  }

  update(_time: number, delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.gameState = restartChapter(this.gameState);
      this.renderResetState();
      this.phaseHud.setText('');
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.resetKey)) {
      if (this.isMoving) this.pendingReset = true;
      else this.dispatch({ type: 'reset' });
      return;
    }

    if (!this.isMoving && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.dispatch({ type: 'interact' });
      return;
    }

    if (this.isMoving) return;

    this.gameState = advanceTime(this.gameState, delta);
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
      .text(
        this.scale.width / 2,
        12,
        'ARROW/WASD · MOVE   Z · INTERACT   R · RESET   C · RESTART',
        {
          color: '#aaa1b5',
          fontFamily: 'monospace',
          fontSize: '14px',
          letterSpacing: 2,
        },
      )
      .setOrigin(0.5, 0);

    this.resetHud = this.add
      .text(this.scale.width / 2, this.scale.height - 18, '', {
        color: '#73c8df',
        fontFamily: 'monospace',
        fontSize: '13px',
        letterSpacing: 1,
      })
      .setOrigin(0.5, 1);
    this.updateResetHud();
    this.phaseHud = this.add
      .text(this.scale.width / 2, this.scale.height / 2, '', {
        color: '#f1ded2',
        fontFamily: 'serif',
        fontSize: '32px',
      })
      .setOrigin(0.5)
      .setDepth(5);
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
    this.resetKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
  }

  private readDirection(): Direction | undefined {
    const directions: readonly Direction[] = ['up', 'down', 'left', 'right'];
    return directions.find((direction) =>
      this.movementKeys[direction].some((key) => Phaser.Input.Keyboard.JustDown(key)),
    );
  }

  private dispatch(action: GameAction): void {
    const previousPlayer = this.gameState.player;
    const result = applyAction(this.gameState, action, DEMO_MAP);
    this.gameState = result.state;
    if (result.chapterCompleted) this.phaseHud.setText('CHAPTER CLEAR');

    if (action.type === 'interact' && result.changed) {
      this.renderObjects();
      this.updateResetHud();
    }

    if (result.resetPerformed) {
      this.renderResetState();
      return;
    }

    if (!result.changed) return;

    this.renderObjects();

    if (
      previousPlayer.x === this.gameState.player.x &&
      previousPlayer.y === this.gameState.player.y
    ) {
      return;
    }

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
        if (this.pendingReset) {
          this.pendingReset = false;
          this.dispatch({ type: 'reset' });
        }
      },
    });
  }

  private renderResetState(): void {
    const playerPixel = this.gridToPixel(this.gameState.player);
    this.player.setPosition(playerPixel.x, playerPixel.y);

    this.echoSprites.forEach((echo) => echo.destroy());
    this.echoSprites = this.gameState.echoes.map((echo) => {
      const pixel = this.gridToPixel(echo.position);
      return this.add
        .rectangle(pixel.x, pixel.y, GRID_SIZE - 10, GRID_SIZE - 10, ECHO_COLOR, 0.42)
        .setStrokeStyle(2, 0xb9efff, 0.7)
        .setDepth(0.5);
    });

    this.renderObjects();
    this.updateResetHud();
    this.cameras.main.flash(90, 115, 200, 223, false);
  }

  private updateResetHud(): void {
    this.resetHud.setVisible(this.gameState.resetUnlocked);
    if (!this.gameState.resetUnlocked) return;

    const remaining = this.gameState.resetLimit - this.gameState.resetCount;
    this.resetHud.setText(
      remaining > 0
        ? `RESET ${this.gameState.resetCount} / ${this.gameState.resetLimit}`
        : 'RESET EXHAUSTED',
    );
  }

  private createObjects(): void {
    this.renderObjects();
  }

  private renderObjects(): void {
    this.objectSprites.forEach((object) => object.destroy());
    this.objectSprites = [];

    this.gameState.objects.forEach((object) => {
      const pixel = this.gridToPixel(object.position);
      if (object.type === 'pocket-watch' && !object.collected) {
        this.objectSprites.push(
          this.add
            .circle(pixel.x, pixel.y, GRID_SIZE / 4, POCKET_WATCH_COLOR)
            .setStrokeStyle(2, 0xffe6a3)
            .setDepth(0.75),
        );
      }
      if (object.type === 'pressure-switch') {
        this.objectSprites.push(
          this.add
            .rectangle(
              pixel.x,
              pixel.y,
              GRID_SIZE - 8,
              GRID_SIZE - 8,
              object.active ? 0x73c8df : 0x625b70,
            )
            .setStrokeStyle(2, object.active ? 0xb9efff : 0x8e849c)
            .setDepth(0.25),
        );
      }
      if (object.type === 'door') {
        this.objectSprites.push(
          this.add
            .rectangle(
              pixel.x,
              pixel.y,
              GRID_SIZE - 4,
              GRID_SIZE - 4,
              object.open ? 0x355b55 : 0x8a644d,
              object.open ? 0.35 : 1,
            )
            .setStrokeStyle(2, object.open ? 0x73c8df : 0xc69a6b)
            .setDepth(0.7),
        );
      }
      if (object.type === 'box') {
        this.objectSprites.push(
          this.add
            .rectangle(pixel.x, pixel.y, GRID_SIZE - 6, GRID_SIZE - 6, 0x9a754f)
            .setStrokeStyle(2, 0xd8b65a)
            .setDepth(0.65),
        );
      }
      if (object.type === 'lever') {
        this.objectSprites.push(
          this.add
            .triangle(
              pixel.x,
              pixel.y,
              0,
              GRID_SIZE / 2,
              GRID_SIZE / 2,
              0,
              GRID_SIZE,
              GRID_SIZE / 2,
              object.active ? 0x73c8df : 0xb8a08c,
            )
            .setStrokeStyle(2, 0xe7d4bb)
            .setDepth(0.65),
        );
      }
      if (object.type === 'key' && !object.collected) {
        this.objectSprites.push(
          this.add
            .star(pixel.x, pixel.y, 4, 4, GRID_SIZE / 4, 0xe5c86c)
            .setStrokeStyle(2, 0xffe6a3)
            .setDepth(0.65),
        );
      }
      if (object.type === 'exit') {
        this.objectSprites.push(
          this.add
            .rectangle(pixel.x, pixel.y, GRID_SIZE - 10, GRID_SIZE - 10, 0x6b8f71, 0.55)
            .setStrokeStyle(2, 0xa7d7ad)
            .setDepth(0.2),
        );
      }
    });
  }

  private gridToPixel(position: GridPosition): GridPosition {
    return {
      x: this.mapOrigin.x + position.x * GRID_SIZE + GRID_SIZE / 2,
      y: this.mapOrigin.y + position.y * GRID_SIZE + GRID_SIZE / 2,
    };
  }
}
