import { CHAPTER1_ASSET_MANIFEST } from '../assets/chapter1/manifest';
import type { ChapterVisualTheme } from './chapter-visual-theme';

export const CHAPTER4_VISUAL_THEME: ChapterVisualTheme = {
  chapterId: 'chapter-04',
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
  typeVisuals: {
    door: {
      depth: 0.7,
      offset: { x: 0, y: -16 },
      displaySize: { width: 32, height: 48 },
    },
  },
};
