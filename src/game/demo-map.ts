import { createGridMap, type GridPosition } from './grid';
import { createDoor, createPocketWatch, createPressureSwitch } from './world-object';

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
export const DEMO_OBJECTS = [
  createPocketWatch('demo-pocket-watch', { x: 2, y: 3 }),
  createPressureSwitch('demo-switch', { x: 4, y: 7 }),
  createDoor('demo-door', { x: 6, y: 7 }, ['demo-switch']),
] as const;
