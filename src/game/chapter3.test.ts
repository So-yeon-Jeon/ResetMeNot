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

function movePath(state: GameState, directions: readonly Direction[]): GameState {
  return directions.reduce((current, direction) => {
    const moved = applyAction(current, { type: 'move', direction }, level.map);
    expect(moved.changed).toBe(true);
    return moved.state;
  }, state);
}

function reachable(start: GridPosition, target: GridPosition, blockedKey?: string): boolean {
  const blockedCells = new Set(blockedKey ? [blockedKey] : []);
  const blockedDoor = level.objects.find(
    (candidate) =>
      candidate.type === 'door' && `${candidate.position.x},${candidate.position.y}` === blockedKey,
  );
  if (blockedDoor?.type === 'door') {
    blockedDoor.interactionCells.forEach((cell) => {
      blockedCells.add(`${blockedDoor.position.x + cell.x},${blockedDoor.position.y + cell.y}`);
    });
  }
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
      if (outside || blockedCells.has(key) || visited.has(key) || level.map.walls.has(key))
        continue;
      visited.add(key);
      queue.push(next);
    }
  }
  return false;
}

describe('Chapter 3 room 1', () => {
  it('uses archive decor instead of Chapter 1 bedroom fixtures', () => {
    const assetKeys = level.objects
      .filter((item) => item.type === 'prop')
      .map((item) => item.assetKey);

    expect(assetKeys).not.toContain('chapter1-bed');
    expect(assetKeys).not.toContain('chapter1-window');
    expect(assetKeys).not.toContain('chapter1-grandfather-clock');
    expect(assetKeys).toContain('chapter2-wall-painting');
  });

  it('uses two RESETs and two fixed Echoes on an 18x14 map', () => {
    const state = createLevelGameState(level, previousMemory);

    expect(level.map).toMatchObject({ width: 18, height: 14 });
    expect(state.resetLimit).toBe(2);
    expect(state.echoLimit).toBe(2);
  });

  it('aligns the central Gate opening with floor, wall, and Gate collision', () => {
    expect(level.map.floorTiles).toEqual(expect.any(Set));
    expect(level.map.partitionWalls).toEqual(expect.any(Set));
    expect(level.map.floorTiles?.has('9,7')).toBe(true);
    expect(level.map.floorTiles?.has('10,7')).toBe(true);
    expect(level.map.floorTiles?.has('11,7')).toBe(true);
    expect(level.map.walls.has('9,7')).toBe(false);
    expect(level.map.walls.has('10,7')).toBe(false);
    expect(level.map.walls.has('11,7')).toBe(false);
    expect(level.map.partitionWalls?.has('8,7')).toBe(true);
    expect(level.map.partitionWalls?.has('12,7')).toBe(true);
    expect(
      object(createLevelGameState(level, previousMemory), 'chapter3-central-gate'),
    ).toMatchObject({
      position: { x: 9, y: 7 },
      interactionCells: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ],
    });
  });

  it('allows reaching Memory and Hold first, but gates the final area', () => {
    const gateKey = '9,7';
    expect(reachable(level.playerStart, { x: 15, y: 10 }, gateKey)).toBe(true);
    expect(reachable(level.playerStart, { x: 7, y: 9 }, gateKey)).toBe(true);
    expect(reachable(level.playerStart, { x: 14, y: 4 }, gateKey)).toBe(false);
    expect(reachable(level.playerStart, { x: 14, y: 4 })).toBe(true);
  });

  it('lets the Player push the Memory Cube onto its Socket before RESET commits it', () => {
    let state = createLevelGameState(level, previousMemory);
    const approach: readonly Direction[] = [
      'up',
      'up',
      'left',
      'left',
      'left',
      'left',
      'left',
      'up',
      'up',
      'right',
    ];
    approach.forEach((direction) => {
      state = applyAction(state, { type: 'move', direction }, level.map).state;
    });

    const placed = applyAction(state, { type: 'move', direction: 'right' }, level.map);
    expect(placed.feedbackMessage).toBe('기억석이 Socket에 들어갔다. RESET으로 고정할 수 있다.');
    expect(object(placed.state, 'chapter3-memory-box')).toMatchObject({
      position: { x: 7, y: 9 },
      memoryCommitted: false,
    });
    expect(object(placed.state, 'chapter3-memory-socket')).toMatchObject({ active: false });

    const reset = applyAction(placed.state, { type: 'reset' }, level.map);
    expect(reset.feedbackMessage).toBe('기억석이 고정되었다.');
    expect(object(reset.state, 'chapter3-memory-box')).toMatchObject({
      position: { x: 7, y: 9 },
      memoryCommitted: true,
    });
    expect(object(reset.state, 'chapter3-memory-socket')).toMatchObject({ active: true });
  });

  it('supports the full Memory, Echo Hold, Gate, Lever, and Exit path without teleporting', () => {
    let state = createLevelGameState(level, previousMemory);
    state = movePath(state, [
      'up',
      'up',
      'left',
      'left',
      'left',
      'left',
      'left',
      'up',
      'up',
      'right',
      'right',
    ]);
    const memoryReset = applyAction(state, { type: 'reset' }, level.map);
    expect(memoryReset.resetPerformed).toBe(true);
    expect(object(memoryReset.state, 'chapter3-memory-socket')).toMatchObject({ active: true });

    state = movePath(memoryReset.state, [
      'up',
      'up',
      'up',
      'right',
      'right',
      'right',
      'right',
      'right',
      'right',
    ]);
    state = at(state, state.player, 'up');
    const hold = applyAction(state, { type: 'interact' }, level.map);
    expect(hold.changed).toBe(true);
    const holdReset = applyAction(hold.state, { type: 'reset' }, level.map);
    expect(holdReset.resetPerformed).toBe(true);
    expect(object(holdReset.state, 'chapter3-central-gate')).toMatchObject({ open: true });

    state = movePath(holdReset.state, [
      'up',
      'up',
      'up',
      'up',
      'up',
      'up',
      'up',
      'left',
      'up',
      'up',
      'up',
      'right',
      'right',
      'right',
      'right',
      'right',
      'down',
      'right',
    ]);
    state = at(state, state.player, 'up');
    const finalLever = applyAction(state, { type: 'interact' }, level.map);
    expect(finalLever.changed).toBe(true);
    expect(object(finalLever.state, 'chapter3-exit-door')).toMatchObject({ open: true });

    const exit = applyAction(finalLever.state, { type: 'move', direction: 'right' }, level.map);
    expect(exit.chapterCompleted).toBe(true);
  });

  it('restores the Memory Object outside its Socket', () => {
    let state = createLevelGameState(level, previousMemory);
    state = withObject(state, 'chapter3-memory-box', { position: { x: 5, y: 10 } });

    const reset = applyAction(at(state, { x: 4, y: 10 }, 'right'), { type: 'reset' }, level.map);

    expect(object(reset.state, 'chapter3-memory-box')).toMatchObject({ position: { x: 5, y: 9 } });
  });

  it('keeps the Memory Object only after it reaches its Socket', () => {
    let state = createLevelGameState(level, previousMemory);
    state = applyAction(
      at(state, { x: 4, y: 9 }, 'right'),
      { type: 'move', direction: 'right' },
      level.map,
    ).state;
    state = applyAction(state, { type: 'move', direction: 'right' }, level.map).state;

    expect(object(state, 'chapter3-memory-box')).toMatchObject({
      position: { x: 7, y: 9 },
      memoryCommitted: false,
    });
    expect(object(state, 'chapter3-memory-socket')).toMatchObject({ active: false });

    const reset = applyAction(state, { type: 'reset' }, level.map);

    expect(object(reset.state, 'chapter3-memory-box')).toMatchObject({
      position: { x: 7, y: 9 },
      memoryCommitted: true,
    });
    expect(object(reset.state, 'chapter3-memory-socket')).toMatchObject({ active: true });
  });

  it('completes the Memory Object, Echo Hold, final lever, and Exit flow', () => {
    let state = createLevelGameState(level, previousMemory);
    state = withObject(state, 'chapter3-memory-box', { position: { x: 7, y: 9 } });
    const memoryReset = applyAction(
      at(state, { x: 6, y: 9 }, 'right'),
      { type: 'reset' },
      level.map,
    );

    expect(object(memoryReset.state, 'chapter3-memory-box')).toMatchObject({
      memoryCommitted: true,
    });
    expect(object(memoryReset.state, 'chapter3-central-gate')).toMatchObject({ open: false });

    state = applyAction(
      at(memoryReset.state, { x: 15, y: 10 }, 'up'),
      { type: 'interact' },
      level.map,
    ).state;
    const holdReset = applyAction(state, { type: 'reset' }, level.map);

    expect(holdReset.echoCreated).toBe(true);
    expect(holdReset.state.echoes).toHaveLength(2);
    expect(holdReset.state.echoes[1]).toMatchObject({
      position: { x: 15, y: 10 },
      heldInteractionId: 'chapter3-hold-lever',
    });
    expect(object(holdReset.state, 'chapter3-memory-box')).toMatchObject({
      memoryCommitted: true,
    });
    expect(object(holdReset.state, 'chapter3-hold-lever')).toMatchObject({ active: true });
    expect(object(holdReset.state, 'chapter3-central-gate')).toMatchObject({ open: true });

    state = applyAction(
      at(holdReset.state, { x: 14, y: 4 }, 'up'),
      { type: 'interact' },
      level.map,
    ).state;
    expect(object(state, 'chapter3-exit-door')).toMatchObject({ open: true });

    const exited = applyAction(
      at(state, { x: 14, y: 4 }, 'right'),
      { type: 'move', direction: 'right' },
      level.map,
    );

    expect(exited.state.player).toEqual({ x: 15, y: 4 });
    expect(exited.chapterCompleted).toBe(true);
  });

  it('opens the central gate only when Memory and Echo Hold are both active', () => {
    let memoryOnly = createLevelGameState(level, previousMemory);
    memoryOnly = withObject(memoryOnly, 'chapter3-memory-box', { position: { x: 7, y: 9 } });
    memoryOnly = applyAction(
      at(memoryOnly, { x: 6, y: 9 }, 'right'),
      { type: 'reset' },
      level.map,
    ).state;
    expect(object(memoryOnly, 'chapter3-central-gate')).toMatchObject({ open: false });

    let holdOnly = createLevelGameState(level, previousMemory);
    holdOnly = applyAction(
      at(holdOnly, { x: 15, y: 10 }, 'up'),
      { type: 'interact' },
      level.map,
    ).state;
    holdOnly = applyAction(holdOnly, { type: 'reset' }, level.map).state;
    expect(object(holdOnly, 'chapter3-central-gate')).toMatchObject({ open: false });
  });

  it('keeps the final Exit locked when any one of the three conditions is missing', () => {
    let state = createLevelGameState(level, previousMemory);
    state = applyAction(at(state, { x: 15, y: 10 }, 'up'), { type: 'interact' }, level.map).state;
    state = applyAction(state, { type: 'reset' }, level.map).state;
    state = applyAction(at(state, { x: 14, y: 4 }, 'up'), { type: 'interact' }, level.map).state;

    expect(object(state, 'chapter3-memory-socket')).toMatchObject({ active: false });
    expect(object(state, 'chapter3-hold-lever')).toMatchObject({ active: true });
    expect(object(state, 'chapter3-final-lever')).toMatchObject({ active: true });
    expect(object(state, 'chapter3-exit-door')).toMatchObject({ open: false });
  });
});
