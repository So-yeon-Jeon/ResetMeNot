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

export type WorldObjectState = PocketWatchState | PuzzleObjectState;

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
  return {
    ...object,
    position: { ...object.position },
    persistentFields: [...object.persistentFields],
  };
}
