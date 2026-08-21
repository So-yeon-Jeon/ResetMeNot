export const PLAYER_CHARACTER_ASSET = {
  path: new URL('./player-character-sheet.png', import.meta.url).href,
  frameWidth: 128,
  frameHeight: 160,
  columns: 4,
  rows: 4,
  animations: {
    idle: { start: 0, end: 3 },
    walk: { start: 4, end: 7 },
  },
} as const;

export const ECHO_CHARACTER_ASSET = {
  path: new URL('./echo-character-sheet.png', import.meta.url).href,
  frameWidth: 128,
  frameHeight: 160,
  columns: 4,
  rows: 2,
  animations: {
    idle: { start: 0, end: 3 },
    walk: { start: 4, end: 7 },
  },
} as const;
