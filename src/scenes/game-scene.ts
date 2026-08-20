import Phaser from 'phaser';
import { CHAPTER1_ASSET_MANIFEST } from '../assets/chapter1/manifest';
import { GRID_SIZE } from '../game-config';
import type { GameAction } from '../game/action';
import { formatClockTime } from '../game/clock';
import { createEndingSequence, type EndingPage } from '../game/ending';
import {
  advanceGameSession,
  createGameSession,
  currentLevel,
  updateSessionState,
  type GameSession,
} from '../game/game-session';
import {
  advanceTime,
  applyAction,
  finishFinale,
  restartChapter,
  type GameState,
} from '../game/game-state';
import type { Direction, GridPosition } from '../game/grid';
import { GAME_LEVELS_LOAD_RESULT } from '../levels/level-catalog';

const MOVE_DURATION_MS = 110;
const RESET_LOCK_MS = 100;
const FINALE_BASE_DURATION_MS = 900;
const ECHO_FADE_STAGGER_MS = 220;
const PLAYER_COLOR = 0xd9b6a3;
const ECHO_COLOR = 0x73c8df;
const WALL_DEPTH = 0.1;
const WALL_OPENING_DEPTH = 0.12;
const WALL_DECORATION_DEPTH = 0.18;
const WALL_TOP_DISPLAY_SIZE = { width: 32, height: 64 };
const WALL_SIDE_DISPLAY_SIZE = { width: 28, height: 32 };
const WALL_SIDE_ALPHA = 0.78;
const WALL_TOP_CORNER_DISPLAY_SIZE = { width: 32, height: 40 };
const WALL_BOTTOM_ALPHA = 0.8;
const WALL_BOTTOM_CORNER_DISPLAY_SIZE = { width: 40, height: 16 };
const WALL_BOTTOM_DISPLAY_SIZE = { width: 32, height: 16 };
const WALL_BOTTOM_DOORWAY_DISPLAY_SIZE = { width: 96, height: 16 };
const WINDOW_DISPLAY_SIZE = { width: 48, height: 32 };
const WINDOW_OFFSET = { x: 4, y: 8 };
const BED_VISUAL_OFFSET = { x: 0, y: 8 };
const NIGHTSTAND_VISUAL_OFFSET = { x: 0, y: 8 };
const GRANDFATHER_CLOCK_DISPLAY_SIZE = { width: 58, height: 88 };
const GRANDFATHER_CLOCK_VISUAL_OFFSET = { x: 0, y: -32 };
const BOOKSHELF_DISPLAY_SIZE = { width: 116, height: 88 };
const BOOKSHELF_VISUAL_OFFSET = { x: -16, y: -32 };
const KEY_DISPLAY_SIZE = { width: 24, height: 24 };
const DOOR_DISPLAY_SIZE = { width: 80, height: 80 };
const DOOR_VISUAL_OFFSET = { x: 8, y: -16 };

