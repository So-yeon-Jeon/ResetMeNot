export const CHAPTER4_CODE = '924';

export type Chapter4Clue = 'portrait-9' | 'book-2-left-to-right' | 'missing-picture-4';

export type Chapter4PuzzleState = Readonly<{
  resetStage: 0 | 1 | 2 | 3 | 4;
  clues: readonly Chapter4Clue[];
  codeInput: string;
  codeConfirmed: boolean;
  clockStarted: boolean;
  exitOpen: boolean;
}>;

export type Chapter4ResetResult = Readonly<{
  state: Chapter4PuzzleState;
  performed: boolean;
  blocked?: 'code-required' | 'completed';
}>;

export function createChapter4PuzzleState(): Chapter4PuzzleState {
  return {
    resetStage: 0,
    clues: [],
    codeInput: '',
    codeConfirmed: false,
    clockStarted: false,
    exitOpen: false,
  };
}

export function inputChapter4Digit(state: Chapter4PuzzleState, digit: number): Chapter4PuzzleState {
  if (!Number.isInteger(digit) || digit < 0 || digit > 9 || state.resetStage < 3) return state;
  if (state.exitOpen) return state;

  const codeInput = `${state.codeInput}${digit}`.slice(-CHAPTER4_CODE.length);
  return {
    ...state,
    codeInput,
    codeConfirmed: codeInput === CHAPTER4_CODE,
  };
}

export function clearChapter4Code(state: Chapter4PuzzleState): Chapter4PuzzleState {
  if (state.codeInput.length === 0 || state.exitOpen) return state;
  return { ...state, codeInput: '', codeConfirmed: false };
}

export function resetChapter4Puzzle(state: Chapter4PuzzleState): Chapter4ResetResult {
  if (state.exitOpen) return { state, performed: false, blocked: 'completed' };
  if (state.resetStage === 3 && !state.codeConfirmed) {
    return { state, performed: false, blocked: 'code-required' };
  }

  const resetStage = Math.min(4, state.resetStage + 1) as Chapter4PuzzleState['resetStage'];
  const clues: readonly Chapter4Clue[] =
    resetStage === 1
      ? ['portrait-9']
      : resetStage === 2
        ? ['portrait-9', 'book-2-left-to-right']
        : resetStage >= 3
          ? ['portrait-9', 'book-2-left-to-right', 'missing-picture-4']
          : [];
  const resolved = resetStage === 4 && state.codeConfirmed;

  return {
    state: {
      ...state,
      resetStage,
      clues,
      codeInput: state.codeInput,
      codeConfirmed: state.codeConfirmed,
      clockStarted: resolved,
      exitOpen: resolved,
    },
    performed: true,
  };
}
