import { CHAPTER5_ASSET_MANIFEST } from '../assets/chapter5/manifest';
import type { ChapterVisualTheme } from './chapter-visual-theme';

export const CHAPTER5_VISUAL_THEME: ChapterVisualTheme = {
  chapterId: 'chapter-05',
  assets: CHAPTER5_ASSET_MANIFEST,
  floor: { assetKey: 'chapter1-floor-tileset', frameCount: 8 },
  walls: {
    doorwayObjectId: 'final-exit-door',
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
    'puzzle-object': { depth: 0.65 },
    lever: { depth: 0.75, displaySize: { width: 48, height: 48 } },
    door: {
      depth: 1.1,
      offset: { x: -24, y: -48 },
      displaySize: { width: 80, height: 80 },
    },
  },
  objectVisuals: {
    'final-grand-clock': {
      offset: { x: -32, y: -64 },
      displaySize: { width: 192, height: 160 },
      depth: 0.55,
    },
    'final-memory-socket': {
      offset: { x: -16, y: -8 },
      displaySize: { width: 64, height: 64 },
    },
    'final-lever': { assetKey: 'chapter1-crate', offset: { x: -8, y: -8 } },
    'final-rug': { offset: { x: 0, y: 0 }, displaySize: { width: 192, height: 128 } },
  },
};
