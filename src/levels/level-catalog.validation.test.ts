import { describe, expect, it } from 'vitest';
import { GAME_LEVELS_LOAD_RESULT, LEVEL_SOURCES } from './level-catalog';

describe('registered level catalog', () => {
  it('contains only valid Tiled JSON levels', () => {
    if (!GAME_LEVELS_LOAD_RESULT.ok) throw GAME_LEVELS_LOAD_RESULT.error;

    expect(GAME_LEVELS_LOAD_RESULT.levels).toHaveLength(LEVEL_SOURCES.length);
  });
});
