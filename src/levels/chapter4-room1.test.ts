import { describe, expect, it } from 'vitest';
import chapter4Room1Json from './chapter4-room1.json';
import { createLevelGameState } from './level-definition';
import { loadTiledLevel } from './tiled-level-loader';
import { applyAction, type GameState } from '../game/game-state';
import type { Direction, GridPosition } from '../game/grid';

const level = loadTiledLevel(chapter4Room1Json);

function at(state: GameState, player: GridPosition, facing: Direction): GameState {
  return { ...state, player: { ...player }, playerFacing: facing, hasAction: true };
}

describe('Chapter 4 room 1', () => {
  it('uses a larger corridor-and-puzzle-room layout', () => {
    expect(level.map).toMatchObject({ width: 24, height: 18 });
    expect(level.playerStart).toEqual({ x: 2, y: 4 });
    expect(level.resetLimit).toBe(4);
  });

  it('places the three clues, wall clock, and code lock on walkable regions', () => {
    const floorTiles = level.map.floorTiles;
    expect(floorTiles).toBeDefined();
    expect(level.objects.map((object) => object.id)).toEqual([
      'chapter4-portrait-clue',
      'chapter4-book-clue',
      'chapter4-missing-picture-clue',
      'chapter4-wall-clock',
      'chapter4-code-lock',
      'chapter4-code-key',
      'chapter4-exit-door',
      'chapter4-exit',
    ]);
    for (const object of level.objects) {
      expect(floorTiles?.has(`${object.position.x},${object.position.y}`)).toBe(true);
    }
  });

  it('keeps the upper corridor connected to the lower puzzle room', () => {
    expect(level.map.floorTiles?.has('19,5')).toBe(true);
    expect(level.map.floorTiles?.has('19,6')).toBe(true);
    expect(level.map.floorTiles?.has('19,8')).toBe(true);
    expect(level.map.floorTiles?.has('19,9')).toBe(true);
    expect(level.map.floorTiles?.has('8,9')).toBe(false);
  });

  it('follows the clue order 9, 2, 4, then the fourth-reset wall clock', () => {
    const positions = Object.fromEntries(
      level.objects.map((object) => [object.id, object.position] as const),
    );

    expect(positions['chapter4-portrait-clue']).toEqual({ x: 7, y: 1 });
    expect(positions['chapter4-book-clue']).toEqual({ x: 11, y: 1 });
    expect(positions['chapter4-missing-picture-clue']).toEqual({ x: 15, y: 1 });
    expect(positions['chapter4-wall-clock']).toEqual({ x: 18, y: 1 });
    expect(positions['chapter4-code-lock']).toEqual({ x: 17, y: 11 });
    expect(positions['chapter4-exit-door']).toEqual({ x: 20, y: 12 });
  });

  it('allows trying the code lock before discovering any clue', () => {
    let state = createLevelGameState(level, {
      totalResetCount: 0,
      chapterRestartCount: 0,
      pocketWatchCollected: true,
      events: [],
    });

    const interaction = applyAction(
      at(state, { x: 17, y: 12 }, 'up'),
      { type: 'interact' },
      level.map,
    );
    expect(interaction.state.codeEntryActive).toBe(true);
    expect(interaction.feedbackMessage).toContain('단서는 부족하지만');

    state = applyAction(interaction.state, { type: 'input-code', digit: 9 }, level.map).state;
    expect(state.chapter4Puzzle?.codeInput).toBe('9');
  });

  it('connects clue inspection, 924, the fourth RESET, and Exit', () => {
    let state = createLevelGameState(level, {
      totalResetCount: 0,
      chapterRestartCount: 0,
      pocketWatchCollected: true,
      events: [],
    });

    state = applyAction(at(state, { x: 7, y: 2 }, 'up'), { type: 'reset' }, level.map).state;
    state = applyAction(state, { type: 'interact' }, level.map).state;
    state = applyAction(at(state, { x: 11, y: 2 }, 'up'), { type: 'reset' }, level.map).state;
    state = applyAction(state, { type: 'interact' }, level.map).state;
    state = applyAction(at(state, { x: 15, y: 2 }, 'up'), { type: 'reset' }, level.map).state;
    state = applyAction(state, { type: 'interact' }, level.map).state;

    state = applyAction(at(state, { x: 17, y: 12 }, 'up'), { type: 'interact' }, level.map).state;
    state = applyAction(state, { type: 'input-code', digit: 9 }, level.map).state;
    state = applyAction(state, { type: 'input-code', digit: 2 }, level.map).state;
    state = applyAction(state, { type: 'input-code', digit: 4 }, level.map).state;
    state = applyAction(state, { type: 'reset' }, level.map).state;

    expect(state.chapter4Puzzle).toMatchObject({ resetStage: 4, exitOpen: true });
    expect(state.objects.find((object) => object.id === 'chapter4-exit-door')).toMatchObject({
      open: true,
      scriptedOpen: true,
    });

    state = applyAction(
      at(state, { x: 19, y: 12 }, 'right'),
      { type: 'move', direction: 'right' },
      level.map,
    ).state;
    const exited = applyAction(state, { type: 'move', direction: 'right' }, level.map);
    expect(exited.chapterCompleted).toBe(true);
  });
});
