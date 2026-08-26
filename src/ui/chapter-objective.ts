import type { GameState } from '../game/game-state';

function doorOpen(state: GameState, id: string): boolean {
  return state.objects.some((object) => object.type === 'door' && object.id === id && object.open);
}

function leverActive(state: GameState, id: string): boolean {
  return state.objects.some(
    (object) => object.type === 'lever' && object.id === id && object.active,
  );
}

export function chapterObjective(chapterId: string, state: GameState): string {
  if (chapterId === 'chapter-02') {
    if (!doorOpen(state, 'chapter2-passage-door')) {
      return state.echoes.length === 0
        ? '목표 · 압력판 위에서 RESET해 이전의 움직임을 남겨라'
        : '목표 · Echo가 압력판에 닿을 때 열린 통로를 지나가라';
    }
    if (!leverActive(state, 'chapter2-final-lever')) {
      return '목표 · 열린 통로 너머의 레버를 작동하라';
    }
    return '목표 · 열린 출구로 이동하라';
  }

  if (chapterId === 'chapter-03') {
    const memoryBox = state.objects.find(
      (object) => object.type === 'box' && object.id === 'chapter3-memory-box',
    );
    if (memoryBox?.type === 'box' && !memoryBox.memoryCommitted) {
      const socketActive = state.objects.some(
        (object) =>
          object.type === 'pressure-switch' &&
          object.id === 'chapter3-memory-socket' &&
          object.active,
      );
      return socketActive
        ? '목표 · Memory Socket 위의 기억석을 RESET으로 고정하라'
        : '목표 · 기억석을 Memory Socket까지 밀어라';
    }
    if (!doorOpen(state, 'chapter3-central-gate')) {
      return state.echoes.length === 0
        ? '목표 · 체인 장치를 잡은 상태에서 RESET하라'
        : '목표 · Echo가 체인을 유지하는 동안 중앙 통로를 지나가라';
    }
    if (!leverActive(state, 'chapter3-final-lever')) {
      return '목표 · 최종 구역의 레버를 작동하라';
    }
    return '목표 · 열린 출구로 이동하라';
  }

  if (chapterId === 'chapter-04' && state.chapter4Puzzle) {
    const puzzle = state.chapter4Puzzle;
    if (puzzle.exitOpen) return '목표 · 시간이 움직인 출구로 나가라';
    if (puzzle.resetStage === 0) return '목표 · RESET 후 방에서 달라진 것을 찾아라';
    if (puzzle.resetStage === 1) return '목표 · 변한 초상화를 조사한 뒤 다시 RESET하라';
    if (puzzle.resetStage === 2) return '목표 · 달라진 책을 조사한 뒤 다시 RESET하라';
    if (puzzle.resetStage === 3 && !puzzle.codeConfirmed) {
      return '목표 · 사라진 그림을 조사하고 모은 숫자를 왼쪽부터 입력하라';
    }
    return '목표 · 기억된 암호를 품은 채 마지막 RESET을 실행하라';
  }

  if (chapterId === 'chapter-05') {
    if (state.finalResolved) return '목표 · 열린 문을 통해 시간을 놓아주어라';
    if (state.finalClockElapsedMs < 10_000) return '목표 · 이번에는 RESET하지 말고 기다려 보자';
    if (state.finalClockElapsedMs < 20_000) return '목표 · 흐르는 시간과 벽의 문장을 지켜보자';
    return '목표 · 시계가 자정에 닿을 때까지 시간을 놓아두자';
  }

  return '';
}
