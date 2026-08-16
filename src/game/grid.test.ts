import { describe, expect, it } from 'vitest';
import { DEMO_LEVEL_LOAD_RESULT } from './demo-map';
import { createGridMap, tryMove } from './grid';

describe('grid movement', () => {
  const map = createGridMap(['#####', '#...#', '#.#.#', '#...#', '#####']);

  it.each([
    ['up', { x: 2, y: 1 }],
    ['down', { x: 2, y: 3 }],
    ['left', { x: 1, y: 2 }],
    ['right', { x: 3, y: 2 }],
  ] as const)('moves one tile %s', (direction, expected) => {
    expect(
      tryMove(
        { x: 2, y: 2 },
        direction,
        createGridMap(['.....', '.....', '.....', '.....', '.....']),
      ),
    ).toEqual(expected);
  });

  it('does not move through a wall', () => {
    const position = { x: 1, y: 2 };
    expect(tryMove(position, 'right', map)).toBe(position);
  });

  it('does not move outside the map', () => {
    const position = { x: 0, y: 0 };
    expect(tryMove(position, 'up', map)).toBe(position);
  });

  it('rejects rows with inconsistent widths', () => {
    expect(() => createGridMap(['###', '##'])).toThrow('모든 맵 행의 길이는 같아야 합니다.');
  });
});

describe('shared map specification', () => {
  if (!DEMO_LEVEL_LOAD_RESULT.ok) throw DEMO_LEVEL_LOAD_RESULT.error;
  const demoMap = DEMO_LEVEL_LOAD_RESULT.level.map;
  const demoMapRows = Array.from({ length: demoMap.height }, (_, y) =>
    Array.from({ length: demoMap.width }, (_, x) =>
      demoMap.walls.has(`${x},${y}`) ? '#' : '.',
    ).join(''),
  );

  it('uses a 12 by 10 map with a 10 by 8 interior', () => {
    expect(demoMap.width).toBe(12);
    expect(demoMap.height).toBe(10);
  });

  it('surrounds the playable area with wall tiles', () => {
    expect(demoMapRows[0]).toBe('############');
    expect(demoMapRows.at(-1)).toBe('############');
    expect(demoMapRows.slice(1, -1).every((row) => row.startsWith('#') && row.endsWith('#'))).toBe(
      true,
    );
  });
});
