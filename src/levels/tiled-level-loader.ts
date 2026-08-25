import { positionKey, type Direction, type GridMap, type GridPosition } from '../game/grid';
import {
  createBox,
  createDoor,
  createExit,
  createKey,
  createLever,
  createPocketWatch,
  createProp,
  createPressureSwitch,
  createPuzzleObject,
  type AcceptedActor,
  type ObjectEffect,
  type PersistentField,
  type PuzzleStateDefinition,
  type WorldObjectState,
} from '../game/world-object';
import type { LevelDefinition } from './level-definition';
import type { ResetPolicy } from '../game/game-state';

type JsonObject = Record<string, unknown>;

export type LevelLoadResult =
  Readonly<{ ok: true; level: LevelDefinition }> | Readonly<{ ok: false; error: Error }>;

export function tryLoadTiledLevel(source: unknown): LevelLoadResult {
  try {
    return { ok: true, level: loadTiledLevel(source) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

export function loadTiledLevel(source: unknown): LevelDefinition {
  const map = object(source, 'Tiled map');
  const width = integer(map.width, 'map.width');
  const height = integer(map.height, 'map.height');
  if (map.orientation !== 'orthogonal') fail('map.orientation은 orthogonal이어야 합니다.');
  if (map.renderorder !== 'right-down') fail('map.renderorder는 right-down이어야 합니다.');
  if (map.tilewidth !== 32 || map.tileheight !== 32) fail('타일 크기는 32x32px이어야 합니다.');

  const properties = readProperties(map.properties, 'map.properties');
  assertAllowedProperties(
    properties,
    [
      'schemaVersion',
      'levelId',
      'chapterId',
      'resetLimit',
      'echoLimit',
      'resetPolicy',
      'echoUnlocked',
      'finalClockStart',
      'finalClockTarget',
      'finalDoorId',
    ],
    'map',
  );
  if (properties.schemaVersion !== 1) fail('schemaVersion은 1이어야 합니다.');
  const id = text(properties.levelId, 'levelId');
  const chapterId = text(properties.chapterId, 'chapterId');
  const resetLimit = nonNegativeInteger(properties.resetLimit, 'resetLimit');
  const echoLimit = nonNegativeInteger(properties.echoLimit, 'echoLimit');
  const resetPolicy = oneOf(
    properties.resetPolicy,
    ['disable', 'unlimited'],
    'resetPolicy',
  ) as ResetPolicy;
  const echoUnlocked = boolean(properties.echoUnlocked, true, 'echoUnlocked');
  if (resetPolicy === 'disable' && echoLimit > resetLimit) {
    fail('disable 정책에서는 echoLimit이 resetLimit보다 클 수 없습니다.');
  }

  const layers = array(map.layers, 'map.layers').map((layer, index) =>
    object(layer, `map.layers[${index}]`),
  );
  const floorLayer = requireLayer(layers, 'floor', 'tilelayer');
  const wallLayer = requireLayer(layers, 'walls', 'tilelayer');
  const movementBlockerLayer = optionalLayer(layers, 'movement-blockers', 'tilelayer');
  const objectLayer = requireLayer(layers, 'objects', 'objectgroup');
  readTileLayerData(floorLayer, 'floor', width, height);
  const wallData = readTileLayerData(wallLayer, 'walls', width, height);
  const structuralWalls = new Set<string>();
  wallData.forEach((gid, index) => {
    if (gid !== 0) {
      structuralWalls.add(positionKey({ x: index % width, y: Math.floor(index / width) }));
    }
  });
  const walls = new Set(structuralWalls);
  if (movementBlockerLayer) {
    const blockerData = readTileLayerData(movementBlockerLayer, 'movement-blockers', width, height);
    blockerData.forEach((gid, index) => {
      if (gid !== 0) walls.add(positionKey({ x: index % width, y: Math.floor(index / width) }));
    });
  }
  const gridMap: GridMap = { width, height, walls, structuralWalls };

  const tiledObjects = array(objectLayer.objects, 'objects.objects').map((value, index) =>
    object(value, `objects.objects[${index}]`),
  );
  const ids = new Set<string>();
  let playerStart: GridPosition | undefined;
  let playerFacing: Direction = 'down';
  const objects: WorldObjectState[] = [];

  tiledObjects.forEach((item, index) => {
    const label = `objects.objects[${index}]`;
    const name = text(item.name, `${label}.name`);
    if (ids.has(name)) fail(`오브젝트 ID가 중복되었습니다: ${name}`);
    ids.add(name);
    const type = text(item.class ?? item.type, `${label}.class`);
    const position = readPosition(item, label, width, height);
    if (structuralWalls.has(positionKey(position))) fail(`${name}이(가) 벽 위에 있습니다.`);
    const props = readProperties(item.properties, `${label}.properties`);

    if (type === 'PlayerSpawn') {
      assertAllowedProperties(props, ['facing'], name);
      if (playerStart) fail('PlayerSpawn은 정확히 하나만 있어야 합니다.');
      playerStart = position;
      playerFacing = oneOf(
        props.facing ?? 'down',
        ['up', 'down', 'left', 'right'],
        `${name}.facing`,
      );
      return;
    }
    objects.push(createLevelObject(type, name, position, props));
  });
  if (!playerStart) fail('PlayerSpawn이 필요합니다.');

  validateInitialOccupancy(objects, playerStart);
  validateReferences(objects);
  const finalClock = readFinalClock(properties);
  const finalDoorId = optionalText(properties.finalDoorId);
  if ((finalClock === undefined) !== (finalDoorId === undefined)) {
    fail('Final 시계와 finalDoorId는 함께 지정해야 합니다.');
  }
  if (finalDoorId !== undefined) {
    const finalDoor = objects.find((item) => item.id === finalDoorId);
    if (finalDoor?.type !== 'door') fail(`finalDoorId가 Door를 참조하지 않습니다: ${finalDoorId}`);
  }
  return {
    schemaVersion: 1,
    id,
    chapterId,
    map: gridMap,
    playerStart,
    playerFacing,
    resetLimit,
    resetPolicy,
    echoUnlocked,
    echoLimit,
    objects,
    finalClockStartSeconds: finalClock?.startSeconds,
    finalClockDurationMs: finalClock?.durationMs,
    finalDoorId,
  };
}

function validateInitialOccupancy(
  objects: readonly WorldObjectState[],
  playerStart: GridPosition,
): void {
  const solidByPosition = new Map<string, WorldObjectState>();
  const interactionByPosition = new Map<string, WorldObjectState>();

  for (const item of objects) {
    const collisionCells = initialCollisionCells(item);
    const validatesSolidOverlap = item.type !== 'pocket-watch' && item.type !== 'lever';
    for (const cell of validatesSolidOverlap ? collisionCells : []) {
      const occupiedPosition = {
        x: item.position.x + cell.x,
        y: item.position.y + cell.y,
      };
      const key = positionKey(occupiedPosition);
      if (samePosition(occupiedPosition, playerStart)) {
        fail(`PlayerSpawn과 ${item.id}이(가) 초기 위치 ${key}에서 겹칩니다.`);
      }
      const occupied = solidByPosition.get(key);
      if (occupied) {
        fail(`초기 위치 ${key}에 ${occupied.id}과(와) ${item.id}이(가) 함께 배치되었습니다.`);
      }
      solidByPosition.set(key, item);
    }

    if (!isInteractionTarget(item)) continue;
    const key = positionKey(item.position);
    const occupied = interactionByPosition.get(key);
    if (occupied) {
      fail(`상호작용 위치 ${key}에 ${occupied.id}과(와) ${item.id}이(가) 중복되었습니다.`);
    }
    interactionByPosition.set(key, item);
  }
}

function initialCollisionCells(object: WorldObjectState): readonly GridPosition[] {
  if (object.type === 'prop') return object.collisionCells;
  if (object.type === 'puzzle-object') {
    return object.states[object.state]?.collisionCells ?? [{ x: 0, y: 0 }];
  }
  if (object.type === 'pocket-watch') {
    return object.blocksMovement && object.interactable && !object.collected
      ? [{ x: 0, y: 0 }]
      : [];
  }
  if (object.type === 'key') {
    return object.collectible && !object.collected ? [{ x: 0, y: 0 }] : [];
  }
  if (object.type === 'door') return object.open ? [] : [{ x: 0, y: 0 }];
  if (object.type === 'box' || object.type === 'lever') return [{ x: 0, y: 0 }];
  return [];
}

function isInteractionTarget(object: WorldObjectState): boolean {
  return (
    (object.type === 'pocket-watch' && object.interactable) ||
    (object.type === 'key' && object.collectible) ||
    object.type === 'lever' ||
    (object.type === 'door' && !object.unlocked && object.keyId !== undefined) ||
    (object.type === 'exit' && object.mode === 'interact') ||
    (object.type === 'puzzle-object' && object.onInteract !== undefined)
  );
}

function samePosition(left: GridPosition, right: GridPosition): boolean {
  return positionKey(left) === positionKey(right);
}

function createLevelObject(
  type: string,
  id: string,
  position: GridPosition,
  props: JsonObject,
): WorldObjectState {
  const allowedProperties: Readonly<Record<string, readonly string[]>> = {
    PocketWatch: ['visible', 'interactable', 'blocksMovement'],
    Box: ['persistentFields'],
    Prop: ['assetKey', 'collisionCells'],
    Switch: ['acceptedActors'],
    Lever: ['mode', 'acceptedActors'],
    Key: [
      'persistentFields',
      'collectible',
      'visible',
      'blocksMovement',
      'requiresReset',
      'assetKey',
    ],
    Door: [
      'switchIds',
      'leverIds',
      'activationMode',
      'interactionCells',
      'keyId',
      'consumesKey',
      'clearOnOpen',
      'closedAssetKey',
      'openAssetKey',
    ],
    Exit: ['mode'],
    PuzzleObject: [
      'persistentFields',
      'initialState',
      'assetKey',
      'stateAssets',
      'stateCollision',
      'stateInteraction',
      'onInteractState',
      'onInteractEffects',
      'onInteractPlayerRetreat',
    ],
  };
  const allowed = allowedProperties[type];
  if (!allowed) return fail(`지원하지 않는 Object Class입니다: ${type}`);
  assertAllowedProperties(props, allowed, id);

  switch (type) {
    case 'PocketWatch':
      return createPocketWatch(id, position, {
        visible: boolean(props.visible, true, `${id}.visible`),
        interactable: boolean(props.interactable, true, `${id}.interactable`),
        blocksMovement: boolean(props.blocksMovement, true, `${id}.blocksMovement`),
      });
    case 'Box':
      return createBox(id, position, csv(props.persistentFields).includes('position'));
    case 'Prop':
      return createProp(
        id,
        position,
        text(props.assetKey, `${id}.assetKey`),
        parseCollisionCells(props.collisionCells, `${id}.collisionCells`),
      );
    case 'Switch':
      return createPressureSwitch(id, position, actors(props.acceptedActors));
    case 'Lever':
      return createLever(
        id,
        position,
        oneOf(props.mode ?? 'toggle', ['toggle', 'hold'] as const, `${id}.mode`),
        actors(props.acceptedActors),
      );
    case 'Key':
      return createKey(
        id,
        position,
        persistent(props.persistentFields).filter(
          (field): field is 'position' | 'collectible' | 'collected' =>
            field === 'position' || field === 'collectible' || field === 'collected',
        ),
        boolean(props.collectible, true, `${id}.collectible`),
        optionalText(props.assetKey),
        boolean(
          props.visible,
          boolean(props.collectible, true, `${id}.collectible`),
          `${id}.visible`,
        ),
        boolean(props.blocksMovement, true, `${id}.blocksMovement`),
        boolean(props.requiresReset, false, `${id}.requiresReset`),
      );
    case 'Door':
      return createDoorFromProperties(id, position, props);
    case 'Exit':
      return createExit(
        id,
        position,
        oneOf(props.mode ?? 'enter', ['enter', 'interact'] as const, `${id}.mode`),
      );
    case 'PuzzleObject':
      return createPuzzleObject(id, position, persistent(props.persistentFields), {
        state: optionalText(props.initialState) ?? 'default',
        assetKey: optionalText(props.assetKey),
        states: parsePuzzleStates(props, id),
        onInteract: parsePuzzleInteraction(props, id),
      });
    default:
      return fail(`지원하지 않는 Object Class입니다: ${type}`);
  }
}

function createDoorFromProperties(
  id: string,
  position: GridPosition,
  props: JsonObject,
): WorldObjectState {
  const switchIds = uniqueCsv(props.switchIds, `${id}.switchIds`);
  const leverIds = uniqueCsv(props.leverIds, `${id}.leverIds`);
  const interactionCells =
    props.interactionCells === undefined
      ? undefined
      : parseCollisionCells(props.interactionCells, `${id}.interactionCells`);
  const keyId = optionalText(props.keyId);
  const consumesKey = boolean(props.consumesKey, false, `${id}.consumesKey`);
  const clearOnOpen = boolean(props.clearOnOpen, false, `${id}.clearOnOpen`);
  const closedAssetKey = optionalText(props.closedAssetKey);
  const openAssetKey = optionalText(props.openAssetKey);
  if ((closedAssetKey === undefined) !== (openAssetKey === undefined)) {
    fail(`${id}의 closedAssetKey와 openAssetKey는 함께 지정해야 합니다.`);
  }
  if (consumesKey && !keyId) fail(`${id}.consumesKey는 keyId가 있을 때만 사용할 수 있습니다.`);
  if (keyId && (switchIds.length > 0 || leverIds.length > 0)) {
    fail(`${id}은(는) 열쇠 조건과 Switch/Lever 조건을 함께 사용할 수 없습니다.`);
  }
  return createDoor(id, position, switchIds, {
    leverIds,
    activationMode: oneOf(
      props.activationMode ?? 'all',
      ['all', 'any'] as const,
      `${id}.activationMode`,
    ),
    interactionCells,
    keyId,
    consumesKey,
    clearOnOpen,
    assetKeys:
      closedAssetKey && openAssetKey ? { closed: closedAssetKey, open: openAssetKey } : undefined,
  });
}

function parsePuzzleStates(
  props: JsonObject,
  id: string,
): Readonly<Record<string, PuzzleStateDefinition>> {
  const initialState = optionalText(props.initialState) ?? 'default';
  const assets = parseStateMap(props.stateAssets, `${id}.stateAssets`);
  const collisions = parseStateCollisionMap(props.stateCollision, `${id}.stateCollision`);
  const interactions = parseStateCollisionMap(props.stateInteraction, `${id}.stateInteraction`);
  const stateNames = new Set([
    initialState,
    ...Object.keys(assets),
    ...Object.keys(collisions),
    ...Object.keys(interactions),
  ]);
  return Object.fromEntries(
    [...stateNames].map((state) => [
      state,
      {
        assetKey:
          assets[state] ?? (state === initialState ? optionalText(props.assetKey) : undefined),
        collisionCells: collisions[state] ?? [{ x: 0, y: 0 }],
        interactionCells: interactions[state],
      },
    ]),
  );
}

function parsePuzzleInteraction(
  props: JsonObject,
  id: string,
):
  | Readonly<{
      nextState?: string;
      effects: readonly ObjectEffect[];
      playerRetreat?: Direction;
    }>
  | undefined {
  const nextState = optionalText(props.onInteractState);
  const effects = parseObjectEffects(props.onInteractEffects, `${id}.onInteractEffects`);
  const playerRetreat =
    props.onInteractPlayerRetreat === undefined
      ? undefined
      : oneOf(
          text(props.onInteractPlayerRetreat, `${id}.onInteractPlayerRetreat`),
          ['up', 'down', 'left', 'right'] as const,
          `${id}.onInteractPlayerRetreat`,
        );
  if (nextState === undefined && effects.length === 0 && playerRetreat === undefined) {
    return undefined;
  }
  return { nextState, effects, playerRetreat };
}

function parseStateMap(value: unknown, label: string): Readonly<Record<string, string>> {
  if (value === undefined || value === '') return {};
  const result: Record<string, string> = {};
  text(value, label)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const [state, assetKey] = entry.split('=').map((part) => part?.trim());
      if (!state || !assetKey) return fail(`${label}의 state=asset 형식이 올바르지 않습니다.`);
      if (Object.hasOwn(result, state)) return fail(`${label}에 중복 state가 있습니다: ${state}`);
      result[state] = assetKey;
    });
  return result;
}

function parseStateCollisionMap(
  value: unknown,
  label: string,
): Readonly<Record<string, readonly GridPosition[]>> {
  if (value === undefined || value === '') return {};
  const result: Record<string, readonly GridPosition[]> = {};
  text(value, label)
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const separator = entry.indexOf('=');
      if (separator <= 0) return fail(`${label}의 state=cell 형식이 올바르지 않습니다.`);
      const state = entry.slice(0, separator).trim();
      const cells = entry.slice(separator + 1).trim();
      if (Object.hasOwn(result, state)) return fail(`${label}에 중복 state가 있습니다: ${state}`);
      result[state] = parseCollisionCells(cells, `${label}.${state}`);
    });
  return result;
}

