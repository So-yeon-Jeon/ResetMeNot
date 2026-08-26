import type { GameAction } from './action';
import {
  clearChapter4Code,
  createChapter4PuzzleState,
  inputChapter4Digit,
  inspectChapter4Clue,
  resetChapter4Puzzle,
  type Chapter4Clue,
  type Chapter4PuzzleState,
} from './chapter4-puzzle';
import type { Direction, GridMap, GridPosition } from './grid';
import { positionInDirection, positionKey, tryMove } from './grid';
import {
  cloneWorldObject,
  restoreWorldObjects,
  type ObjectEffect,
  type WorldObjectState,
} from './world-object';

export type EchoState = Readonly<{
  id: number;
  position: GridPosition;
  facing: Direction;
  heldInteractionId?: string;
}>;

export type WorldMemory = Readonly<{
  totalResetCount: number;
  chapterRestartCount: number;
  pocketWatchCollected: boolean;
  events: readonly string[];
  objectMemories?: readonly RememberedObjectState[];
  resetCountsByLevel?: Readonly<Record<string, number>>;
}>;

export type RememberedObjectState = Readonly<{
  levelId: string;
  objectId: string;
  objectType: 'box' | 'key' | 'puzzle-object';
  values: Readonly<{
    position?: GridPosition;
    state?: string;
    broken?: boolean;
    collectible?: boolean;
    collected?: boolean;
  }>;
}>;

export type GamePhase = 'playing' | 'let-time-go' | 'completed';
export type FinalClockStage = 'waiting' | 'wall-message' | 'clock-moving' | 'door-open';
export type ResetPolicy = 'disable' | 'unlimited';
const FINAL_GAZE_LEAD_MS = 3_000;
const DEFAULT_FINAL_WALL_MESSAGE_LEAD_MS = 20_000;
const DEFAULT_FINAL_CLOCK_MOTION_LEAD_MS = 10_000;

export type GameState = Readonly<{
  player: GridPosition;
  playerFacing: Direction;
  playerStart: GridPosition;
  playerStartFacing: Direction;
  elapsedMs: number;
  hasAction: boolean;
  heldInteractionId?: string;
  resetUnlocked: boolean;
  echoUnlocked: boolean;
  resetCount: number;
  resetLimit: number;
  resetPolicy: ResetPolicy;
  echoLimit: number;
  echoes: readonly EchoState[];
  objects: readonly WorldObjectState[];
  initialObjects: readonly WorldObjectState[];
  inventoryKeys: readonly string[];
  phase: GamePhase;
  worldMemory: WorldMemory;
  finalClockDurationMs?: number;
  finalWallMessageAtMs?: number;
  finalClockMotionAtMs?: number;
  finalDoorId?: string;
  finalClockElapsedMs: number;
  finalClockWarning: boolean;
  finalClockStage: FinalClockStage;
  finalResolved: boolean;
  levelId?: string;
  chapterId?: string;
  chapter4Puzzle?: Chapter4PuzzleState;
  codeEntryActive: boolean;
}>;

export type GameStateOptions = Readonly<{
  facing?: Direction;
  resetUnlocked?: boolean;
  echoUnlocked?: boolean;
  resetLimit?: number;
  resetPolicy?: ResetPolicy;
  echoLimit?: number;
  objects?: readonly WorldObjectState[];
  worldMemory?: WorldMemory;
  finalClockDurationMs?: number;
  finalWallMessageAtMs?: number;
  finalClockMotionAtMs?: number;
  finalDoorId?: string;
  levelId?: string;
  chapterId?: string;
}>;

export type ActionResult = Readonly<{
  state: GameState;
  changed: boolean;
  resetPerformed: boolean;
  resetBlocked?: 'locked' | 'empty-run' | 'limit' | 'chapter4-code-required';
  echoCreated: boolean;
  echoCreationBlocked?: 'occupied' | 'limit';
  feedbackEvent?: 'reset-unlocked' | 'key-acquired' | 'key-required';
  feedbackMessage?: string;
  chapterCompleted: boolean;
}>;

