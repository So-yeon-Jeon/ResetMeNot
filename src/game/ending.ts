import type { RememberedObjectState, WorldMemory } from './game-state';

export type EndingPage = Readonly<{
  id: 'room' | 'book' | 'trace' | 'title';
  assetKey: string;
  heading: string;
  body: string;
}>;

export type EndingSequence = Readonly<{
  pages: readonly EndingPage[];
  rememberedEvents: readonly string[];
  rememberedObjects: readonly RememberedObjectState[];
  totalResetCount: number;
  chapterRestartCount: number;
  resetCountsByLevel: Readonly<Record<string, number>>;
}>;

export function createEndingSequence(worldMemory: WorldMemory): EndingSequence {
  return {
    pages: [
      {
        id: 'room',
        assetKey: 'ending-room',
        heading: '',
        body: '눈을 뜨니, 익숙한 방이었다.',
      },
      {
        id: 'book',
        assetKey: 'ending-book',
        heading: '',
        body: '펼쳐진 책의 마지막 페이지.',
      },
      {
        id: 'trace',
        assetKey: 'ending-trace',
        heading: '',
        body: '책 속의 일은 사라지지 않았다.',
      },
      {
        id: 'title',
        assetKey: 'ending-title',
        heading: '',
        body: 'The world remembers.',
      },
    ],
    rememberedEvents: [...worldMemory.events],
    rememberedObjects: (worldMemory.objectMemories ?? []).map((memory) => ({
      ...memory,
      values: {
        ...memory.values,
        position: memory.values.position ? { ...memory.values.position } : undefined,
      },
    })),
    totalResetCount: worldMemory.totalResetCount,
    chapterRestartCount: worldMemory.chapterRestartCount,
    resetCountsByLevel: { ...worldMemory.resetCountsByLevel },
  };
}

export function nextEndingPageIndex(current: number, pageCount: number): number {
  if (!Number.isInteger(current) || !Number.isInteger(pageCount) || pageCount <= 0) return 0;
  return Math.min(Math.max(0, current) + 1, pageCount - 1);
}
