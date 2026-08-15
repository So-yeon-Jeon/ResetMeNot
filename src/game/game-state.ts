import type { GameAction } from './action';
import type { Direction, GridMap, GridPosition } from './grid';
import { positionInDirection, positionKey, tryMove } from './grid';
import { cloneWorldObject, restoreWorldObjects, type WorldObjectState } from './world-object';

export type EchoState = Readonly<{
  id: number;
  position: GridPosition;
  facing: Direction;
}>;

export type GameState = Readonly<{
  player: GridPosition;
  playerFacing: Direction;
  playerStart: GridPosition;
  playerStartFacing: Direction;
  elapsedMs: number;
  hasAction: boolean;
  resetUnlocked: boolean;
  resetCount: number;
  resetLimit: number;
  echoLimit: number;
  echoes: readonly EchoState[];
  objects: readonly WorldObjectState[];
  initialObjects: readonly WorldObjectState[];
}>;

export type GameStateOptions = Readonly<{
  facing?: Direction;
  resetUnlocked?: boolean;
  resetLimit?: number;
  echoLimit?: number;
  objects?: readonly WorldObjectState[];
}>;

export type ActionResult = Readonly<{
  state: GameState;
  changed: boolean;
  resetPerformed: boolean;
  echoCreated: boolean;
}>;

export function createGameState(player: GridPosition, options: GameStateOptions = {}): GameState {
  const resetLimit = options.resetLimit ?? 3;
  const echoLimit = options.echoLimit ?? resetLimit;

  if (!Number.isInteger(resetLimit) || resetLimit < 0) {
    throw new Error('RESET 한도는 0 이상의 정수여야 합니다.');
  }
  if (!Number.isInteger(echoLimit) || echoLimit < 0 || echoLimit > resetLimit) {
    throw new Error('Echo 한도는 RESET 한도 이하의 0 이상 정수여야 합니다.');
  }

  const facing = options.facing ?? 'down';
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
    objects: (options.objects ?? []).map(cloneWorldObject),
    initialObjects: (options.objects ?? []).map(cloneWorldObject),
  };
}

export function unlockReset(state: GameState): GameState {
  if (state.resetUnlocked) return state;
  return { ...state, resetUnlocked: true };
}

export function advanceTime(state: GameState, elapsedMs: number): GameState {
  if (!Number.isFinite(elapsedMs) || elapsedMs < state.elapsedMs) {
    throw new Error('게임 경과 시간은 이전 값보다 작을 수 없습니다.');
  }

  return { ...state, elapsedMs };
}

export function applyAction(state: GameState, action: GameAction, map: GridMap): ActionResult {
  if (action.type === 'reset') return applyReset(state);

  if (action.type === 'interact') {
    return applyInteract(state);
  }

  const player = tryMove(state.player, action.direction, map);
  const moved = player !== state.player;
  return result(
    {
      ...state,
      player,
      playerFacing: action.direction,
      hasAction: state.hasAction || moved,
    },
    moved || action.direction !== state.playerFacing,
  );
}

function applyInteract(state: GameState): ActionResult {
  const target = positionInDirection(state.player, state.playerFacing);
  const objectIndex = state.objects.findIndex(
    (object) => !object.collected && positionKey(object.position) === positionKey(target),
  );
  if (objectIndex < 0) return result(state, false);

  const object = state.objects[objectIndex];
  if (object?.type !== 'pocket-watch') return result(state, false);

  const objects = state.objects.map((current, index) =>
    index === objectIndex ? { ...current, collected: true } : current,
  );
  return result(
    {
      ...state,
      objects,
      resetUnlocked: true,
      hasAction: true,
    },
    true,
  );
}

function applyReset(state: GameState): ActionResult {
  if (!state.resetUnlocked || !state.hasAction || state.resetCount >= state.resetLimit) {
    return result(state, false);
  }

  const canCreateEcho = state.echoes.length < state.echoLimit;
  const echoes = canCreateEcho
    ? [
        ...state.echoes,
        {
          id: state.echoes.length + 1,
          position: { ...state.player },
          facing: state.playerFacing,
        },
      ]
    : state.echoes;

  return {
    state: {
      ...state,
      player: { ...state.playerStart },
      playerFacing: state.playerStartFacing,
      elapsedMs: 0,
      hasAction: false,
      resetCount: state.resetCount + 1,
      echoes,
      objects: restoreWorldObjects(state.objects, state.initialObjects),
    },
    changed: true,
    resetPerformed: true,
    echoCreated: canCreateEcho,
  };
}

function result(state: GameState, changed: boolean): ActionResult {
  return { state, changed, resetPerformed: false, echoCreated: false };
}
