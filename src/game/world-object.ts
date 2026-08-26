import type { Direction, GridPosition } from './grid';

export type PersistentField = 'position' | 'state' | 'broken' | 'collectible' | 'collected';
export type AcceptedActor = 'player' | 'echo' | 'box';

export type ObjectEffect =
  | Readonly<{ type: 'set-state'; objectId: string; state: string }>
  | Readonly<{ type: 'set-position'; objectId: string; position: GridPosition }>
  | Readonly<{ type: 'set-collectible'; objectId: string; collectible: boolean }>
  | Readonly<{ type: 'set-collected'; objectId: string; collected: boolean }>;

export type PuzzleStateDefinition = Readonly<{
  assetKey?: string;
  collisionCells: readonly GridPosition[];
  interactionCells?: readonly GridPosition[];
}>;

export type PuzzleInteraction = Readonly<{
  nextState?: string;
  effects: readonly ObjectEffect[];
  playerRetreat?: Direction;
}>;

export type PocketWatchState = Readonly<{
  id: string;
  type: 'pocket-watch';
  position: GridPosition;
  collected: boolean;
  visible: boolean;
  interactable: boolean;
  blocksMovement: boolean;
}>;

export type PuzzleObjectState = Readonly<{
  id: string;
  type: 'puzzle-object';
  position: GridPosition;
  state: string;
  broken: boolean;
  collected: boolean;
  persistentFields: readonly PersistentField[];
  assetKey?: string;
  states: Readonly<Record<string, PuzzleStateDefinition>>;
  onInteract?: PuzzleInteraction;
}>;

export type PropState = Readonly<{
  id: string;
  type: 'prop';
  position: GridPosition;
  assetKey: string;
  collisionCells: readonly GridPosition[];
}>;

export type PressureSwitchState = Readonly<{
  id: string;
  type: 'pressure-switch';
  position: GridPosition;
  active: boolean;
  acceptedActors: readonly AcceptedActor[];
  requiresCommittedMemory: boolean;
}>;

export type BoxState = Readonly<{
  id: string;
  type: 'box';
  position: GridPosition;
  persistentFields: readonly 'position'[];
  memorySocketId?: string;
  memoryCommitted: boolean;
}>;

export type LeverState = Readonly<{
  id: string;
  type: 'lever';
  position: GridPosition;
  active: boolean;
  mode: 'toggle' | 'hold';
  acceptedActors: readonly AcceptedActor[];
}>;

export type KeyState = Readonly<{
  id: string;
  type: 'key';
  position: GridPosition;
  collected: boolean;
  collectible: boolean;
  visible: boolean;
  blocksMovement: boolean;
  requiresReset: boolean;
  availableAfterResetCount?: number;
  persistentFields: readonly ('position' | 'collectible' | 'collected')[];
  assetKey?: string;
}>;

export type DoorState = Readonly<{
  id: string;
  type: 'door';
  position: GridPosition;
  interactionCells: readonly GridPosition[];
  open: boolean;
  switchIds: readonly string[];
  leverIds: readonly string[];
  activationMode: 'all' | 'any';
  keyId?: string;
  consumesKey: boolean;
  unlocked: boolean;
  scriptedOpen: boolean;
  clearOnOpen: boolean;
  assetKeys?: Readonly<{ closed: string; open: string }>;
}>;

export type ExitState = Readonly<{
  id: string;
  type: 'exit';
  position: GridPosition;
  mode: 'enter' | 'interact';
}>;

export type WorldObjectState =
  | PocketWatchState
  | PuzzleObjectState
  | PropState
  | PressureSwitchState
  | BoxState
  | LeverState
  | KeyState
  | DoorState
  | ExitState;

export function createPocketWatch(
  id: string,
  position: GridPosition,
  options: Readonly<{
    visible?: boolean;
    interactable?: boolean;
    blocksMovement?: boolean;
  }> = {},
): PocketWatchState {
  return {
    id,
    type: 'pocket-watch',
    position: { ...position },
    collected: false,
    visible: options.visible ?? true,
    interactable: options.interactable ?? true,
    blocksMovement: options.blocksMovement ?? true,
  };
}

export function createPuzzleObject(
  id: string,
  position: GridPosition,
  persistentFields: readonly PersistentField[] = [],
  options: Readonly<{
    state?: string;
    assetKey?: string;
    states?: Readonly<Record<string, PuzzleStateDefinition>>;
    onInteract?: PuzzleInteraction;
  }> = {},
): PuzzleObjectState {
  const state = options.state ?? 'default';
  return {
    id,
    type: 'puzzle-object',
    position: { ...position },
    state,
    broken: false,
    collected: false,
    persistentFields: [...persistentFields],
    assetKey: options.assetKey,
    states: options.states ?? { [state]: { collisionCells: [{ x: 0, y: 0 }] } },
    onInteract: options.onInteract,
  };
}

export function createProp(
  id: string,
  position: GridPosition,
  assetKey: string,
  collisionCells: readonly GridPosition[] = [],
): PropState {
  return {
    id,
    type: 'prop',
    position: { ...position },
    assetKey,
    collisionCells: collisionCells.map((cell) => ({ ...cell })),
  };
}

export function createPressureSwitch(
  id: string,
  position: GridPosition,
  acceptedActors: readonly AcceptedActor[] = ['player', 'echo', 'box'],
  requiresCommittedMemory = false,
): PressureSwitchState {
  return {
    id,
    type: 'pressure-switch',
    position: { ...position },
    active: false,
    acceptedActors: [...acceptedActors],
    requiresCommittedMemory,
  };
}

