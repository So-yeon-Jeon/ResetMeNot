import { describe, expect, it } from 'vitest';
import { createEndingSequence } from './ending';

describe('createEndingSequence', () => {
  it('builds the fixed ending flow and carries remembered results', () => {
    const ending = createEndingSequence({
      totalResetCount: 7,
      chapterRestartCount: 2,
      pocketWatchCollected: true,
      events: ['level-cleared:chapter-01', 'memory:key-position'],
    });

    expect(ending.pages.map((page) => page.id)).toEqual(['room', 'book', 'blank-page', 'title']);
    expect(ending.pages[1]?.body).toContain('did not turn the clock');
    expect(ending.rememberedEvents).toEqual(['level-cleared:chapter-01', 'memory:key-position']);
    expect(ending.rememberedEvents).not.toBe(ending.pages);
    expect(ending.totalResetCount).toBe(7);
    expect(ending.chapterRestartCount).toBe(2);
  });
});
