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
      at(state, { x: 3, y: 3 }, 'up'),
      { type: 'move', direction: 'up' },
      level.map,
    ).state;
    expect(blockedByNightstand.player).toEqual({ x: 3, y: 3 });

    const blockedByClock = applyAction(
      at(state, { x: 6, y: 3 }, 'up'),
      { type: 'move', direction: 'up' },
      level.map,
    ).state;
    expect(blockedByClock.player).toEqual({ x: 6, y: 3 });

    const blockedByWindow = applyAction(
      at(state, { x: 4, y: 2 }, 'up'),
      { type: 'move', direction: 'up' },
      level.map,
    ).state;
    expect(blockedByWindow.player).toEqual({ x: 4, y: 2 });

    const blockedByWindowRightEdge = applyAction(
      at(state, { x: 5, y: 2 }, 'up'),
      { type: 'move', direction: 'up' },
      level.map,
    ).state;
    expect(blockedByWindowRightEdge.player).toEqual({ x: 5, y: 2 });

    const blockedByPlant = applyAction(
      at(state, { x: 2, y: 4 }, 'left'),
      { type: 'move', direction: 'left' },
      level.map,
    ).state;
    expect(blockedByPlant.player).toEqual({ x: 2, y: 4 });

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

  it('keeps the front tiles of the bed and grandfather clock reachable from the start', () => {
    const state = createLevelGameState(level);
    const reachable = (target: GridPosition): boolean => {
      const queue: GridPosition[] = [state.player];
      const visited = new Set<string>();
      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) break;
        const key = `${current.x},${current.y}`;
        if (visited.has(key)) continue;
        if (current.x === target.x && current.y === target.y) return true;
        visited.add(key);
        (['up', 'down', 'left', 'right'] as const).forEach((direction) => {
          const moved = applyAction(
            at(state, current, direction),
            { type: 'move', direction },
            level.map,
          ).state.player;
          if (`${moved.x},${moved.y}` !== key && !visited.has(`${moved.x},${moved.y}`)) {
            queue.push(moved);
          }
        });
      }
      return false;
    };

    expect(reachable({ x: 3, y: 3 })).toBe(true);
    expect(reachable({ x: 6, y: 3 })).toBe(true);
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
    const acquired = interact(state, { x: 3, y: 3 }, 'up');

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
    const acquired = interact(createLevelGameState(level), { x: 3, y: 3 }, 'up');
    const result = applyAction(acquired, { type: 'reset' }, level.map);

    expect(result.resetPerformed).toBe(true);
    expect(result.echoCreated).toBe(false);
    expect(result.state.echoes).toEqual([]);
    expect(result.state.player).toEqual({ x: 5, y: 8 });
    expect(object(result.state, 'chapter1-pocket-watch')).toMatchObject({ collected: true });
  });

  it('turns the bookshelf fallen and leaves the key trapped until RESET', () => {
    const acquired = interact(createLevelGameState(level), { x: 3, y: 3 }, 'up');
    const fallen = interact(acquired, { x: 9, y: 2 }, 'up');
    const blocked = applyAction(at(fallen, { x: 9, y: 4 }, 'up'), { type: 'interact' }, level.map);

    expect(object(fallen, 'chapter1-bookshelf')).toMatchObject({
      position: { x: 8, y: 1 },
      state: 'fallen',
    });
    expect(fallen.player).toEqual({ x: 9, y: 3 });
    expect(fallen.playerFacing).toBe('down');
    expect(object(fallen, 'chapter1-key')).toMatchObject({
      position: { x: 9, y: 3 },
      collectible: true,
      collected: false,
    });
    expect(blocked.changed).toBe(false);
    expect(object(blocked.state, 'chapter1-key')).toMatchObject({ collected: false });
  });

  it('requires a new RESET after the bookshelf falls even if RESET was used earlier', () => {
    const acquired = interact(createLevelGameState(level), { x: 3, y: 3 }, 'up');
    const resetBeforeShelf = resetAfterAction(acquired);
    const fallen = interact(resetBeforeShelf, { x: 9, y: 2 }, 'up');
    const trapped = interact(fallen, { x: 9, y: 4 }, 'up');

    expect(resetBeforeShelf.resetCount).toBe(1);
    expect(object(fallen, 'chapter1-key')).toMatchObject({
      collectible: true,
      collected: false,
      availableAfterResetCount: 2,
    });
    expect(object(trapped, 'chapter1-key')).toMatchObject({ collected: false });

    const resetAfterShelf = resetAfterAction(fallen);
    const collected = interact(resetAfterShelf, { x: 9, y: 4 }, 'up');

    expect(resetAfterShelf.resetCount).toBe(2);
    expect(object(collected, 'chapter1-key')).toMatchObject({ collected: true });
  });

  it('allows the player to stand in front of the standing bookshelf', () => {
    const state = createLevelGameState(level);
    const front = applyAction(
      at(state, { x: 9, y: 3 }, 'up'),
      { type: 'move', direction: 'up' },
      level.map,
    ).state;
    const behind = applyAction(
      at(front, { x: 9, y: 2 }, 'up'),
      { type: 'move', direction: 'up' },
      level.map,
    ).state;

    expect(front.player).toEqual({ x: 9, y: 2 });
    expect(behind.player).toEqual({ x: 9, y: 2 });
  });

  it('allows interaction only from the center front tile of the standing bookshelf', () => {
    const left = interact(createLevelGameState(level), { x: 8, y: 2 }, 'up');
    const center = interact(createLevelGameState(level), { x: 9, y: 2 }, 'up');
    const right = interact(createLevelGameState(level), { x: 10, y: 2 }, 'up');

    expect(object(left, 'chapter1-bookshelf')).toMatchObject({ state: 'standing' });
    expect(object(center, 'chapter1-bookshelf')).toMatchObject({ state: 'fallen' });
    expect(object(right, 'chapter1-bookshelf')).toMatchObject({ state: 'standing' });
  });

  it('does not allow side access to the key while the bookshelf is fallen', () => {
    const acquired = interact(createLevelGameState(level), { x: 3, y: 3 }, 'up');
    const fallen = interact(acquired, { x: 9, y: 2 }, 'up');
    const blocked = applyAction(
      at(fallen, { x: 8, y: 3 }, 'right'),
      { type: 'interact' },
      level.map,
    );

    expect(blocked.changed).toBe(false);
    expect(object(blocked.state, 'chapter1-key')).toMatchObject({ collected: false });
  });

  it('lets the player escape after falling the bookshelf while keeping the key blocked', () => {
    const acquired = interact(createLevelGameState(level), { x: 3, y: 3 }, 'up');
    const fallen = interact(acquired, { x: 9, y: 2 }, 'up');
    const movedLeft = applyAction(
      at(fallen, { x: 9, y: 3 }, 'left'),
      { type: 'move', direction: 'left' },
      level.map,
    ).state;
    const escaped = applyAction(
      at(movedLeft, { x: 8, y: 3 }, 'down'),
      { type: 'move', direction: 'down' },
      level.map,
    ).state;

    expect(movedLeft.player).toEqual({ x: 8, y: 3 });
    expect(escaped.player).toEqual({ x: 8, y: 4 });
    expect(object(escaped, 'chapter1-key')).toMatchObject({ collected: false });
  });

  it('restores the bookshelf but preserves the dropped key position and collectible state', () => {
    const acquired = interact(createLevelGameState(level), { x: 3, y: 3 }, 'up');
    const fallen = interact(acquired, { x: 9, y: 2 }, 'up');
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

  it('still allows the player to collect the dropped key after RESET', () => {
    const acquired = interact(createLevelGameState(level), { x: 3, y: 3 }, 'up');
    const reset = resetAfterAction(interact(acquired, { x: 9, y: 2 }, 'up'));
    const collected = interact(reset, { x: 9, y: 4 }, 'up');

    expect(object(collected, 'chapter1-key')).toMatchObject({ collected: true });
    expect(collected.inventoryKeys).toEqual(['chapter1-key']);
  });

  it('allows collecting the dropped key while standing on its tile', () => {
    const acquired = interact(createLevelGameState(level), { x: 3, y: 3 }, 'up');
    const reset = resetAfterAction(interact(acquired, { x: 9, y: 2 }, 'up'));
    const collected = interact(reset, { x: 9, y: 3 }, 'left');

    expect(object(collected, 'chapter1-key')).toMatchObject({ collected: true });
    expect(collected.inventoryKeys).toEqual(['chapter1-key']);
  });

  it('does not open or clear the door without the key', () => {
    const state = interact(createLevelGameState(level), { x: 1, y: 8 }, 'down');

    expect(state.phase).toBe('playing');
    expect(object(state, 'chapter1-door')).toMatchObject({ open: false, unlocked: false });
  });

  it('allows standing at the closed door while blocking the step beyond it', () => {
    const initial = at(createLevelGameState(level), { x: 2, y: 8 }, 'down');
    const atDoor = applyAction(initial, { type: 'move', direction: 'down' }, level.map);
    const blockedBeyond = applyAction(atDoor.state, { type: 'move', direction: 'down' }, level.map);

    expect(atDoor.state.player).toEqual({ x: 2, y: 9 });
    expect(atDoor.chapterCompleted).toBe(false);
    expect(blockedBeyond.state.player).toEqual({ x: 2, y: 9 });
    expect(blockedBeyond.chapterCompleted).toBe(false);
  });

  it('allows horizontal movement in the hidden row behind the bottom boundary', () => {
    const initial = at(createLevelGameState(level), { x: 5, y: 8 }, 'down');
    const entered = applyAction(initial, { type: 'move', direction: 'down' }, level.map);
    const movedSideways = applyAction(
      entered.state,
      { type: 'move', direction: 'right' },
      level.map,
    );

    expect(entered.state.player).toEqual({ x: 5, y: 9 });
    expect(entered.chapterCompleted).toBe(false);
    expect(movedSideways.state.player).toEqual({ x: 6, y: 9 });
    expect(movedSideways.chapterCompleted).toBe(false);
  });

  it('opens the door and clears Chapter 1 after stepping through it', () => {
    const acquired = interact(createLevelGameState(level), { x: 3, y: 3 }, 'up');
    const reset = resetAfterAction(interact(acquired, { x: 9, y: 2 }, 'up'));
    const withKey = interact(reset, { x: 9, y: 4 }, 'up');
    const opened = applyAction(
      at(withKey, { x: 2, y: 8 }, 'down'),
      { type: 'interact' },
      level.map,
    );
    const result = applyAction(opened.state, { type: 'move', direction: 'down' }, level.map);
    const completed = applyAction(result.state, { type: 'move', direction: 'down' }, level.map);

    expect(opened.chapterCompleted).toBe(false);
    expect(opened.state.phase).toBe('playing');
    expect(result.chapterCompleted).toBe(false);
    expect(result.state.player).toEqual({ x: 2, y: 9 });
    expect(completed.chapterCompleted).toBe(true);
    expect(completed.state.player).toEqual({ x: 2, y: 10 });
    expect(completed.state.phase).toBe('completed');
    expect(object(completed.state, 'chapter1-door')).toMatchObject({
      open: true,
      unlocked: true,
    });
  });

  it('opens the visual three-tile door from any front tile', () => {
    const acquired = interact(createLevelGameState(level), { x: 3, y: 3 }, 'up');
    const reset = resetAfterAction(interact(acquired, { x: 9, y: 2 }, 'up'));
    const withKey = interact(reset, { x: 9, y: 4 }, 'up');

    for (const x of [1, 2, 3]) {
      const result = applyAction(at(withKey, { x, y: 8 }, 'down'), { type: 'interact' }, level.map);

      expect(result.chapterCompleted).toBe(false);
      expect(result.state.phase).toBe('playing');
      expect(object(result.state, 'chapter1-door')).toMatchObject({ open: true, unlocked: true });
    }
  });

  it('restarts the Chapter 1 puzzle state from its initial data', () => {
    const acquired = interact(createLevelGameState(level), { x: 3, y: 3 }, 'up');
    const fallen = interact(acquired, { x: 9, y: 2 }, 'up');
    const restarted = restartChapter(fallen);

    expect(restarted.player).toEqual({ x: 5, y: 8 });
    expect(object(restarted, 'chapter1-bookshelf')).toMatchObject({ state: 'standing' });
    expect(object(restarted, 'chapter1-key')).toMatchObject({
      position: { x: 9, y: 1 },
      collectible: false,
      collected: false,
    });
    expect(
      (object(restarted, 'chapter1-key') as { availableAfterResetCount?: number })
        .availableAfterResetCount,
    ).toBeUndefined();
    expect(object(restarted, 'chapter1-door')).toMatchObject({ open: false, unlocked: false });
  });
});
