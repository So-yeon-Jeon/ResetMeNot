import { describe, expect, it } from 'vitest';
import { bgmAssetKeyForChapter } from './bgm';

describe('bgmAssetKeyForChapter', () => {
  it('shares Chapter 1 and Chapter 2 music', () => {
    expect(bgmAssetKeyForChapter('chapter-01')).toBe('bgm-chapter1-2');
    expect(bgmAssetKeyForChapter('chapter-02')).toBe('bgm-chapter1-2');
  });

  it('maps Chapters 3, 4, and 5 to their own tracks', () => {
    expect(bgmAssetKeyForChapter('chapter-03')).toBe('bgm-chapter3');
    expect(bgmAssetKeyForChapter('chapter-04')).toBe('bgm-chapter4');
    expect(bgmAssetKeyForChapter('chapter-05')).toBe('bgm-chapter5');
  });

  it('returns no track for non-chapter screens', () => {
    expect(bgmAssetKeyForChapter('ending')).toBeUndefined();
  });
});
