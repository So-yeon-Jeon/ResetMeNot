import { describe, expect, it } from 'vitest';
import chapter4Room1Json from './chapter4-room1.json';
import { createLevelGameState } from './level-definition';
import { loadTiledLevel } from './tiled-level-loader';
import { applyAction, type GameState } from '../game/game-state';
import type { Direction, GridPosition } from '../game/grid';

const level = loadTiledLevel(chapter4Room1Json);
const WORLD_MEMORY = {
  totalResetCount: 0,
  chapterRestartCount: 0,
  pocketWatchCollected: true,
  events: [],
};

function at(state: GameState, player: GridPosition, facing: Direction): GameState {
  return { ...state, player: { ...player }, playerFacing: facing, hasAction: true };
}

function object(state: GameState, id: string) {
  const found = state.objects.find((item) => item.id === id);
  if (!found) throw new Error(`Missing Chapter 4 object: ${id}`);
  return found;
}

describe('Chapter 4 room 1', () => {
  it('uses the approved 28x18 corridor, right connector, and puzzle room layout', () => {
    expect(level.map).toMatchObject({ width: 28, height: 18 });
    expect(level.playerStart).toEqual({ x: 3, y: 4 });
    expect(level.resetLimit).toBe(4);
    expect(level.map.floorTiles?.has('1,4')).toBe(true);
    expect(level.map.floorTiles?.has('22,6')).toBe(true);
    expect(level.map.floorTiles?.has('23,7')).toBe(true);
    expect(level.map.floorTiles?.has('14,12')).toBe(true);
  });

  it('keeps every interaction, exit threshold, and decorative collision on floor cells', () => {
    const floorTiles = level.map.floorTiles;
    expect(floorTiles).toBeDefined();
    for (const item of level.objects) {
      expect(floorTiles?.has(`${item.position.x},${item.position.y}`)).toBe(true);
    }
    expect(object(createLevelGameState(level), 'chapter4-exit-door')).toMatchObject({
      position: { x: 25, y: 12 },
      open: false,
    });
    expect(object(createLevelGameState(level), 'chapter4-exit')).toMatchObject({
      position: { x: 26, y: 12 },
    });
    expect(level.map.floorTiles?.has('27,12')).toBe(false);
    const closedDoor = applyAction(
      at(createLevelGameState(level), { x: 24, y: 12 }, 'right'),
      { type: 'move', direction: 'right' },
      level.map,
    );
    expect(closedDoor.changed).toBe(false);
    expect(closedDoor.state.player).toEqual({ x: 24, y: 12 });
  });

  it('uses the Chapter 1 bookshelf footprint so the player stops at its front edge', () => {
    const state = createLevelGameState(level);
    for (const x of [3, 9, 16, 20]) {
      const moved = applyAction(
        at(state, { x, y: 2 }, 'up'),
        { type: 'move', direction: 'up' },
        level.map,
      );
      expect(moved.state.player).toEqual({ x, y: 2 });
    }
  });

  it('blocks the shared top wall cap and face while leaving clue-front tiles walkable', () => {
    const state = createLevelGameState(level);
    const intoWallFace = applyAction(
      at(state, { x: 5, y: 2 }, 'up'),
      { type: 'move', direction: 'up' },
      level.map,
    );
    expect(intoWallFace.state.player).toEqual({ x: 5, y: 2 });
    expect(level.map.walls.has('5,0')).toBe(true);
    expect(level.map.walls.has('6,3')).toBe(false);
  });

  it('changes the visual state in the intended 9, 2, 4, clock order', () => {
    let state = createLevelGameState(level, WORLD_MEMORY);
    state = applyAction(at(state, { x: 6, y: 3 }, 'up'), { type: 'reset' }, level.map).state;
    expect(object(state, 'chapter4-portrait-clue')).toMatchObject({ state: 'changed' });

    state = applyAction(at(state, { x: 11, y: 3 }, 'up'), { type: 'reset' }, level.map).state;
    expect(object(state, 'chapter4-book-clue')).toMatchObject({ state: 'changed' });

    state = applyAction(at(state, { x: 16, y: 3 }, 'up'), { type: 'reset' }, level.map).state;
    expect(object(state, 'chapter4-painting-clue')).toMatchObject({ state: 'changed' });

    state = applyAction(at(state, { x: 14, y: 13 }, 'up'), { type: 'interact' }, level.map).state;
    for (const digit of [9, 2, 4]) {
      state = applyAction(state, { type: 'input-code', digit }, level.map).state;
    }
    state = applyAction(state, { type: 'reset' }, level.map).state;
    expect(object(state, 'chapter4-wall-clock')).toMatchObject({ state: 'moved' });
    expect(state.chapter4Puzzle).toMatchObject({ codeInput: '924', clockStarted: true });
  });

  it('plays the complete 9 → 2 → 4 → 924 → clock → exit flow', () => {
    let state = createLevelGameState(level, WORLD_MEMORY);
    state = applyAction(at(state, { x: 6, y: 3 }, 'up'), { type: 'reset' }, level.map).state;
    let inspected = applyAction(at(state, { x: 6, y: 3 }, 'up'), { type: 'interact' }, level.map);
    expect(inspected.feedbackMessage).toContain('9시');

    state = applyAction(inspected.state, { type: 'reset' }, level.map).state;
    inspected = applyAction(at(state, { x: 11, y: 3 }, 'up'), { type: 'interact' }, level.map);
    expect(inspected.feedbackMessage).toContain('숫자 2');

    state = applyAction(inspected.state, { type: 'reset' }, level.map).state;
    inspected = applyAction(at(state, { x: 16, y: 3 }, 'up'), { type: 'interact' }, level.map);
    expect(inspected.feedbackMessage).toContain('숫자 4');

    state = applyAction(inspected.state, { type: 'interact' }, level.map).state;
    state = applyAction(at(state, { x: 14, y: 13 }, 'up'), { type: 'interact' }, level.map).state;
    for (const digit of [9, 2, 4])
      state = applyAction(state, { type: 'input-code', digit }, level.map).state;
    expect(state.chapter4Puzzle).toMatchObject({
      resetStage: 3,
      codeInput: '924',
      exitOpen: false,
    });

    state = applyAction(state, { type: 'reset' }, level.map).state;
    expect(state.chapter4Puzzle).toMatchObject({ resetStage: 4, codeInput: '924', exitOpen: true });
    expect(object(state, 'chapter4-exit-door')).toMatchObject({ open: true, scriptedOpen: true });
    inspected = applyAction(at(state, { x: 21, y: 3 }, 'up'), { type: 'interact' }, level.map);
    expect(inspected.feedbackMessage).toContain('앞으로 미끄러져 나왔다');

    state = at(inspected.state, { x: 24, y: 12 }, 'right');
    state = applyAction(state, { type: 'move', direction: 'right' }, level.map).state;
    const exited = applyAction(state, { type: 'move', direction: 'right' }, level.map);
    expect(exited.chapterCompleted).toBe(true);
  });
});
