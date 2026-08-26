import { CHAPTER1_ASSET_MANIFEST } from '../assets/chapter1/manifest';
import type { ChapterVisualTheme } from './chapter-visual-theme';
import { WALL_ATTACHED_BOOKSHELF_VISUAL } from './manor-shared-visuals';

export const CHAPTER1_VISUAL_THEME: ChapterVisualTheme = {
  chapterId: 'chapter-01',
  assets: CHAPTER1_ASSET_MANIFEST,
  floor: { assetKey: 'chapter1-floor-tileset', frameCount: 8 },
  walls: {
    doorwayObjectId: 'chapter1-door',
    perspectiveBoundary: true,
    top: 'chapter1-wall-unified-top',
    bottom: 'chapter1-wall-unified-bottom',
    left: 'chapter1-wall-unified-left',
    right: 'chapter1-wall-unified-right',
    cornerTopLeft: 'chapter1-wall-unified-corner-tl',
    cornerTopRight: 'chapter1-wall-unified-corner-tr',
    cornerBottomLeft: 'chapter1-wall-unified-corner-bl',
    cornerBottomRight: 'chapter1-wall-unified-corner-br',
    bottomDoorway: 'chapter1-wall-bottom-doorway',
  },
  typeVisuals: {
    prop: { depth: 0.35 },
    'puzzle-object': { depth: 0.6 },
    'pocket-watch': { depth: 0.75 },
    door: {
      depth: 1.1,
      offset: { x: 8, y: -12 },
      displaySize: { width: 80, height: 76 },
      foregroundCrop: { y: 70, height: 26, depth: 2 },
    },
    key: { depth: 0.8, displaySize: { width: 24, height: 24 } },
  },
  objectVisuals: {
    'chapter1-window': {
      positionOverride: { y: 0 },
      offset: { x: 4, y: 28 },
      displaySize: { width: 48, height: 32 },
      depth: 0.18,
    },
    'chapter1-grandfather-clock': {
      // Keep the visual body aligned with the authored 2×2 collision footprint.
      // The previous upward shift made the reachable front tile look detached.
      offset: { x: 0, y: -8 },
      displaySize: { width: 64, height: 72 },
    },
    'chapter1-bed': {
      // Match the 2×3 collision footprint instead of rendering the source
      // image a tile taller than the furniture it occupies.
      offset: { x: 0, y: 0 },
      displaySize: { width: 64, height: 96 },
    },
    'chapter1-nightstand': { offset: { x: 0, y: 8 } },
    'chapter1-chair': { depth: 0.5 },
    'chapter1-bookshelf': {
      ...WALL_ATTACHED_BOOKSHELF_VISUAL,
      offsetsByState: { fallen: { x: -4, y: 0 } },
      stateTransition: {
        from: 'standing',
        to: 'fallen',
        kind: 'fall',
        durationMs: 460,
        angle: -78,
        travelY: 14,
        depth: 1.3,
        feedback: 'BOOKSHELF FALLS · KEY EXPOSED',
        shakeDurationMs: 180,
        shakeIntensity: 0.004,
      },
    },
    'chapter1-left-plant': { offset: { x: 0, y: -16 } },
    'chapter1-desk': { offset: { x: 8, y: 0 } },
    'chapter1-crates': { offset: { x: 16, y: 8 } },
    'chapter1-barrel': { offset: { x: 8, y: 16 } },
    'chapter1-pocket-watch': { assetKey: 'chapter1-pocket-watch' },
    'chapter1-key': { offsetsByPosition: { '9,1': { x: 0, y: -32 } } },
  },
};
