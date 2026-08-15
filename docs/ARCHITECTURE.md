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

현재 Run에는 Echo 생성 여부를 판단할 `hasAction`만 기록합니다. 빈 Run은 Echo를 생성하지 않습니다.

## 현재 행동

- `move`: 구현 완료
- `interact`: 명령 타입과 행동 여부 표시 지원, 상호작용 규칙은 후속 구현
- `reset`: 명령 타입 지원, Echo 스냅샷 생성은 후속 구현

## 디렉터리 책임

```text
src/
├─ game/       순수 상태, 행동, 규칙, 레벨 도메인 타입
├─ input/      키보드 등 입력 어댑터
├─ levels/     Tiled 로더, 검증, 변환
├─ echo/       Echo 스냅샷 생성과 고정 상호작용
├─ scenes/     Phaser Scene과 화면 조립
└─ ui/         HUD, 대화, 메뉴
```

폴더는 해당 기능을 구현할 때 생성합니다. 빈 구조를 미리 만들지 않습니다.

## 관련 계약

- 상태 수명과 RESET: [GAME_STATE.md](./GAME_STATE.md)
- 행동과 Echo 생성 조건: [ACTIONS.md](./ACTIONS.md)
- Tiled 데이터: [LEVEL_SCHEMA.md](./LEVEL_SCHEMA.md)
- 화면과 그리드: [GAME_SPEC.md](./GAME_SPEC.md)