function parseCollisionCells(value: unknown, label: string): readonly GridPosition[] {
  if (value === undefined || value === '') return [];
  return text(value, label)
    .split('|')
    .map((cell) => {
      const [xText, yText] = cell.split(',').map((part) => part?.trim());
      const x = Number(xText);
      const y = Number(yText);
      if (!Number.isInteger(x) || !Number.isInteger(y)) {
        return fail(`${label}의 collision cell은 x,y 정수여야 합니다.`);
      }
      return { x, y };
    });
}

function parseObjectEffects(value: unknown, label: string): readonly ObjectEffect[] {
  if (value === undefined || value === '') return [];
  return text(value, label)
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [type, objectId, payload] = entry.split(':').map((part) => part?.trim());
      if (!type || !objectId || payload === undefined)
        return fail(`${label}의 effect 형식이 올바르지 않습니다.`);
      if (type === 'set-position') {
        return {
          type: 'set-position' as const,
          objectId,
          position: parseGridPosition(payload, `${label}.${objectId}`),
        };
      }
      if (type === 'set-state') return { type: 'set-state' as const, objectId, state: payload };
      if (type === 'set-collectible') {
        return {
          type: 'set-collectible' as const,
          objectId,
          collectible:
            oneOf(payload, ['true', 'false'] as const, `${label}.${objectId}`) === 'true',
        };
      }
      if (type === 'set-collected') {
        return {
          type: 'set-collected' as const,
          objectId,
          collected: oneOf(payload, ['true', 'false'] as const, `${label}.${objectId}`) === 'true',
        };
      }
      return fail(`${label}의 지원하지 않는 effect입니다: ${type}`);
    });
}

