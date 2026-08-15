import type { GameAction } from './action';
import type { GridMap, GridPosition } from './grid';
import { tryMove } from './grid';

export type GameState = Readonly<{
  player: GridPosition;
  elapsedMs: number;
  hasAction: boolean;
}>;

export type ActionResult = Readonly<{
  state: GameState;
  changed: boolean;
}>;

export function createGameState(player: GridPosition): GameState {
  return {
    player: { ...player },
    elapsedMs: 0,
    hasAction: false,
  };
}

export function advanceTime(state: GameState, elapsedMs: number): GameState {
  if (!Number.isFinite(elapsedMs) || elapsedMs < state.elapsedMs) {
    throw new Error('게임 경과 시간은 이전 값보다 작을 수 없습니다.');
  }

  return { ...state, elapsedMs };
}

export function applyAction(state: GameState, action: GameAction, map: GridMap): ActionResult {
  if (action.type === 'reset') {
    return { state, changed: false };
  }

  if (action.type === 'interact') {
    return { state: { ...state, hasAction: true }, changed: false };
  }

  const player = tryMove(state.player, action.direction, map);
  const changed = player !== state.player;
  return {
    state: { ...state, player, hasAction: true },
    changed,
  };
}
