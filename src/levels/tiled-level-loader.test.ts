import { describe, expect, it } from 'vitest';
import { loadTiledLevel, tryLoadTiledLevel } from './tiled-level-loader';

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
      activationMode: 'all',
    });
  });

  it('챕터마다 서로 다른 맵 크기를 허용한다', () => {
    const map = validMap();
    const width = 16;
    const height = 12;
    map.width = width;
    map.height = height;
    const layers = map.layers as Array<Record<string, unknown>>;
    layers[0]!.data = Array(width * height).fill(1);
    layers[1]!.data = Array.from({ length: width * height }, (_, index) => {
      const x = index % width;
      const y = Math.floor(index / width);
      return x === 0 || x === width - 1 || y === 0 || y === height - 1 ? 1 : 0;
    });

    const level = loadTiledLevel(map);

    expect(level.map.width).toBe(16);
    expect(level.map.height).toBe(12);
    expect(level.map.walls.has('15,11')).toBe(true);
    expect(level.map.structuralWalls?.has('15,11')).toBe(true);
    expect(level.map.walls.has('8,6')).toBe(false);
  });

  it('시각적 벽과 별개인 이동 차단 레이어를 맵 충돌에 포함한다', () => {
    const map = validMap();
    const layers = map.layers as Array<Record<string, unknown>>;
    layers.splice(2, 0, {
      name: 'movement-blockers',
      type: 'tilelayer',
      data: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    });

    const level = loadTiledLevel(map);

    expect(level.map.walls.has('2,1')).toBe(true);
    expect(level.objects.find((object) => object.id === 'switch-a')).toBeDefined();
  });

  it('floor가 없는 셀을 void로 보존하고 내부 partition을 별도 벽으로 읽는다', () => {
    const map = validMap();
    const layers = map.layers as Array<Record<string, unknown>>;
    layers[0]!.data = [0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0];
    layers.splice(2, 0, {
      name: 'partitions',
      type: 'tilelayer',
      data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
    });
    const objects = layers[3]!.objects as Array<Record<string, unknown>>;
    layers[3]!.objects = objects.filter((item) => item.name !== 'watch');

    const level = loadTiledLevel(map);

    expect(level.map.floorCells).toEqual(new Set(['1,1', '2,1', '1,2', '2,2']));
    expect(level.map.partitionWalls).toEqual(new Set(['1,2']));
    expect(level.map.walls.has('1,2')).toBe(true);
    expect(level.map.structuralWalls?.has('1,2')).toBe(false);
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

  it('unlimited 정책에서는 RESET 한도와 별도로 Echo 수를 제한한다', () => {
    const map = validMap();
    const properties = map.properties as Array<Record<string, unknown>>;
    properties.find((item) => item.name === 'resetLimit')!.value = 0;
    properties.find((item) => item.name === 'echoLimit')!.value = 3;
    properties.find((item) => item.name === 'resetPolicy')!.value = 'unlimited';

    expect(loadTiledLevel(map)).toMatchObject({
      resetLimit: 0,
      resetPolicy: 'unlimited',
      echoLimit: 3,
    });
  });

  it('지원하지 않는 RESET 정책을 거부한다', () => {
    const map = validMap();
    const properties = map.properties as Array<Record<string, unknown>>;
    properties.find((item) => item.name === 'resetPolicy')!.value = 'restart';

    expect(() => loadTiledLevel(map)).toThrow(/resetPolicy/);
  });

  it('Final 시계 구간을 밀리초로 변환한다', () => {
    const map = validMap();
    const properties = map.properties as Array<Record<string, unknown>>;
    properties.push(property('finalClockStart', '11:59:30'));
    properties.push(property('finalClockTarget', '12:00:00'));
    properties.push(property('finalDoorId', 'door-a'));

    expect(loadTiledLevel(map)).toMatchObject({
      finalClockStartSeconds: 43_170,
      finalClockDurationMs: 30_000,
      finalDoorId: 'door-a',
    });
  });

  it('Final 문 ID가 Door를 참조하지 않으면 거부한다', () => {
    const map = validMap();
    const properties = map.properties as Array<Record<string, unknown>>;
    properties.push(property('finalClockStart', '11:59:30'));
    properties.push(property('finalClockTarget', '12:00:00'));
    properties.push(property('finalDoorId', 'switch-a'));

    expect(() => loadTiledLevel(map)).toThrow(/finalDoorId/);
  });

  it('상자와 문이 같은 초기 위치에 있으면 거부한다', () => {
    const map = validMap();
    const layers = map.layers as Array<Record<string, unknown>>;
    const objects = layers[2]!.objects as Array<Record<string, unknown>>;
    objects.push({
      name: 'box-a',
      class: 'Box',
      x: 64,
      y: 64,
      width: 32,
      height: 32,
    });

    expect(() => loadTiledLevel(map)).toThrow(/초기 위치 2,2/);
  });

  it('한 칸에 상호작용 대상이 둘 이상 있으면 거부한다', () => {
    const map = validMap();
    const layers = map.layers as Array<Record<string, unknown>>;
    const objects = layers[2]!.objects as Array<Record<string, unknown>>;
    objects.push({
      name: 'lever-a',
      class: 'Lever',
      x: 32,
      y: 64,
      width: 32,
      height: 32,
    });

    expect(() => loadTiledLevel(map)).toThrow(/상호작용 위치 1,2/);
  });

  it('압력 스위치 위의 상자는 허용한다', () => {
    const map = validMap();
    const layers = map.layers as Array<Record<string, unknown>>;
    const objects = layers[2]!.objects as Array<Record<string, unknown>>;
    objects.push({
      name: 'box-on-switch',
      class: 'Box',
      x: 64,
      y: 32,
      width: 32,
      height: 32,
    });

    expect(loadTiledLevel(map).objects).toHaveLength(4);
  });

  it('오타가 난 Custom Property를 거부한다', () => {
    const map = validMap();
    const layers = map.layers as Array<Record<string, unknown>>;
    const objects = layers[2]!.objects as Array<Record<string, unknown>>;
    objects[2]!.properties = [property('switchId', 'switch-a')];

    expect(() => loadTiledLevel(map)).toThrow(/지원하지 않는 Property.*switchId/);
  });

  it('같은 이름의 Custom Property가 중복되면 거부한다', () => {
    const map = validMap();
    const properties = map.properties as Array<Record<string, unknown>>;
    properties.push(property('resetLimit', 5));

    expect(() => loadTiledLevel(map)).toThrow(/중복 Property.*resetLimit/);
  });

  it('안전 로더는 예외 대신 화면에 표시할 오류를 반환한다', () => {
    const result = tryLoadTiledLevel({});

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/Tiled level validation failed/);
  });

  it('PlayerSpawn과 상자가 같은 칸에 있으면 거부한다', () => {
    const map = validMap();
    const layers = map.layers as Array<Record<string, unknown>>;
    const objects = layers[2]!.objects as Array<Record<string, unknown>>;
    objects.push({
      name: 'spawn-blocking-box',
      class: 'Box',
      x: 32,
      y: 32,
      width: 32,
      height: 32,
    });

    expect(() => loadTiledLevel(map)).toThrow(/PlayerSpawn.*spawn-blocking-box/);
  });

  it('PlayerSpawn이 압력 스위치나 통로형 출구 위에 있는 것은 허용한다', () => {
    const map = validMap();
    const layers = map.layers as Array<Record<string, unknown>>;
    const objects = layers[2]!.objects as Array<Record<string, unknown>>;
    objects.push({
      name: 'spawn-switch',
      class: 'Switch',
      x: 32,
      y: 32,
      width: 32,
      height: 32,
    });
    objects.push({
      name: 'spawn-exit',
      class: 'Exit',
      x: 32,
      y: 32,
      width: 32,
      height: 32,
      properties: [property('mode', 'enter')],
    });

    expect(loadTiledLevel(map).objects).toHaveLength(5);
  });

  it('Tile Layer 데이터 크기가 맵과 다르면 거부한다', () => {
    const map = validMap();
    const layers = map.layers as Array<Record<string, unknown>>;
    layers[0]!.data = [1];

    expect(() => loadTiledLevel(map)).toThrow(/floor\.data 크기/);
  });

  it('Door의 장치 참조 ID가 중복되면 거부한다', () => {
    const map = validMap();
    const layers = map.layers as Array<Record<string, unknown>>;
    const objects = layers[2]!.objects as Array<Record<string, unknown>>;
    objects[2]!.properties = [property('switchIds', 'switch-a,switch-a')];

    expect(() => loadTiledLevel(map)).toThrow(/switchIds.*중복 ID/);
  });

  it('keyId 없이 consumesKey를 설정한 Door를 거부한다', () => {
    const map = validMap();
    const layers = map.layers as Array<Record<string, unknown>>;
    const objects = layers[2]!.objects as Array<Record<string, unknown>>;
    objects[2]!.properties = [property('consumesKey', true)];

    expect(() => loadTiledLevel(map)).toThrow(/consumesKey.*keyId/);
  });

  it('열쇠와 장치 조건을 동시에 사용하는 Door를 거부한다', () => {
    const map = validMap();
    const layers = map.layers as Array<Record<string, unknown>>;
    const objects = layers[2]!.objects as Array<Record<string, unknown>>;
    objects.push({
      name: 'key-a',
      class: 'Key',
      x: 32,
      y: 64,
      width: 32,
      height: 32,
    });
    objects[2]!.properties = [property('switchIds', 'switch-a'), property('keyId', 'key-a')];

    expect(() => loadTiledLevel(map)).toThrow(/열쇠 조건.*Switch\/Lever/);
  });
});
