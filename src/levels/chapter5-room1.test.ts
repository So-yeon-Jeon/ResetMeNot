import { describe, expect, it } from 'vitest';
import chapter5Room1Json from './chapter5-room1.json';
import { positionKey } from '../game/grid';
import { advanceGameSession, createGameSession, updateSessionState } from '../game/game-session';
import { advanceTime, applyAction, finishFinale, type GameState } from '../game/game-state';
import { createLevelGameState } from './level-definition';
import { loadTiledLevel } from './tiled-level-loader';

const level = loadTiledLevel(chapter5Room1Json);

describe('Final Room map and assets', () => {
  it('matches the 20x20 main-room and entrance-corridor silhouette', () => {
    expect(level.map).toMatchObject({ width: 20, height: 20 });
    expect(level.playerStart).toEqual({ x: 9, y: 17 });
    expect(level.playerFacing).toBe('up');
    expect(level.map.floorTiles?.has('1,1')).toBe(true);
    expect(level.map.floorTiles?.has('18,14')).toBe(true);
    expect(level.map.floorTiles?.has('7,18')).toBe(true);
    expect(level.map.floorTiles?.has('6,18')).toBe(false);
    expect(level.map.floorTiles?.has('13,18')).toBe(false);
  });

  it('places every object and its collision footprint on walkable floor', () => {
    expect(level.map.floorTiles?.has(positionKey(level.playerStart))).toBe(true);
    for (const object of level.objects) {
      expect(level.map.floorTiles?.has(positionKey(object.position)), object.id).toBe(true);
      if (object.type !== 'prop') continue;
      for (const cell of object.collisionCells) {
        expect(
          level.map.floorTiles?.has(`${object.position.x + cell.x},${object.position.y + cell.y}`),
          `${object.id} collision`,
        ).toBe(true);
      }
    }
  });

  it('keeps the final interactables reachable from one facing-adjacent tile', () => {
    const door = level.objects.find((object) => object.id === 'final-exit-door');
    const socket = level.objects.find((object) => object.id === 'final-memory-socket');
    const lever = level.objects.find((object) => object.id === 'final-lever');
    expect(door).toMatchObject({ type: 'door', position: { x: 15, y: 2 } });
    expect(socket).toMatchObject({ type: 'puzzle-object', position: { x: 9, y: 10 } });
    expect(lever).toMatchObject({ type: 'lever', position: { x: 15, y: 12 } });
    expect(level.map.floorTiles?.has('15,3')).toBe(true);
    expect(level.map.floorTiles?.has('9,11')).toBe(true);
    expect(level.map.floorTiles?.has('15,13')).toBe(true);
  });

  it('blocks RESET even after the player has moved', () => {
    let state = createLevelGameState(level, {
      totalResetCount: 0,
      chapterRestartCount: 0,
      pocketWatchCollected: true,
      events: [],
    });
    state = applyAction(state, { type: 'move', direction: 'up' }, level.map).state;

    const reset = applyAction(state, { type: 'reset' }, level.map);

    expect(reset.resetPerformed).toBe(false);
    expect(reset.resetBlocked).toBe('limit');
    expect(reset.state.echoes).toHaveLength(0);
    expect(reset.state.finalClockElapsedMs).toBe(0);
  });

  it('advances the wall, moving-clock, and door stages in order while waiting', () => {
    let state = createLevelGameState(level);
    const door = () => state.objects.find((object) => object.id === 'final-exit-door');

    state = advanceTime(state, 9_999);
    expect(state.finalClockElapsedMs).toBe(9_999);
    expect(state.finalClockStage).toBe('waiting');
    expect(door()).toMatchObject({ type: 'door', open: false });

    state = advanceTime(state, 1);
    expect(state.finalClockStage).toBe('wall-message');
    expect(door()).toMatchObject({ type: 'door', open: false });

    state = advanceTime(state, 10_000);
    expect(state.finalClockStage).toBe('clock-moving');
    expect(door()).toMatchObject({ type: 'door', open: false });

    state = advanceTime(state, 9_999);
    expect(state.finalClockStage).toBe('clock-moving');
    expect(door()).toMatchObject({ type: 'door', open: false });

    state = advanceTime(state, 1);
    expect(state.finalClockStage).toBe('door-open');
    expect(state.phase).toBe('let-time-go');
    expect(door()).toMatchObject({ type: 'door', open: true });
  });

  it('completes the final session only after crossing the opened door into EXIT', () => {
    let session = createGameSession([level]);
    let state: GameState = {
      ...session.state,
      player: { x: 15, y: 3 },
      playerFacing: 'up',
    };

    const closedDoor = applyAction(state, { type: 'move', direction: 'up' }, level.map);
    expect(closedDoor.chapterCompleted).toBe(false);
    expect(closedDoor.state.player).toEqual({ x: 15, y: 3 });

    state = finishFinale(advanceTime(state, 30_000));

    const throughDoor = applyAction(state, { type: 'move', direction: 'up' }, level.map);
    expect(throughDoor.chapterCompleted).toBe(true);
    expect(throughDoor.state.player).toEqual({ x: 15, y: 2 });
    expect(throughDoor.state.phase).toBe('completed');

    session = updateSessionState(session, throughDoor.state);
    session = advanceGameSession(session);
    expect(session.completed).toBe(true);
    expect(session.state.worldMemory.events).toContain('level-cleared:chapter-05-room-01');
  });
});
