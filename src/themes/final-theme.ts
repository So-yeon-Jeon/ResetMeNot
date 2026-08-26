import { CHAPTER1_ASSET_MANIFEST } from '../assets/chapter1/manifest';
import type { ChapterVisualTheme } from './chapter-visual-theme';

export const FINAL_VISUAL_THEME: ChapterVisualTheme = {
  chapterId: 'final',
  assets: CHAPTER1_ASSET_MANIFEST,
  floor: { assetKey: 'chapter1-floor-tileset', frameCount: 8 },
  walls: {
    renderBoundary: false,
    top: 'chapter1-wall-unified-top',
    bottom: 'chapter1-wall-unified-bottom',
    left: 'chapter1-wall-unified-left',
    right: 'chapter1-wall-unified-right',
    cornerTopLeft: 'chapter1-wall-unified-corner-tl',
    cornerTopRight: 'chapter1-wall-unified-corner-tr',
    cornerBottomLeft: 'chapter1-wall-unified-corner-bl',
    cornerBottomRight: 'chapter1-wall-unified-corner-br',
  },
  objectVisuals: {
    'final-great-clock': {
      offset: { x: -12, y: -42 },
      displaySize: { width: 120, height: 180 },
      depth: 0.72,
    },
    'final-rug': {
      displaySize: { width: 192, height: 96 },
      depth: 0.18,
    },
    'final-bookshelf-left': {
      displaySize: { width: 128, height: 96 },
      offset: { x: 48, y: -32 },
      depth: 0.62,
    },
    'final-desk-left': {
      displaySize: { width: 64, height: 96 },
      offset: { x: 16, y: -32 },
      depth: 0.58,
    },
    'final-desk-right': {
      displaySize: { width: 64, height: 96 },
      offset: { x: 16, y: -32 },
      depth: 0.58,
    },
    'final-plant-left': {
      displaySize: { width: 32, height: 64 },
      offset: { x: 0, y: -16 },
      depth: 0.64,
    },
    'final-plant-right': {
      displaySize: { width: 32, height: 64 },
      offset: { x: 0, y: -16 },
      depth: 0.64,
    },
  },
  typeVisuals: {
    door: {
      depth: 0.7,
      offset: { x: 0, y: -16 },
      displaySize: { width: 32, height: 48 },
    },
  },
};
