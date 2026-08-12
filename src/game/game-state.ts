import type { GameAction, TimedAction } from './action';
import type { GridMap, GridPosition } from './grid';
import { tryMove } from './grid';

export type GameState = Readonly<{
  player: GridPosition;
  elapsedMs: number;
  actions: readonly TimedAction[];
}>;

export type ActionResult = Readonly<{
  state: GameState;
  changed: boolean;
}>;

export function createGameState(player: GridPosition): GameState {
  return {
    player: { ...player },
    elapsedMs: 0,
    actions: [],
  };
}

export function advanceTime(state: GameState, elapsedMs: number): GameState {
  if (!Number.isFinite(elapsedMs) || elapsedMs < state.elapsedMs) {
    throw new Error('게임 경과 시간은 이전 값보다 작을 수 없습니다.');
  }

  return { ...state, elapsedMs };
}

export function applyAction(state: GameState, action: GameAction, map: GridMap): ActionResult {
  const actions = [...state.actions, { action, atMs: state.elapsedMs }];

  if (action.type !== 'move') {
    return { state: { ...state, actions }, changed: false };
  }

  const player = tryMove(state.player, action.direction, map);
  const changed = player !== state.player;
  return {
    state: { ...state, player, actions },
    changed,
  };
}
