import { describe, expect, it } from 'vitest';
import { createGameState } from '../game/game-state';
import { createBox, createDoor, createLever, createPressureSwitch } from '../game/world-object';
import { chapterObjective } from './chapter-objective';

describe('chapterObjective', () => {
  it('guides Chapter 2 from RESET to the final lever', () => {
    const state = createGameState(
      { x: 1, y: 1 },
      {
        echoUnlocked: true,
        objects: [
          createDoor('chapter2-passage-door', { x: 2, y: 1 }),
          createLever('chapter2-final-lever', { x: 3, y: 1 }),
        ],
      },
    );
    expect(chapterObjective('chapter-02', state)).toContain('압력판 위에서 RESET');
  });

  it('distinguishes moving and committing the Chapter 3 memory cube', () => {
    const box = createBox('chapter3-memory-box', { x: 2, y: 2 }, true, 'chapter3-memory-socket');
    const socket = createPressureSwitch('chapter3-memory-socket', { x: 3, y: 2 }, ['box'], true);
    const state = createGameState(
      { x: 1, y: 1 },
      { objects: [box, socket, createDoor('chapter3-central-gate', { x: 4, y: 2 })] },
    );
    expect(chapterObjective('chapter-03', state)).toContain('Memory Socket까지 밀어라');
  });

  it('does not reveal Final as a reset puzzle', () => {
    const state = createGameState({ x: 1, y: 1 }, { finalClockDurationMs: 30_000 });
    expect(chapterObjective('chapter-05', state)).toContain('RESET하지 말고');
  });
});
