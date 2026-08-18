import { describe, expect, it } from 'vitest';
import { formatClockTime } from './clock';

describe('formatClockTime', () => {
  it('advances from the configured start time', () => {
    expect(formatClockTime(43_190, 0)).toBe('11:59:50');
    expect(formatClockTime(43_190, 9_999)).toBe('11:59:59');
    expect(formatClockTime(43_190, 10_000)).toBe('12:00:00');
  });

  it('wraps at midnight', () => {
    expect(formatClockTime(86_399, 1_000)).toBe('00:00:00');
  });
});
