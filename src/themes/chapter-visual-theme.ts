import type { AssetManifest } from '../assets/asset-definition';
import type { GridPosition } from '../game/grid';

export type DisplaySize = Readonly<{ width: number; height: number }>;

export type StateTransitionVisual = Readonly<{
  from: string;
  to: string;
  kind: 'fall';
  durationMs: number;
  angle: number;
  travelY: number;
  depth: number;
  feedback?: string;
  shakeDurationMs?: number;
  shakeIntensity?: number;
}>;

export type ForegroundCrop = Readonly<{
  y: number;
  height: number;
  depth?: number;
}>;

export type ObjectVisual = Readonly<{
  assetKey?: string;
  stableStateFrameAssetKey?: string;
  closedOverlay?: Readonly<{
    assetKey: string;
    offset: GridPosition;
    displaySize?: DisplaySize;
  }>;
  stateAssetKeys?: Readonly<Partial<Record<'inactive' | 'active' | 'closed' | 'open', string>>>;
  positionOverride?: Readonly<Partial<GridPosition>>;
  offset?: GridPosition;
  offsetsByPosition?: Readonly<Record<string, GridPosition>>;
  offsetsByState?: Readonly<Record<string, GridPosition>>;
  displaySize?: DisplaySize;
  flipX?: boolean;
  activeTint?: number;
  activeFlipX?: boolean;
  depth?: number;
  foregroundCrop?: ForegroundCrop;
  stateTransition?: StateTransitionVisual;
}>;

export type WallVisualTheme = Readonly<{
  tint?: number;
  doorwayObjectId?: string;
  perspectiveBoundary?: boolean;
  followFloorSilhouette?: boolean;
  floorPlanBoundary?: boolean;
  partition?: string;
  partitionVertical?: string;
  partitionVerticalDisplayWidth?: number;
  partitionVerticalDisplayHeight?: number;
  partitionStraightFrame?: number;
  partitionLeftEndFrame?: number;
  partitionRightEndFrame?: number;
  partitionDoorwayLeftFrame?: number;
  partitionDoorwayRightFrame?: number;
  partitionDisplayHeight?: number;
  partitionDoorwayOverlap?: number;
  renderBoundary?: boolean;
  top: string;
  bottom: string;
  left: string;
  right: string;
  cornerTopLeft: string;
  cornerTopRight: string;
  cornerBottomLeft: string;
  cornerBottomRight: string;
  bottomDoorway?: string;
  /** Optional wall face rendered below the bottom boundary. */
  bottomFace?: string;
  /** How far the bottom face overlaps the map edge. Defaults to the bottom cap height. */
  bottomFaceOverlap?: number;
  /** Rendered height of the bottom wall face. Defaults to the source asset height. */
  bottomFaceHeight?: number;
  /** Number of centered tiles left open behind a three-tile doorway. Defaults to three. */
  bottomFaceDoorwayGapTiles?: 1 | 3;
  /** Number of centered bottom-boundary tiles replaced by the doorway. Defaults to three. */
  bottomBoundaryDoorwayGapTiles?: 1 | 3;
  /** Draw the bottom boundary again above characters walking in its hidden row. */
  bottomBoundaryForeground?: boolean;
  interiorBottomBoundaries?: readonly Readonly<{
    y: number;
    startX: number;
    endX: number;
    doorwayStartX?: number;
  }>[];
  interiorSideBoundaries?: readonly Readonly<{
    side: 'left' | 'right';
    x: number;
    startY: number;
    endY: number;
  }>[];
  internalTop?: string;
  internalLeft?: string;
}>;

export type ChapterVisualTheme = Readonly<{
  chapterId: string;
  cameraZoom?: number;
  assets: AssetManifest;
  floor: Readonly<{
    assetKey: string;
    frameCount?: number;
    tint?: number;
  }>;
  walls: WallVisualTheme;
  objectVisuals?: Readonly<Record<string, ObjectVisual>>;
  typeVisuals?: Readonly<Record<string, ObjectVisual>>;
}>;
