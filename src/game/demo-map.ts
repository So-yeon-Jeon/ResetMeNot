import { createGridMap, type GridPosition } from './grid';
import {
  createBox,
  createDoor,
  createExit,
  createKey,
  createLever,
  createPocketWatch,
  createPressureSwitch,
} from './world-object';

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
  createBox('demo-memory-box', { x: 8, y: 5 }, true),
  createKey('demo-key', { x: 9, y: 2 }),
  createDoor('demo-key-door', { x: 9, y: 7 }, [], {
    keyId: 'demo-key',
    consumesKey: true,
  }),
  createLever('demo-lever', { x: 8, y: 8 }),
  createExit('demo-exit', { x: 10, y: 8 }),
] as const;
