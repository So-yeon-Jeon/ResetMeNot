import Phaser from 'phaser';
import { ECHO_CHARACTER_ASSET, PLAYER_CHARACTER_ASSET } from '../assets/characters/manifest';
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
import type { PuzzleObjectState } from '../game/world-object';
import { GAME_LEVELS_LOAD_RESULT } from '../levels/level-catalog';
import type {
  ChapterVisualTheme,
  ObjectVisual,
  StateTransitionVisual,
} from '../themes/chapter-visual-theme';
import { CHAPTER_VISUAL_THEMES, getChapterVisualTheme } from '../themes/theme-catalog';
import { actionFeedback, FEEDBACK_MESSAGES, resetBlockedFeedback } from '../ui/feedback-messages';

const MOVE_DURATION_MS = 110;
const RESET_LOCK_MS = 100;
const FEEDBACK_DURATION_MS = 1_400;
const CHAPTER_FADE_OUT_MS = 350;
const CHAPTER_FADE_IN_MS = 450;
const FINALE_BASE_DURATION_MS = 900;
const ECHO_FADE_STAGGER_MS = 220;
const PLAYER_CHARACTER_TEXTURE = 'player-character';
const ECHO_CHARACTER_TEXTURE = 'echo-character';
const PLAYER_CHARACTER_SCALE = 0.3;
const PLAYER_CHARACTER_ORIGIN_Y = 0.95;
const CHARACTER_FOOT_OFFSET_Y = GRID_SIZE / 2;
const PLAYER_CHARACTER_DEPTH = 1.2;
const ECHO_CHARACTER_DEPTH = 1.15;
const WALL_DEPTH = 0.1;
const WALL_OPENING_DEPTH = 0.12;
const WALL_SIDE_ALPHA = 0.78;
const WALL_BOTTOM_ALPHA = 0.8;
const FOREGROUND_DEPTH_OFFSET = 0.03;

type MovementKeys = Readonly<{
  up: Phaser.Input.Keyboard.Key[];
  down: Phaser.Input.Keyboard.Key[];
  left: Phaser.Input.Keyboard.Key[];
  right: Phaser.Input.Keyboard.Key[];
}>;

type CharacterPose = 'idle' | 'walk';

const CHARACTER_DIRECTION_COLUMN: Readonly<Record<Direction, number>> = {
  down: 0,
  right: 1,
  left: 2,
  up: 3,
};

