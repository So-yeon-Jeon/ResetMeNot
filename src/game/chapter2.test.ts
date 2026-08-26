import { describe, expect, it } from 'vitest';
import chapter2Room1Json from '../levels/chapter2-room1.json';
import { createLevelGameState } from '../levels/level-definition';
import { loadTiledLevel } from '../levels/tiled-level-loader';
import { applyAction, type GameState, type WorldMemory } from './game-state';
import { tryMove, type Direction, type GridPosition } from './grid';

const level = loadTiledLevel(chapter2Room1Json);
const chapter1Memory: WorldMemory = {
  totalResetCount: 1,
  chapterRestartCount: 0,
  pocketWatchCollected: true,
  events: ['level-cleared:chapter-01-room-01'],
};

function at(
  state: GameState,
  player: GridPosition,
  facing: Direction,
  hasAction = true,
): GameState {
  return { ...state, player: { ...player }, playerFacing: facing, hasAction };
}

function object(state: GameState, id: string): GameState['objects'][number] {
  const found = state.objects.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing Chapter 2 object: ${id}`);
  return found;
}

function move(state: GameState, directions: readonly Direction[]): GameState {
  return directions.reduce(
    (current, direction) => applyAction(current, { type: 'move', direction }, level.map).state,
    state,
  );
}

describe('Chapter 2 room 1', () => {
  it('uses a Chapter 2-only 22x15 stepped floor plan', () => {
    const state = createLevelGameState(level, chapter1Memory);

    expect(level.map).toMatchObject({ width: 22, height: 15 });
    expect(level.map.floorCells?.has('6,1')).toBe(true);
    expect(level.map.floorCells?.has('2,6')).toBe(true);
    expect(level.map.floorCells?.has('0,0')).toBe(false);
    expect(level.map.floorCells?.has('5,1')).toBe(false);
    expect(tryMove({ x: 0, y: 0 }, 'right', level.map)).toEqual({ x: 0, y: 0 });
    expect(state.resetLimit).toBe(1);
    expect(state.echoLimit).toBe(1);
  });

  it('keeps one light partition with a three-tile Central Gate', () => {
    expect(level.map.partitionWalls).toEqual(
      new Set([
        '5,6',
        '6,6',
        '7,6',
        '8,6',
        '9,6',
        '13,6',
        '14,6',
        '15,6',
        '16,6',
        '17,6',
        '18,6',
        '19,6',
      ]),
    );
    expect(level.map.walls.has('10,6')).toBe(false);
    expect(level.map.walls.has('11,6')).toBe(false);
    expect(level.map.walls.has('12,6')).toBe(false);
    expect(level.objects.filter((candidate) => candidate.type === 'door')).toHaveLength(2);
  });

  it('routes Player Spawn to the isolated Pressure Plate before RESET', () => {
    const initial = createLevelGameState(level, chapter1Memory);
    const onPlate = move(initial, ['up', 'up', 'up', 'left', 'left', 'left', 'left', 'left']);

    expect(initial.player).toEqual({ x: 11, y: 13 });
    expect(onPlate.player).toEqual({ x: 6, y: 10 });
    expect(object(onPlate, 'chapter2-echo-switch')).toMatchObject({ active: true });
    for (let y = 8; y <= 12; y += 1) {
      for (let x = 4; x <= 8; x += 1) {
        const occupied = level.objects.some(
          (candidate) =>
            candidate.type === 'prop' && candidate.position.x === x && candidate.position.y === y,
        );
        expect(occupied).toBe(false);
      }
    }
  });

  it('leaves the Echo on the Plate and opens the Central Gate after RESET', () => {
    const state = createLevelGameState(level, chapter1Memory);
    const reset = applyAction(at(state, { x: 6, y: 10 }, 'up'), { type: 'reset' }, level.map);

    expect(reset.resetPerformed).toBe(true);
    expect(reset.echoCreated).toBe(true);
    expect(reset.state.player).toEqual({ x: 11, y: 13 });
    expect(reset.state.echoes).toMatchObject([{ position: { x: 6, y: 10 } }]);
    expect(object(reset.state, 'chapter2-echo-switch')).toMatchObject({ active: true });
    expect(object(reset.state, 'chapter2-passage-door')).toMatchObject({
      position: { x: 10, y: 6 },
      open: true,
    });
  });

  it('supports the complete Gate to Lever to EXIT route', () => {
    const state = createLevelGameState(level, chapter1Memory);
    let current = applyAction(at(state, { x: 6, y: 10 }, 'up'), { type: 'reset' }, level.map).state;

    current = move(current, ['up', 'up', 'up', 'up', 'up', 'up', 'up', 'up']);
    expect(current.player).toEqual({ x: 11, y: 5 });

    current = move(current, ['right', 'right', 'right', 'right', 'right', 'up']);
    expect(current.player).toEqual({ x: 16, y: 4 });
    current = applyAction(current, { type: 'move', direction: 'right' }, level.map).state;
    current = applyAction(current, { type: 'interact' }, level.map).state;
    expect(object(current, 'chapter2-final-lever')).toMatchObject({
      position: { x: 17, y: 4 },
      active: true,
    });
    expect(object(current, 'chapter2-exit-door')).toMatchObject({
      position: { x: 18, y: 2 },
      open: true,
    });

    current = move(current, ['down', 'right', 'right', 'up', 'up', 'up']);
    expect(current.player).toEqual({ x: 18, y: 2 });
    const exited = applyAction(current, { type: 'move', direction: 'right' }, level.map);

    expect(exited.state.player).toEqual({ x: 19, y: 2 });
    expect(exited.chapterCompleted).toBe(true);
    expect(exited.state.phase).toBe('completed');
  });

  it('keeps all fixed puzzle coordinates unchanged', () => {
    const state = createLevelGameState(level, chapter1Memory);

    expect(state.player).toEqual({ x: 11, y: 13 });
    expect(object(state, 'chapter2-echo-switch').position).toEqual({ x: 6, y: 10 });
    expect(object(state, 'chapter2-passage-door').position).toEqual({ x: 10, y: 6 });
    expect(object(state, 'chapter2-final-lever').position).toEqual({ x: 17, y: 4 });
    expect(object(state, 'chapter2-exit-door').position).toEqual({ x: 18, y: 2 });
    expect(object(state, 'chapter2-exit').position).toEqual({ x: 19, y: 2 });
  });

  it('blocks a second RESET after the single allowed use', () => {
    const state = createLevelGameState(level, chapter1Memory);
    const reset = applyAction(at(state, { x: 6, y: 10 }, 'up'), { type: 'reset' }, level.map).state;
    const blocked = applyAction(at(reset, { x: 11, y: 12 }, 'up'), { type: 'reset' }, level.map);

    expect(blocked.resetPerformed).toBe(false);
    expect(blocked.resetBlocked).toBe('limit');
    expect(blocked.state.resetCount).toBe(1);
  });
});
