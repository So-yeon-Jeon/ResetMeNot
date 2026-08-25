import { describe, expect, it } from 'vitest';
import {
  clearChapter4Code,
  createChapter4PuzzleState,
  inputChapter4Digit,
  resetChapter4Puzzle,
} from './chapter4-puzzle';

describe('Chapter 4 puzzle', () => {
  it('reveals 9, 2, and 4 clues over the first three RESETs', () => {
    let state = createChapter4PuzzleState();

    state = resetChapter4Puzzle(state).state;
    expect(state.clues).toEqual(['portrait-9']);

    state = resetChapter4Puzzle(state).state;
    expect(state.clues).toEqual(['portrait-9', 'book-2-left-to-right']);

    state = resetChapter4Puzzle(state).state;
    expect(state.clues).toEqual(['portrait-9', 'book-2-left-to-right', 'missing-picture-4']);
  });

  it('does not accept code input before the third clue appears', () => {
    const state = inputChapter4Digit(createChapter4PuzzleState(), 9);
    expect(state.codeInput).toBe('');
  });

  it('keeps the correct 924 input but waits for the fourth RESET', () => {
    let state = createChapter4PuzzleState();
    state = resetChapter4Puzzle(state).state;
    state = resetChapter4Puzzle(state).state;
    state = resetChapter4Puzzle(state).state;
    state = inputChapter4Digit(state, 9);
    state = inputChapter4Digit(state, 2);
    state = inputChapter4Digit(state, 4);

    expect(state.codeInput).toBe('924');
    expect(state.codeConfirmed).toBe(true);
    expect(state.exitOpen).toBe(false);
  });

  it('does not consume the fourth RESET until 924 is confirmed', () => {
    let state = createChapter4PuzzleState();
    state = resetChapter4Puzzle(state).state;
    state = resetChapter4Puzzle(state).state;
    state = resetChapter4Puzzle(state).state;

    const blocked = resetChapter4Puzzle(state);
    expect(blocked.performed).toBe(false);
    expect(blocked.blocked).toBe('code-required');
    expect(blocked.state.resetStage).toBe(3);
  });

  it('starts the clock and opens the Exit on the fourth RESET after 924', () => {
    let state = createChapter4PuzzleState();
    state = resetChapter4Puzzle(state).state;
    state = resetChapter4Puzzle(state).state;
    state = resetChapter4Puzzle(state).state;
    state = inputChapter4Digit(state, 9);
    state = inputChapter4Digit(state, 2);
    state = inputChapter4Digit(state, 4);
    state = resetChapter4Puzzle(state).state;

    expect(state).toMatchObject({
      resetStage: 4,
      codeInput: '924',
      codeConfirmed: true,
      clockStarted: true,
      exitOpen: true,
    });
  });

  it('supports correcting a wrong code before confirmation', () => {
    let state = createChapter4PuzzleState();
    state = resetChapter4Puzzle(state).state;
    state = resetChapter4Puzzle(state).state;
    state = resetChapter4Puzzle(state).state;
    state = inputChapter4Digit(state, 9);
    state = inputChapter4Digit(state, 9);
    state = inputChapter4Digit(state, 9);
    state = clearChapter4Code(state);
    state = inputChapter4Digit(state, 9);
    state = inputChapter4Digit(state, 2);
    state = inputChapter4Digit(state, 4);

    expect(state.codeConfirmed).toBe(true);
  });
});
