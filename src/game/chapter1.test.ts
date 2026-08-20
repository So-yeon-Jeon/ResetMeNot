import { describe, expect, it } from 'vitest';
import chapter1Room1Json from '../levels/chapter1-room1.json';
import { createLevelGameState } from '../levels/level-definition';
import { loadTiledLevel } from '../levels/tiled-level-loader';
import { applyAction, restartChapter, type GameState } from './game-state';
import type { Direction, GridPosition } from './grid';

const level = loadTiledLevel(chapter1Room1Json);

function at(state: GameState, player: GridPosition, facing: Direction): GameState {
  return { ...state, player: { ...player }, playerFacing: facing, hasAction: false };
}

function interact(state: GameState, player: GridPosition, facing: Direction): GameState {
  return applyAction(at(state, player, facing), { type: 'interact' }, level.map).state;
}

function resetAfterAction(state: GameState): GameState {
  return applyAction(state, { type: 'reset' }, level.map).state;
}

function object(state: GameState, id: string): GameState['objects'][number] {
  const found = state.objects.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing Chapter 1 object: ${id}`);
  return found;
}

describe('Chapter 1 room 1', () => {
  it('uses the fixed 12x10 map and centered-grid-compatible coordinates', () => {
    const state = createLevelGameState(level);

    expect(level.map.width).toBe(12);
    expect(level.map.height).toBe(10);
    expect(state.player).toEqual({ x: 5, y: 8 });
    expect(level.map.walls.has('0,0')).toBe(true);
    expect(level.map.walls.has('11,9')).toBe(true);
    expect(level.map.walls.has('5,8')).toBe(false);
  });

  it('blocks visible furniture footprints while leaving the rug passable', () => {
    const state = createLevelGameState(level);

    const blockedByNightstand = applyAction(
      at(state, { x: 3, y: 2 }, 'up'),
      { type: 'move', direction: 'up' },
      level.map,
    ).state;
    expect(blockedByNightstand.player).toEqual({ x: 3, y: 2 });

    const blockedByClock = applyAction(
      at(state, { x: 6, y: 3 }, 'up'),
      { type: 'move', direction: 'up' },
      level.map,
    ).state;
    expect(blockedByClock.player).toEqual({ x: 6, y: 3 });

    const aboveChair = applyAction(
      at(state, { x: 7, y: 4 }, 'right'),
      { type: 'move', direction: 'right' },
      level.map,
    ).state;
    expect(aboveChair.player).toEqual({ x: 8, y: 4 });

    const blockedByChair = applyAction(
      at(state, { x: 7, y: 5 }, 'right'),
      { type: 'move', direction: 'right' },
      level.map,
    ).state;
    expect(blockedByChair.player).toEqual({ x: 7, y: 5 });

    const belowDesk = applyAction(
      at(state, { x: 8, y: 7 }, 'right'),
      { type: 'move', direction: 'right' },
      level.map,
    ).state;
    expect(belowDesk.player).toEqual({ x: 9, y: 7 });

    const blockedByDesk = applyAction(
      at(state, { x: 8, y: 4 }, 'right'),
      { type: 'move', direction: 'right' },
      level.map,
    ).state;
    expect(blockedByDesk.player).toEqual({ x: 8, y: 4 });

    const blockedByCrates = applyAction(
      at(state, { x: 10, y: 6 }, 'down'),
      { type: 'move', direction: 'down' },
      level.map,
    ).state;
    expect(blockedByCrates.player).toEqual({ x: 10, y: 6 });

    const blockedByBarrel = applyAction(
      at(state, { x: 9, y: 7 }, 'down'),
      { type: 'move', direction: 'down' },
      level.map,
    ).state;
    expect(blockedByBarrel.player).toEqual({ x: 9, y: 7 });
  });

  it('does not allow RESET before the pocket watch is acquired', () => {
    const state = createLevelGameState(level);
    const result = applyAction(state, { type: 'reset' }, level.map);

    expect(result.resetPerformed).toBe(false);
    expect(result.state.resetUnlocked).toBe(false);
    expect(result.state.echoUnlocked).toBe(false);
  });

  it('acquires the hidden pocket watch through the nightstand and unlocks RESET only', () => {
    const state = createLevelGameState(level);
    const acquired = interact(state, { x: 3, y: 2 }, 'up');

    expect(object(acquired, 'chapter1-pocket-watch')).toMatchObject({
      collected: true,
      visible: false,
      interactable: false,
    });
    expect(acquired.resetUnlocked).toBe(true);
    expect(acquired.echoUnlocked).toBe(false);
    expect(acquired.worldMemory.pocketWatchCollected).toBe(true);
  });

  it('allows RESET after the pocket watch but does not create an Echo in Chapter 1', () => {
    const acquired = interact(createLevelGameState(level), { x: 3, y: 2 }, 'up');
    const result = applyAction(acquired, { type: 'reset' }, level.map);

    expect(result.resetPerformed).toBe(true);
    expect(result.echoCreated).toBe(false);
    expect(result.state.echoes).toEqual([]);
    expect(result.state.player).toEqual({ x: 5, y: 8 });
    expect(object(result.state, 'chapter1-pocket-watch')).toMatchObject({ collected: true });
  });

  it('turns the bookshelf fallen and drops an initially unavailable key', () => {
    const acquired = interact(createLevelGameState(level), { x: 3, y: 2 }, 'up');
    const fallen = interact(acquired, { x: 7, y: 1 }, 'right');

    expect(object(fallen, 'chapter1-bookshelf')).toMatchObject({
      position: { x: 8, y: 1 },
      state: 'fallen',
    });
    expect(object(fallen, 'chapter1-key')).toMatchObject({
      position: { x: 9, y: 3 },
      collectible: true,
      collected: false,
    });
  });

  it('blocks the dropped key while the bookshelf is fallen', () => {
    const acquired = interact(createLevelGameState(level), { x: 3, y: 2 }, 'up');
    const fallen = interact(acquired, { x: 7, y: 1 }, 'right');
    const blocked = applyAction(
      at(fallen, { x: 9, y: 4 }, 'up'),
      { type: 'interact' },
      level.map,
    ).state;

    expect(blocked.player).toEqual({ x: 9, y: 4 });
    expect(blocked.hasAction).toBe(false);
    expect(object(blocked, 'chapter1-key')).toMatchObject({ collected: false });
  });

  it('restores the bookshelf but preserves the dropped key position and collectible state', () => {
    const acquired = interact(createLevelGameState(level), { x: 3, y: 2 }, 'up');
    const fallen = interact(acquired, { x: 7, y: 1 }, 'right');
    const reset = resetAfterAction(fallen);

    expect(object(reset, 'chapter1-bookshelf')).toMatchObject({
      position: { x: 8, y: 1 },
      state: 'standing',
    });
    expect(object(reset, 'chapter1-key')).toMatchObject({
      position: { x: 9, y: 3 },
      collectible: true,
      collected: false,
    });
    expect(reset.player).toEqual({ x: 5, y: 8 });
  });

  it('allows the player to collect the dropped key after RESET', () => {
    const acquired = interact(createLevelGameState(level), { x: 3, y: 2 }, 'up');
    const reset = resetAfterAction(interact(acquired, { x: 7, y: 1 }, 'right'));
    const collected = interact(reset, { x: 9, y: 4 }, 'up');

    expect(object(collected, 'chapter1-key')).toMatchObject({ collected: true });
    expect(collected.inventoryKeys).toEqual(['chapter1-key']);
  });

  it('does not open or clear the door without the key', () => {
    const state = interact(createLevelGameState(level), { x: 1, y: 7 }, 'down');

    expect(state.phase).toBe('playing');
    expect(object(state, 'chapter1-door')).toMatchObject({ open: false, unlocked: false });
  });

  it('opens the door and clears Chapter 1 after the key is collected', () => {
    const acquired = interact(createLevelGameState(level), { x: 3, y: 2 }, 'up');
    const reset = resetAfterAction(interact(acquired, { x: 7, y: 1 }, 'right'));
    const withKey = interact(reset, { x: 9, y: 4 }, 'up');
    const result = applyAction(
      at(withKey, { x: 1, y: 7 }, 'down'),
      { type: 'interact' },
      level.map,
    );

    expect(result.chapterCompleted).toBe(true);
    expect(result.state.phase).toBe('completed');
    expect(object(result.state, 'chapter1-door')).toMatchObject({ open: true, unlocked: true });
  });

  it('restarts the Chapter 1 puzzle state from its initial data', () => {
    const acquired = interact(createLevelGameState(level), { x: 3, y: 2 }, 'up');
    const fallen = interact(acquired, { x: 7, y: 1 }, 'right');
    const restarted = restartChapter(fallen);

    expect(restarted.player).toEqual({ x: 5, y: 8 });
    expect(object(restarted, 'chapter1-bookshelf')).toMatchObject({ state: 'standing' });
    expect(object(restarted, 'chapter1-key')).toMatchObject({
      position: { x: 9, y: 1 },
      collectible: false,
      collected: false,
    });
    expect(object(restarted, 'chapter1-door')).toMatchObject({ open: false, unlocked: false });
  });
});