export function createGameState(player: GridPosition, options: GameStateOptions = {}): GameState {
  const resetLimit = options.resetLimit ?? 3;
  const resetPolicy = options.resetPolicy ?? 'disable';
  const echoLimit = options.echoLimit ?? resetLimit;
  validateLimits(resetLimit, echoLimit, resetPolicy);
  if (
    options.finalClockDurationMs !== undefined &&
    (!Number.isFinite(options.finalClockDurationMs) || options.finalClockDurationMs <= 0)
  ) {
    throw new Error('Final 시계 시간은 0보다 커야 합니다.');
  }
  validateFinalTimeline(
    options.finalClockDurationMs,
    options.finalWallMessageAtMs,
    options.finalClockMotionAtMs,
  );

  const facing = options.facing ?? 'down';
  const resetUnlocked = options.resetUnlocked ?? options.worldMemory?.pocketWatchCollected ?? false;
  const initialObjects = (options.objects ?? []).map(cloneWorldObject);
  const objects = recalculateDerivedObjects(initialObjects, player, [], undefined, undefined);
  return {
    player: { ...player },
    playerFacing: facing,
    playerStart: { ...player },
    playerStartFacing: facing,
    elapsedMs: 0,
    hasAction: false,
    resetUnlocked,
    echoUnlocked: options.echoUnlocked ?? resetUnlocked,
    resetCount: 0,
    resetLimit,
    resetPolicy,
    echoLimit,
    echoes: [],
    objects,
    initialObjects,
    inventoryKeys: [],
    phase: 'playing',
    worldMemory: options.worldMemory ?? {
      totalResetCount: 0,
      chapterRestartCount: 0,
      pocketWatchCollected: false,
      events: [],
    },
    finalClockDurationMs: options.finalClockDurationMs,
    finalWallMessageAtMs: options.finalWallMessageAtMs,
    finalClockMotionAtMs: options.finalClockMotionAtMs,
    finalDoorId: options.finalDoorId,
    finalClockElapsedMs: 0,
    finalClockWarning: false,
    finalClockStage: 'waiting',
    finalResolved: false,
    levelId: options.levelId,
    chapterId: options.chapterId,
    chapter4Puzzle: options.chapterId === 'chapter-04' ? createChapter4PuzzleState() : undefined,
    codeEntryActive: false,
  };
}

export function unlockReset(state: GameState): GameState {
  if (state.resetUnlocked) return state;
  return { ...state, resetUnlocked: true, echoUnlocked: true };
}

export function advanceTime(state: GameState, deltaMs: number): GameState {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new Error('게임 경과 시간 증가량은 0 이상이어야 합니다.');
  }
  if (state.phase !== 'playing') return state;
  if (state.finalResolved) return { ...state, elapsedMs: state.elapsedMs + deltaMs };

  const finalClockElapsedMs = state.finalClockElapsedMs + deltaMs;
  const reachedFinalClock =
    state.finalClockDurationMs !== undefined && finalClockElapsedMs >= state.finalClockDurationMs;
  const finalClockWarning =
    state.finalClockDurationMs !== undefined &&
    finalClockElapsedMs >= Math.max(0, state.finalClockDurationMs - FINAL_GAZE_LEAD_MS);
  const finalClockStage = calculateFinalClockStage(state, finalClockElapsedMs);
  const objects = reachedFinalClock
    ? state.objects.map((object) =>
        object.type === 'door' && object.id === state.finalDoorId
          ? { ...object, open: true }
          : object,
      )
    : state.objects;
  const echoes =
    finalClockWarning && !state.finalClockWarning
      ? state.echoes.map((echo) => ({
          ...echo,
          facing: directionToward(echo.position, state.player, echo.facing),
        }))
      : state.echoes;
  return {
    ...state,
    elapsedMs: state.elapsedMs + deltaMs,
    finalClockElapsedMs,
    finalClockWarning,
    finalClockStage,
    objects,
    echoes,
    phase: reachedFinalClock ? 'let-time-go' : state.phase,
  };
}

export function finishFinale(state: GameState): GameState {
  if (state.phase !== 'let-time-go') return state;
  return {
    ...state,
    phase: 'playing',
    finalResolved: true,
    echoes: [],
    objects: state.objects.map((object) =>
      object.type === 'door' && object.id === state.finalDoorId
        ? { ...object, open: true, scriptedOpen: true }
        : object,
    ),
  };
}

