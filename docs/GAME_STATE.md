# 게임 상태 모델

이 문서는 런타임 상태의 단일 기준입니다. Phaser 객체는 상태가 아니라 표현이며 RESET, Echo, 퍼즐 판정은 이 문서의 순수 데이터만 사용합니다.

## 상태 계층

```text
GameSession
├─ chapterId
├─ chapterAttempt
├─ resetCount
├─ phase
├─ initialState
├─ persistentMemory
├─ currentRun
│  ├─ elapsedMs
│  ├─ player
│  ├─ objects
│  └─ hasAction
└─ echoes[]
   ├─ id
   ├─ actor
   └─ heldInteraction
```

## 핵심 타입

```ts
type ActorState = {
  position: GridPosition;
  facing: Direction;
};

type ObjectState =
  | { id: string; type: 'box'; position: GridPosition }
  | { id: string; type: 'switch'; active: boolean }
  | { id: string; type: 'door'; open: boolean }
  | { id: string; type: 'key'; position: GridPosition; state: 'placed' | 'pickedUp' };

type EchoState = {
  id: string;
  actor: ActorState;
  heldInteraction?: { objectId: string };
};

type ChapterPhase = 'playing' | 'restarting' | 'let-time-go' | 'completed';
```

`Puzzle State`에는 현재 오브젝트, Echo, RESET 횟수와 열쇠 소유 상태가 포함됩니다. `World Memory`에는 전체 RESET 횟수와 주요 이벤트 ID를 별도로 저장하며 Chapter Restart로 지우지 않습니다.

실제 TypeScript 구현은 기능을 추가하면서 이 모델을 작은 단위로 확장합니다. 하나의 거대한 상태 객체를 한 번에 만들지 않습니다.

## 상태 출처

| 상태                    | 출처          | 런타임 변경 | RESET 처리                     |
| ----------------------- | ------------- | ----------- | ------------------------------ |
| 맵 크기·벽              | 레벨 데이터   | 불가        | 다시 로드                      |
| 플레이어 시작점         | 레벨 데이터   | 불가        | 해당 위치로 복원               |
| 현재 플레이어 위치·방향 | 런타임        | 가능        | 초기값으로 복원                |
| 오브젝트 초기 상태      | 레벨 데이터   | 불가        | 기본적으로 복원                |
| 기억하는 오브젝트 상태  | 런타임 메모리 | 가능        | 현재 값을 유지                 |
| 현재 Run 행동 여부      | 런타임        | 가능        | Echo 생성 판정 후 초기화       |
| Echo 목록               | 런타임        | 가능        | 기존 Echo 유지 후 새 Echo 추가 |
| 리셋 사용 횟수          | 런타임        | 가능        | 1 증가                         |
| 챕터 시도 횟수          | 런타임        | 가능        | 한도 소진 재시작 시 증가       |

## RESET 상태 전이

일반 챕터에서 R 입력을 받으면 다음 순서로 처리합니다.

1. 현재 Run에 성공한 이동 또는 유효한 상호작용이 있었는지 확인합니다. 없다면 RESET을 실행하지 않습니다.
2. 유효한 Run이면 Player의 위치·방향·유지 상호작용을 Echo로 저장합니다.
3. 디자이너가 `persistentFields`로 지정한 오브젝트 속성만 메모리에 저장합니다.
4. 플레이어와 비기억 오브젝트를 레벨 초기 상태로 복원합니다.
5. 기억 오브젝트에는 저장한 상태를 덮어씁니다.
6. 기존 Echo는 현재 위치와 방향을 그대로 유지합니다.
7. 현재 Run의 행동 여부와 경과 시간을 초기화합니다.
8. 리셋 사용 횟수를 1 증가시킵니다.

리셋 한도 소진 시 강제로 재시작하지 않습니다. RESET만 비활성화하고 현재 상태의 탐색과 상호작용은 유지합니다. 메뉴의 Chapter Restart를 선택하면 Echo와 기억 상태를 포함한 현재 챕터의 Puzzle State를 초기화합니다.

Final 챕터의 시계는 RESET할 때 시작 시각으로 돌아갑니다. 지정 시각까지 RESET하지 않으면 `phase = 'let-time-go'`로 전환하며 별도 Player 버튼은 없습니다.

## Chapter Restart

- Player와 일반 오브젝트를 챕터 초기 상태로 복원합니다.
- Echo, 현재 열쇠 소유, RESET 횟수와 Final 시계를 초기화합니다.
- 회중시계 획득 상태는 특수 핵심 아이템이므로 유지합니다.
- `World Memory`의 전체 RESET 횟수와 주요 이벤트는 유지합니다.

## 기억 상태

- 기억 여부는 런타임이 추론하지 않고 레벨 데이터의 `persistentFields`만 따릅니다.
- 유지 단위는 지정된 속성입니다. Chapter 1의 열쇠는 `position`만 기억하며 `collected`는 기본적으로 유지하지 않습니다.
- 문과 스위치의 파생 상태는 RESET 복원 이후 다시 계산합니다.
- 레벨 데이터 자체는 수정하지 않습니다. 기억 상태는 현재 챕터 세션에만 존재합니다.

## 충돌과 점유

- 현재 플레이어와 Echo는 서로를 점유 장애물로 보지 않으며 같은 타일에 있을 수 있습니다.
- 상자와 닫힌 문은 이동을 막습니다.
- 벽과 맵 경계는 모든 이동을 막습니다.
- 상자 밀기 목적지에 벽, 닫힌 문, 다른 상자가 있으면 실패합니다.
- 실패한 행동은 상태를 바꾸지 않지만 입력 기록에는 남습니다.

## 불변 조건

- 모든 오브젝트 ID는 챕터 안에서 유일합니다.
- 모든 좌표는 맵 경계 안의 정수입니다.
- 플레이어·Echo 시작점은 통과 가능한 타일입니다.
- 한 타일에는 상자가 최대 하나만 존재합니다.
- `resetCount`와 시간은 음수가 될 수 없습니다.
- Phaser GameObject를 `GameState`에 저장하지 않습니다.

## 레벨 데이터로 명시할 규칙

- 스위치를 Player, Echo, Box 중 무엇이 활성화할 수 있는지
- 스위치의 작동 방식과 여러 조건의 조합 방식
- 열쇠 사용 시 소모 여부와 출구 완료 방식
- RESET 허용 횟수와 Final 대기 시간

전역 판정은 [게임 규칙 결정서](./GAME_RULE_DECISIONS.md)를 따르고, 위 항목은 각 레벨이 명시합니다.

전체 규칙과 결정 기록은 [게임 규칙 결정서](./GAME_RULE_DECISIONS.md)에서 관리합니다.
