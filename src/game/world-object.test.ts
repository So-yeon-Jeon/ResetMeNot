import { describe, expect, it } from 'vitest';
import { createPocketWatch, createPuzzleObject, restoreWorldObjects } from './world-object';

describe('world object reset', () => {
  it('restores fields that are not persistent', () => {
    const initial = createPuzzleObject('box', { x: 1, y: 1 });
    const current = {
      ...initial,
      position: { x: 3, y: 2 },
      state: 'active',
      broken: true,
      collected: true,
    } as const;

    expect(restoreWorldObjects([current], [initial])).toEqual([initial]);
  });

  it('keeps only fields listed in persistentFields', () => {
    const initial = createPuzzleObject('memory-key', { x: 1, y: 1 }, ['position', 'broken']);
    const current = {
      ...initial,
      position: { x: 3, y: 2 },
      state: 'active',
      broken: true,
      collected: true,
    } as const;
    const [restored] = restoreWorldObjects([current], [initial]);

    expect(restored).toMatchObject({
      position: { x: 3, y: 2 },
      state: 'default',
      broken: true,
      collected: false,
    });
  });

  it('always keeps the special pocket watch state', () => {
    const initial = createPocketWatch('watch', { x: 1, y: 1 });
    const current = { ...initial, collected: true } as const;

    expect(restoreWorldObjects([current], [initial])).toEqual([current]);
  });
});
