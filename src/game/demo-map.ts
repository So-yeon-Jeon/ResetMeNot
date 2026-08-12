import { createGridMap, type GridPosition } from './grid';

export const DEMO_MAP_ROWS = [
  '############',
  '#..........#',
  '#..###.....#',
  '#....#.....#',
  '#....###...#',
  '#..........#',
  '#......##..#',
  '#..........#',
  '#..........#',
  '############',
] as const;

export const DEMO_MAP = createGridMap(DEMO_MAP_ROWS);
export const PLAYER_START: GridPosition = { x: 2, y: 2 };
