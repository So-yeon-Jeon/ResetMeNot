import { describe, expect, it } from 'vitest';
import { loadTiledLevel } from './tiled-level-loader';

const property = (name: string, value: unknown) => ({ name, value });

function validMap(): Record<string, unknown> {
  const width = 4;
  const height = 4;
  return {
    width,
    height,
    tilewidth: 32,
    tileheight: 32,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    properties: [
      property('schemaVersion', 1),
      property('levelId', 'chapter-01-room-01'),
      property('chapterId', 'chapter-01'),
      property('resetLimit', 3),
      property('echoLimit', 2),
      property('resetPolicy', 'disable'),
    ],
    layers: [
      { name: 'floor', type: 'tilelayer', data: Array(width * height).fill(1) },
      {
        name: 'walls',
        type: 'tilelayer',
        data: [1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1],
      },
      {
        name: 'objects',
        type: 'objectgroup',
        objects: [
          {
            name: 'spawn',
            class: 'PlayerSpawn',
            x: 32,
            y: 32,
            width: 32,
            height: 32,
            properties: [property('facing', 'right')],
          },
          { name: 'switch-a', class: 'Switch', x: 64, y: 32, width: 32, height: 32 },
          {
            name: 'door-a',
            class: 'Door',
            x: 64,
            y: 64,
            width: 32,
            height: 32,
            properties: [property('switchIds', 'switch-a')],
          },
          { name: 'watch', class: 'PocketWatch', x: 32, y: 64, width: 32, height: 32 },
        ],
      },
    ],
  };
}

describe('loadTiledLevel', () => {
  it('Tiled JSON을 검증된 레벨 정의로 변환한다', () => {
    const level = loadTiledLevel(validMap());

    expect(level.id).toBe('chapter-01-room-01');
    expect(level.playerStart).toEqual({ x: 1, y: 1 });
    expect(level.playerFacing).toBe('right');
    expect(level.map.walls.has('0,0')).toBe(true);
    expect(level.objects).toHaveLength(3);
    expect(level.objects.find((object) => object.id === 'door-a')).toMatchObject({
      type: 'door',
      switchIds: ['switch-a'],
    });
  });

  it('존재하지 않는 오브젝트 참조를 거부한다', () => {
    const map = validMap();
    const layers = map.layers as Array<Record<string, unknown>>;
    const objectLayer = layers[2]!;
    const objects = objectLayer.objects as Array<Record<string, unknown>>;
    objects[2]!.properties = [property('switchIds', 'missing-switch')];

    expect(() => loadTiledLevel(map)).toThrow(/missing-switch/);
  });

  it('타일에 정렬되지 않은 오브젝트를 거부한다', () => {
    const map = validMap();
    const layers = map.layers as Array<Record<string, unknown>>;
    const objects = layers[2]!.objects as Array<Record<string, unknown>>;
    objects[0]!.x = 33;

    expect(() => loadTiledLevel(map)).toThrow(/32px/);
  });

  it('echoLimit이 resetLimit보다 크면 거부한다', () => {
    const map = validMap();
    const properties = map.properties as Array<Record<string, unknown>>;
    properties.find((item) => item.name === 'echoLimit')!.value = 4;

    expect(() => loadTiledLevel(map)).toThrow(/echoLimit/);
  });

  it('Final 시계 구간을 밀리초로 변환한다', () => {
    const map = validMap();
    const properties = map.properties as Array<Record<string, unknown>>;
    properties.push(property('finalClockStart', '11:59:50'));
    properties.push(property('finalClockTarget', '12:00:00'));

    expect(loadTiledLevel(map).finalClockDurationMs).toBe(10_000);
  });
});