function calculateFinalClockStage(state: GameState, elapsedMs: number): FinalClockStage {
  const durationMs = state.finalClockDurationMs;
  if (durationMs === undefined) return 'waiting';
  if (elapsedMs >= durationMs) return 'door-open';
  const clockMotionAtMs =
    state.finalClockMotionAtMs ?? Math.max(0, durationMs - DEFAULT_FINAL_CLOCK_MOTION_LEAD_MS);
  if (elapsedMs >= clockMotionAtMs) return 'clock-moving';
  const wallMessageAtMs =
    state.finalWallMessageAtMs ?? Math.max(0, durationMs - DEFAULT_FINAL_WALL_MESSAGE_LEAD_MS);
  return elapsedMs >= wallMessageAtMs ? 'wall-message' : 'waiting';
}

function validateFinalTimeline(
  durationMs: number | undefined,
  wallMessageAtMs: number | undefined,
  clockMotionAtMs: number | undefined,
): void {
  for (const [label, value] of [
    ['Final 벽 문장 시점', wallMessageAtMs],
    ['Final 시계 움직임 시점', clockMotionAtMs],
  ] as const) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
      throw new Error(`${label}은 0 이상이어야 합니다.`);
    }
  }
  if (
    durationMs === undefined &&
    (wallMessageAtMs !== undefined || clockMotionAtMs !== undefined)
  ) {
    throw new Error('Final 연출 시점은 Final 시계 시간과 함께 지정해야 합니다.');
  }
  if (
    wallMessageAtMs !== undefined &&
    clockMotionAtMs !== undefined &&
    wallMessageAtMs > clockMotionAtMs
  ) {
    throw new Error('Final 벽 문장 시점은 시계 움직임 시점보다 늦을 수 없습니다.');
  }
  if (durationMs !== undefined && clockMotionAtMs !== undefined && clockMotionAtMs >= durationMs) {
    throw new Error('Final 시계 움직임 시점은 목표 시간 전이어야 합니다.');
  }
}

export function applyAction(state: GameState, action: GameAction, map: GridMap): ActionResult {
  if (state.phase !== 'playing') return result(state, false);
  if (action.type === 'reset') return applyReset(state);
  if (action.type === 'interact') return applyInteract(state, map);
  if (action.type === 'input-code') return applyCodeDigit(state, action.digit);
  if (action.type === 'clear-code') return applyCodeClear(state);
  return applyMove(state, action.direction, map);
}

export function restartChapter(state: GameState): GameState {
  if (state.finalResolved) return state;
  const objects = restoreWorldObjects(state.initialObjects, state.initialObjects).map((object) => {
    if (object.type !== 'pocket-watch') return object;
    const currentWatch = state.objects.find((candidate) => candidate.id === object.id);
    return currentWatch?.type === 'pocket-watch' ? cloneWorldObject(currentWatch) : object;
  });
  return {
    ...state,
    player: { ...state.playerStart },
    playerFacing: state.playerStartFacing,
    elapsedMs: 0,
    hasAction: false,
    heldInteractionId: undefined,
    resetCount: 0,
    echoes: [],
    objects: recalculateDerivedObjects(objects, state.playerStart, [], undefined, undefined),
    inventoryKeys: [],
    phase: 'playing',
    finalClockElapsedMs: 0,
    finalClockWarning: false,
    finalClockStage: 'waiting',
    finalResolved: false,
    chapter4Puzzle:
      state.chapterId === 'chapter-04' ? createChapter4PuzzleState() : state.chapter4Puzzle,
    codeEntryActive: false,
    worldMemory: {
      ...state.worldMemory,
      chapterRestartCount: state.worldMemory.chapterRestartCount + 1,
    },
  };
}

export function rememberWorldEvent(state: GameState, eventId: string): GameState {
  if (state.worldMemory.events.includes(eventId)) return state;
  return {
    ...state,
    worldMemory: {
      ...state.worldMemory,
      events: [...state.worldMemory.events, eventId],
    },
  };
}

