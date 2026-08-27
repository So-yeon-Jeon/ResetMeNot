export type OpeningPage = Readonly<{
  id: 'reading' | 'asleep' | 'clock-tick' | 'strange-room';
  assetKey: string;
  body: string;
}>;

export function createOpeningSequence(): readonly OpeningPage[] {
  return [
    {
      id: 'reading',
      assetKey: 'opening-reading',
      body: '밤, 나는 오래된 동화책을 읽고 있었다.',
    },
    {
      id: 'asleep',
      assetKey: 'opening-asleep',
      body: '책에는 이상한 세계와 시간에 대한 이야기가 적혀 있었다.\n문장을 따라갈수록 눈꺼풀이 무거워졌다.',
    },
    {
      id: 'clock-tick',
      assetKey: 'opening-clock-tick',
      body: '째깍.',
    },
    {
      id: 'strange-room',
      assetKey: 'opening-strange-room',
      body: '눈을 뜨자, 그곳은 더 이상 내 방이 아니었다.\n방금 전까지 읽고 있던 동화책 속의 낯선 방.',
    },
  ];
}

export function nextOpeningPageIndex(current: number, pageCount: number): number | undefined {
  if (!Number.isInteger(current) || !Number.isInteger(pageCount) || pageCount <= 0)
    return undefined;
  const next = Math.max(0, current) + 1;
  return next < pageCount ? next : undefined;
}