function parseGridPosition(value: string, label: string): GridPosition {
  const [xText, yText] = value.split(',').map((part) => part?.trim());
  const x = Number(xText);
  const y = Number(yText);
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0) {
    return fail(`${label}의 좌표가 올바르지 않습니다.`);
  }
  return { x, y };
}

function validateReferences(objects: readonly WorldObjectState[]): void {
  const byId = new Map(objects.map((item) => [item.id, item]));
  for (const item of objects) {
    if (item.type === 'door') {
      for (const id of item.switchIds)
        if (byId.get(id)?.type !== 'pressure-switch')
          fail(`${item.id}.switchIds가 존재하는 Switch를 가리켜야 합니다: ${id}`);
      for (const id of item.leverIds)
        if (byId.get(id)?.type !== 'lever')
          fail(`${item.id}.leverIds가 존재하는 Lever를 가리켜야 합니다: ${id}`);
      if (item.keyId && byId.get(item.keyId)?.type !== 'key')
        fail(`${item.id}.keyId가 존재하는 Key를 가리켜야 합니다: ${item.keyId}`);
    }
    if (item.type === 'puzzle-object') {
      for (const effect of item.onInteract?.effects ?? []) {
        const target = byId.get(effect.objectId);
        if (!target)
          fail(`${item.id}의 effect가 존재하지 않는 오브젝트를 가리킵니다: ${effect.objectId}`);
        if (effect.type === 'set-state' && target.type !== 'puzzle-object') {
          fail(`${item.id}의 set-state effect 대상은 PuzzleObject여야 합니다: ${effect.objectId}`);
        }
        if (effect.type === 'set-collectible' && target.type !== 'key') {
          fail(`${item.id}의 set-collectible effect 대상은 Key여야 합니다: ${effect.objectId}`);
        }
        if (
          effect.type === 'set-collected' &&
          target.type !== 'key' &&
          target.type !== 'pocket-watch'
        ) {
          fail(`${item.id}의 set-collected effect 대상이 올바르지 않습니다: ${effect.objectId}`);
        }
      }
    }
  }
}

