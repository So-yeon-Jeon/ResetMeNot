import type { GridMap, GridPosition, Direction } from '../game/grid';
import {
  createGameState,
  type GameState,
  type ResetPolicy,
  type WorldMemory,
} from '../game/game-state';
import type { WorldObjectState } from '../game/world-object';

export type LevelDefinition = Readonly<{
  schemaVersion: 1;
  id: string;
  chapterId: string;
  map: GridMap;
  playerStart: GridPosition;
  playerFacing: Direction;
  resetLimit: number;
  resetPolicy: ResetPolicy;
  echoLimit: number;
  objects: readonly WorldObjectState[];
  finalClockStartSeconds?: number;
  finalClockDurationMs?: number;
  finalDoorId?: string;
}>;

export function createLevelGameState(level: LevelDefinition, worldMemory?: WorldMemory): GameState {
  return createGameState(level.playerStart, {
    levelId: level.id,
    facing: level.playerFacing,
    resetLimit: level.resetLimit,
    resetPolicy: level.resetPolicy,
    echoLimit: level.echoLimit,
    objects: level.objects,
    finalClockDurationMs: level.finalClockDurationMs,
    finalDoorId: level.finalDoorId,
    worldMemory,
  });
}
