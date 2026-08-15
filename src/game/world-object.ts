import type { GridPosition } from './grid';

export type PocketWatchState = Readonly<{
  id: string;
  type: 'pocket-watch';
  position: GridPosition;
  collected: boolean;
}>;

export type PersistentField = 'position' | 'state' | 'broken' | 'collected';

export type PuzzleObjectState = Readonly<{
  id: string;
  type: 'puzzle-object';
  position: GridPosition;
  state: string;
  broken: boolean;
  collected: boolean;
  persistentFields: readonly PersistentField[];
}>;

export type PressureSwitchState = Readonly<{
  id: string;
  type: 'pressure-switch';
  position: GridPosition;
  active: boolean;
  acceptedActors: readonly ('player' | 'echo')[];
}>;

export type DoorState = Readonly<{
  id: string;
  type: 'door';
  position: GridPosition;
  open: boolean;
  switchIds: readonly string[];
}>;

export type WorldObjectState =
  PocketWatchState | PuzzleObjectState | PressureSwitchState | DoorState;

export function createPocketWatch(id: string, position: GridPosition): PocketWatchState {
  return {
    id,
    type: 'pocket-watch',
    position: { ...position },
    collected: false,
  };
}

export function createPuzzleObject(
  id: string,
  position: GridPosition,
  persistentFields: readonly PersistentField[] = [],
): PuzzleObjectState {
  return {
    id,
    type: 'puzzle-object',
    position: { ...position },
    state: 'default',
    broken: false,
    collected: false,
    persistentFields: [...persistentFields],
  };
}

export function createPressureSwitch(
  id: string,
  position: GridPosition,
  acceptedActors: readonly ('player' | 'echo')[] = ['player', 'echo'],
): PressureSwitchState {
  return {
    id,
    type: 'pressure-switch',
    position: { ...position },
    active: false,
    acceptedActors: [...acceptedActors],
  };
}

export function createDoor(
  id: string,
  position: GridPosition,
  switchIds: readonly string[],
): DoorState {
  return {
    id,
    type: 'door',
    position: { ...position },
    open: false,
    switchIds: [...switchIds],
  };
}

export function restoreWorldObjects(
  currentObjects: readonly WorldObjectState[],
  initialObjects: readonly WorldObjectState[],
): readonly WorldObjectState[] {
  return initialObjects.map((initial) => {
    const current = currentObjects.find((object) => object.id === initial.id);
    if (!current || current.type !== initial.type) return cloneWorldObject(initial);
    if (initial.type === 'pocket-watch' && current.type === 'pocket-watch') {
      return cloneWorldObject(current);
    }

    if (initial.type !== 'puzzle-object' || current.type !== 'puzzle-object') {
      return cloneWorldObject(initial);
    }

    const fields = new Set(initial.persistentFields);
    return {
      ...initial,
      position: fields.has('position') ? { ...current.position } : { ...initial.position },
      state: fields.has('state') ? current.state : initial.state,
      broken: fields.has('broken') ? current.broken : initial.broken,
      collected: fields.has('collected') ? current.collected : initial.collected,
      persistentFields: [...initial.persistentFields],
    };
  });
}

export function cloneWorldObject(object: WorldObjectState): WorldObjectState {
  if (object.type === 'pocket-watch') return { ...object, position: { ...object.position } };
  if (object.type === 'pressure-switch') {
    return {
      ...object,
      position: { ...object.position },
      acceptedActors: [...object.acceptedActors],
    };
  }
  if (object.type === 'door') {
    return { ...object, position: { ...object.position }, switchIds: [...object.switchIds] };
  }
  return {
    ...object,
    position: { ...object.position },
    persistentFields: [...object.persistentFields],
  };
}
