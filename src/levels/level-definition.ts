import type { GridMap, GridPosition, Direction } from '../game/grid';
import type { WorldObjectState } from '../game/world-object';

export type LevelDefinition = Readonly<{
  schemaVersion: 1;
  id: string;
  chapterId: string;
  map: GridMap;
  playerStart: GridPosition;
  playerFacing: Direction;
  resetLimit: number;
  echoLimit: number;
  objects: readonly WorldObjectState[];
  finalClockDurationMs?: number;
}>;