function characterFrame(
  asset: typeof PLAYER_CHARACTER_ASSET | typeof ECHO_CHARACTER_ASSET,
  pose: CharacterPose,
  direction: Direction,
): number {
  return asset.animations[pose].start + CHARACTER_DIRECTION_COLUMN[direction];
}

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private session!: GameSession;
  private gameState!: GameState;
  private loadError?: Error;
  private mapTiles: (Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle)[] = [];
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
  private echoSprites: Phaser.GameObjects.Sprite[] = [];
  private objectSprites: Phaser.GameObjects.GameObject[] = [];
  private isMoving = false;
  private isResetting = false;
  private isObjectTransitioning = false;
  private isChapterTransitioning = false;
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
    this.load.spritesheet(PLAYER_CHARACTER_TEXTURE, PLAYER_CHARACTER_ASSET.path, {
      frameWidth: PLAYER_CHARACTER_ASSET.frameWidth,
      frameHeight: PLAYER_CHARACTER_ASSET.frameHeight,
    });
    this.load.spritesheet(ECHO_CHARACTER_TEXTURE, ECHO_CHARACTER_ASSET.path, {
      frameWidth: ECHO_CHARACTER_ASSET.frameWidth,
      frameHeight: ECHO_CHARACTER_ASSET.frameHeight,
    });

    const assets = new Map(
      Object.values(CHAPTER_VISUAL_THEMES).flatMap((theme) => Object.entries(theme.assets)),
    );
    assets.forEach((asset, assetKey) => {
      if (!asset.sourceAvailable) return;
      if (asset.kind === 'spritesheet') {
        this.load.spritesheet(assetKey, asset.path, {
          frameWidth: asset.frameWidth ?? GRID_SIZE,
          frameHeight: asset.frameHeight ?? GRID_SIZE,
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
    if (this.isResetting || this.isChapterTransitioning) return;
    if (this.isObjectTransitioning) {
      if (Phaser.Input.Keyboard.JustDown(this.resetKey)) {
        this.pendingReset = true;
        this.pendingDirection = undefined;
      }
      return;
    }

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
      this.startChapterTransition();
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
    const theme = this.currentTheme();
    this.mapTiles.forEach((tile) => tile.destroy());
    this.mapTiles = [];

    for (let y = 0; y < map.height; y += 1) {
      for (let x = 0; x < map.width; x += 1) {
        const pixelX = this.mapOrigin.x + x * GRID_SIZE;
        const pixelY = this.mapOrigin.y + y * GRID_SIZE;

        this.mapTiles.push(
          this.add
            .image(
              pixelX,
              pixelY,
              theme.floor.assetKey,
              (x + y * 3) % (theme.floor.frameCount ?? 1),
            )
            .setOrigin(0, 0)
            .setDepth(0),
        );
      }
    }

    this.drawWallKit(map, theme);
  }

  private drawWallKit(
    map: Readonly<{ width: number; height: number }>,
    theme: ChapterVisualTheme,
  ): void {
    const wall = theme.walls;
    const doorObject = this.gameState.objects.find((object) => object.id === wall.doorwayObjectId);
    const doorwayStartX = this.validSectionStart(doorObject?.position.x, map.width);
    if (wall.perspectiveBoundary) {
      this.drawPerspectiveWall(map, doorwayStartX);
      return;
    }

    this.renderWallAsset(wall.cornerTopLeft, 0, 0, WALL_DEPTH, undefined, 0.9);
    this.renderWallAsset(wall.cornerTopRight, map.width - 1, 0, WALL_DEPTH, undefined, 0.9);
    this.renderWallAsset(
      wall.cornerBottomLeft,
      0,
      map.height - 1,
      WALL_DEPTH,
      undefined,
      WALL_BOTTOM_ALPHA,
    );
    this.renderWallAsset(
      wall.cornerBottomRight,
      map.width - 1,
      map.height - 1,
      WALL_DEPTH,
      undefined,
      WALL_BOTTOM_ALPHA,
    );

    for (let x = 1; x < map.width - 1; x += 1) {
      this.renderWallAsset(wall.top, x, 0, WALL_DEPTH);
    }

    for (let y = 1; y < map.height - 1; y += 1) {
      this.renderWallAsset(wall.left, 0, y, WALL_DEPTH, undefined, WALL_SIDE_ALPHA);
      this.renderWallAsset(wall.right, map.width - 1, y, WALL_DEPTH, undefined, WALL_SIDE_ALPHA);
    }

    for (let x = 1; x < map.width - 1; x += 1) {
      if (doorwayStartX !== undefined && x === doorwayStartX && wall.bottomDoorway) {
        this.renderWallAsset(
          wall.bottomDoorway,
          x,
          map.height - 1,
          WALL_OPENING_DEPTH,
          undefined,
          WALL_BOTTOM_ALPHA,
        );
        x += 2;
      } else {
        this.renderWallAsset(
          wall.bottom,
          x,
          map.height - 1,
          WALL_DEPTH,
          undefined,
          WALL_BOTTOM_ALPHA,
        );
      }
    }
  }

  private drawPerspectiveWall(
    map: Readonly<{ width: number; height: number }>,
    doorwayStartX: number | undefined,
  ): void {
    const wall = this.currentTheme().walls;
    this.renderPerspectiveBoundaryAsset(wall.cornerTopLeft, 0, 0);
    this.renderPerspectiveBoundaryAsset(
      wall.cornerTopRight,
      map.width * GRID_SIZE - this.assetWidth(wall.cornerTopRight),
      0,
    );
    for (let x = 1; x < map.width - 1; x += 1) {
      this.renderPerspectiveBoundaryAsset(wall.top, x * GRID_SIZE, 0);
    }

    for (let y = 1; y < map.height - 1; y += 1) {
      this.renderPerspectiveBoundaryAsset(wall.left, 0, y * GRID_SIZE);
      this.renderPerspectiveBoundaryAsset(
        wall.right,
        map.width * GRID_SIZE - this.assetWidth(wall.right),
        y * GRID_SIZE,
      );
    }

    this.renderPerspectiveBoundaryAsset(
      wall.cornerBottomLeft,
      0,
      map.height * GRID_SIZE - this.assetHeight(wall.cornerBottomLeft),
    );
    this.renderPerspectiveBoundaryAsset(
      wall.cornerBottomRight,
      map.width * GRID_SIZE - this.assetWidth(wall.cornerBottomRight),
      map.height * GRID_SIZE - this.assetHeight(wall.cornerBottomRight),
    );
    if (doorwayStartX !== undefined && wall.bottomDoorway) {
      this.renderPerspectiveBoundaryAsset(
        wall.bottomDoorway,
        doorwayStartX * GRID_SIZE,
        map.height * GRID_SIZE - this.assetHeight(wall.bottomDoorway),
        WALL_OPENING_DEPTH,
      );
      this.renderDoorwayForeground(wall.bottomDoorway, doorwayStartX, map.height);
    }
    for (let x = 1; x < map.width - 1; x += 1) {
      const isDoorway = doorwayStartX !== undefined && x >= doorwayStartX && x < doorwayStartX + 3;
      if (!isDoorway) {
        this.renderPerspectiveBoundaryAsset(
          wall.bottom,
          x * GRID_SIZE,
          map.height * GRID_SIZE - this.assetHeight(wall.bottom),
        );
      }
    }
  }

  private assetWidth(assetKey: string): number {
    return this.currentTheme().assets[assetKey]?.width ?? 0;
  }

  private assetHeight(assetKey: string): number {
    return this.currentTheme().assets[assetKey]?.height ?? 0;
  }

  private renderPerspectiveBoundaryAsset(
    assetKey: string,
    offsetX: number,
    offsetY: number,
    depth = WALL_DEPTH + 0.01,
  ): void {
    if (!this.currentTheme().assets[assetKey] || !this.textures.exists(assetKey)) return;
    this.mapTiles.push(
      this.add
        .image(this.mapOrigin.x + offsetX, this.mapOrigin.y + offsetY, assetKey)
        .setOrigin(0, 0)
        .setDepth(depth),
    );
  }

  private renderDoorwayForeground(
    assetKey: string,
    doorwayStartX: number,
    mapHeight: number,
  ): void {
    const asset = this.currentTheme().assets[assetKey];
    if (!asset || !this.textures.exists(assetKey)) return;

    const foregroundHeight = 4;
    const foreground = this.add
      .image(
        this.mapOrigin.x + doorwayStartX * GRID_SIZE,
        this.mapOrigin.y + mapHeight * GRID_SIZE - asset.height,
        assetKey,
      )
      .setOrigin(0, 0)
      .setCrop(0, asset.height - foregroundHeight, asset.width, foregroundHeight)
      .setDepth(1.2);
    this.mapTiles.push(foreground);
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
    displaySize?: Readonly<{ width: number; height: number }>,
    alpha = 1,
  ): void {
    const manifestEntry = this.currentTheme().assets[assetKey];
    if (!manifestEntry || !this.textures.exists(assetKey)) return;

    const image = this.add
      .image(
        this.mapOrigin.x + positionX * GRID_SIZE,
        this.mapOrigin.y + positionY * GRID_SIZE,
        assetKey,
      )
      .setOrigin(0, 0)
      .setAlpha(alpha)
      .setDepth(depth);
    if (displaySize) image.setDisplaySize(displaySize.width, displaySize.height);
    this.mapTiles.push(image);
  }

  private createPlayer(): void {
    const pixel = this.characterToPixel(this.gameState.player);
    this.player = this.add
      .sprite(
        pixel.x,
        pixel.y,
        PLAYER_CHARACTER_TEXTURE,
        characterFrame(PLAYER_CHARACTER_ASSET, 'idle', this.gameState.playerFacing),
      )
      .setOrigin(0.5, PLAYER_CHARACTER_ORIGIN_Y)
      .setScale(PLAYER_CHARACTER_SCALE)
      .setDepth(PLAYER_CHARACTER_DEPTH);
  }

  private createInstructions(): void {
    const instructions = this.add
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
    const availableWidth = this.scale.width - 32;
    if (instructions.width > availableWidth) {
      instructions.setScale(availableWidth / instructions.width);
    }

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
    const previousState = this.gameState;
    const result = applyAction(this.gameState, action, currentLevel(this.session).map);
    const stateTransition = this.findStateTransition(previousState, result.state);
    this.setGameState(result.state);
    if (action.type === 'move') {
      this.setPlayerFrame('idle');
      this.updatePlayerDepth();
    }
    if (result.chapterCompleted) this.phaseHud.setText('CHAPTER CLEAR');

    if (result.resetPerformed) {
      if (result.echoCreationBlocked === 'occupied') {
        this.showFeedback(FEEDBACK_MESSAGES.echoSpaceOccupied);
      } else if (result.echoCreationBlocked === 'limit') {
        this.showFeedback(FEEDBACK_MESSAGES.echoLimitReached);
      }
      this.lockInputForReset();
      this.renderResetState();
      return;
    }

    if (action.type === 'reset' && result.resetBlocked) {
      const message = resetBlockedFeedback(result.resetBlocked);
      if (message) this.showFeedback(message);
      return;
    }

    if (result.feedbackEvent) {
      const message = actionFeedback(result.feedbackEvent);
      if (message) this.showFeedback(message);
    }

    if (!result.changed) return;

    this.renderObjects();
    if (stateTransition) {
      this.playStateTransitionAnimation(
        stateTransition.object,
        stateTransition.previousState,
        stateTransition.visual,
        stateTransition.transition,
      );
      if (stateTransition.transition.feedback) {
        this.showFeedback(stateTransition.transition.feedback);
      }
    }

    if (
      previousPlayer.x === this.gameState.player.x &&
      previousPlayer.y === this.gameState.player.y
    ) {
      return;
    }

    const pixel = this.characterToPixel(this.gameState.player);
    this.setPlayerFrame('walk');
    this.isMoving = true;

    this.tweens.add({
      targets: this.player,
      x: pixel.x,
      y: pixel.y,
      duration: MOVE_DURATION_MS,
      ease: 'Sine.easeInOut',
      onUpdate: () => this.updatePlayerDepth(),
      onComplete: () => {
        this.isMoving = false;
        this.setPlayerFrame('idle');
        this.updatePlayerDepth();
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
    this.isObjectTransitioning = false;
    const playerPixel = this.characterToPixel(this.gameState.player);
    this.player.setPosition(playerPixel.x, playerPixel.y);
    this.setPlayerFrame('idle');
    this.updatePlayerDepth();

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
      const pixel = this.characterToPixel(echo.position);
      return this.add
        .sprite(
          pixel.x,
          pixel.y,
          ECHO_CHARACTER_TEXTURE,
          characterFrame(ECHO_CHARACTER_ASSET, 'idle', echo.facing),
        )
        .setOrigin(0.5, PLAYER_CHARACTER_ORIGIN_Y)
        .setScale(PLAYER_CHARACTER_SCALE)
        .setAlpha(0.78)
        .setDepth(ECHO_CHARACTER_DEPTH);
    });
  }

  private setPlayerFrame(pose: CharacterPose): void {
    this.player.setFrame(characterFrame(PLAYER_CHARACTER_ASSET, pose, this.gameState.playerFacing));
  }

  private createObjects(): void {
    this.renderObjects();
  }

  private findStateTransition(
    previous: GameState,
    next: GameState,
  ):
    | Readonly<{
        object: PuzzleObjectState;
        previousState: string;
        visual: ObjectVisual;
        transition: StateTransitionVisual;
      }>
    | undefined {
    for (const previousObject of previous.objects) {
      if (previousObject.type !== 'puzzle-object') continue;
      const nextObject = next.objects.find(
        (candidate): candidate is PuzzleObjectState =>
          candidate.id === previousObject.id && candidate.type === 'puzzle-object',
      );
      if (!nextObject || nextObject.state === previousObject.state) continue;

      const visual = this.objectVisual(
        previousObject.id,
        previousObject.type,
        previousObject.position,
        previousObject.state,
      );
      const transition = visual.stateTransition;
      if (
        transition &&
        transition.from === previousObject.state &&
        transition.to === nextObject.state
      ) {
        return { object: nextObject, previousState: previousObject.state, visual, transition };
      }
    }
    return undefined;
  }

  private playStateTransitionAnimation(
    object: PuzzleObjectState,
    previousState: string,
    visual: ObjectVisual,
    transition: StateTransitionVisual,
  ): void {
    const assetKey = object.states[previousState]?.assetKey ?? object.assetKey;
    if (!assetKey || !this.textures.exists(assetKey) || transition.kind !== 'fall') return;

    const offset = visual.offset ?? { x: 0, y: 0 };
    const manifestEntry = this.currentTheme().assets[assetKey];
    const displaySize = visual.displaySize ?? manifestEntry;
    if (!displaySize) return;
    const x = this.mapOrigin.x + object.position.x * GRID_SIZE + offset.x;
    const y = this.mapOrigin.y + object.position.y * GRID_SIZE + offset.y;
    const fallingSprite = this.add
      .image(x + displaySize.width / 2, y + displaySize.height, assetKey)
      .setOrigin(0.5, 1)
      .setDisplaySize(displaySize.width, displaySize.height)
      .setDepth(transition.depth);

    this.objectSprites.push(fallingSprite);
    this.isObjectTransitioning = true;
    if (transition.shakeDurationMs && transition.shakeIntensity) {
      this.cameras.main.shake(transition.shakeDurationMs, transition.shakeIntensity);
    }
    this.tweens.add({
      targets: fallingSprite,
      angle: transition.angle,
      y: fallingSprite.y + transition.travelY,
      alpha: 0,
      duration: transition.durationMs,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        fallingSprite.destroy();
        this.isObjectTransitioning = false;
        if (this.pendingReset) {
          this.pendingReset = false;
          this.dispatch({ type: 'reset' });
        }
      },
    });
  }

  private renderObjects(): void {
    this.objectSprites.forEach((object) => object.destroy());
    this.objectSprites = [];
    this.gameState.objects.forEach((object) => {
      const pixel = this.gridToPixel(object.position);
      const visual = this.objectVisual(
        object.id,
        object.type,
        object.position,
        object.type === 'puzzle-object' ? object.state : undefined,
      );
      const visualPosition = {
        x: visual.positionOverride?.x ?? object.position.x,
        y: visual.positionOverride?.y ?? object.position.y,
      };
      const visualOffset = visual.offset;
      if (object.type === 'prop') {
        this.objectSprites.push(
          ...this.renderAssetObject(
            object.assetKey,
            visualPosition,
            visual.depth ?? 0.35,
            visualOffset,
            visual.displaySize,
          ),
        );
      }
      if (object.type === 'puzzle-object') {
        const stateDefinition = object.states[object.state];
        this.objectSprites.push(
          ...this.renderAssetObject(
            stateDefinition?.assetKey ?? object.assetKey,
            visualPosition,
            visual.depth ?? 0.6,
            visualOffset,
            visual.displaySize,
          ),
        );
      }
      if (object.type === 'pocket-watch' && !object.collected) {
        if (object.visible) {
          this.objectSprites.push(
            ...this.renderAssetObject(
              visual.assetKey,
              visualPosition,
              visual.depth ?? 0.75,
              visualOffset,
              visual.displaySize,
            ),
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
            visualPosition,
            visual.depth ?? 0.7,
            visualOffset,
            visual.displaySize,
            visual.foregroundCrop,
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
      if (
        object.type === 'key' &&
        object.visible &&
        !object.collected &&
        this.shouldRenderKey(object)
      ) {
        this.objectSprites.push(
          ...this.renderAssetObject(
            object.assetKey,
            visualPosition,
            visual.depth ?? 0.8,
            visualOffset,
            visual.displaySize,
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
    foregroundCrop?: Readonly<{ y: number; height: number; depth?: number }>,
  ): Phaser.GameObjects.GameObject[] {
    const manifestEntry = assetKey === undefined ? undefined : this.currentTheme().assets[assetKey];
    if (assetKey !== undefined && manifestEntry && this.textures.exists(assetKey)) {
      const x = this.mapOrigin.x + position.x * GRID_SIZE + offset.x;
      const y = this.mapOrigin.y + position.y * GRID_SIZE + offset.y;
      const sprite = this.add.image(x, y, assetKey).setOrigin(0, 0);
      if (displaySize) sprite.setDisplaySize(displaySize.width, displaySize.height);

      const sprites: Phaser.GameObjects.GameObject[] = [sprite.setDepth(depth)];
      if (foregroundCrop) {
        const displayWidth = displaySize?.width ?? manifestEntry.width;
        const displayHeight = displaySize?.height ?? manifestEntry.height;
        const cropY = Math.max(0, Math.min(foregroundCrop.y, manifestEntry.height));
        const cropHeight = Math.max(
          0,
          Math.min(foregroundCrop.height, manifestEntry.height - cropY),
        );
        if (cropHeight > 0) {
          sprites.push(
            this.add
              .image(x, y + (displayHeight * cropY) / manifestEntry.height, assetKey)
              .setOrigin(0, 0)
              .setCrop(0, cropY, manifestEntry.width, cropHeight)
              .setDisplaySize(displayWidth, (displayHeight * cropHeight) / manifestEntry.height)
              .setDepth(foregroundCrop.depth ?? depth + FOREGROUND_DEPTH_OFFSET),
          );
        }
      }
      return sprites;
    }

    return [];
  }

  private shouldRenderKey(key: Extract<GameState['objects'][number], { type: 'key' }>): boolean {
    return (
      !key.requiresReset ||
      key.availableAfterResetCount === undefined ||
      this.gameState.resetCount >= key.availableAfterResetCount
    );
  }

  private currentTheme(): ChapterVisualTheme {
    return getChapterVisualTheme(currentLevel(this.session).chapterId);
  }

  private objectVisual(
    id: string,
    type: string,
    position: GridPosition,
    state?: string,
  ): ObjectVisual {
    const theme = this.currentTheme();
    const typeVisual = theme.typeVisuals?.[type] ?? {};
    const objectVisual = theme.objectVisuals?.[id] ?? {};
    const positionOffset = objectVisual.offsetsByPosition?.[`${position.x},${position.y}`];
    const stateOffset = state ? objectVisual.offsetsByState?.[state] : undefined;
    return {
      ...typeVisual,
      ...objectVisual,
      offset: stateOffset ?? positionOffset ?? objectVisual.offset ?? typeVisual.offset,
    };
  }

  private gridToPixel(position: GridPosition): GridPosition {
    return {
      x: this.mapOrigin.x + position.x * GRID_SIZE + GRID_SIZE / 2,
      y: this.mapOrigin.y + position.y * GRID_SIZE + GRID_SIZE / 2,
    };
  }

  private characterToPixel(position: GridPosition): GridPosition {
    const pixel = this.gridToPixel(position);
    return { x: pixel.x, y: pixel.y + CHARACTER_FOOT_OFFSET_Y };
  }

  private updatePlayerDepth(): void {
    this.player.setDepth(PLAYER_CHARACTER_DEPTH);
  }

  private setGameState(state: GameState): void {
    this.gameState = state;
    this.session = updateSessionState(this.session, state);
  }

  private startChapterTransition(): void {
    if (this.isChapterTransitioning || this.gameState.phase !== 'completed') return;
    this.isChapterTransitioning = true;
    this.pendingReset = false;
    this.pendingDirection = undefined;
    this.cameras.main.fadeOut(CHAPTER_FADE_OUT_MS, 8, 7, 12);
    this.time.delayedCall(CHAPTER_FADE_OUT_MS + 30, () => this.advanceToNextLevel());
  }

  private advanceToNextLevel(): void {
    const previousIndex = this.session.currentLevelIndex;
    this.session = advanceGameSession(this.session);
    this.gameState = this.session.state;
    if (this.session.completed) {
      this.startEndingSequence(true);
      return;
    }
    if (this.session.currentLevelIndex === previousIndex) {
      this.isChapterTransitioning = false;
      this.cameras.main.fadeIn(CHAPTER_FADE_IN_MS, 8, 7, 12);
      return;
    }

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
    this.cameras.main.fadeIn(CHAPTER_FADE_IN_MS, 8, 7, 12);
    this.time.delayedCall(CHAPTER_FADE_IN_MS, () => {
      this.isChapterTransitioning = false;
    });
  }

  private lockInputForReset(): void {
    this.isResetting = true;
    this.time.delayedCall(RESET_LOCK_MS, () => {
      this.isResetting = false;
    });
  }

  private startEndingSequence(cameraAlreadyFaded = false): void {
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
    const revealEnding = () => {
      this.cameras.main.fadeIn(600, 8, 7, 12);
      this.renderEndingPage();
      this.isChapterTransitioning = false;
    };
    if (cameraAlreadyFaded) {
      revealEnding();
      return;
    }
    this.cameras.main.fadeOut(450, 8, 7, 12);
    this.time.delayedCall(480, revealEnding);
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
        scale: PLAYER_CHARACTER_SCALE * 0.65,
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
      this.feedbackHud.setText(FEEDBACK_MESSAGES.doorOpen);
    });
  }

  private showFeedback(message: string): void {
    this.feedbackHud.setText(message);
    this.time.delayedCall(FEEDBACK_DURATION_MS, () => {
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