export function rememberLevelObjects(state: GameState, levelId: string): GameState {
  const remembered = state.objects.flatMap((object): RememberedObjectState[] => {
    if (object.type === 'box' && object.persistentFields.length > 0) {
      return [
        {
          levelId,
          objectId: object.id,
          objectType: object.type,
          values: { position: { ...object.position } },
        },
      ];
    }
    if (object.type === 'key' && object.persistentFields.length > 0) {
      return [
        {
          levelId,
          objectId: object.id,
          objectType: object.type,
          values: {
            ...(object.persistentFields.includes('position') && {
              position: { ...object.position },
            }),
            ...(object.persistentFields.includes('collectible') && {
              collectible: object.collectible,
            }),
            ...(object.persistentFields.includes('collected') && { collected: object.collected }),
          },
        },
      ];
    }
    if (object.type === 'puzzle-object' && object.persistentFields.length > 0) {
      return [
        {
          levelId,
          objectId: object.id,
          objectType: object.type,
          values: {
            ...(object.persistentFields.includes('position') && {
              position: { ...object.position },
            }),
            ...(object.persistentFields.includes('state') && { state: object.state }),
            ...(object.persistentFields.includes('broken') && { broken: object.broken }),
            ...(object.persistentFields.includes('collected') && { collected: object.collected }),
          },
        },
      ];
    }
    return [];
  });
  if (remembered.length === 0) return state;

  const keys = new Set(remembered.map((item) => `${item.levelId}:${item.objectId}`));
  const previous = (state.worldMemory.objectMemories ?? []).filter(
    (item) => !keys.has(`${item.levelId}:${item.objectId}`),
  );
  return {
    ...state,
    worldMemory: {
      ...state.worldMemory,
      objectMemories: [...previous, ...remembered],
    },
  };
}

function applyMove(state: GameState, direction: Direction, map: GridMap): ActionResult {
  const candidate = tryMove(state.player, direction, map);
  if (candidate === state.player) return facingResult(state, direction);

  let objects = state.objects;
  const box = findObjectAt(objects, candidate, 'box');
  const blockedByObject = objects.some(
    (object) => object.id !== box?.id && blocksPosition(object, candidate),
  );
  if (blockedByObject) return facingResult(state, direction);

  if (box?.type === 'box') {
    const boxDestination = tryMove(box.position, direction, map);
    const boxBlocked =
      boxDestination === box.position ||
      objects.some(
        (object) =>
          object.id !== box.id && (object.type === 'box' || blocksPosition(object, boxDestination)),
      );
    if (boxBlocked) return facingResult(state, direction);
    objects = objects.map((object) =>
      object.id === box.id ? { ...box, position: { ...boxDestination } } : object,
    );
  }

  objects = recalculateDerivedObjects(objects, candidate, state.echoes, state.objects, undefined);
  const completed = objects.some(
    (object) =>
      object.type === 'exit' &&
      object.mode === 'enter' &&
      positionKey(object.position) === positionKey(candidate),
  );
  const nextState: GameState = {
    ...state,
    player: candidate,
    playerFacing: direction,
    hasAction: true,
    heldInteractionId: undefined,
    objects,
    phase: completed ? 'completed' : state.phase,
  };
  return { ...result(nextState, true), chapterCompleted: completed };
}

