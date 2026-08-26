import { CHAPTER2_ASSET_MANIFEST } from '../assets/chapter2/manifest';
import type { ChapterVisualTheme } from './chapter-visual-theme';

export const CHAPTER2_VISUAL_THEME: ChapterVisualTheme = {
  chapterId: 'chapter-02',
  assets: CHAPTER2_ASSET_MANIFEST,
  floor: { assetKey: 'chapter2-floor-tileset', frameCount: 8, tint: 0xb8c5df },
  walls: {
    tint: 0xaebbd3,
    perspectiveBoundary: true,
    followFloorSilhouette: true,
    doorwayObjectId: 'chapter2-passage-door',
    partition: 'chapter2-partition-tileset',
    partitionStraightFrame: 1,
    partitionLeftEndFrame: 4,
    partitionRightEndFrame: 0,
    partitionDoorwayLeftFrame: 0,
    partitionDoorwayRightFrame: 4,
    partitionDisplayHeight: 48,
    partitionDoorwayOverlap: 8,
    top: 'chapter2-wall-unified-top',
    bottom: 'chapter2-wall-unified-bottom',
    left: 'chapter2-wall-unified-left',
    right: 'chapter2-wall-unified-right',
    cornerTopLeft: 'chapter2-wall-unified-corner-tl',
    cornerTopRight: 'chapter2-wall-unified-corner-tr',
    cornerBottomLeft: 'chapter2-wall-unified-corner-bl',
    cornerBottomRight: 'chapter2-wall-unified-corner-br',
    bottomDoorway: 'chapter2-wall-bottom-doorway',
    internalTop: 'chapter2-wall-unified-bottom',
    internalLeft: 'chapter2-wall-unified-left',
  },
  objectVisuals: {
    'chapter2-window': {
      positionOverride: { y: 0 },
      offset: { x: 4, y: 56 },
      displaySize: { width: 48, height: 32 },
      depth: 0.24,
    },
    'chapter2-bed': {
      offset: { x: 10, y: 18 },
      displaySize: { width: 64, height: 96 },
      depth: 0.34,
    },
    'chapter2-nightstand': { offset: { x: 4, y: 20 } },
    'chapter2-bookshelf': {
      offset: { x: 0, y: 4 },
      displaySize: { width: 112, height: 84 },
    },
    'chapter2-left-bookshelf': {
      offset: { x: 8, y: 4 },
      displaySize: { width: 96, height: 84 },
    },
    'chapter2-rug': { depth: 0.18 },
    'chapter2-desk': {
      offset: { x: 8, y: 30 },
      displaySize: { width: 56, height: 84 },
    },
    'chapter2-chair': {
      offset: { x: 2, y: 22 },
      displaySize: { width: 28, height: 56 },
      depth: 0.5,
    },
    'chapter2-left-plant': { offset: { x: 10, y: 0 } },
    'chapter2-right-plant': { offset: { x: -14, y: 0 } },
    'chapter2-crates': { offset: { x: 16, y: 8 } },
    'chapter2-barrel': { offset: { x: -4, y: 0 } },
    'chapter2-top-left-painting': {
      depth: 0.12,
      offset: { x: 0, y: -32 },
      displaySize: { width: 32, height: 48 },
    },
    'chapter2-top-right-painting': {
      depth: 0.12,
      offset: { x: 0, y: -32 },
      displaySize: { width: 32, height: 48 },
    },
    'chapter2-top-left-candle': {
      depth: 0.42,
      offset: { x: 4, y: -20 },
      displaySize: { width: 24, height: 36 },
    },
    'chapter2-top-right-candle': {
      depth: 0.42,
      offset: { x: 4, y: -20 },
      displaySize: { width: 24, height: 36 },
    },
    'chapter2-left-candle': {
      depth: 0.42,
      offset: { x: 4, y: -20 },
      displaySize: { width: 24, height: 36 },
    },
    'chapter2-right-candle': {
      depth: 0.42,
      offset: { x: 4, y: -20 },
      displaySize: { width: 24, height: 36 },
    },
    'chapter2-right-flowers': {
      depth: 0.36,
      offset: { x: -12, y: -8 },
      displaySize: { width: 64, height: 96 },
    },
    'chapter2-passage-door': {
      stateAssetKeys: {
        closed: 'chapter2-central-gate-closed',
        open: 'chapter2-central-gate-open',
      },
      offset: { x: -32, y: -64 },
      displaySize: { width: 96, height: 96 },
      depth: 1.14,
    },
    'chapter2-exit-door': {
      stateAssetKeys: {
        closed: 'chapter2-door-right-closed',
        open: 'chapter2-door-right-open',
      },
      offset: { x: -28, y: -4 },
      displaySize: { width: 88, height: 88 },
      depth: 1.06,
    },
    'chapter2-echo-switch': {
      assetKey: 'chapter2-pressure-plate-inactive',
      stateAssetKeys: {
        inactive: 'chapter2-pressure-plate-inactive',
        active: 'chapter2-pressure-plate-active',
      },
      depth: 0.22,
      offset: { x: -16, y: -16 },
      displaySize: { width: 64, height: 64 },
    },
    'chapter2-final-lever': {
      assetKey: 'chapter2-lever',
      depth: 0.66,
      offset: { x: 0, y: 24 },
      displaySize: { width: 64, height: 64 },
    },
  },
  typeVisuals: {
    prop: { depth: 0.35 },
    'puzzle-object': { depth: 0.6 },
    'pocket-watch': { depth: 0.75 },
    door: {
      depth: 1.1,
      offset: { x: 8, y: -12 },
      displaySize: { width: 80, height: 76 },
    },
    key: { depth: 0.8, displaySize: { width: 24, height: 24 } },
  },
};
