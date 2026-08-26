import type { Direction } from './grid';

export type GameAction =
  | Readonly<{ type: 'move'; direction: Direction }>
  | Readonly<{ type: 'interact' }>
  | Readonly<{ type: 'reset' }>
  | Readonly<{ type: 'input-code'; digit: number }>
  | Readonly<{ type: 'clear-code' }>;
