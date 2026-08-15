import demoLevelJson from '../levels/demo-level.json';
import { loadTiledLevel } from '../levels/tiled-level-loader';

export const DEMO_LEVEL = loadTiledLevel(demoLevelJson);
export const DEMO_MAP = DEMO_LEVEL.map;
export const DEMO_MAP_ROWS = Array.from({ length: DEMO_MAP.height }, (_, y) =>
  Array.from({ length: DEMO_MAP.width }, (_, x) =>
    DEMO_MAP.walls.has(`${x},${y}`) ? '#' : '.',
  ).join(''),
);
export const PLAYER_START = DEMO_LEVEL.playerStart;
export const DEMO_OBJECTS = DEMO_LEVEL.objects;
