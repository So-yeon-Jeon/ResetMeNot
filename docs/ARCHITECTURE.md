# 게임 시스템 아키텍처

## 설계 원칙

- 게임 규칙은 Phaser와 독립된 순수 TypeScript로 구현합니다.
- 레벨 원본, 런타임 상태, 화면 표현을 분리합니다.
- 모든 상태 변경은 `GameAction`을 통해 실행합니다.
- RESET과 Echo는 Scene 재시작이 아니라 상태 전이로 구현합니다.
- 결정적인 규칙은 브라우저 없이 단위 테스트할 수 있어야 합니다.

## 상태 변경 흐름

```text
Tiled JSON → Level Loader → LevelDefinition ─┐
                                              ├→ Game Rules → GameState → Phaser Renderer
Keyboard → Input Adapter → GameAction ───────┘
RESET → Echo Snapshot Factory ───────────────┘
```

- `GameAction`: 현재 Player가 실행하는 행동 명령입니다.
- `GameState`: Phaser 객체와 무관한 순수 게임 상태입니다.
- `applyAction`: 행동을 상태에 적용하는 순수 함수입니다.
- Phaser Scene: 입력을 행동으로 변환하고 상태 결과를 화면에 표현합니다.

의존 방향은 바깥쪽 어댑터에서 안쪽 게임 규칙으로만 향합니다. `src/game`은 `phaser`를 import하지 않습니다.

## 계층 책임

| 계층            | 책임                            | 금지                       |
| --------------- | ------------------------------- | -------------------------- |
| Level Loader    | Tiled JSON 검증·변환            | 게임 진행 상태 변경        |
| Input Adapter   | 키보드를 GameAction으로 변환    | 직접 좌표 변경             |
| Game Rules      | 충돌, 상호작용, RESET 상태 전이 | Phaser 객체 접근           |
| Echo Snapshot   | RESET 순간 Player 상태 보존     | 이동 경로 기록·재생        |
| Phaser Renderer | 상태를 화면·사운드로 표현       | 게임 규칙의 단일 기준이 됨 |

## RESET과 Echo 흐름

```text
R 입력
  → 현재 Run의 행동 여부 확인
  → 기억 상태 추출
  → 행동이 있었다면 현재 Player 상태로 Echo 생성
  → 초기 상태 복원
  → 기억 상태 병합
  → 새 Run 시작
```

기존 Echo는 다음 RESET에서도 생성된 위치와 방향을 유지합니다. Echo는 이동 경로나 행동 타임라인을 재생하지 않습니다.

## Echo 스냅샷

Echo에는 RESET 순간의 고정 상태만 저장합니다.

```ts
type EchoState = {
  position: GridPosition;
  facing: Direction;
  heldInteraction?: { objectId: string };
};
```

현재 Run에는 Echo 생성 여부를 판단할 `hasAction`만 기록합니다. 성공한 이동 또는 유효한 상호작용만 이 값을 활성화합니다. 빈 Run에서는 RESET을 실행하거나 횟수를 소비하지 않습니다.

## 구현된 행동

- `move`: 구현 완료
- `interact`: 회중시계, 열쇠, 레버, 문, 조사형 출구 상호작용 구현 완료
- `reset`: 유효 Run 판정, 고정형 Echo 생성, 기억 상태 복원 구현 완료

레벨 완료와 Final의 `let-time-go` 연출 중에는 게임 행동을 받지 않습니다. Final 연출이 끝나면
조작을 돌려주며, Exit 도달로 `completed`가 된 뒤에만 게임 세션이 다음 레벨의 새 `GameState`를 생성합니다.

마지막 레벨 완료 후에는 `WorldMemory`를 `EndingSequence`의 입력으로 전달합니다. 엔딩의 고정 페이지
순서와 기억된 이벤트 데이터는 `src/game/ending.ts`에서 관리하고, Phaser Scene은 페이지 전환과
페이드만 담당합니다. 추후 삽화와 최종 카피를 교체해도 게임 규칙에는 영향을 주지 않습니다.
각 레벨을 완료할 때 `persistentFields`가 지정된 오브젝트의 최종 결과를 구조화된
`objectMemories`로 저장하며, 엔딩 렌더러는 이 데이터를 삽화 변형에 사용할 수 있습니다.
RESET 실행 시 전체 횟수와 현재 `levelId`별 횟수를 함께 누적합니다. Chapter 4의 이상 현상과
엔딩 분기는 Phaser 입력 기록이 아니라 이 `WorldMemory.resetCountsByLevel`을 참조합니다.

Final의 핵심 경로는 `src/game/final-flow.test.ts`에서 경계 전체를 검증합니다. 개별 단위 테스트가
통과하더라도 RESET, 시계, 문, Exit, 세션 완료와 엔딩 메모리 사이의 연결이 끊기면 이 테스트가 실패합니다.

## 디렉터리 책임

```text
src/
├─ game/       순수 상태, 행동, 퍼즐 규칙, 게임 세션
├─ levels/     Tiled JSON, 로더, 검증, LevelDefinition
└─ scenes/     키보드 입력, Phaser 렌더링, 레벨 화면 전환
```

폴더는 해당 기능을 구현할 때 생성합니다. 빈 구조를 미리 만들지 않습니다.

## 관련 계약

- 상태 수명과 RESET: [GAME_STATE.md](./GAME_STATE.md)
- 행동과 Echo 생성 조건: [ACTIONS.md](./ACTIONS.md)
- Tiled 데이터: [LEVEL_SCHEMA.md](./LEVEL_SCHEMA.md)
- 화면과 그리드: [GAME_SPEC.md](./GAME_SPEC.md)
