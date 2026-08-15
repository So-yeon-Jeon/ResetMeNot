import { describe, expect, it } from 'vitest';
import { advanceTime, applyAction, createGameState, unlockReset } from './game-state';
import { createGridMap } from './grid';
import { createPocketWatch } from './world-object';

describe('game state', () => {
  const map = createGridMap(['#####', '#...#', '#####']);

  it('creates an independent initial player state', () => {
    const start = { x: 1, y: 1 };
    const state = createGameState(start);

    expect(state.player).toEqual(start);
    expect(state.player).not.toBe(start);
    expect(state.playerFacing).toBe('down');
    expect(state.resetUnlocked).toBe(false);
    expect(state.echoes).toEqual([]);
  });

  it('applies movement without mutating the previous state', () => {
    const previous = advanceTime(createGameState({ x: 1, y: 1 }), 120);
    const result = applyAction(previous, { type: 'move', direction: 'right' }, map);

    expect(result.changed).toBe(true);
    expect(result.state.player).toEqual({ x: 2, y: 1 });
    expect(result.state.playerFacing).toBe('right');
    expect(result.state.hasAction).toBe(true);
    expect(previous.player).toEqual({ x: 1, y: 1 });
    expect(previous.hasAction).toBe(false);
  });

  it('changes facing without making a blocked move a valid action', () => {
    const state = createGameState({ x: 1, y: 1 });
    const result = applyAction(state, { type: 'move', direction: 'left' }, map);

    expect(result.state.player).toEqual({ x: 1, y: 1 });
    expect(result.state.playerFacing).toBe('left');
    expect(result.state.hasAction).toBe(false);
  });

  it('ignores reset before it is unlocked', () => {
    const state = createGameState({ x: 1, y: 1 });
    const result = applyAction(state, { type: 'reset' }, map);

    expect(result.state).toBe(state);
    expect(result.resetPerformed).toBe(false);
  });

  it('creates a fixed echo and restores the player on reset', () => {
    const initial = unlockReset(createGameState({ x: 1, y: 1 }, { facing: 'down', resetLimit: 2 }));
    const moved = applyAction(initial, { type: 'move', direction: 'right' }, map).state;
    const result = applyAction(moved, { type: 'reset' }, map);

    expect(result.resetPerformed).toBe(true);
    expect(result.echoCreated).toBe(true);
    expect(result.state.player).toEqual({ x: 1, y: 1 });
    expect(result.state.playerFacing).toBe('down');
    expect(result.state.echoes).toEqual([{ id: 1, position: { x: 2, y: 1 }, facing: 'right' }]);
    expect(result.state.hasAction).toBe(false);
    expect(result.state.resetCount).toBe(1);
  });

  it('ignores an empty reset without consuming the limit', () => {
    const state = unlockReset(createGameState({ x: 1, y: 1 }, { resetLimit: 2 }));
    const result = applyAction(state, { type: 'reset' }, map);

    expect(result.resetPerformed).toBe(false);
    expect(result.echoCreated).toBe(false);
    expect(result.state.echoes).toEqual([]);
    expect(result.state.resetCount).toBe(0);
  });

  it('keeps existing echoes fixed across later resets', () => {
    let state = unlockReset(createGameState({ x: 1, y: 1 }, { resetLimit: 2 }));
    state = applyAction(state, { type: 'move', direction: 'right' }, map).state;
    state = applyAction(state, { type: 'reset' }, map).state;
    state = applyAction(state, { type: 'move', direction: 'right' }, map).state;
    state = applyAction(state, { type: 'reset' }, map).state;

    expect(state.echoes).toEqual([
      { id: 1, position: { x: 2, y: 1 }, facing: 'right' },
      { id: 2, position: { x: 2, y: 1 }, facing: 'right' },
    ]);
  });

  it('disables further resets after the limit without restarting', () => {
    let state = unlockReset(createGameState({ x: 1, y: 1 }, { resetLimit: 1 }));
    state = applyAction(state, { type: 'move', direction: 'right' }, map).state;
    state = applyAction(state, { type: 'reset' }, map).state;
    const exhausted = applyAction(state, { type: 'reset' }, map);

    expect(exhausted.resetPerformed).toBe(false);
    expect(exhausted.state).toBe(state);
    expect(exhausted.state.player).toEqual({ x: 1, y: 1 });
    expect(exhausted.state.echoes).toHaveLength(1);
  });

  it('validates reset and echo limits', () => {
    expect(() => createGameState({ x: 1, y: 1 }, { resetLimit: -1 })).toThrow();
    expect(() => createGameState({ x: 1, y: 1 }, { resetLimit: 1, echoLimit: 2 })).toThrow();
  });

  it('does not make an unavailable interaction a valid action', () => {
    const state = createGameState({ x: 1, y: 1 });
    const result = applyAction(state, { type: 'interact' }, map);

    expect(result.changed).toBe(false);
    expect(result.state.hasAction).toBe(false);
  });

  it('collects a pocket watch in the facing tile and unlocks reset', () => {
    const state = createGameState(
      { x: 1, y: 1 },
      { objects: [createPocketWatch('watch', { x: 2, y: 1 })], facing: 'right' },
    );
    const result = applyAction(state, { type: 'interact' }, map);

    expect(result.changed).toBe(true);
    expect(result.state.resetUnlocked).toBe(true);
    expect(result.state.hasAction).toBe(true);
    expect(result.state.objects[0]).toMatchObject({ id: 'watch', collected: true });
  });

  it('keeps the collected pocket watch after reset', () => {
    let state = createGameState(
      { x: 1, y: 1 },
      { objects: [createPocketWatch('watch', { x: 2, y: 1 })], facing: 'right' },
    );
    state = applyAction(state, { type: 'interact' }, map).state;
    const result = applyAction(state, { type: 'reset' }, map);

    expect(result.resetPerformed).toBe(true);
    expect(result.state.objects[0]).toMatchObject({ id: 'watch', collected: true });
    expect(result.state.resetUnlocked).toBe(true);
  });

  it('rejects time moving backwards', () => {
    const state = advanceTime(createGameState({ x: 1, y: 1 }), 100);
    expect(() => advanceTime(state, 99)).toThrow('게임 경과 시간은 이전 값보다 작을 수 없습니다.');
  });
});
