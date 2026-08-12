export type GridPosition = Readonly<{
  x: number;
  y: number;
}>;

export type Direction = 'up' | 'down' | 'left' | 'right';

export type GridMap = Readonly<{
  width: number;
  height: number;
  walls: ReadonlySet<string>;
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

  return { width, height: rows.length, walls };
}

export function tryMove(current: GridPosition, direction: Direction, map: GridMap): GridPosition {
  const offset = DIRECTION_OFFSETS[direction];
  const destination = {
    x: current.x + offset.x,
    y: current.y + offset.y,
  };

  const isOutOfBounds =
    destination.x < 0 ||
    destination.y < 0 ||
    destination.x >= map.width ||
    destination.y >= map.height;

  if (isOutOfBounds || map.walls.has(positionKey(destination))) return current;
  return destination;
}
