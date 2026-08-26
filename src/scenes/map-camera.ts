export type MapCameraLayout = Readonly<{
  mapOrigin: Readonly<{ x: number; y: number }>;
  worldWidth: number;
  worldHeight: number;
  followsPlayer: boolean;
}>;

const HORIZONTAL_SAFE_MARGIN = 32;
export const TOP_HUD_SAFE_MARGIN = 30;
export const BOTTOM_HUD_SAFE_MARGIN = 30;

export function calculateMapCameraLayout(
  viewportWidth: number,
  viewportHeight: number,
  mapWidth: number,
  mapHeight: number,
  tileSize: number,
): MapCameraLayout {
  const mapPixelWidth = mapWidth * tileSize;
  const mapPixelHeight = mapHeight * tileSize;
  const availableWidth = viewportWidth - HORIZONTAL_SAFE_MARGIN * 2;
  const availableHeight = viewportHeight - TOP_HUD_SAFE_MARGIN - BOTTOM_HUD_SAFE_MARGIN;
  const scrollsHorizontally = mapPixelWidth > availableWidth;
  const scrollsVertically = mapPixelHeight > availableHeight;
  const mapOrigin = {
    x: scrollsHorizontally
      ? HORIZONTAL_SAFE_MARGIN
      : Math.floor((viewportWidth - mapPixelWidth) / 2),
    y: scrollsVertically
      ? TOP_HUD_SAFE_MARGIN
      : TOP_HUD_SAFE_MARGIN + Math.floor((availableHeight - mapPixelHeight) / 2),
  };

  return {
    mapOrigin,
    worldWidth: scrollsHorizontally ? mapPixelWidth + HORIZONTAL_SAFE_MARGIN * 2 : viewportWidth,
    worldHeight: scrollsVertically
      ? mapPixelHeight + TOP_HUD_SAFE_MARGIN + BOTTOM_HUD_SAFE_MARGIN
      : viewportHeight,
    followsPlayer: scrollsHorizontally || scrollsVertically,
  };
}
