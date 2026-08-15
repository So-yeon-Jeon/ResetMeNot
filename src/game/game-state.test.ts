import { describe, expect, it } from 'vitest';
import { advanceTime, applyAction, createGameState } from './game-state';
import { createGridMap } from './grid';

describe('game state', () => {
  const map = createGridMap(['#####', '#...#', '#####']);

  it('creates an independent initial player position', () => {
    const start = { x: 1, y: 1 };
    const state = createGameState(start);
    expect(state).toEqual({ player: start, elapsedMs: 0, hasAction: false });
    expect(state.player).not.toBe(start);
  });

  it('applies a move action without mutating the previous state', () => {
    const previous = advanceTime(createGameState({ x: 1, y: 1 }), 120);
    const result = applyAction(previous, { type: 'move', direction: 'right' }, map);

    expect(result.changed).toBe(true);
    expect(result.state.player).toEqual({ x: 2, y: 1 });
    expect(result.state.hasAction).toBe(true);
    expect(previous.player).toEqual({ x: 1, y: 1 });
    expect(previous.hasAction).toBe(false);
  });

  it('marks a blocked move as an action for echo creation', () => {
    const state = advanceTime(createGameState({ x: 1, y: 1 }), 250);
    const result = applyAction(state, { type: 'move', direction: 'left' }, map);

    expect(result.changed).toBe(false);
    expect(result.state.player).toEqual({ x: 1, y: 1 });
    expect(result.state.hasAction).toBe(true);
  });

  it('marks an interaction without changing the player', () => {
    const state = createGameState({ x: 1, y: 1 });
    const result = applyAction(state, { type: 'interact' }, map);
    expect(result.changed).toBe(false);
    expect(result.state.hasAction).toBe(true);
  });

  it('does not mark reset as a player action', () => {
    const state = createGameState({ x: 1, y: 1 });
    const result = applyAction(state, { type: 'reset' }, map);
    expect(result.state).toBe(state);
    expect(result.state.hasAction).toBe(false);
  });

  it('rejects time moving backwards', () => {
    const state = advanceTime(createGameState({ x: 1, y: 1 }), 100);
    expect(() => advanceTime(state, 99)).toThrow('게임 경과 시간은 이전 값보다 작을 수 없습니다.');
  });
});
