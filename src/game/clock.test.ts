import { describe, expect, it } from 'vitest';
import { calculateFinalClockHandAngles, formatClockTime } from './clock';

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

describe('Final clock hands', () => {
  it('jumps from 12 to 20, 40, and back to 12 as the finale advances', () => {
    expect(calculateFinalClockHandAngles(9_999, 10_000, 20_000, 30_000)).toEqual({
      minute: 0,
      second: 0,
    });
    expect(calculateFinalClockHandAngles(10_000, 10_000, 20_000, 30_000)).toEqual({
      minute: 120,
      second: 0,
    });
    expect(calculateFinalClockHandAngles(20_000, 10_000, 20_000, 30_000)).toEqual({
      minute: 240,
      second: 0,
    });
    expect(calculateFinalClockHandAngles(30_000, 10_000, 20_000, 30_000)).toEqual({
      minute: 0,
      second: 0,
    });
  });
});
