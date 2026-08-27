export const BGM_ASSET_KEY_BY_CHAPTER: Readonly<Record<string, string>> = {
  'chapter-01': 'bgm-chapter1-2',
  'chapter-02': 'bgm-chapter1-2',
  'chapter-03': 'bgm-chapter3',
  'chapter-04': 'bgm-chapter4',
  'chapter-05': 'bgm-chapter5',
};

export function bgmAssetKeyForChapter(chapterId: string): string | undefined {
  return BGM_ASSET_KEY_BY_CHAPTER[chapterId];
}
