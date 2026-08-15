import { describe, expect, it } from 'vitest';
import { createGridMap } from '../game/grid';
import { createPocketWatch } from '../game/world-object';
import { createLevelGameState, type LevelDefinition } from './level-definition';

describe('createLevelGameState', () => {
  const level: LevelDefinition = {
    schemaVersion: 1,
    id: 'chapter-01-room-01',
    chapterId: 'chapter-01',
    map: createGridMap(['###', '#.#', '###']),
    playerStart: { x: 1, y: 1 },
    playerFacing: 'left',
    resetLimit: 4,
    echoLimit: 2,
    objects: [createPocketWatch('watch', { x: 1, y: 1 })],
    finalClockDurationMs: 10_000,
  };

  it('copies every runtime option from the level definition', () => {
    const state = createLevelGameState(level);

    expect(state.player).toEqual({ x: 1, y: 1 });
    expect(state.playerFacing).toBe('left');
    expect(state.resetLimit).toBe(4);
    expect(state.echoLimit).toBe(2);
    expect(state.objects[0]).toMatchObject({ id: 'watch' });
    expect(state.finalClockDurationMs).toBe(10_000);
  });

  it('carries world memory into the next level state', () => {
    const worldMemory = {
      totalResetCount: 7,
      chapterRestartCount: 2,
      events: ['chapter-01-clear'],
    } as const;

    expect(createLevelGameState(level, worldMemory).worldMemory).toBe(worldMemory);
  });
});
