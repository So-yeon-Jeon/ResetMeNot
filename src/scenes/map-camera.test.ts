import { describe, expect, it } from 'vitest';
import { calculateMapCameraLayout } from './map-camera';

describe('map camera layout', () => {
  it('keeps the 12x10 Chapter 1 map centered without camera tracking', () => {
    expect(calculateMapCameraLayout(960, 540, 12, 10, 32)).toEqual({
      mapOrigin: { x: 288, y: 110 },
      worldWidth: 960,
      worldHeight: 540,
      followsPlayer: false,
    });
  });

  it('keeps a 16x12 map fully visible inside the HUD-safe area', () => {
    expect(calculateMapCameraLayout(960, 540, 16, 12, 32)).toEqual({
      mapOrigin: { x: 224, y: 78 },
      worldWidth: 960,
      worldHeight: 540,
      followsPlayer: false,
    });
  });

  it('adds safe margins and enables tracking for a large multi-room map', () => {
    expect(calculateMapCameraLayout(960, 540, 32, 20, 32)).toEqual({
      mapOrigin: { x: 32, y: 64 },
      worldWidth: 1088,
      worldHeight: 768,
      followsPlayer: true,
    });
  });
});
