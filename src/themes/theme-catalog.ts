import { CHAPTER1_VISUAL_THEME } from './chapter1-theme';
import { CHAPTER2_VISUAL_THEME } from './chapter2-theme';
import type { ChapterVisualTheme } from './chapter-visual-theme';

export const CHAPTER_VISUAL_THEMES: Readonly<Record<string, ChapterVisualTheme>> = {
  [CHAPTER1_VISUAL_THEME.chapterId]: CHAPTER1_VISUAL_THEME,
  [CHAPTER2_VISUAL_THEME.chapterId]: CHAPTER2_VISUAL_THEME,
};

export function getChapterVisualTheme(chapterId: string): ChapterVisualTheme {
  const theme = CHAPTER_VISUAL_THEMES[chapterId];
  if (!theme) throw new Error(`등록되지 않은 챕터 비주얼 테마입니다: ${chapterId}`);
  return theme;
}
