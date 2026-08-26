import { describe, expect, it } from 'vitest';
import { containDisplaySize } from './cinematic-layout';

describe('containDisplaySize', () => {
  it('fits a cinematic illustration without changing its aspect ratio', () => {
    const fitted = containDisplaySize({ width: 1672, height: 941 }, { width: 960, height: 540 });

    expect(fitted.height).toBe(540);
    expect(fitted.width).toBeCloseTo(959.49, 2);
    expect(fitted.width / fitted.height).toBeCloseTo(1672 / 941, 8);
  });

  it('keeps a transparent square logo inside its safe area', () => {
    const fitted = containDisplaySize({ width: 1254, height: 1254 }, { width: 928, height: 508 });

    expect(fitted.width).toBeCloseTo(508, 8);
    expect(fitted.height).toBeCloseTo(508, 8);
  });
});