function applyInteract(state: GameState, map: GridMap): ActionResult {
  const target = positionInDirection(state.player, state.playerFacing);
  const object = state.objects.find((candidate) => {
    const isPuzzleObject = candidate.type === 'puzzle-object' && candidate.onInteract !== undefined;
    const isKeyOnPlayer =
      candidate.type === 'key' && samePosition(candidate.position, state.player);
    if (isPuzzleObject && !puzzleObjectOccupies(candidate, target)) return false;
    if (
      !isPuzzleObject &&
      !isKeyOnPlayer &&
      (candidate.type === 'door'
        ? !relativeCellsContain(candidate.position, candidate.interactionCells, target)
        : positionKey(candidate.position) !== positionKey(target))
    ) {
      return false;
    }
    return (
      (candidate.type === 'pocket-watch' && !candidate.collected && candidate.interactable) ||
      (candidate.type === 'key' &&
        !candidate.collected &&
        candidate.collectible &&
        (!candidate.requiresReset ||
          candidate.availableAfterResetCount === undefined ||
          state.resetCount >= candidate.availableAfterResetCount)) ||
      candidate.type === 'lever' ||
      (candidate.type === 'door' && !candidate.unlocked && candidate.keyId !== undefined) ||
      (candidate.type === 'exit' && candidate.mode === 'interact') ||
      (candidate.type === 'puzzle-object' && candidate.onInteract !== undefined)
    );
  });
  if (!object) return result(state, false);

  const clueByObjectId: Readonly<Record<string, Chapter4Clue>> = {
    'chapter4-portrait-clue': 'portrait-9',
    'chapter4-book-clue': 'book-2-left-to-right',
    'chapter4-missing-picture-clue': 'missing-picture-4',
  };
  const clue = clueByObjectId[object.id];
  if (state.chapter4Puzzle && clue) {
    const inspection = inspectChapter4Clue(state.chapter4Puzzle, clue);
    return {
      ...result(
        {
          ...state,
          chapter4Puzzle: inspection.state,
          hasAction: state.hasAction || inspection.discovered,
        },
        inspection.discovered,
      ),
      feedbackMessage: inspection.feedback,
    };
  }
  if (state.chapter4Puzzle && object.id === 'chapter4-code-lock') {
    const available = state.chapter4Puzzle.resetStage >= 3;
    return {
      ...result({ ...state, codeEntryActive: available, hasAction: true }, available),
      feedbackMessage: available
        ? '암호를 숫자키로 입력하자. BACKSPACE로 지울 수 있다.'
        : '단서가 부족하다.',
    };
  }

  if (
    object.type === 'key' &&
    !samePosition(object.position, state.player) &&
    isBlockedByOtherObject(state.objects, target, object.id)
  ) {
    return result(state, false);
  }

  if (object.type === 'pocket-watch' && !object.collected) {
    return {
      ...changedInteraction(
        state,
        object.id,
        { collected: true },
        {
          resetUnlocked: true,
          worldMemory: { ...state.worldMemory, pocketWatchCollected: true },
        },
      ),
      feedbackEvent: 'reset-unlocked',
    };
  }
  if (object.type === 'key' && !object.collected) {
    return {
      ...changedInteraction(
        state,
        object.id,
        { collected: true },
        {
          inventoryKeys: [...state.inventoryKeys, object.id],
        },
      ),
      feedbackEvent: 'key-acquired',
    };
  }
  if (object.type === 'lever' && object.acceptedActors.includes('player')) {
    const active = object.mode === 'toggle' ? !object.active : true;
    const objects = state.objects.map((candidate) =>
      candidate.id === object.id ? { ...object, active } : candidate,
    );
    return result(
      {
        ...state,
        objects: recalculateDerivedObjects(
          objects,
          state.player,
          state.echoes,
          state.objects,
          object.mode === 'hold' ? object.id : undefined,
        ),
        heldInteractionId: object.mode === 'hold' ? object.id : undefined,
        hasAction: true,
      },
      true,
    );
  }
  if (object.type === 'door' && !object.unlocked && object.keyId) {
    if (!state.inventoryKeys.includes(object.keyId)) {
      return { ...result(state, false), feedbackEvent: 'key-required' };
    }
    const inventoryKeys = object.consumesKey
      ? state.inventoryKeys.filter((keyId) => keyId !== object.keyId)
      : state.inventoryKeys;
    const objects = state.objects.map((candidate) =>
      candidate.id === object.id ? { ...object, unlocked: true, open: true } : candidate,
    );
    return {
      ...result(
        {
          ...state,
          objects,
          inventoryKeys,
          hasAction: true,
          phase: object.clearOnOpen ? 'completed' : state.phase,
        },
        true,
      ),
      chapterCompleted: object.clearOnOpen,
    };
  }
  if (object.type === 'exit' && object.mode === 'interact') {
    return {
      ...result({ ...state, phase: 'completed', hasAction: true }, true),
      chapterCompleted: true,
    };
  }
  if (object.type === 'puzzle-object' && object.onInteract) {
    return applyPuzzleInteraction(state, object, map);
  }
  return result(state, false);
}

function puzzleObjectOccupies(
  object: Extract<WorldObjectState, { type: 'puzzle-object' }>,
  position: GridPosition,
): boolean {
  const interactionCells = object.states[object.state]?.interactionCells ?? [{ x: 0, y: 0 }];
  return interactionCells.some(
    (cell) =>
      positionKey({
        x: object.position.x + cell.x,
        y: object.position.y + cell.y,
      }) === positionKey(position),
  );
}

