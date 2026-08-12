# 게임 시스템 아키텍처

## 상태 변경 흐름

```text
키보드 입력 → GameAction → applyAction → GameState → Phaser 렌더링
```

- `GameAction`: 플레이어 또는 Echo가 실행할 수 있는 행동 명령입니다.
- `GameState`: Phaser 객체와 무관한 순수 게임 상태입니다.
- `applyAction`: 행동을 상태에 적용하는 순수 함수입니다.
- Phaser Scene: 입력을 행동으로 변환하고 상태 결과를 화면에 표현합니다.

## Echo를 위한 행동 기록

각 행동은 게임 시작 이후 경과 시간과 함께 기록됩니다.

```ts
type TimedAction = {
  action: GameAction;
  atMs: number;
};
```

벽에 막힌 이동처럼 상태를 바꾸지 못한 입력도 기록합니다. Echo는 기록된 시간과 행동을 그대로 재생하며, 재생 시점의 상태에 따라 행동 결과만 다시 판정합니다.

## 현재 행동

- `move`: 구현 완료
- `interact`: 명령 타입과 기록 지원, 상호작용 규칙은 후속 구현
- `reset`: 명령 타입과 기록 지원, RESET 규칙은 후속 구현

게임 규칙은 `src/game`, Phaser 표현은 `src/scenes`에 둡니다. 게임 규칙 테스트는 브라우저나 Phaser 런타임 없이 실행 가능해야 합니다.
