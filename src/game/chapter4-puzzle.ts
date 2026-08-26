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

export type Chapter4InspectionResult = Readonly<{
  state: Chapter4PuzzleState;
  discovered: boolean;
  feedback: string;
}>;

export type Chapter4SceneState = Readonly<{
  portraitChanged: boolean;
  bookChanged: boolean;
  pictureMissing: boolean;
  memoryMessageVisible: boolean;
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

export function chapter4SceneState(state: Chapter4PuzzleState): Chapter4SceneState {
  return {
    portraitChanged: state.resetStage >= 1,
    bookChanged: state.resetStage >= 2,
    pictureMissing: state.resetStage >= 3,
    memoryMessageVisible: state.resetStage >= 4,
  };
}

export function inspectChapter4Clue(
  state: Chapter4PuzzleState,
  clue: Chapter4Clue,
): Chapter4InspectionResult {
  const requiredStage: Readonly<Record<Chapter4Clue, number>> = {
    'portrait-9': 1,
    'book-2-left-to-right': 2,
    'missing-picture-4': 3,
  };
  if (state.resetStage < requiredStage[clue]) {
    return { state, discovered: false, feedback: '아직 특별한 점은 보이지 않는다.' };
  }

  const feedback: Readonly<Record<Chapter4Clue, string>> = {
    'portrait-9': '초상화가 벽시계를 가리킨다. 시각은 9시다.',
    'book-2-left-to-right': '두 번째 페이지에 숫자 2와 “왼쪽부터”라는 문장이 있다.',
    'missing-picture-4': '빈 자리에는 “세 번째 것은 돌아오지 않았다.”와 숫자 4가 남아 있다.',
  };
  if (state.clues.includes(clue)) {
    return { state, discovered: false, feedback: feedback[clue] };
  }
  return {
    state: { ...state, clues: [...state.clues, clue] },
    discovered: true,
    feedback: feedback[clue],
  };
}

export function resetChapter4Puzzle(state: Chapter4PuzzleState): Chapter4ResetResult {
  if (state.exitOpen) return { state, performed: false, blocked: 'completed' };
  if (state.resetStage === 3 && !state.codeConfirmed) {
    return { state, performed: false, blocked: 'code-required' };
  }

  const resetStage = Math.min(4, state.resetStage + 1) as Chapter4PuzzleState['resetStage'];
  const resolved = resetStage === 4 && state.codeConfirmed;

  return {
    state: {
      ...state,
      resetStage,
      clues: state.clues,
      codeInput: state.codeInput,
      codeConfirmed: state.codeConfirmed,
      clockStarted: resolved,
      exitOpen: resolved,
    },
    performed: true,
  };
}
