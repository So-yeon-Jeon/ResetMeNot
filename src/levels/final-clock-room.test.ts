import { describe, expect, it } from 'vitest';
import { advanceTime, applyAction, finishFinale } from '../game/game-state';
import { createLevelGameState } from './level-definition';
import finalClockRoomJson from './final-clock-room.json';
import { loadTiledLevel } from './tiled-level-loader';

const level = loadTiledLevel(finalClockRoomJson);

describe('Final clock room', () => {
  it('uses a 30-second clock and unlimited RESETs', () => {
    expect(level.map).toMatchObject({ width: 18, height: 14 });
    expect(level.playerStart).toEqual({ x: 9, y: 12 });
    expect(level.resetPolicy).toBe('unlimited');
    expect(level.finalClockDurationMs).toBe(30_000);
    expect(level.finalDoorId).toBe('final-clock-door');
    expect(level.objects.find((object) => object.id === 'final-great-clock')).toMatchObject({
      type: 'prop',
      position: { x: 8, y: 1 },
    });
    expect(level.objects.filter((object) => object.type === 'prop')).toHaveLength(7);
    expect(level.objects.find((object) => object.id === 'final-rug')).toMatchObject({
      type: 'prop',
      assetKey: 'chapter1-rug',
      position: { x: 7, y: 7 },
    });
  });

  it('rewinds on RESET and opens the final door only after uninterrupted time', () => {
    let state = createLevelGameState(level, {
      totalResetCount: 0,
      chapterRestartCount: 0,
      pocketWatchCollected: true,
      events: [],
    });
    state = advanceTime(state, 20_000);
    state = applyAction(
      { ...state, player: { x: 9, y: 11 }, hasAction: true },
      { type: 'reset' },
      level.map,
    ).state;
    expect(state.finalClockElapsedMs).toBe(0);

    state = advanceTime(state, 30_000);
    expect(state.phase).toBe('let-time-go');
    expect(state.objects.find((object) => object.id === 'final-clock-door')).toMatchObject({
      open: true,
    });

    state = finishFinale(state);
    state = applyAction(
      { ...state, player: { x: 14, y: 2 }, playerFacing: 'right' },
      { type: 'move', direction: 'right' },
      level.map,
    ).state;
    const exited = applyAction(state, { type: 'move', direction: 'right' }, level.map);
    expect(exited.chapterCompleted).toBe(true);
  });

  it('does not clear when the player reaches the exit before midnight', () => {
    let state = createLevelGameState(level, {
      totalResetCount: 0,
      chapterRestartCount: 0,
      pocketWatchCollected: true,
      events: [],
    });

    state = {
      ...state,
      player: { x: 15, y: 2 },
      playerFacing: 'right',
      hasAction: true,
    };
    const earlyExit = applyAction(state, { type: 'move', direction: 'right' }, level.map);

    expect(earlyExit.state.player).toEqual({ x: 16, y: 2 });
    expect(earlyExit.chapterCompleted).toBe(false);
    expect(earlyExit.state.phase).not.toBe('completed');
  });
});
