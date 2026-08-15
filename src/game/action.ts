import type { Direction } from './grid';

export type GameAction =
  | Readonly<{ type: 'move'; direction: Direction }>
  | Readonly<{ type: 'interact' }>
  | Readonly<{ type: 'reset' }>;
