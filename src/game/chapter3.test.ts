import { describe, expect, it } from 'vitest';
import chapter3Room1Json from '../levels/chapter3-room1.json';
import { createLevelGameState } from '../levels/level-definition';
import { loadTiledLevel } from '../levels/tiled-level-loader';
import { applyAction, type GameState, type WorldMemory } from './game-state';
import type { Direction, GridPosition } from './grid';

const level = loadTiledLevel(chapter3Room1Json);
const previousMemory: WorldMemory = {
  totalResetCount: 2,
  chapterRestartCount: 0,
  pocketWatchCollected: true,
  events: ['level-cleared:chapter-01-room-01', 'level-cleared:chapter-02-room-01'],
};

function at(
  state: GameState,
  player: GridPosition,
  facing: Direction,
  hasAction = true,
): GameState {
  return { ...state, player: { ...player }, playerFacing: facing, hasAction };
}

function withObject(
  state: GameState,
  id: string,
  change: Readonly<Record<string, unknown>>,
): GameState {
  return {
    ...state,
    objects: state.objects.map((object) =>
      object.id === id ? ({ ...object, ...change } as GameState['objects'][number]) : object,
    ),
  };
}

function object(state: GameState, id: string): GameState['objects'][number] {
  const found = state.objects.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing Chapter 3 object: ${id}`);
  return found;
}

function reachable(start: GridPosition, target: GridPosition, blockedKey?: string): boolean {
  const visited = new Set([`${start.x},${start.y}`]);
  const queue: GridPosition[] = [start];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.x === target.x && current.y === target.y) return true;
    for (const next of [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ]) {
      const key = `${next.x},${next.y}`;
      const outside =
        next.x < 0 || next.y < 0 || next.x >= level.map.width || next.y >= level.map.height;
      if (outside || key === blockedKey || visited.has(key) || level.map.walls.has(key)) continue;
      visited.add(key);
      queue.push(next);
    }
  }
  return false;
}

describe('Chapter 3 room 1', () => {
  it('uses two RESETs and two fixed Echoes on an 18x14 map', () => {
    const state = createLevelGameState(level, previousMemory);

    expect(level.map).toMatchObject({ width: 18, height: 14 });
    expect(state.resetLimit).toBe(2);
    expect(state.echoLimit).toBe(2);
  });

  it('requires opening the central gate before entering the Memory area', () => {
    const gateKey = '9,7';
    expect(reachable(level.playerStart, { x: 13, y: 11 }, gateKey)).toBe(true);
    expect(reachable(level.playerStart, { x: 3, y: 4 }, gateKey)).toBe(false);
    expect(reachable(level.playerStart, { x: 3, y: 4 })).toBe(true);
  });

  it('restores the Memory Object outside its Socket', () => {
    let state = createLevelGameState(level, previousMemory);
    state = withObject(state, 'chapter3-memory-box', { position: { x: 5, y: 10 } });

    const reset = applyAction(at(state, { x: 4, y: 10 }, 'right'), { type: 'reset' }, level.map);

    expect(object(reset.state, 'chapter3-memory-box')).toMatchObject({ position: { x: 3, y: 3 } });
  });

  it('keeps the Memory Object only after it reaches its Socket', () => {
    let state = createLevelGameState(level, previousMemory);
    state = applyAction(
      at(state, { x: 2, y: 3 }, 'right'),
      { type: 'move', direction: 'right' },
      level.map,
    ).state;
    state = applyAction(state, { type: 'move', direction: 'right' }, level.map).state;

    expect(object(state, 'chapter3-memory-box')).toMatchObject({
      position: { x: 5, y: 3 },
      memoryCommitted: false,
    });
    expect(object(state, 'chapter3-memory-socket')).toMatchObject({ active: false });

    const reset = applyAction(state, { type: 'reset' }, level.map);

    expect(object(reset.state, 'chapter3-memory-box')).toMatchObject({
      position: { x: 5, y: 3 },
      memoryCommitted: true,
    });
    expect(object(reset.state, 'chapter3-memory-socket')).toMatchObject({ active: true });
  });

  it('completes the Memory Object, Echo Hold, final lever, and Exit flow', () => {
    let state = createLevelGameState(level, previousMemory);
    state = applyAction(at(state, { x: 13, y: 11 }, 'up'), { type: 'interact' }, level.map).state;
    state = applyAction(state, { type: 'reset' }, level.map).state;
    state = withObject(state, 'chapter3-memory-box', { position: { x: 5, y: 3 } });
    const secondReset = applyAction(
      at(state, { x: 4, y: 3 }, 'right'),
      { type: 'reset' },
      level.map,
    );

    expect(secondReset.echoCreated).toBe(true);
    expect(secondReset.state.echoes).toHaveLength(2);
    expect(secondReset.state.echoes[0]).toMatchObject({
      position: { x: 13, y: 11 },
      heldInteractionId: 'chapter3-hold-lever',
    });
    expect(object(secondReset.state, 'chapter3-memory-box')).toMatchObject({
      memoryCommitted: true,
    });
    expect(object(secondReset.state, 'chapter3-hold-lever')).toMatchObject({ active: true });
    expect(object(secondReset.state, 'chapter3-central-gate')).toMatchObject({ open: true });

    state = applyAction(
      at(secondReset.state, { x: 14, y: 4 }, 'up'),
      { type: 'interact' },
      level.map,
    ).state;
    expect(object(state, 'chapter3-exit-door')).toMatchObject({ open: true });

    state = applyAction(
      at(state, { x: 14, y: 2 }, 'right'),
      { type: 'move', direction: 'right' },
      level.map,
    ).state;
    const exited = applyAction(state, { type: 'move', direction: 'right' }, level.map);

    expect(exited.state.player).toEqual({ x: 16, y: 2 });
    expect(exited.chapterCompleted).toBe(true);
  });

  it('keeps the final Exit locked when any one of the three conditions is missing', () => {
    let state = createLevelGameState(level, previousMemory);
    state = applyAction(at(state, { x: 13, y: 11 }, 'up'), { type: 'interact' }, level.map).state;
    state = applyAction(state, { type: 'reset' }, level.map).state;
    state = applyAction(at(state, { x: 14, y: 4 }, 'up'), { type: 'interact' }, level.map).state;

    expect(object(state, 'chapter3-memory-socket')).toMatchObject({ active: false });
    expect(object(state, 'chapter3-hold-lever')).toMatchObject({ active: true });
    expect(object(state, 'chapter3-final-lever')).toMatchObject({ active: true });
    expect(object(state, 'chapter3-exit-door')).toMatchObject({ open: false });
  });
});
