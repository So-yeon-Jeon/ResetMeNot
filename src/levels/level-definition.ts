import type { GridMap, GridPosition, Direction } from '../game/grid';
import { createGameState, type GameState, type WorldMemory } from '../game/game-state';
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

export function createLevelGameState(level: LevelDefinition, worldMemory?: WorldMemory): GameState {
  return createGameState(level.playerStart, {
    facing: level.playerFacing,
    resetLimit: level.resetLimit,
    echoLimit: level.echoLimit,
    objects: level.objects,
    finalClockDurationMs: level.finalClockDurationMs,
    worldMemory,
  });
}