function readPosition(
  item: JsonObject,
  label: string,
  width: number,
  height: number,
): GridPosition {
  const x = number(item.x, `${label}.x`);
  const y = number(item.y, `${label}.y`);
  const w = number(item.width, `${label}.width`);
  const h = number(item.height, `${label}.height`);
  if (x % 32 || y % 32 || w !== 32 || h !== 32) fail(`${label}은 32px 타일에 정렬되어야 합니다.`);
  const position = { x: x / 32, y: y / 32 };
  if (position.x < 0 || position.y < 0 || position.x >= width || position.y >= height)
    fail(`${label}이 맵 범위를 벗어났습니다.`);
  return position;
}

function readFinalClock(
  props: JsonObject,
): Readonly<{ startSeconds: number; durationMs: number }> | undefined {
  const start = optionalText(props.finalClockStart);
  const target = optionalText(props.finalClockTarget);
  if ((start === undefined) !== (target === undefined))
    fail('finalClockStart와 finalClockTarget은 함께 지정해야 합니다.');
  if (!start || !target) return undefined;
  const startSeconds = clockSeconds(start, 'finalClockStart');
  const targetSeconds = clockSeconds(target, 'finalClockTarget');
  const duration = (targetSeconds - startSeconds + 86400) % 86400;
  if (duration === 0) fail('Final 시계 시작과 목표 시각은 달라야 합니다.');
  return { startSeconds, durationMs: duration * 1000 };
}

