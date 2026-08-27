import { describe, expect, it } from 'vitest';
import { createGridMap, tryMove } from './grid';
import { GAME_LEVELS_LOAD_RESULT } from '../levels/level-catalog';

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

  it('does not move onto an in-bounds void cell when a floor mask is present', () => {
    const floorMaskedMap = {
      width: 3,
      height: 3,
      walls: new Set<string>(),
      floorCells: new Set(['1,1']),
    };

    expect(tryMove({ x: 1, y: 1 }, 'right', floorMaskedMap)).toEqual({ x: 1, y: 1 });
  });

  it('rejects rows with inconsistent widths', () => {
    expect(() => createGridMap(['###', '##'])).toThrow('모든 맵 행의 길이는 같아야 합니다.');
  });
});

describe('shared map specification', () => {
  if (!GAME_LEVELS_LOAD_RESULT.ok) throw GAME_LEVELS_LOAD_RESULT.error;
  const demoMap = GAME_LEVELS_LOAD_RESULT.levels[0]!.map;
  const demoMapRows = Array.from({ length: demoMap.height }, (_, y) =>
    Array.from({ length: demoMap.width }, (_, x) =>
      demoMap.walls.has(`${x},${y}`) ? '#' : '.',
    ).join(''),
  );

  it('uses a 12 by 10 map with a 10 by 8 interior', () => {
    expect(demoMap.width).toBe(12);
    expect(demoMap.height).toBe(10);
  });

  it('keeps the outer walls while exposing Chapter 1 hidden exit row movement', () => {
    expect(demoMapRows[0]).toBe('############');
    expect(demoMapRows.at(-1)).toBe('#..........#');
    expect(demoMapRows.slice(1, -1).every((row) => row.startsWith('#') && row.endsWith('#'))).toBe(
      true,
    );
  });
});
