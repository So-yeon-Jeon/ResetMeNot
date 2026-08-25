import { describe, expect, it } from 'vitest';
import chapter2Room1Json from '../levels/chapter2-room1.json';
import { createLevelGameState } from '../levels/level-definition';
import { loadTiledLevel } from '../levels/tiled-level-loader';
import { applyAction, type GameState, type WorldMemory } from './game-state';
import type { Direction, GridPosition } from './grid';

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

describe('Chapter 2 room 1', () => {
  it('uses one RESET and one fixed Echo on a 16x12 map', () => {
    const state = createLevelGameState(level, chapter1Memory);

    expect(level.map).toMatchObject({ width: 16, height: 12 });
    expect(state.resetUnlocked).toBe(true);
    expect(state.echoUnlocked).toBe(true);
    expect(state.resetLimit).toBe(1);
    expect(state.echoLimit).toBe(1);
  });

  it('keeps the passage open with an Echo left on the pressure switch', () => {
    const state = createLevelGameState(level, chapter1Memory);
    const reset = applyAction(at(state, { x: 4, y: 8 }, 'up'), { type: 'reset' }, level.map);

    expect(reset.resetPerformed).toBe(true);
    expect(reset.echoCreated).toBe(true);
    expect(reset.state.player).toEqual({ x: 8, y: 10 });
    expect(reset.state.echoes).toMatchObject([{ position: { x: 4, y: 8 } }]);
    expect(object(reset.state, 'chapter2-echo-switch')).toMatchObject({ active: true });
    expect(object(reset.state, 'chapter2-passage-door')).toMatchObject({ open: true });
  });

  it('opens the exit door with the final lever and completes on Exit entry', () => {
    const state = createLevelGameState(level, chapter1Memory);
    const reset = applyAction(at(state, { x: 4, y: 8 }, 'up'), { type: 'reset' }, level.map).state;
    const lever = applyAction(
      at(reset, { x: 11, y: 4 }, 'up'),
      { type: 'interact' },
      level.map,
    ).state;

    expect(object(lever, 'chapter2-final-lever')).toMatchObject({ active: true });
    expect(object(lever, 'chapter2-exit-door')).toMatchObject({ open: true });

    const throughDoor = applyAction(
      at(lever, { x: 12, y: 2 }, 'right'),
      { type: 'move', direction: 'right' },
      level.map,
    ).state;
    const exited = applyAction(throughDoor, { type: 'move', direction: 'right' }, level.map);

    expect(throughDoor.player).toEqual({ x: 13, y: 2 });
    expect(exited.state.player).toEqual({ x: 14, y: 2 });
    expect(exited.chapterCompleted).toBe(true);
    expect(exited.state.phase).toBe('completed');
  });

  it('blocks a second RESET after the single allowed use', () => {
    const state = createLevelGameState(level, chapter1Memory);
    const reset = applyAction(at(state, { x: 4, y: 8 }, 'up'), { type: 'reset' }, level.map).state;
    const blocked = applyAction(at(reset, { x: 8, y: 9 }, 'up'), { type: 'reset' }, level.map);

    expect(blocked.resetPerformed).toBe(false);
    expect(blocked.resetBlocked).toBe('limit');
    expect(blocked.state.resetCount).toBe(1);
  });
});
