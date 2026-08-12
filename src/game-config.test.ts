import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT, GAME_WIDTH, GRID_SIZE } from './game-config';

describe('game configuration', () => {
  it('uses the intended 16:9 viewport', () => {
    expect(GAME_WIDTH / GAME_HEIGHT).toBeCloseTo(16 / 9);
  });

  it('uses a positive grid size aligned to the viewport width', () => {
    expect(GRID_SIZE).toBeGreaterThan(0);
    expect(GAME_WIDTH % GRID_SIZE).toBe(0);
  });
});
