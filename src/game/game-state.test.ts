import { describe, expect, it } from 'vitest';
import {
  advanceTime,
  applyAction,
  createGameState,
  rememberWorldEvent,
  restartChapter,
  unlockReset,
} from './game-state';
import { createGridMap } from './grid';
import {
  createBox,
  createDoor,
  createExit,
  createKey,
  createLever,
  createPocketWatch,
  createPressureSwitch,
} from './world-object';

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

  it('keeps existing echoes fixed and does not create another on the same tile', () => {
    let state = unlockReset(createGameState({ x: 1, y: 1 }, { resetLimit: 2 }));
    state = applyAction(state, { type: 'move', direction: 'right' }, map).state;
    state = applyAction(state, { type: 'reset' }, map).state;
    state = applyAction(state, { type: 'move', direction: 'right' }, map).state;
    state = applyAction(state, { type: 'reset' }, map).state;

    expect(state.echoes).toEqual([{ id: 1, position: { x: 2, y: 1 }, facing: 'right' }]);
    expect(state.resetCount).toBe(2);
  });

  it('performs reset without creating an echo when its tile is already occupied by one', () => {
    let state = unlockReset(createGameState({ x: 1, y: 1 }, { resetLimit: 2 }));
    state = applyAction(state, { type: 'move', direction: 'right' }, map).state;
    state = applyAction(state, { type: 'reset' }, map).state;
    state = applyAction(state, { type: 'move', direction: 'right' }, map).state;
    const result = applyAction(state, { type: 'reset' }, map);

    expect(result.resetPerformed).toBe(true);
    expect(result.echoCreated).toBe(false);
    expect(result.echoCreationBlocked).toBe('occupied');
    expect(result.state.echoes).toHaveLength(1);
    expect(result.state.resetCount).toBe(2);
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

  it('reports when reset succeeds but the echo limit is already reached', () => {
    let state = unlockReset(createGameState({ x: 1, y: 1 }, { resetLimit: 2, echoLimit: 0 }));
    state = applyAction(state, { type: 'move', direction: 'right' }, map).state;
    const result = applyAction(state, { type: 'reset' }, map);

    expect(result.resetPerformed).toBe(true);
    expect(result.echoCreated).toBe(false);
    expect(result.echoCreationBlocked).toBe('limit');
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

  it('records pocket-watch acquisition in world memory', () => {
    const state = createGameState(
      { x: 1, y: 1 },
      { objects: [createPocketWatch('watch', { x: 2, y: 1 })], facing: 'right' },
    );
    const collected = applyAction(state, { type: 'interact' }, map).state;

    expect(collected.worldMemory.pocketWatchCollected).toBe(true);
  });

  it('stops in front of an interaction object so it can be examined', () => {
    const state = createGameState(
      { x: 1, y: 1 },
      { facing: 'right', objects: [createKey('key', { x: 2, y: 1 })] },
    );
    const moved = applyAction(state, { type: 'move', direction: 'right' }, map).state;
    const interacted = applyAction(moved, { type: 'interact' }, map).state;

    expect(moved.player).toEqual({ x: 1, y: 1 });
    expect(moved.playerFacing).toBe('right');
    expect(moved.hasAction).toBe(false);
    expect(interacted.inventoryKeys).toEqual(['key']);
  });

  it('opens a linked door while the player occupies a pressure switch', () => {
    const state = createGameState(
      { x: 1, y: 1 },
      {
        facing: 'right',
        objects: [
          createPressureSwitch('switch', { x: 2, y: 1 }),
          createDoor('door', { x: 3, y: 1 }, ['switch']),
        ],
      },
    );
    const moved = applyAction(state, { type: 'move', direction: 'right' }, map).state;

    expect(moved.objects).toMatchObject([
      { id: 'switch', active: true },
      { id: 'door', open: true },
    ]);
  });

  it('calculates a player-occupied switch as soon as the level starts', () => {
    const state = createGameState(
      { x: 2, y: 1 },
      {
        objects: [
          createPressureSwitch('switch', { x: 2, y: 1 }),
          createDoor('door', { x: 3, y: 1 }, ['switch']),
        ],
      },
    );

    expect(state.objects).toMatchObject([
      { id: 'switch', active: true },
      { id: 'door', open: true },
    ]);
    expect(state.initialObjects).toMatchObject([
      { id: 'switch', active: false },
      { id: 'door', open: false },
    ]);
  });

  it('calculates a box-occupied switch as soon as the level starts', () => {
    const state = createGameState(
      { x: 1, y: 1 },
      {
        objects: [
          createPressureSwitch('switch', { x: 3, y: 1 }),
          createBox('box', { x: 3, y: 1 }),
          createDoor('door', { x: 4, y: 1 }, ['switch']),
        ],
      },
    );

    expect(state.objects).toMatchObject([
      { id: 'switch', active: true },
      { id: 'box' },
      { id: 'door', open: true },
    ]);
  });

  it('keeps a pressure switch active with a fixed echo after reset', () => {
    let state = createGameState(
      { x: 1, y: 1 },
      {
        facing: 'right',
        resetUnlocked: true,
        resetLimit: 1,
        objects: [
          createPressureSwitch('switch', { x: 2, y: 1 }),
          createDoor('door', { x: 3, y: 1 }, ['switch']),
        ],
      },
    );
    state = applyAction(state, { type: 'move', direction: 'right' }, map).state;
    state = applyAction(state, { type: 'reset' }, map).state;

    expect(state.echoes[0]?.position).toEqual({ x: 2, y: 1 });
    expect(state.objects).toMatchObject([
      { id: 'switch', active: true },
      { id: 'door', open: true },
    ]);
  });

  it('keeps an open door open while the player occupies its tile', () => {
    const wideMap = createGridMap(['######', '#....#', '######']);
    let state = createGameState(
      { x: 2, y: 1 },
      {
        facing: 'right',
        objects: [
          createPressureSwitch('switch', { x: 2, y: 1 }),
          createDoor('door', { x: 3, y: 1 }, ['switch']),
        ],
      },
    );

    state = applyAction(state, { type: 'move', direction: 'right' }, wideMap).state;
    expect(state.player).toEqual({ x: 3, y: 1 });
    expect(state.objects.find((object) => object.id === 'door')).toMatchObject({ open: true });

    state = applyAction(state, { type: 'move', direction: 'right' }, wideMap).state;
    expect(state.objects.find((object) => object.id === 'door')).toMatchObject({ open: false });
  });

  it('opens a linked door while a box occupies an accepting pressure switch', () => {
    const wideMap = createGridMap(['#######', '#.....#', '#######']);
    const state = createGameState(
      { x: 1, y: 1 },
      {
        facing: 'right',
        objects: [
          createBox('box', { x: 2, y: 1 }),
          createPressureSwitch('switch', { x: 3, y: 1 }),
          createDoor('door', { x: 5, y: 1 }, ['switch']),
        ],
      },
    );
    const moved = applyAction(state, { type: 'move', direction: 'right' }, wideMap).state;

    expect(moved.objects).toMatchObject([
      { id: 'box', position: { x: 3, y: 1 } },
      { id: 'switch', active: true },
      { id: 'door', open: true },
    ]);
  });

  it('does not activate a pressure switch for a disallowed box', () => {
    const wideMap = createGridMap(['#######', '#.....#', '#######']);
    const state = createGameState(
      { x: 1, y: 1 },
      {
        facing: 'right',
        objects: [
          createBox('box', { x: 2, y: 1 }),
          createPressureSwitch('switch', { x: 3, y: 1 }, ['player', 'echo']),
          createDoor('door', { x: 5, y: 1 }, ['switch']),
        ],
      },
    );
    const moved = applyAction(state, { type: 'move', direction: 'right' }, wideMap).state;

    expect(moved.objects).toMatchObject([
      { id: 'box', position: { x: 3, y: 1 } },
      { id: 'switch', active: false },
      { id: 'door', open: false },
    ]);
  });

  it('requires every controller for a door in the default all mode', () => {
    const wideMap = createGridMap(['#######', '#.....#', '#######']);
    const state = createGameState(
      { x: 1, y: 1 },
      {
        facing: 'right',
        objects: [
          createPressureSwitch('switch-a', { x: 2, y: 1 }),
          createPressureSwitch('switch-b', { x: 4, y: 1 }),
          createDoor('door', { x: 5, y: 1 }, ['switch-a', 'switch-b']),
        ],
      },
    );
    const moved = applyAction(state, { type: 'move', direction: 'right' }, wideMap).state;

    expect(moved.objects.find((object) => object.id === 'door')).toMatchObject({ open: false });
  });

  it('opens an any-mode door when at least one controller is active', () => {
    const wideMap = createGridMap(['#######', '#.....#', '#######']);
    const state = createGameState(
      { x: 1, y: 1 },
      {
        facing: 'right',
        objects: [
          createPressureSwitch('switch-a', { x: 2, y: 1 }),
          createPressureSwitch('switch-b', { x: 4, y: 1 }),
          createDoor('door', { x: 5, y: 1 }, ['switch-a', 'switch-b'], {
            activationMode: 'any',
          }),
        ],
      },
    );
    const moved = applyAction(state, { type: 'move', direction: 'right' }, wideMap).state;

    expect(moved.objects.find((object) => object.id === 'door')).toMatchObject({ open: true });
  });

  it('blocks movement through a closed door', () => {
    const state = createGameState(
      { x: 1, y: 1 },
      { facing: 'right', objects: [createDoor('door', { x: 2, y: 1 }, [])] },
    );
    const result = applyAction(state, { type: 'move', direction: 'right' }, map);

    expect(result.state.player).toEqual({ x: 1, y: 1 });
    expect(result.state.hasAction).toBe(false);
  });

  it('pushes a box one tile when its destination is empty', () => {
    const state = createGameState(
      { x: 1, y: 1 },
      { facing: 'right', objects: [createBox('box', { x: 2, y: 1 })] },
    );
    const result = applyAction(state, { type: 'move', direction: 'right' }, map);

    expect(result.state.player).toEqual({ x: 2, y: 1 });
    expect(result.state.objects[0]).toMatchObject({ position: { x: 3, y: 1 } });
  });

  it('does not push a box onto a blocking interaction object', () => {
    const wideMap = createGridMap(['######', '#....#', '######']);
    const state = createGameState(
      { x: 1, y: 1 },
      {
        facing: 'right',
        objects: [createBox('box', { x: 2, y: 1 }), createKey('key', { x: 3, y: 1 })],
      },
    );
    const result = applyAction(state, { type: 'move', direction: 'right' }, wideMap);

    expect(result.state.player).toEqual({ x: 1, y: 1 });
    expect(result.state.objects[0]).toMatchObject({ position: { x: 2, y: 1 } });
  });

  it('restores a normal box but keeps a memory box position on reset', () => {
    const objects = [
      createBox('normal', { x: 2, y: 1 }),
      createBox('memory', { x: 3, y: 1 }, true),
    ];
    let state = unlockReset(createGameState({ x: 1, y: 1 }, { objects }));
    state = {
      ...state,
      hasAction: true,
      objects: [
        { ...objects[0]!, position: { x: 3, y: 1 } },
        { ...objects[1]!, position: { x: 1, y: 1 } },
      ],
    };
    state = applyAction(state, { type: 'reset' }, map).state;

    expect(state.objects).toMatchObject([
      { id: 'normal', position: { x: 2, y: 1 } },
      { id: 'memory', position: { x: 1, y: 1 } },
    ]);
  });

  it('toggles a lever and opens its linked door', () => {
    const state = createGameState(
      { x: 1, y: 1 },
      {
        facing: 'right',
        objects: [
          createLever('lever', { x: 2, y: 1 }),
          createDoor('door', { x: 3, y: 1 }, [], { leverIds: ['lever'] }),
        ],
      },
    );
    const result = applyAction(state, { type: 'interact' }, map);

    expect(result.state.objects).toMatchObject([
      { id: 'lever', active: true },
      { id: 'door', open: true },
    ]);
  });

  it('releases a hold lever and recalculates its door after a blocked move', () => {
    const state = createGameState(
      { x: 1, y: 1 },
      {
        facing: 'right',
        objects: [
          createLever('lever', { x: 2, y: 1 }, 'hold'),
          createDoor('door', { x: 3, y: 1 }, [], { leverIds: ['lever'] }),
        ],
      },
    );
    const held = applyAction(state, { type: 'interact' }, map).state;
    const released = applyAction(held, { type: 'move', direction: 'left' }, map).state;

    expect(released.heldInteractionId).toBeUndefined();
    expect(released.objects).toMatchObject([
      { id: 'lever', active: false },
      { id: 'door', open: false },
    ]);
  });

  it('selects an actionable object when it overlaps a floor switch', () => {
    const state = createGameState(
      { x: 1, y: 1 },
      {
        facing: 'right',
        objects: [
          createPressureSwitch('switch', { x: 2, y: 1 }),
          createLever('lever', { x: 2, y: 1 }),
        ],
      },
    );
    const interacted = applyAction(state, { type: 'interact' }, map).state;

    expect(interacted.objects.find((object) => object.id === 'lever')).toMatchObject({
      active: true,
    });
  });

  it('collects a key and unlocks a matching door', () => {
    let state = createGameState(
      { x: 1, y: 1 },
      {
        facing: 'right',
        objects: [
          createKey('key', { x: 2, y: 1 }),
          createDoor('door', { x: 3, y: 1 }, [], { keyId: 'key', consumesKey: true }),
        ],
      },
    );
    state = applyAction(state, { type: 'interact' }, map).state;
    state = applyAction(state, { type: 'move', direction: 'right' }, map).state;
    state = applyAction(state, { type: 'interact' }, map).state;

    expect(state.inventoryKeys).toEqual([]);
    expect(state.objects).toMatchObject([
      { id: 'key', collected: true },
      { id: 'door', unlocked: true, open: true },
    ]);
  });

  it('restores a persistently collected key to player inventory after reset', () => {
    let state = createGameState(
      { x: 1, y: 1 },
      {
        facing: 'right',
        resetUnlocked: true,
        objects: [createKey('memory-key', { x: 2, y: 1 }, ['collected'])],
      },
    );
    state = applyAction(state, { type: 'interact' }, map).state;
    state = applyAction(state, { type: 'reset' }, map).state;

    expect(state.objects[0]).toMatchObject({ id: 'memory-key', collected: true });
    expect(state.inventoryKeys).toEqual(['memory-key']);
  });

  it('completes a chapter only when the player enters an enter exit', () => {
    const state = createGameState(
      { x: 1, y: 1 },
      { facing: 'right', objects: [createExit('exit', { x: 2, y: 1 })] },
    );
    const result = applyAction(state, { type: 'move', direction: 'right' }, map);

    expect(result.chapterCompleted).toBe(true);
    expect(result.state.phase).toBe('completed');
  });

  it('restarts puzzle state while preserving world memory', () => {
    let state = unlockReset(createGameState({ x: 1, y: 1 }, { resetLimit: 2 }));
    state = applyAction(state, { type: 'move', direction: 'right' }, map).state;
    state = applyAction(state, { type: 'reset' }, map).state;
    state = rememberWorldEvent(state, 'first-reset');
    state = restartChapter(state);

    expect(state.player).toEqual({ x: 1, y: 1 });
    expect(state.resetCount).toBe(0);
    expect(state.echoes).toEqual([]);
    expect(state.worldMemory).toEqual({
      totalResetCount: 1,
      chapterRestartCount: 1,
      pocketWatchCollected: false,
      events: ['first-reset'],
    });
  });

  it('tracks chapter restarts separately from resets', () => {
    let state = createGameState({ x: 1, y: 1 });
    state = restartChapter(state);
    state = restartChapter(state);

    expect(state.worldMemory).toMatchObject({
      totalResetCount: 0,
      chapterRestartCount: 2,
    });
  });

  it('enters let-time-go when the final clock reaches its target', () => {
    let state = createGameState({ x: 1, y: 1 }, { finalClockDurationMs: 1000 });
    state = advanceTime(state, 999);
    expect(state.phase).toBe('playing');
    state = advanceTime(state, 1);
    expect(state.phase).toBe('let-time-go');
  });

  it.each(['completed', 'let-time-go'] as const)(
    'ignores game actions while the phase is %s',
    (phase) => {
      const state = {
        ...createGameState({ x: 1, y: 1 }),
        phase,
      };

      expect(applyAction(state, { type: 'move', direction: 'right' }, map).state).toBe(state);
      expect(applyAction(state, { type: 'interact' }, map).state).toBe(state);
      expect(applyAction(state, { type: 'reset' }, map).state).toBe(state);
    },
  );

  it('rewinds the final clock when reset is performed', () => {
    let state = unlockReset(
      createGameState({ x: 1, y: 1 }, { resetLimit: 1, finalClockDurationMs: 1000 }),
    );
    state = advanceTime(state, 700);
    state = applyAction(state, { type: 'move', direction: 'right' }, map).state;
    state = applyAction(state, { type: 'reset' }, map).state;

    expect(state.finalClockElapsedMs).toBe(0);
    expect(state.phase).toBe('playing');
  });

  it('allows unlimited resets while keeping the Echo limit', () => {
    let state = unlockReset(
      createGameState(
        { x: 1, y: 1 },
        { resetLimit: 0, resetPolicy: 'unlimited', echoLimit: 1, finalClockDurationMs: 30_000 },
      ),
    );

    state = applyAction(state, { type: 'move', direction: 'right' }, map).state;
    const firstReset = applyAction(state, { type: 'reset' }, map);
    expect(firstReset.resetPerformed).toBe(true);
    expect(firstReset.echoCreated).toBe(true);

    state = applyAction(firstReset.state, { type: 'move', direction: 'right' }, map).state;
    state = applyAction(state, { type: 'move', direction: 'right' }, map).state;
    state = advanceTime(state, 29_000);
    const secondReset = applyAction(state, { type: 'reset' }, map);

    expect(secondReset.resetPerformed).toBe(true);
    expect(secondReset.echoCreated).toBe(false);
    expect(secondReset.echoCreationBlocked).toBe('limit');
    expect(secondReset.state.resetCount).toBe(2);
    expect(secondReset.state.echoes).toHaveLength(1);
    expect(secondReset.state.finalClockElapsedMs).toBe(0);
  });

  it('rejects a negative time delta', () => {
    const state = advanceTime(createGameState({ x: 1, y: 1 }), 100);
    expect(() => advanceTime(state, -1)).toThrow('게임 경과 시간 증가량은 0 이상이어야 합니다.');
  });
});
