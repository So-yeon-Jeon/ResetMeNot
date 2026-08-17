import { describe, expect, it } from 'vitest';
import { createGridMap } from './grid';
import { createGameState } from './game-state';
import {
  advanceGameSession,
  createGameSession,
  currentLevel,
  updateSessionState,
} from './game-session';
import type { LevelDefinition } from '../levels/level-definition';

function level(id: string, chapterId = 'chapter-01'): LevelDefinition {
  return {
    schemaVersion: 1,
    id,
    chapterId,
    map: createGridMap(['###', '#.#', '###']),
    playerStart: { x: 1, y: 1 },
    playerFacing: 'down',
    resetLimit: 3,
    resetPolicy: 'disable',
    echoLimit: 2,
    objects: [],
  };
}

describe('game session', () => {
  it('requires at least one level with unique IDs', () => {
    expect(() => createGameSession([])).toThrow(/하나 이상/);
    expect(() => createGameSession([level('room'), level('room')])).toThrow(/중복/);
  });

  it('does not advance while the current level is still playing', () => {
    const session = createGameSession([level('room-01'), level('room-02')]);

    expect(advanceGameSession(session)).toBe(session);
  });

  it('starts the next level with carried world memory and fresh puzzle state', () => {
    let session = createGameSession([level('room-01'), level('room-02')]);
    const completedState = {
      ...session.state,
      phase: 'completed' as const,
      resetCount: 2,
      worldMemory: {
        ...session.state.worldMemory,
        totalResetCount: 2,
      },
    };
    session = updateSessionState(session, completedState);
    session = advanceGameSession(session);

    expect(currentLevel(session).id).toBe('room-02');
    expect(session.state.resetCount).toBe(0);
    expect(session.state.echoes).toEqual([]);
    expect(session.state.worldMemory).toEqual({
      totalResetCount: 2,
      chapterRestartCount: 0,
      pocketWatchCollected: false,
      events: ['level-cleared:room-01'],
    });
  });

  it('keeps reset unlocked in later levels after the pocket watch is collected', () => {
    let session = createGameSession([level('room-01'), level('room-02')]);
    session = updateSessionState(session, {
      ...session.state,
      phase: 'completed',
      resetUnlocked: true,
      worldMemory: {
        ...session.state.worldMemory,
        pocketWatchCollected: true,
      },
    });
    session = advanceGameSession(session);

    expect(session.state.resetUnlocked).toBe(true);
  });

  it('finishes the session after the last level', () => {
    let session = createGameSession([level('final', 'final')]);
    session = updateSessionState(session, {
      ...session.state,
      phase: 'let-time-go',
    });
    session = advanceGameSession(session);

    expect(session.completed).toBe(true);
    expect(session.state.worldMemory.events).toContain('level-cleared:final');
    expect(advanceGameSession(session)).toBe(session);
  });

  it('ignores state updates after the session is complete', () => {
    let session = createGameSession([level('only')]);
    session = updateSessionState(session, { ...session.state, phase: 'completed' });
    session = advanceGameSession(session);
    const unrelatedState = createGameState({ x: 1, y: 1 });

    expect(updateSessionState(session, unrelatedState)).toBe(session);
  });
});
