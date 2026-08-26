import { describe, expect, it } from 'vitest';
import { createEndingSequence, nextEndingPageIndex } from './ending';

describe('createEndingSequence', () => {
  it('builds the fixed ending flow and carries remembered results', () => {
    const ending = createEndingSequence({
      totalResetCount: 7,
      chapterRestartCount: 2,
      pocketWatchCollected: true,
      events: ['level-cleared:chapter-01', 'memory:key-position'],
      objectMemories: [
        {
          levelId: 'chapter-01',
          objectId: 'memory-box',
          objectType: 'box',
          values: { position: { x: 4, y: 2 } },
        },
      ],
      resetCountsByLevel: { 'chapter-01': 2, final: 5 },
    });

    expect(ending.pages.map((page) => page.id)).toEqual(['room', 'book', 'trace', 'title']);
    expect(ending.pages.map((page) => page.assetKey)).toEqual([
      'ending-room',
      'ending-book',
      'ending-trace',
      'ending-title',
    ]);
    expect(ending.pages.at(-1)?.body).toBe('The world remembers.');
    expect(ending.rememberedEvents).toEqual(['level-cleared:chapter-01', 'memory:key-position']);
    expect(ending.rememberedEvents).not.toBe(ending.pages);
    expect(ending.totalResetCount).toBe(7);
    expect(ending.chapterRestartCount).toBe(2);
    expect(ending.resetCountsByLevel).toEqual({ 'chapter-01': 2, final: 5 });
    expect(ending.rememberedObjects).toEqual([
      {
        levelId: 'chapter-01',
        objectId: 'memory-box',
        objectType: 'box',
        values: { position: { x: 4, y: 2 } },
      },
    ]);
  });

  it('advances with ENTER semantics and stays on the final title page', () => {
    expect(nextEndingPageIndex(0, 4)).toBe(1);
    expect(nextEndingPageIndex(1, 4)).toBe(2);
    expect(nextEndingPageIndex(2, 4)).toBe(3);
    expect(nextEndingPageIndex(3, 4)).toBe(3);
  });
});