function applyPuzzleInteraction(
  state: GameState,
  object: Extract<WorldObjectState, { type: 'puzzle-object' }>,
  map: GridMap,
): ActionResult {
  const interaction = object.onInteract;
  if (!interaction) return result(state, false);

  let objects = state.objects;
  const nextState = interaction.nextState;
  if (nextState === object.state) return result(state, false);
  if (nextState !== undefined) {
    if (!object.states[nextState]) return result(state, false);
    objects = objects.map((candidate) =>
      candidate.id === object.id ? { ...object, state: nextState } : candidate,
    );
  }

  for (const effect of interaction.effects) {
    const nextObjects = applyObjectEffect(objects, effect, state.resetCount);
    if (!nextObjects) return result(state, false);
    objects = nextObjects;
  }

  const watchCollected = objects.some(
    (candidate) => candidate.type === 'pocket-watch' && candidate.collected,
  );
  const watchMemory = watchCollected
    ? { ...state.worldMemory, pocketWatchCollected: true }
    : state.worldMemory;
  const retreatDirection = interaction.playerRetreat;
  const retreatPosition = retreatDirection
    ? tryMove(state.player, retreatDirection, map)
    : state.player;
  const canRetreat =
    retreatDirection !== undefined &&
    retreatPosition !== state.player &&
    !objects.some((candidate) => blocksPosition(candidate, retreatPosition));
  if (retreatDirection !== undefined && !canRetreat) return result(state, false);
  const player = canRetreat ? retreatPosition : state.player;
  const playerFacing = canRetreat && retreatDirection ? retreatDirection : state.playerFacing;
  objects = recalculateDerivedObjects(objects, player, state.echoes, state.objects, undefined);
  return {
    ...result(
      {
        ...state,
        player,
        playerFacing,
        objects,
        hasAction: true,
        resetUnlocked: state.resetUnlocked || watchCollected,
        worldMemory: watchMemory,
      },
      true,
    ),
    feedbackEvent: watchCollected && !state.resetUnlocked ? 'reset-unlocked' : undefined,
  };
}

function applyObjectEffect(
  objects: readonly WorldObjectState[],
  effect: ObjectEffect,
  resetCount: number,
): readonly WorldObjectState[] | undefined {
  const target = objects.find((object) => object.id === effect.objectId);
  if (!target) return undefined;

  return objects.map((object) => {
    if (object.id !== effect.objectId) return object;
    if (effect.type === 'set-position') return { ...object, position: { ...effect.position } };
    if (effect.type === 'set-state' && object.type === 'puzzle-object') {
      return object.states[effect.state] ? { ...object, state: effect.state } : object;
    }
    if (effect.type === 'set-collectible' && object.type === 'key') {
      const newlyCollectible = effect.collectible && !object.collectible;
      return {
        ...object,
        collectible: effect.collectible,
        availableAfterResetCount:
          newlyCollectible && object.requiresReset
            ? resetCount + 1
            : object.availableAfterResetCount,
      };
    }
    if (
      effect.type === 'set-collected' &&
      (object.type === 'key' || object.type === 'pocket-watch')
    ) {
      return { ...object, collected: effect.collected };
    }
    return object;
  });
}

function changedInteraction(
  state: GameState,
  objectId: string,
  objectChange: Readonly<Record<string, unknown>>,
  stateChange: Partial<GameState>,
): ActionResult {
  const objects = state.objects.map((object) =>
    object.id === objectId ? ({ ...object, ...objectChange } as WorldObjectState) : object,
  );
  return result({ ...state, ...stateChange, objects, hasAction: true }, true);
}

