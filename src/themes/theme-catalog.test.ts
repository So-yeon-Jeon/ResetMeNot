import { describe, expect, it } from 'vitest';
import { GAME_LEVELS_LOAD_RESULT } from '../levels/level-catalog';
import { CHAPTER_VISUAL_THEMES, getChapterVisualTheme } from './theme-catalog';

describe('chapter visual theme catalog', () => {
  it('모든 게임 레벨의 챕터 테마가 등록되어 있다', () => {
    expect(GAME_LEVELS_LOAD_RESULT.ok).toBe(true);
    if (!GAME_LEVELS_LOAD_RESULT.ok) return;

    GAME_LEVELS_LOAD_RESULT.levels.forEach((level) => {
      expect(getChapterVisualTheme(level.chapterId).chapterId).toBe(level.chapterId);
    });
  });

  it('테마가 참조하는 바닥과 벽 에셋이 manifest에 존재한다', () => {
    Object.values(CHAPTER_VISUAL_THEMES).forEach((theme) => {
      const requiredAssetKeys = [
        theme.floor.assetKey,
        theme.walls.top,
        theme.walls.bottom,
        theme.walls.left,
        theme.walls.right,
        theme.walls.cornerTopLeft,
        theme.walls.cornerTopRight,
        theme.walls.cornerBottomLeft,
        theme.walls.cornerBottomRight,
        theme.walls.bottomDoorway,
      ].filter((assetKey): assetKey is string => assetKey !== undefined);

      requiredAssetKeys.forEach((assetKey) => {
        expect(theme.assets, `${theme.chapterId}: ${assetKey}`).toHaveProperty(assetKey);
      });
    });
  });

  it('등록되지 않은 챕터는 명확한 오류를 반환한다', () => {
    expect(() => getChapterVisualTheme('chapter-missing')).toThrow(
      '등록되지 않은 챕터 비주얼 테마입니다: chapter-missing',
    );
  });
});