function clockSeconds(value: string, label: string): number {
  const match = /^(\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) return fail(`${label}은 HH:MM:SS 형식이어야 합니다.`);
  const [, h, m, s] = match.map(Number);
  if (h! > 23 || m! > 59 || s! > 59) return fail(`${label}의 시각 범위가 올바르지 않습니다.`);
  return h! * 3600 + m! * 60 + s!;
}

function requireLayer(layers: JsonObject[], name: string, type: string): JsonObject {
  const found = layers.filter((layer) => layer.name === name && layer.type === type);
  if (found.length !== 1) return fail(`${name} ${type} 레이어가 정확히 하나 필요합니다.`);
  return found[0]!;
}

function optionalLayer(layers: JsonObject[], name: string, type: string): JsonObject | undefined {
  const found = layers.filter((layer) => layer.name === name && layer.type === type);
  if (found.length > 1) fail(`${name} ${type} 레이어는 하나만 존재해야 합니다.`);
  return found[0];
}
function readTileLayerData(
  layer: JsonObject,
  name: string,
  width: number,
  height: number,
): number[] {
  const data = array(layer.data, `${name}.data`);
  if (data.length !== width * height) fail(`${name}.data 크기가 맵 크기와 일치하지 않습니다.`);
  return data.map((gid) => {
    if (typeof gid !== 'number' || !Number.isInteger(gid) || gid < 0)
      return fail(`${name}.data의 GID가 올바르지 않습니다.`);
    return gid;
  });
}
function readProperties(value: unknown, label: string): JsonObject {
  if (value === undefined) return {};
  const result: JsonObject = {};
  array(value, label).forEach((entry, index) => {
    const prop = object(entry, `${label}[${index}]`);
    const name = text(prop.name, `${label}[${index}].name`);
    if (Object.hasOwn(result, name)) fail(`${label}에 중복 Property가 있습니다: ${name}`);
    result[name] = prop.value;
  });
  return result;
}
function assertAllowedProperties(
  properties: JsonObject,
  allowed: readonly string[],
  label: string,
): void {
  const unknown = Object.keys(properties).find((name) => !allowed.includes(name));
  if (unknown) fail(`${label}에서 지원하지 않는 Property입니다: ${unknown}`);
}
function actors(value: unknown): AcceptedActor[] {
  return csv(value ?? 'player,echo,box').map((actor) =>
    oneOf(actor, ['player', 'echo', 'box'], 'acceptedActors'),
  );
}
function persistent(value: unknown): PersistentField[] {
  return csv(value).map((field) =>
    oneOf(field, ['position', 'state', 'broken', 'collectible', 'collected'], 'persistentFields'),
  );
}
function csv(value: unknown): string[] {
  if (value === undefined || value === '') return [];
  return text(value, 'CSV property')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
function uniqueCsv(value: unknown, label: string): string[] {
  const values = csv(value);
  if (new Set(values).size !== values.length) fail(`${label}에 중복 ID가 있습니다.`);
  return values;
}
function oneOf<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  const parsed = text(value, label);
  if (!allowed.includes(parsed as T)) return fail(`${label} 값이 올바르지 않습니다: ${parsed}`);
  return parsed as T;
}
function optionalText(value: unknown): string | undefined {
  return value === undefined || value === '' ? undefined : text(value, 'property');
}
function boolean(value: unknown, fallback: boolean, label: string): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') return fail(`${label}은 boolean이어야 합니다.`);
  return value;
}
function object(value: unknown, label: string): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return fail(`${label}은 object여야 합니다.`);
  return value as JsonObject;
}
function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) return fail(`${label}은 array여야 합니다.`);
  return value;
}
function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '')
    return fail(`${label}은 비어 있지 않은 string이어야 합니다.`);
  return value;
}
function number(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    return fail(`${label}은 number여야 합니다.`);
  return value;
}
function integer(value: unknown, label: string): number {
  const parsed = number(value, label);
  if (!Number.isInteger(parsed) || parsed <= 0) return fail(`${label}은 양의 정수여야 합니다.`);
  return parsed;
}
function nonNegativeInteger(value: unknown, label: string): number {
  const parsed = number(value, label);
  if (!Number.isInteger(parsed) || parsed < 0) return fail(`${label}은 0 이상의 정수여야 합니다.`);
  return parsed;
}
function fail(message: string): never {
  throw new Error(`Tiled level validation failed: ${message}`);
}