function applyReset(state: GameState): ActionResult {
  const resetLimitReached = state.resetPolicy === 'disable' && state.resetCount >= state.resetLimit;
  if (state.finalResolved) return result(state, false);
  if (!state.resetUnlocked) return { ...result(state, false), resetBlocked: 'locked' };
  if (resetLimitReached) return { ...result(state, false), resetBlocked: 'limit' };
  if (!state.hasAction) return { ...result(state, false), resetBlocked: 'empty-run' };

  const chapter4Reset = state.chapter4Puzzle
    ? resetChapter4Puzzle(state.chapter4Puzzle)
    : undefined;
  if (chapter4Reset && !chapter4Reset.performed) {
    return {
      ...result(state, false),
      resetBlocked: chapter4Reset.blocked === 'code-required' ? 'chapter4-code-required' : 'limit',
    };
  }

  const echoAlreadyAtPlayer = state.echoes.some((echo) =>
    samePosition(echo.position, state.player),
  );
  const echoLimitReached = state.echoes.length >= state.echoLimit;
  const canCreateEcho = state.echoUnlocked && !echoLimitReached && !echoAlreadyAtPlayer;
  const echoCreationBlocked = !state.echoUnlocked
    ? undefined
    : echoAlreadyAtPlayer
      ? 'occupied'
      : echoLimitReached
        ? 'limit'
        : undefined;
  const echoes: readonly EchoState[] = canCreateEcho
    ? [
        ...state.echoes,
        {
          id: state.echoes.length + 1,
          position: { ...state.player },
          facing: state.playerFacing,
          heldInteractionId: state.heldInteractionId,
        },
      ]
    : state.echoes;
  const restoredObjects = restoreWorldObjects(state.objects, state.initialObjects);
  let objects = recalculateDerivedObjects(
    restoredObjects,
    state.playerStart,
    echoes,
    state.objects,
    undefined,
  );
  if (chapter4Reset?.state.exitOpen) {
    objects = objects.map((object) =>
      object.type === 'door' && object.id === 'chapter4-exit-door'
        ? { ...object, open: true, scriptedOpen: true }
        : object,
    );
  }

  return {
    state: {
      ...state,
      player: { ...state.playerStart },
      playerFacing: state.playerStartFacing,
      elapsedMs: 0,
      hasAction: false,
      heldInteractionId: undefined,
      resetCount: state.resetCount + 1,
      echoes,
      objects,
      inventoryKeys: restoredObjects
        .filter((object) => object.type === 'key' && object.collected)
        .map((object) => object.id),
      finalClockElapsedMs: 0,
      finalClockWarning: false,
      finalClockStage: 'waiting',
      finalResolved: false,
      chapter4Puzzle: chapter4Reset?.state ?? state.chapter4Puzzle,
      codeEntryActive: false,
      worldMemory: {
        ...state.worldMemory,
        totalResetCount: state.worldMemory.totalResetCount + 1,
        resetCountsByLevel: state.levelId
          ? {
              ...state.worldMemory.resetCountsByLevel,
              [state.levelId]: (state.worldMemory.resetCountsByLevel?.[state.levelId] ?? 0) + 1,
            }
          : state.worldMemory.resetCountsByLevel,
      },
    },
    changed: true,
    resetPerformed: true,
    echoCreated: canCreateEcho,
    echoCreationBlocked,
    chapterCompleted: false,
  };
}

function applyCodeDigit(state: GameState, digit: number): ActionResult {
  if (!state.chapter4Puzzle || !state.codeEntryActive) return result(state, false);
  const chapter4Puzzle = inputChapter4Digit(state.chapter4Puzzle, digit);
  if (chapter4Puzzle === state.chapter4Puzzle) return result(state, false);
  return {
    ...result({ ...state, chapter4Puzzle, hasAction: true }, true),
    feedbackMessage: chapter4Puzzle.codeConfirmed
      ? '기억은 맞지만, 아직 시간이 맞지 않는다.'
      : `암호 ${chapter4Puzzle.codeInput.padEnd(3, '·')}`,
  };
}

function applyCodeClear(state: GameState): ActionResult {
  if (!state.chapter4Puzzle || !state.codeEntryActive) return result(state, false);
  const chapter4Puzzle = clearChapter4Code(state.chapter4Puzzle);
  if (chapter4Puzzle === state.chapter4Puzzle) return result(state, false);
  return {
    ...result({ ...state, chapter4Puzzle }, true),
    feedbackMessage: '암호를 지웠다.',
  };
}

function recalculateDerivedObjects(
  objects: readonly WorldObjectState[],
  player: GridPosition,
  echoes: readonly EchoState[],
  previousObjects: readonly WorldObjectState[] | undefined,
  playerHeldInteractionId: string | undefined,
): readonly WorldObjectState[] {
  const activated = objects.map((object) => {
    if (object.type === 'pressure-switch') {
      const playerActive =
        object.acceptedActors.includes('player') && samePosition(object.position, player);
      const echoActive =
        object.acceptedActors.includes('echo') &&
        echoes.some((echo) => samePosition(echo.position, object.position));
      const boxActive =
        object.acceptedActors.includes('box') &&
        objects.some(
          (candidate) =>
            candidate.type === 'box' &&
            samePosition(candidate.position, object.position) &&
            (!object.requiresCommittedMemory || candidate.memoryCommitted),
        );
      return { ...object, active: playerActive || echoActive || boxActive };
    }
    if (object.type === 'lever' && object.mode === 'hold') {
      const playerActive =
        object.acceptedActors.includes('player') && playerHeldInteractionId === object.id;
      const echoActive =
        object.acceptedActors.includes('echo') &&
        echoes.some((echo) => echo.heldInteractionId === object.id);
      return { ...object, active: playerActive || echoActive };
    }
    return object;
  });

  return activated.map((object) => {
    if (object.type !== 'door') return object;
    const controllers = [...object.switchIds, ...object.leverIds];
    const activeControllers = controllers.filter((id) => {
      const linked = activated.find((candidate) => candidate.id === id);
      return (linked?.type === 'pressure-switch' || linked?.type === 'lever') && linked.active;
    });
    const controllersActive =
      controllers.length > 0 &&
      (object.activationMode === 'all'
        ? activeControllers.length === controllers.length
        : activeControllers.length > 0);
    const occupied =
      samePosition(object.position, player) ||
      echoes.some((echo) => samePosition(echo.position, object.position)) ||
      activated.some(
        (candidate) =>
          candidate.type === 'box' && samePosition(candidate.position, object.position),
      );
    const previous = previousObjects?.find((candidate) => candidate.id === object.id);
    const keepOpenWhileOccupied = previous?.type === 'door' && previous.open && occupied;
    const keyOpen = object.keyId !== undefined && object.unlocked;
    return {
      ...object,
      open:
        object.scriptedOpen ||
        keyOpen ||
        (object.unlocked && controllersActive) ||
        keepOpenWhileOccupied,
    };
  });
}

