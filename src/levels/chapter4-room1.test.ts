import { describe, expect, it } from 'vitest';
import chapter4Room1Json from './chapter4-room1.json';
import { loadTiledLevel } from './tiled-level-loader';

const level = loadTiledLevel(chapter4Room1Json);

describe('Chapter 4 room 1', () => {
  it('uses a larger corridor-and-puzzle-room layout', () => {
    expect(level.map).toMatchObject({ width: 20, height: 14 });
    expect(level.playerStart).toEqual({ x: 2, y: 3 });
    expect(level.resetLimit).toBe(4);
  });

  it('places the three clue objects and code lock on walkable regions', () => {
    const floorTiles = level.map.floorTiles;
    expect(floorTiles).toBeDefined();
    expect(level.objects.map((object) => object.id)).toEqual([
      'chapter4-portrait-clue',
      'chapter4-book-clue',
      'chapter4-missing-picture-clue',
      'chapter4-code-lock',
    ]);
    for (const object of level.objects) {
      expect(floorTiles?.has(`${object.position.x},${object.position.y}`)).toBe(true);
    }
  });

  it('keeps the upper corridor connected to the lower puzzle room', () => {
    expect(level.map.floorTiles?.has('15,5')).toBe(true);
    expect(level.map.floorTiles?.has('15,6')).toBe(true);
    expect(level.map.floorTiles?.has('15,7')).toBe(true);
  });
});