type MovementKeys = Readonly<{
  up: Phaser.Input.Keyboard.Key[];
  down: Phaser.Input.Keyboard.Key[];
  left: Phaser.Input.Keyboard.Key[];
  right: Phaser.Input.Keyboard.Key[];
}>;

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private session!: GameSession;
  private gameState!: GameState;
  private loadError?: Error;
  private mapTiles: Phaser.GameObjects.Image[] = [];
  private movementKeys!: MovementKeys;
  private resetKey!: Phaser.Input.Keyboard.Key;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private continueKey!: Phaser.Input.Keyboard.Key;
  private resetHud!: Phaser.GameObjects.Text;
  private feedbackHud!: Phaser.GameObjects.Text;
  private phaseHud!: Phaser.GameObjects.Text;
  private clockHud!: Phaser.GameObjects.Text;
  private endingHud!: Phaser.GameObjects.Text;
  private echoSprites: Phaser.GameObjects.Container[] = [];
  private objectSprites: Phaser.GameObjects.GameObject[] = [];
  private isMoving = false;
  private isResetting = false;
  private isFinalePlaying = false;
  private pendingReset = false;
  private pendingDirection?: Direction;
  private endingPages: readonly EndingPage[] = [];
  private endingPageIndex = 0;
  private mapOrigin = { x: 0, y: 0 };

  constructor() {
    super('game');
    if (GAME_LEVELS_LOAD_RESULT.ok) {
      this.session = createGameSession(GAME_LEVELS_LOAD_RESULT.levels);
      this.gameState = this.session.state;
    } else {
      this.loadError = GAME_LEVELS_LOAD_RESULT.error;
    }
  }

  preload(): void {
    Object.entries(CHAPTER1_ASSET_MANIFEST).forEach(([assetKey, asset]) => {
      if (!asset.sourceAvailable) return;
      if (assetKey === 'chapter1-floor-tileset' || assetKey === 'chapter1-wall-tileset') {
        this.load.spritesheet(assetKey, asset.path, {
          frameWidth: GRID_SIZE,
          frameHeight: GRID_SIZE,
        });
        return;
      }
      this.load.image(assetKey, asset.path);
    });
  }

  create(): void {
    if (this.loadError) {
      this.renderLoadError(this.loadError);
      return;
    }
    const map = currentLevel(this.session).map;
    this.mapOrigin = {
      x: Math.floor((this.scale.width - map.width * GRID_SIZE) / 2),
      y: Math.floor((this.scale.height - map.height * GRID_SIZE) / 2),
    };

    this.drawMap();
    this.createPlayer();
    this.createObjects();
    this.createInstructions();
    this.createKeyboardControls();
  }

  update(_time: number, delta: number): void {
    if (this.loadError) return;
    const previousPhase = this.gameState.phase;
    const previousClockWarning = this.gameState.finalClockWarning;
    this.setGameState(advanceTime(this.gameState, delta));
    this.updateClockHud();
    if (!previousClockWarning && this.gameState.finalClockWarning) {
      this.renderEchoes();
      this.tweens.add({
        targets: this.clockHud,
        alpha: 0.45,
        duration: 280,
        yoyo: true,
        repeat: 4,
      });
    }
    if (previousPhase !== this.gameState.phase && this.gameState.phase === 'let-time-go') {
      this.pendingReset = false;
      this.pendingDirection = undefined;
      this.playFinaleSequence();
    }

    if (this.session.completed) {
      if (Phaser.Input.Keyboard.JustDown(this.continueKey)) this.advanceEndingPage();
      return;
    }
    if (this.isResetting) return;

    if (
      this.gameState.phase === 'playing' &&
      !this.gameState.finalResolved &&
      Phaser.Input.Keyboard.JustDown(this.restartKey)
    ) {
      this.tweens.killTweensOf(this.player);
      this.isMoving = false;
      this.pendingReset = false;
      this.pendingDirection = undefined;
      this.setGameState(restartChapter(this.gameState));
      this.renderResetState();
      this.phaseHud.setText('');
      this.feedbackHud.setText('');
      this.updateClockHud();
      return;
    }

    if (
      this.gameState.phase === 'completed' &&
      !this.isFinalePlaying &&
      Phaser.Input.Keyboard.JustDown(this.continueKey)
    ) {
      this.advanceToNextLevel();
      return;
    }

    if (this.gameState.phase !== 'playing') return;

    if (Phaser.Input.Keyboard.JustDown(this.resetKey)) {
      if (this.isMoving) {
        this.pendingReset = true;
        this.pendingDirection = undefined;
      } else this.dispatch({ type: 'reset' });
      return;
    }

    if (!this.isMoving && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.dispatch({ type: 'interact' });
      return;
    }

    const direction = this.readDirection();
    if (this.isMoving) {
      if (direction && !this.pendingReset) this.pendingDirection = direction;
      return;
    }

    if (direction) this.dispatch({ type: 'move', direction });
  }

  private drawMap(): void {
    const map = currentLevel(this.session).map;
    this.mapTiles.forEach((tile) => tile.destroy());
    this.mapTiles = [];

    for (let y = 0; y < map.height; y += 1) {
      for (let x = 0; x < map.width; x += 1) {
        const pixelX = this.mapOrigin.x + x * GRID_SIZE;
        const pixelY = this.mapOrigin.y + y * GRID_SIZE;

        this.mapTiles.push(
          this.add
            .image(pixelX, pixelY, 'chapter1-floor-tileset', (x + y * 3) % 8)
            .setOrigin(0, 0)
            .setDepth(0),
        );
      }
    }

    this.drawWallKit(map);
  }

  private drawWallKit(map: Readonly<{ width: number; height: number }>): void {
    const doorObject = this.gameState.objects.find((object) => object.id === 'chapter1-door');
    const doorwayStartX = this.validSectionStart(doorObject?.position.x, map.width);

    this.renderWallAsset(
      'chapter1-wall-corner-tl',
      0,
      0,
      WALL_DEPTH,
      WALL_TOP_CORNER_DISPLAY_SIZE,
      0.9,
    );
    this.renderWallAsset(
      'chapter1-wall-corner-tr',
      map.width - 1,
      0,
      WALL_DEPTH,
      WALL_TOP_CORNER_DISPLAY_SIZE,
      0.9,
    );
    this.renderWallAsset(
      'chapter1-wall-corner-bl',
      0,
      map.height - 1,
      WALL_DEPTH,
      WALL_BOTTOM_CORNER_DISPLAY_SIZE,
      WALL_BOTTOM_ALPHA,
    );
    this.renderWallAsset(
      'chapter1-wall-corner-br',
      map.width - 1,
      map.height - 1,
      WALL_DEPTH,
      WALL_BOTTOM_CORNER_DISPLAY_SIZE,
      WALL_BOTTOM_ALPHA,
    );

    for (let x = 1; x < map.width - 1; x += 1) {
      this.renderWallAsset('chapter1-wall-top', x, 0, WALL_DEPTH, WALL_TOP_DISPLAY_SIZE);
    }

    for (let y = 1; y < map.height - 1; y += 1) {
      this.renderWallAsset(
        'chapter1-wall-left',
        0,
        y,
        WALL_DEPTH,
        WALL_SIDE_DISPLAY_SIZE,
        WALL_SIDE_ALPHA,
      );
      this.renderWallAsset(
        'chapter1-wall-right',
        map.width - 1,
        y,
        WALL_DEPTH,
        WALL_SIDE_DISPLAY_SIZE,
        WALL_SIDE_ALPHA,
      );
    }

    for (let x = 1; x < map.width - 1; x += 1) {
      if (doorwayStartX !== undefined && x === doorwayStartX) {
        this.renderWallAsset(
          'chapter1-wall-bottom-doorway',
          x,
          map.height - 1,
          WALL_OPENING_DEPTH,
          WALL_BOTTOM_DOORWAY_DISPLAY_SIZE,
          WALL_BOTTOM_ALPHA,
        );
        x += 2;
      } else {
        this.renderWallAsset(
          'chapter1-wall-bottom',
          x,
          map.height - 1,
          WALL_DEPTH,
          WALL_BOTTOM_DISPLAY_SIZE,
          WALL_BOTTOM_ALPHA,
        );
      }
    }
  }

  private validSectionStart(start: number | undefined, mapWidth: number): number | undefined {
    if (start === undefined || start < 1 || start + 2 > mapWidth - 2) return undefined;
    return start;
  }

  private renderWallAsset(
    assetKey: string,
    positionX: number,
    positionY: number,
    depth: number,
    displaySize: Readonly<{ width: number; height: number }>,
    alpha = 1,
  ): void {
    const manifestEntry = CHAPTER1_ASSET_MANIFEST[assetKey];
    if (!manifestEntry || !this.textures.exists(assetKey)) return;

    this.mapTiles.push(
      this.add
        .image(
          this.mapOrigin.x + positionX * GRID_SIZE,
          this.mapOrigin.y + positionY * GRID_SIZE,
          assetKey,
        )
        .setOrigin(0, 0)
        .setDisplaySize(displaySize.width, displaySize.height)
        .setAlpha(alpha)
        .setDepth(depth),
    );
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
        'ARROW/WASD · MOVE   Z · INTERACT   R · RESET   C · RESTART   ENTER · CONTINUE',
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
    this.feedbackHud = this.add
      .text(this.scale.width / 2, this.scale.height - 42, '', {
        color: '#d8b65a',
        fontFamily: 'monospace',
        fontSize: '13px',
        letterSpacing: 1,
      })
      .setOrigin(0.5, 1);
    this.phaseHud = this.add
      .text(this.scale.width / 2, this.scale.height / 2, '', {
        color: '#f1ded2',
        fontFamily: 'serif',
        fontSize: '32px',
      })
      .setOrigin(0.5)
      .setDepth(5);
    this.clockHud = this.add
      .text(this.scale.width - 20, 18, '', {
        color: '#d8b65a',
        fontFamily: 'monospace',
        fontSize: '18px',
        letterSpacing: 2,
      })
      .setOrigin(1, 0);
    this.endingHud = this.add
      .text(this.scale.width / 2, this.scale.height / 2, '', {
        align: 'center',
        color: '#f1ded2',
        fontFamily: 'serif',
        fontSize: '24px',
        lineSpacing: 14,
        wordWrap: { width: this.scale.width - 180 },
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setVisible(false);
    this.updateClockHud();
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
    this.continueKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
  }

  private readDirection(): Direction | undefined {
    const directions: readonly Direction[] = ['up', 'down', 'left', 'right'];
    const pressed = Object.fromEntries(
      directions.map((direction) => [
        direction,
        this.movementKeys[direction].some((key) => Phaser.Input.Keyboard.JustDown(key)),
      ]),
    ) as Record<Direction, boolean>;
    if ((pressed.up && pressed.down) || (pressed.left && pressed.right)) return undefined;
    return directions.find((direction) => pressed[direction]);
  }

  private dispatch(action: GameAction): void {
    const previousPlayer = this.gameState.player;
    const result = applyAction(this.gameState, action, currentLevel(this.session).map);
    this.setGameState(result.state);
    if (result.chapterCompleted) this.phaseHud.setText('CHAPTER CLEAR');

    if (action.type === 'interact' && result.changed) {
      this.renderObjects();
      this.updateResetHud();
    }

    if (result.resetPerformed) {
      if (result.echoCreationBlocked === 'occupied') {
        this.showFeedback('ECHO SPACE OCCUPIED');
      } else if (result.echoCreationBlocked === 'limit') {
        this.showFeedback('ECHO LIMIT REACHED');
      }
      this.lockInputForReset();
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
          return;
        }
        const nextDirection = this.pendingDirection;
        this.pendingDirection = undefined;
        if (nextDirection) this.dispatch({ type: 'move', direction: nextDirection });
      },
    });
  }

  private renderResetState(): void {
    const playerPixel = this.gridToPixel(this.gameState.player);
    this.player.setPosition(playerPixel.x, playerPixel.y);

    this.renderEchoes();

    this.renderObjects();
    this.updateResetHud();
    this.cameras.main.flash(90, 115, 200, 223, false);
  }

  private updateResetHud(): void {
    this.resetHud.setVisible(this.gameState.resetUnlocked);
    if (!this.gameState.resetUnlocked) return;

    if (this.gameState.finalResolved) {
      this.resetHud.setText('TIME RELEASED');
      return;
    }

    if (this.gameState.resetPolicy === 'unlimited') {
      this.resetHud.setText(
        `RESET ∞ · ECHO ${this.gameState.echoes.length} / ${this.gameState.echoLimit}`,
      );
      return;
    }

    const remaining = this.gameState.resetLimit - this.gameState.resetCount;
    this.resetHud.setText(
      remaining > 0
        ? `RESET ${this.gameState.resetCount} / ${this.gameState.resetLimit}`
        : 'RESET EXHAUSTED',
    );
  }

  private renderEchoes(): void {
    this.echoSprites.forEach((echo) => echo.destroy());
    this.echoSprites = this.gameState.echoes.map((echo) => {
      const pixel = this.gridToPixel(echo.position);
      const facingOffset = this.facingOffset(echo.facing, GRID_SIZE / 4);
      const body = this.add
        .rectangle(0, 0, GRID_SIZE - 10, GRID_SIZE - 10, ECHO_COLOR, 0.42)
        .setStrokeStyle(2, 0xb9efff, 0.7);
      const gaze = this.add.circle(facingOffset.x, facingOffset.y, 3, 0xe8fbff, 0.95);
      return this.add.container(pixel.x, pixel.y, [body, gaze]).setDepth(0.5);
    });
  }

  private facingOffset(direction: Direction, distance: number): GridPosition {
    if (direction === 'up') return { x: 0, y: -distance };
    if (direction === 'down') return { x: 0, y: distance };
    if (direction === 'left') return { x: -distance, y: 0 };
    return { x: distance, y: 0 };
  }

  private createObjects(): void {
    this.renderObjects();
  }

  private renderObjects(): void {
    this.objectSprites.forEach((object) => object.destroy());
    this.objectSprites = [];

    this.gameState.objects.forEach((object) => {
      const pixel = this.gridToPixel(object.position);
      if (object.type === 'prop') {
        const propPosition =
          object.id === 'chapter1-window' ? { x: object.position.x, y: 0 } : object.position;
        const propOffset =
          object.id === 'chapter1-window'
            ? WINDOW_OFFSET
            : object.id === 'chapter1-grandfather-clock'
              ? GRANDFATHER_CLOCK_VISUAL_OFFSET
              : object.id === 'chapter1-bed'
                ? BED_VISUAL_OFFSET
                : object.id === 'chapter1-nightstand'
                  ? NIGHTSTAND_VISUAL_OFFSET
                  : undefined;
        const propDepth = object.id === 'chapter1-chair' ? 0.5 : 0.35;
        this.objectSprites.push(
          ...this.renderAssetObject(
            object.assetKey,
            propPosition,
            object.id === 'chapter1-window' ? WALL_DECORATION_DEPTH : propDepth,
            propOffset,
            object.id === 'chapter1-window'
              ? WINDOW_DISPLAY_SIZE
              : object.id === 'chapter1-grandfather-clock'
                ? GRANDFATHER_CLOCK_DISPLAY_SIZE
                : undefined,
          ),
        );
      }
      if (object.type === 'puzzle-object') {
        const stateDefinition = object.states[object.state];
        const puzzleOffset =
          object.id === 'chapter1-bookshelf' ? BOOKSHELF_VISUAL_OFFSET : { x: 0, y: 0 };
        this.objectSprites.push(
          ...this.renderAssetObject(
            stateDefinition?.assetKey ?? object.assetKey,
            object.position,
            0.6,
            puzzleOffset,
            object.id === 'chapter1-bookshelf' ? BOOKSHELF_DISPLAY_SIZE : undefined,
          ),
        );
      }
      if (object.type === 'pocket-watch' && !object.collected) {
        if (object.visible) {
          this.objectSprites.push(
            ...this.renderAssetObject('chapter1-pocket-watch', object.position, 0.75),
          );
        }
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
        const assetKey = object.assetKeys?.[object.open ? 'open' : 'closed'];
        this.objectSprites.push(
          ...this.renderAssetObject(
            assetKey,
            object.position,
            0.7,
            DOOR_VISUAL_OFFSET,
            DOOR_DISPLAY_SIZE,
          ),
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
      if (object.type === 'key' && object.visible && !object.collected) {
        const keyOffset =
          object.id === 'chapter1-key' && object.position.y === 1 ? { x: 0, y: -32 } : undefined;
        this.objectSprites.push(
          ...this.renderAssetObject(
            object.assetKey,
            object.position,
            0.8,
            keyOffset,
            KEY_DISPLAY_SIZE,
          ),
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

  private renderAssetObject(
    assetKey: string | undefined,
    position: GridPosition,
    depth: number,
    offset: GridPosition = { x: 0, y: 0 },
    displaySize?: Readonly<{ width: number; height: number }>,
  ): Phaser.GameObjects.GameObject[] {
    const manifestEntry = assetKey === undefined ? undefined : CHAPTER1_ASSET_MANIFEST[assetKey];
    if (assetKey !== undefined && manifestEntry && this.textures.exists(assetKey)) {
      const sprite = this.add
        .image(
          this.mapOrigin.x + position.x * GRID_SIZE + offset.x,
          this.mapOrigin.y + position.y * GRID_SIZE + offset.y,
          assetKey,
        )
        .setOrigin(0, 0);
      if (displaySize) sprite.setDisplaySize(displaySize.width, displaySize.height);
      return [sprite.setDepth(depth)];
    }

    return [];
  }

  private gridToPixel(position: GridPosition): GridPosition {
    return {
      x: this.mapOrigin.x + position.x * GRID_SIZE + GRID_SIZE / 2,
      y: this.mapOrigin.y + position.y * GRID_SIZE + GRID_SIZE / 2,
    };
  }

  private setGameState(state: GameState): void {
    this.gameState = state;
    this.session = updateSessionState(this.session, state);
  }

  private advanceToNextLevel(): void {
    const previousIndex = this.session.currentLevelIndex;
    this.session = advanceGameSession(this.session);
    this.gameState = this.session.state;
    if (this.session.completed) {
      this.startEndingSequence();
      return;
    }
    if (this.session.currentLevelIndex === previousIndex) return;

    this.tweens.killTweensOf(this.player);
    this.isMoving = false;
    this.isResetting = false;
    this.isFinalePlaying = false;
    this.pendingReset = false;
    this.pendingDirection = undefined;
    this.mapTiles.forEach((tile) => tile.destroy());
    this.mapTiles = [];
    this.player.destroy();
    this.echoSprites.forEach((echo) => echo.destroy());
    this.echoSprites = [];
    this.objectSprites.forEach((object) => object.destroy());
    this.objectSprites = [];

    const map = currentLevel(this.session).map;
    this.mapOrigin = {
      x: Math.floor((this.scale.width - map.width * GRID_SIZE) / 2),
      y: Math.floor((this.scale.height - map.height * GRID_SIZE) / 2),
    };
    this.drawMap();
    this.createPlayer();
    this.createObjects();
    this.updateResetHud();
    this.phaseHud.setText('');
    this.feedbackHud.setText('');
    this.updateClockHud();
  }

  private lockInputForReset(): void {
    this.isResetting = true;
    this.time.delayedCall(RESET_LOCK_MS, () => {
      this.isResetting = false;
    });
  }

  private startEndingSequence(): void {
    const ending = createEndingSequence(this.gameState.worldMemory);
    this.endingPages = ending.pages;
    this.endingPageIndex = 0;
    this.player.setVisible(false);
    this.mapTiles.forEach((tile) => tile.setVisible(false));
    this.objectSprites.forEach((object) => object.destroy());
    this.objectSprites = [];
    this.echoSprites.forEach((echo) => echo.destroy());
    this.echoSprites = [];
    this.resetHud.setVisible(false);
    this.feedbackHud.setVisible(false);
    this.phaseHud.setVisible(false);
    this.clockHud.setVisible(false);
    this.cameras.main.fadeOut(450, 8, 7, 12);
    this.time.delayedCall(480, () => {
      this.cameras.main.fadeIn(600, 8, 7, 12);
      this.renderEndingPage();
    });
  }

  private advanceEndingPage(): void {
    if (!this.endingHud.visible || this.endingPageIndex >= this.endingPages.length - 1) return;
    this.endingPageIndex += 1;
    this.cameras.main.fadeOut(220, 8, 7, 12);
    this.time.delayedCall(240, () => {
      this.renderEndingPage();
      this.cameras.main.fadeIn(320, 8, 7, 12);
    });
  }

  private renderEndingPage(): void {
    const page = this.endingPages[this.endingPageIndex];
    if (!page) return;
    const prompt = this.endingPageIndex < this.endingPages.length - 1 ? '\n\n[ ENTER ]' : '';
    this.endingHud.setText(`${page.heading}\n\n${page.body}${prompt}`).setVisible(true);
  }

  private playFinaleSequence(): void {
    this.isFinalePlaying = true;
    this.tweens.killTweensOf(this.player);
    this.isMoving = false;
    this.renderObjects();
    this.renderEchoes();
    this.phaseHud.setText('DONG—\nLET TIME GO');
    this.cameras.main.shake(260, 0.004);
    this.cameras.main.flash(350, 225, 216, 180, false);

    this.echoSprites.forEach((echo, index) => {
      this.tweens.add({
        targets: echo,
        alpha: 0,
        scale: 0.65,
        duration: 650,
        delay: index * ECHO_FADE_STAGGER_MS,
        ease: 'Sine.easeIn',
      });
    });

    const duration =
      FINALE_BASE_DURATION_MS + Math.max(0, this.echoSprites.length - 1) * ECHO_FADE_STAGGER_MS;
    this.time.delayedCall(duration, () => {
      this.isFinalePlaying = false;
      this.setGameState(finishFinale(this.gameState));
      this.renderEchoes();
      this.renderObjects();
      this.updateResetHud();
      this.phaseHud.setText('');
      this.feedbackHud.setText('THE DOOR IS OPEN');
    });
  }

  private showFeedback(message: string): void {
    this.feedbackHud.setText(message);
    this.time.delayedCall(900, () => {
      if (this.feedbackHud.text === message) this.feedbackHud.setText('');
    });
  }

  private updateClockHud(): void {
    const startSeconds = currentLevel(this.session).finalClockStartSeconds;
    this.clockHud.setVisible(startSeconds !== undefined);
    if (startSeconds === undefined) return;

    this.clockHud.setText(formatClockTime(startSeconds, this.gameState.finalClockElapsedMs));
  }

  private renderLoadError(error: Error): void {
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, `LEVEL LOAD FAILED\n\n${error.message}`, {
        align: 'center',
        color: '#f0a6a6',
        fontFamily: 'monospace',
        fontSize: '18px',
        lineSpacing: 8,
        wordWrap: { width: this.scale.width - 120 },
      })
      .setOrigin(0.5);
  }
}