function blocksPosition(object: WorldObjectState, position: GridPosition): boolean {
  if (object.type === 'door') return !object.open && samePosition(object.position, position);
  if (object.type === 'box') return samePosition(object.position, position);
  if (object.type === 'key')
    return (
      object.blocksMovement &&
      !object.collected &&
      object.collectible &&
      samePosition(object.position, position)
    );
  if (object.type === 'pocket-watch') {
    return (
      !object.collected &&
      object.interactable &&
      object.blocksMovement &&
      samePosition(object.position, position)
    );
  }
  if (object.type === 'lever') return samePosition(object.position, position);
  if (object.type === 'prop')
    return relativeCellsContain(object.position, object.collisionCells, position);
  if (object.type === 'puzzle-object') {
    const definition = object.states[object.state];
    return relativeCellsContain(
      object.position,
      definition?.collisionCells ?? [{ x: 0, y: 0 }],
      position,
    );
  }
  return false;
}

function isBlockedByOtherObject(
  objects: readonly WorldObjectState[],
  position: GridPosition,
  ignoredObjectId: string,
): boolean {
  return objects.some(
    (object) => object.id !== ignoredObjectId && blocksPosition(object, position),
  );
}

function relativeCellsContain(
  origin: GridPosition,
  cells: readonly GridPosition[],
  position: GridPosition,
): boolean {
  return cells.some((cell) => origin.x + cell.x === position.x && origin.y + cell.y === position.y);
}

function findObjectAt(
  objects: readonly WorldObjectState[],
  position: GridPosition,
  type: WorldObjectState['type'],
): WorldObjectState | undefined {
  return objects.find((object) => object.type === type && samePosition(object.position, position));
}

function samePosition(left: GridPosition, right: GridPosition): boolean {
  return positionKey(left) === positionKey(right);
}

function directionToward(from: GridPosition, target: GridPosition, fallback: Direction): Direction {
  const horizontalDistance = target.x - from.x;
  const verticalDistance = target.y - from.y;
  if (Math.abs(horizontalDistance) >= Math.abs(verticalDistance) && horizontalDistance !== 0) {
    return horizontalDistance > 0 ? 'right' : 'left';
  }
  if (verticalDistance !== 0) return verticalDistance > 0 ? 'down' : 'up';
  return fallback;
}

function facingResult(state: GameState, direction: Direction): ActionResult {
  const releasedHold = state.heldInteractionId !== undefined;
  const objects = releasedHold
    ? recalculateDerivedObjects(state.objects, state.player, state.echoes, state.objects, undefined)
    : state.objects;
  return result(
    { ...state, playerFacing: direction, heldInteractionId: undefined, objects },
    direction !== state.playerFacing || releasedHold,
  );
}

function result(state: GameState, changed: boolean): ActionResult {
  return {
    state,
    changed,
    resetPerformed: false,
    echoCreated: false,
    chapterCompleted: false,
  };
}

function validateLimits(resetLimit: number, echoLimit: number, resetPolicy: ResetPolicy): void {
  if (!Number.isInteger(resetLimit) || resetLimit < 0) {
    throw new Error('RESET 한도는 0 이상의 정수여야 합니다.');
  }
  if (
    !Number.isInteger(echoLimit) ||
    echoLimit < 0 ||
    (resetPolicy === 'disable' && echoLimit > resetLimit)
  ) {
    throw new Error('Echo 한도는 RESET 한도 이하의 0 이상 정수여야 합니다.');
  }
}