export function createBox(
  id: string,
  position: GridPosition,
  rememberPosition = false,
  memorySocketId?: string,
): BoxState {
  return {
    id,
    type: 'box',
    position: { ...position },
    persistentFields: rememberPosition ? ['position'] : [],
    memorySocketId,
    memoryCommitted: false,
  };
}

export function createLever(
  id: string,
  position: GridPosition,
  mode: 'toggle' | 'hold' = 'toggle',
  acceptedActors: readonly AcceptedActor[] = ['player', 'echo'],
): LeverState {
  return {
    id,
    type: 'lever',
    position: { ...position },
    active: false,
    mode,
    acceptedActors: [...acceptedActors],
  };
}

export function createKey(
  id: string,
  position: GridPosition,
  persistentFields: readonly ('position' | 'collectible' | 'collected')[] = [],
  collectible = true,
  assetKey?: string,
  visible = collectible,
  blocksMovement = true,
  requiresReset = false,
): KeyState {
  return {
    id,
    type: 'key',
    position: { ...position },
    collected: false,
    collectible,
    visible,
    blocksMovement,
    requiresReset,
    availableAfterResetCount: requiresReset && collectible ? 1 : undefined,
    persistentFields: [...persistentFields],
    assetKey,
  };
}

export function createDoor(
  id: string,
  position: GridPosition,
  switchIds: readonly string[] = [],
  options: Readonly<{
    leverIds?: readonly string[];
    activationMode?: 'all' | 'any';
    interactionCells?: readonly GridPosition[];
    keyId?: string;
    consumesKey?: boolean;
    clearOnOpen?: boolean;
    assetKeys?: Readonly<{ closed: string; open: string }>;
  }> = {},
): DoorState {
  return {
    id,
    type: 'door',
    position: { ...position },
    interactionCells: [...(options.interactionCells ?? [{ x: 0, y: 0 }])],
    open: false,
    switchIds: [...switchIds],
    leverIds: [...(options.leverIds ?? [])],
    activationMode: options.activationMode ?? 'all',
    keyId: options.keyId,
    consumesKey: options.consumesKey ?? false,
    unlocked: options.keyId === undefined,
    scriptedOpen: false,
    clearOnOpen: options.clearOnOpen ?? false,
    assetKeys: options.assetKeys,
  };
}

export function createExit(
  id: string,
  position: GridPosition,
  mode: 'enter' | 'interact' = 'enter',
): ExitState {
  return { id, type: 'exit', position: { ...position }, mode };
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
    if (initial.type === 'box' && current.type === 'box') {
      const socket = initial.memorySocketId
        ? currentObjects.find((object) => object.id === initial.memorySocketId)
        : undefined;
      const positionIsRemembered =
        initial.persistentFields.includes('position') &&
        (!initial.memorySocketId ||
          (socket?.type === 'pressure-switch' &&
            socket.position.x === current.position.x &&
            socket.position.y === current.position.y));
      return {
        ...initial,
        position: positionIsRemembered ? { ...current.position } : { ...initial.position },
        memoryCommitted: positionIsRemembered && initial.memorySocketId !== undefined,
        persistentFields: [...initial.persistentFields],
      };
    }
    if (initial.type === 'key' && current.type === 'key') {
      return {
        ...initial,
        position: initial.persistentFields.includes('position')
          ? { ...current.position }
          : { ...initial.position },
        collectible: initial.persistentFields.includes('collectible')
          ? current.collectible
          : initial.collectible,
        collected: initial.persistentFields.includes('collected')
          ? current.collected
          : initial.collected,
        availableAfterResetCount: current.availableAfterResetCount,
        persistentFields: [...initial.persistentFields],
      };
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
  if (object.type === 'pressure-switch' || object.type === 'lever') {
    return {
      ...object,
      position: { ...object.position },
      acceptedActors: [...object.acceptedActors],
    };
  }
  if (object.type === 'pocket-watch') {
    return { ...object, position: { ...object.position } };
  }
  if (object.type === 'door') {
    return {
      ...object,
      position: { ...object.position },
      interactionCells: object.interactionCells.map((cell) => ({ ...cell })),
      switchIds: [...object.switchIds],
      leverIds: [...object.leverIds],
      assetKeys: object.assetKeys ? { ...object.assetKeys } : undefined,
    };
  }
  if (object.type === 'box') {
    return {
      ...object,
      position: { ...object.position },
      persistentFields: [...object.persistentFields],
    };
  }
  if (object.type === 'key') {
    return {
      ...object,
      position: { ...object.position },
      persistentFields: [...object.persistentFields],
    };
  }
  if (object.type === 'prop') {
    return {
      ...object,
      position: { ...object.position },
      collisionCells: object.collisionCells.map((cell) => ({ ...cell })),
    };
  }
  if (object.type === 'puzzle-object') {
    return {
      ...object,
      position: { ...object.position },
      persistentFields: [...object.persistentFields],
      states: Object.fromEntries(
        Object.entries(object.states).map(([state, definition]) => [
          state,
          {
            ...definition,
            collisionCells: definition.collisionCells.map((cell) => ({ ...cell })),
            interactionCells: definition.interactionCells?.map((cell) => ({ ...cell })),
          },
        ]),
      ),
      onInteract: object.onInteract
        ? {
            ...object.onInteract,
            effects: object.onInteract.effects.map((effect) =>
              effect.type === 'set-position'
                ? { ...effect, position: { ...effect.position } }
                : { ...effect },
            ),
          }
        : undefined,
    };
  }
  return { ...object, position: { ...object.position } };
}
