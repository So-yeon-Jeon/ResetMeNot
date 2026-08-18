import type { RememberedObjectState, WorldMemory } from './game-state';

export type EndingPage = Readonly<{
  id: 'room' | 'book' | 'blank-page' | 'title';
  heading: string;
  body: string;
}>;

export type EndingSequence = Readonly<{
  pages: readonly EndingPage[];
  rememberedEvents: readonly string[];
  rememberedObjects: readonly RememberedObjectState[];
  totalResetCount: number;
  chapterRestartCount: number;
}>;

export function createEndingSequence(worldMemory: WorldMemory): EndingSequence {
  return {
    pages: [
      {
        id: 'room',
        heading: 'THE ROOM REMEMBERS.',
        body: 'The book is still open where you left it.',
      },
      {
        id: 'book',
        heading: 'THE LAST SENTENCE HAS CHANGED.',
        body: '“And the child did not turn the clock.”',
      },
      {
        id: 'blank-page',
        heading: 'THE FINAL PAGE',
        body: '“This time, it is your turn.”',
      },
      {
        id: 'title',
        heading: 'RESET ME NOT',
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
  };
}
