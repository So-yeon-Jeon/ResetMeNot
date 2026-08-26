import { describe, expect, it } from 'vitest';
import { finalWallMessage } from './final-wall-message';

describe('Final wall message', () => {
  it('reveals each sentence as uninterrupted time passes', () => {
    expect(finalWallMessage(0)).toBe('');
    expect(finalWallMessage(9_999)).toBe('');
    expect(finalWallMessage(10_000)).toContain('돌아가야만');
    expect(finalWallMessage(20_000)).toContain('처음으로');
    expect(finalWallMessage(27_000)).toContain('같은 페이지');
    expect(finalWallMessage(30_000)).toBe('LET TIME GO.');
  });

  it('returns to silence when RESET rewinds elapsed time', () => {
    expect(finalWallMessage(20_000)).not.toBe('');
    expect(finalWallMessage(0)).toBe('');
  });
});
