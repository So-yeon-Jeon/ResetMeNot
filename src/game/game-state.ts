import type { GameAction } from './action';
import type { Direction, GridMap, GridPosition } from './grid';
import { positionInDirection, positionKey, tryMove } from './grid';
import { cloneWorldObject, restoreWorldObjects, type WorldObjectState } from './world-object';

export type EchoState = Readonly<{
  id: number;
  position: GridPosition;
  facing: Direction;
  heldInteractionId?: string;
}>;

export type WorldMemory = Readonly<{
  totalResetCount: number;
  events: readonly string[];
}>;

export type GamePhase = 'playing' | 'let-time-go' | 'completed';

export type GameState = Readonly<{
  player: GridPosition;
  playerFacing: Direction;
  playerStart: GridPosition;
  playerStartFacing: Direction;
  elapsedMs: number;
  hasAction: boolean;
  heldInteractionId?: string;
  resetUnlocked: boolean;
  resetCount: number;
  resetLimit: number;
  echoLimit: number;
  echoes: readonly EchoState[];
  objects: readonly WorldObjectState[];
  initialObjects: readonly WorldObjectState[];
  inventoryKeys: readonly string[];
  phase: GamePhase;
  worldMemory: WorldMemory;
  finalClockDurationMs?: number;
  finalClockElapsedMs: number;
}>;

export type GameStateOptions = Readonly<{
  facing?: Direction;
  resetUnlocked?: boolean;
  resetLimit?: number;
  echoLimit?: number;
  objects?: readonly WorldObjectState[];
  worldMemory?: WorldMemory;
  finalClockDurationMs?: number;
}>;

export type ActionResult = Readonly<{
  state: GameState;
  changed: boolean;
  resetPerformed: boolean;
  echoCreated: boolean;
  chapterCompleted: boolean;
}>;

export function createGameState(player: GridPosition, options: GameStateOptions = {}): GameState {
  const resetLimit = options.resetLimit ?? 3;
  const echoLimit = options.echoLimit ?? resetLimit;
  validateLimits(resetLimit, echoLimit);
  if (
    options.finalClockDurationMs !== undefined &&
    (!Number.isFinite(options.finalClockDurationMs) || options.finalClockDurationMs <= 0)
  ) {
    throw new Error('Final 시계 시간은 0보다 커야 합니다.');
  }

  const facing = options.facing ?? 'down';
  const objects = (options.objects ?? []).map(cloneWorldObject);
  return {
    player: { ...player },
    playerFacing: facing,
    playerStart: { ...player },
    playerStartFacing: facing,
    elapsedMs: 0,
    hasAction: false,
    resetUnlocked: options.resetUnlocked ?? false,
    resetCount: 0,
    resetLimit,
    echoLimit,
    echoes: [],
    objects,
    initialObjects: objects.map(cloneWorldObject),
    inventoryKeys: [],
    phase: 'playing',
    worldMemory: options.worldMemory ?? { totalResetCount: 0, events: [] },
    finalClockDurationMs: options.finalClockDurationMs,
    finalClockElapsedMs: 0,
  };
}

export function unlockReset(state: GameState): GameState {
  if (state.resetUnlocked) return state;
  return { ...state, resetUnlocked: true };
}

export function advanceTime(state: GameState, deltaMs: number): GameState {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new Error('게임 경과 시간 증가량은 0 이상이어야 합니다.');
  }
  if (state.phase !== 'playing') return state;

  const finalClockElapsedMs = state.finalClockElapsedMs + deltaMs;
  const reachedFinalClock =
    state.finalClockDurationMs !== undefined && finalClockElapsedMs >= state.finalClockDurationMs;
  return {
    ...state,
    elapsedMs: state.elapsedMs + deltaMs,
    finalClockElapsedMs,
    phase: reachedFinalClock ? 'let-time-go' : state.phase,
  };
}

export function applyAction(state: GameState, action: GameAction, map: GridMap): ActionResult {
  if (state.phase !== 'playing') return result(state, false);
  if (action.type === 'reset') return applyReset(state);
  if (action.type === 'interact') return applyInteract(state);
  return applyMove(state, action.direction, map);
}

