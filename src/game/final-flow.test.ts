import { describe, expect, it } from 'vitest';
import { createEndingSequence } from './ending';
import { advanceGameSession, createGameSession, updateSessionState } from './game-session';
import { advanceTime, applyAction, finishFinale } from './game-state';
import { createGridMap } from './grid';
import { createDoor, createExit } from './world-object';
import type { LevelDefinition } from '../levels/level-definition';

describe('Final flow', () => {
  it('continues from RESET and the bell to the Exit and ending memory', () => {
    const finalLevel: LevelDefinition = {
      schemaVersion: 1,
      id: 'final-clock-room',
      chapterId: 'final',
      map: createGridMap(['######', '#....#', '######']),
      playerStart: { x: 1, y: 1 },
      playerFacing: 'right',
      resetLimit: 0,
      resetPolicy: 'unlimited',
      echoLimit: 1,
      objects: [createDoor('final-door', { x: 3, y: 1 }), createExit('final-exit', { x: 4, y: 1 })],
      finalClockStartSeconds: 43_170,
      finalClockDurationMs: 30_000,
      finalDoorId: 'final-door',
    };
    let session = createGameSession([finalLevel], {
      totalResetCount: 0,
      chapterRestartCount: 0,
      pocketWatchCollected: true,
      events: [],
    });

    let state = applyAction(
      session.state,
      { type: 'move', direction: 'right' },
      finalLevel.map,
    ).state;
    const reset = applyAction(state, { type: 'reset' }, finalLevel.map);
    expect(reset.resetPerformed).toBe(true);
    expect(reset.state.echoes).toHaveLength(1);
    expect(reset.state.worldMemory.resetCountsByLevel).toEqual({ 'final-clock-room': 1 });

    state = advanceTime(reset.state, 27_000);
    expect(state.finalClockWarning).toBe(true);
    expect(state.phase).toBe('playing');

    state = advanceTime(state, 3_000);
    expect(state.phase).toBe('let-time-go');
    expect(state.objects.find((object) => object.id === 'final-door')).toMatchObject({
      open: true,
    });

    state = finishFinale(state);
    expect(state.echoes).toHaveLength(0);
    expect(state.finalResolved).toBe(true);

    state = applyAction(state, { type: 'move', direction: 'right' }, finalLevel.map).state;
    state = applyAction(state, { type: 'move', direction: 'right' }, finalLevel.map).state;
    const exit = applyAction(state, { type: 'move', direction: 'right' }, finalLevel.map);
    expect(exit.chapterCompleted).toBe(true);
    expect(exit.state.phase).toBe('completed');

    session = updateSessionState(session, exit.state);
    session = advanceGameSession(session);
    expect(session.completed).toBe(true);
    expect(session.state.worldMemory.events).toContain('level-cleared:final-clock-room');

    const ending = createEndingSequence(session.state.worldMemory);
    expect(ending.pages.at(-1)).toMatchObject({
      id: 'title',
      heading: 'RESET ME NOT',
    });
    expect(ending.totalResetCount).toBe(1);
    expect(ending.resetCountsByLevel).toEqual({ 'final-clock-room': 1 });
  });
});
