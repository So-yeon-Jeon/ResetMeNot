import chapter1Room1Json from './chapter1-room1.json';
import demoLevelJson from './demo-level.json';
import { tryLoadTiledLevel } from './tiled-level-loader';
import type { LevelDefinition } from './level-definition';

export type LevelSource = Readonly<{
  fileName: string;
  data: unknown;
}>;

export type LevelCatalogResult =
  | Readonly<{ ok: true; levels: readonly LevelDefinition[] }>
  | Readonly<{ ok: false; error: Error }>;

export const LEVEL_SOURCES: readonly LevelSource[] = [
  { fileName: 'chapter1-room1.json', data: chapter1Room1Json },
];

export const TEST_LEVEL_SOURCES: readonly LevelSource[] = [
  { fileName: 'demo-level.json', data: demoLevelJson },
];

export const GAME_LEVELS_LOAD_RESULT = loadLevelCatalog(LEVEL_SOURCES);

export function loadLevelCatalog(sources: readonly LevelSource[]): LevelCatalogResult {
  if (sources.length === 0) {
    return { ok: false, error: new Error('레벨 카탈로그가 비어 있습니다.') };
  }

  const levels: LevelDefinition[] = [];
  const errors: string[] = [];
  for (const source of sources) {
    const result = tryLoadTiledLevel(source.data);
    if (result.ok) levels.push(result.level);
    else errors.push(`${source.fileName}: ${result.error.message}`);
  }
  if (errors.length > 0) {
    return { ok: false, error: new Error(errors.join('\n\n')) };
  }

  const ids = new Set<string>();
  for (const level of levels) {
    if (ids.has(level.id)) {
      return {
        ok: false,
        error: new Error(`레벨 카탈로그에 중복 levelId가 있습니다: ${level.id}`),
      };
    }
    ids.add(level.id);
  }
  return { ok: true, levels };
}
