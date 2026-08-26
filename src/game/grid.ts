export type GridPosition = Readonly<{
  x: number;
  y: number;
}>;

export type Direction = 'up' | 'down' | 'left' | 'right';

export type GridMap = Readonly<{
  width: number;
  height: number;
  walls: ReadonlySet<string>;
  floorCells?: ReadonlySet<string>;
  floorTiles?: ReadonlySet<string>;
  structuralWalls?: ReadonlySet<string>;
  partitionWalls?: ReadonlySet<string>;
}>;

const DIRECTION_OFFSETS: Readonly<Record<Direction, GridPosition>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function positionKey(position: GridPosition): string {
  return `${position.x},${position.y}`;
}

export function positionInDirection(position: GridPosition, direction: Direction): GridPosition {
  const offset = DIRECTION_OFFSETS[direction];
  return { x: position.x + offset.x, y: position.y + offset.y };
}

export function createGridMap(rows: readonly string[]): GridMap {
  const firstRow = rows[0];
  if (firstRow === undefined || firstRow.length === 0) {
    throw new Error('맵에는 최소 한 개의 타일이 필요합니다.');
  }

  const width = firstRow.length;
  if (rows.some((row) => row.length !== width)) {
    throw new Error('모든 맵 행의 길이는 같아야 합니다.');
  }

  const walls = new Set<string>();
  rows.forEach((row, y) => {
    [...row].forEach((tile, x) => {
      if (tile === '#') walls.add(positionKey({ x, y }));
    });
  });

  return { width, height: rows.length, walls, structuralWalls: walls };
}

export function tryMove(current: GridPosition, direction: Direction, map: GridMap): GridPosition {
  const destination = positionInDirection(current, direction);

  const isOutOfBounds =
    destination.x < 0 ||
    destination.y < 0 ||
    destination.x >= map.width ||
    destination.y >= map.height;

  const destinationKey = positionKey(destination);
  const floorTiles = map.floorTiles ?? map.floorCells;
  const isVoid = floorTiles !== undefined && !floorTiles.has(destinationKey);
  if (isOutOfBounds || isVoid || map.walls.has(destinationKey)) return current;
  return destination;
}
