import { rememberWorldEvent, type GameState, type WorldMemory } from './game-state';
import { createLevelGameState, type LevelDefinition } from '../levels/level-definition';

export type GameSession = Readonly<{
  levels: readonly LevelDefinition[];
  currentLevelIndex: number;
  state: GameState;
  completed: boolean;
}>;

export function createGameSession(
  levels: readonly LevelDefinition[],
  worldMemory?: WorldMemory,
): GameSession {
  if (levels.length === 0) {
    throw new Error('게임 세션에는 레벨이 하나 이상 필요합니다.');
  }
  const ids = new Set<string>();
  for (const level of levels) {
    if (ids.has(level.id)) throw new Error(`레벨 ID가 중복되었습니다: ${level.id}`);
    ids.add(level.id);
  }

  return {
    levels: [...levels],
    currentLevelIndex: 0,
    state: createLevelGameState(levels[0]!, worldMemory),
    completed: false,
  };
}

export function updateSessionState(session: GameSession, state: GameState): GameSession {
  if (session.completed || session.state === state) return session;
  return { ...session, state };
}

export function advanceGameSession(session: GameSession): GameSession {
  if (session.completed) return session;
  if (session.state.phase !== 'completed' && session.state.phase !== 'let-time-go') {
    return session;
  }

  const currentLevel = session.levels[session.currentLevelIndex]!;
  const stateWithClearEvent = rememberWorldEvent(session.state, `level-cleared:${currentLevel.id}`);
  const nextLevelIndex = session.currentLevelIndex + 1;
  const nextLevel = session.levels[nextLevelIndex];
  if (!nextLevel) {
    return { ...session, state: stateWithClearEvent, completed: true };
  }

  return {
    ...session,
    currentLevelIndex: nextLevelIndex,
    state: createLevelGameState(nextLevel, stateWithClearEvent.worldMemory),
  };
}

export function currentLevel(session: GameSession): LevelDefinition {
  return session.levels[session.currentLevelIndex]!;
}