export function restartChapter(state: GameState): GameState {
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

function applyMove(state: GameState, direction: Direction, map: GridMap): ActionResult {
  const candidate = tryMove(state.player, direction, map);
  if (candidate === state.player) return facingResult(state, direction);

  const closedDoor = findObjectAt(state.objects, candidate, 'door');
  if (closedDoor?.type === 'door' && !closedDoor.open) return facingResult(state, direction);

  const blockingInteractionObject = state.objects.some(
    (object) =>
      samePosition(object.position, candidate) &&
      ((object.type === 'pocket-watch' && !object.collected) ||
        (object.type === 'key' && !object.collected) ||
        object.type === 'lever' ||
        object.type === 'puzzle-object'),
  );
  if (blockingInteractionObject) return facingResult(state, direction);

  let objects = state.objects;
  const box = findObjectAt(objects, candidate, 'box');
  if (box?.type === 'box') {
    const boxDestination = tryMove(box.position, direction, map);
    const boxBlocked =
      boxDestination === box.position ||
      objects.some(
        (object) =>
          (object.type === 'box' || (object.type === 'door' && !object.open)) &&
          object.id !== box.id &&
          positionKey(object.position) === positionKey(boxDestination),
      );
    if (boxBlocked) return facingResult(state, direction);
    objects = objects.map((object) =>
      object.id === box.id ? { ...box, position: { ...boxDestination } } : object,
    );
  }

  objects = recalculateDerivedObjects(objects, candidate, state.echoes, undefined, undefined);
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

function applyInteract(state: GameState): ActionResult {
  const target = positionInDirection(state.player, state.playerFacing);
  const object = state.objects.find(
    (candidate) => positionKey(candidate.position) === positionKey(target),
  );
  if (!object) return result(state, false);

  if (object.type === 'pocket-watch' && !object.collected) {
    return changedInteraction(state, object.id, { collected: true }, { resetUnlocked: true });
  }
  if (object.type === 'key' && !object.collected) {
    return changedInteraction(
      state,
      object.id,
      { collected: true },
      {
        inventoryKeys: [...state.inventoryKeys, object.id],
      },
    );
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
    if (!state.inventoryKeys.includes(object.keyId)) return result(state, false);
    const inventoryKeys = object.consumesKey
      ? state.inventoryKeys.filter((keyId) => keyId !== object.keyId)
      : state.inventoryKeys;
    const objects = state.objects.map((candidate) =>
      candidate.id === object.id ? { ...object, unlocked: true, open: true } : candidate,
    );
    return result({ ...state, objects, inventoryKeys, hasAction: true }, true);
  }
  if (object.type === 'exit' && object.mode === 'interact') {
    return {
      ...result({ ...state, phase: 'completed', hasAction: true }, true),
      chapterCompleted: true,
    };
  }
  return result(state, false);
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
  if (!state.resetUnlocked || !state.hasAction || state.resetCount >= state.resetLimit) {
    return result(state, false);
  }

  const canCreateEcho = state.echoes.length < state.echoLimit;
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
  const objects = recalculateDerivedObjects(
    restoredObjects,
    state.playerStart,
    echoes,
    state.objects,
    undefined,
  );

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
      inventoryKeys: [],
      finalClockElapsedMs: 0,
      worldMemory: {
        ...state.worldMemory,
        totalResetCount: state.worldMemory.totalResetCount + 1,
      },
    },
    changed: true,
    resetPerformed: true,
    echoCreated: canCreateEcho,
    chapterCompleted: false,
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
            candidate.type === 'box' && samePosition(candidate.position, object.position),
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
    const controllersActive =
      controllers.length > 0 &&
      controllers.every((id) => {
        const linked = activated.find((candidate) => candidate.id === id);
        return (linked?.type === 'pressure-switch' || linked?.type === 'lever') && linked.active;
      });
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
      open: keyOpen || (object.unlocked && controllersActive) || keepOpenWhileOccupied,
    };
  });
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

function facingResult(state: GameState, direction: Direction): ActionResult {
  return result(
    { ...state, playerFacing: direction, heldInteractionId: undefined },
    direction !== state.playerFacing,
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

function validateLimits(resetLimit: number, echoLimit: number): void {
  if (!Number.isInteger(resetLimit) || resetLimit < 0) {
    throw new Error('RESET 한도는 0 이상의 정수여야 합니다.');
  }
  if (!Number.isInteger(echoLimit) || echoLimit < 0 || echoLimit > resetLimit) {
    throw new Error('Echo 한도는 RESET 한도 이하의 0 이상 정수여야 합니다.');
  }
}
