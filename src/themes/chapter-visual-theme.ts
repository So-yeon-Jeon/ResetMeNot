import type { AssetManifest } from '../assets/asset-definition';
import type { GridPosition } from '../game/grid';

export type DisplaySize = Readonly<{ width: number; height: number }>;

export type ObjectVisual = Readonly<{
  assetKey?: string;
  positionOverride?: Readonly<Partial<GridPosition>>;
  offset?: GridPosition;
  offsetsByPosition?: Readonly<Record<string, GridPosition>>;
  displaySize?: DisplaySize;
  depth?: number;
}>;

export type WallVisualTheme = Readonly<{
  doorwayObjectId?: string;
  perspectiveBoundary?: boolean;
  top: string;
  bottom: string;
  left: string;
  right: string;
  cornerTopLeft: string;
  cornerTopRight: string;
  cornerBottomLeft: string;
  cornerBottomRight: string;
  bottomDoorway?: string;
}>;

export type ChapterVisualTheme = Readonly<{
  chapterId: string;
  assets: AssetManifest;
  floor: Readonly<{
    assetKey: string;
    frameCount?: number;
  }>;
  walls: WallVisualTheme;
  objectVisuals?: Readonly<Record<string, ObjectVisual>>;
  typeVisuals?: Readonly<Record<string, ObjectVisual>>;
}>;
