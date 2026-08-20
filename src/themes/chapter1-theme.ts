import { CHAPTER1_ASSET_MANIFEST } from '../assets/chapter1/manifest';
import type { ChapterVisualTheme } from './chapter-visual-theme';

export const CHAPTER1_VISUAL_THEME: ChapterVisualTheme = {
  chapterId: 'chapter-01',
  assets: CHAPTER1_ASSET_MANIFEST,
  floor: { assetKey: 'chapter1-floor-tileset', frameCount: 8 },
  walls: {
    doorwayObjectId: 'chapter1-door',
    top: 'chapter1-wall-top',
    bottom: 'chapter1-wall-bottom',
    left: 'chapter1-wall-left',
    right: 'chapter1-wall-right',
    cornerTopLeft: 'chapter1-wall-corner-tl',
    cornerTopRight: 'chapter1-wall-corner-tr',
    cornerBottomLeft: 'chapter1-wall-corner-bl',
    cornerBottomRight: 'chapter1-wall-corner-br',
    bottomDoorway: 'chapter1-wall-bottom-doorway',
  },
  typeVisuals: {
    prop: { depth: 0.35 },
    'puzzle-object': { depth: 0.6 },
    'pocket-watch': { depth: 0.75 },
    door: { depth: 0.7, offset: { x: 8, y: -16 }, displaySize: { width: 80, height: 80 } },
    key: { depth: 0.8, displaySize: { width: 24, height: 24 } },
  },
  objectVisuals: {
    'chapter1-window': {
      positionOverride: { y: 0 },
      offset: { x: 4, y: 8 },
      displaySize: { width: 48, height: 32 },
      depth: 0.18,
    },
    'chapter1-grandfather-clock': {
      offset: { x: 0, y: -32 },
      displaySize: { width: 58, height: 88 },
    },
    'chapter1-bed': { offset: { x: 0, y: 8 } },
    'chapter1-nightstand': { offset: { x: 0, y: 8 } },
    'chapter1-chair': { depth: 0.5 },
    'chapter1-bookshelf': {
      offset: { x: -16, y: -32 },
      displaySize: { width: 116, height: 88 },
    },
    'chapter1-pocket-watch': { assetKey: 'chapter1-pocket-watch' },
    'chapter1-key': { offsetsByPosition: { '9,1': { x: 0, y: -32 } } },
  },
};
