import type { Direction } from './grid';

export type GameAction =
  | Readonly<{ type: 'move'; direction: Direction }>
  | Readonly<{ type: 'interact' }>
  | Readonly<{ type: 'reset' }>;

export type TimedAction = Readonly<{
  action: GameAction;
  atMs: number;
}>;
