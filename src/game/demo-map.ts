import demoLevelJson from '../levels/demo-level.json';
import { tryLoadTiledLevel } from '../levels/tiled-level-loader';

export const DEMO_LEVEL_LOAD_RESULT = tryLoadTiledLevel(demoLevelJson);
