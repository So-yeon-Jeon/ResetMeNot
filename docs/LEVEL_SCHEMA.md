# 레벨 데이터 기술 규격

이 문서는 A가 관리하는 Tiled JSON 계약의 초안입니다. B가 실제 Tiled 샘플 맵으로 편집 편의성을 검토한 뒤 `schemaVersion: 1`을 확정합니다.

## 파이프라인

```text
Tiled 편집 → JSON export → 런타임 검증 → 도메인 레벨 변환 → Phaser 렌더링
```

게임 규칙은 Tiled 원본 구조를 직접 참조하지 않습니다. 로더가 Tiled JSON을 검증한 뒤 `LevelDefinition`으로 변환합니다.

## 맵 규격

| 항목           | 값                         |
| -------------- | -------------------------- |
| Orientation    | Orthogonal                 |
| Render order   | Right Down                 |
| Tile size      | 32×32 px                   |
| 전체 크기      | 챕터별 가변                |
| 내부 이동 영역 | 전체 크기에서 외곽 벽 제외 |
| Export         | JSON                       |

## 필수 레이어

레이어 이름은 계약이므로 정확히 사용합니다.

| 레이어    | Tiled 타입   | 용도                   |
| --------- | ------------ | ---------------------- |
| `floor`   | Tile Layer   | 바닥 표현              |
| `walls`   | Tile Layer   | 벽 표현과 기본 충돌    |
| `objects` | Object Layer | Player와 퍼즐 오브젝트 |

가구처럼 벽 칸에 배치되지만 Player만 진입하지 못하게 할 영역은 선택 Tile Layer인
`movement-blockers`에 표시합니다. 이 레이어는 화면에 렌더링하지 않고 이동 판정에만 사용합니다.

장식 전용 Tile Layer는 `decor-*` 이름으로 추가할 수 있으며 게임 규칙에서 무시합니다.

`floor`, `walls`, `movement-blockers`의 데이터 길이는 각각 `width × height`와 정확히
일치해야 합니다. 런타임은 레벨별 `width`, `height`로 중앙 배치와 충돌 범위를 계산하므로
Chapter 1의 `12×10` 크기를 다른 챕터에 그대로 적용할 필요는 없습니다.

## Map Custom Properties

| 이름               | 타입   | 필수   | 예시                 | 설명                       |
| ------------------ | ------ | ------ | -------------------- | -------------------------- |
| `schemaVersion`    | int    | 예     | `1`                  | 데이터 계약 버전           |
| `levelId`          | string | 예     | `chapter-01-room-01` | 전역 고유 ID               |
| `chapterId`        | string | 예     | `chapter-01`         | 챕터 ID                    |
| `resetLimit`       | int    | 예     | `3`                  | 허용 RESET 횟수            |
| `echoLimit`        | int    | 예     | `3`                  | 동시에 유지할 Echo 최대 수 |
| `resetPolicy`      | string | 예     | `disable`            | `disable` 또는 `unlimited` |
| `echoUnlocked`     | bool   | 아니오 | `false`              | RESET과 Echo 해금 분리     |
| `finalClockStart`  | string | 조건부 | `11:59:30`           | Final 시계 시작 시각       |
| `finalClockTarget` | string | 조건부 | `12:00:00`           | 종과 해결 연출의 목표 시각 |
| `finalDoorId`      | string | 조건부 | `final-door`         | 종이 울릴 때 열릴 Door ID  |

Final의 마지막 방에는 `resetPolicy: unlimited`, `finalClockStart: 11:59:30`,
`finalClockTarget: 12:00:00`, `finalDoorId`를 사용합니다. `resetLimit`은 스키마 호환을 위해 `0`으로 두되
`unlimited` 정책에서는 적용하지 않습니다. RESET 횟수는 계속 기록하고 Echo 생성만
`echoLimit`으로 제한합니다.

## Object Layer 계약

Tiled Object의 위치는 픽셀 좌표이지만 로더에서 32로 나눠 그리드 좌표로 변환합니다. 모든 오브젝트는 타일 좌측 상단에 정렬되어야 합니다.

### 공통 필드

| 필드               | 필수   | 규칙                                                                     |
| ------------------ | ------ | ------------------------------------------------------------------------ |
| Name               | 예     | 챕터 안에서 유일한 ID, kebab-case                                        |
| Type/Class         | 예     | 아래 허용 타입 중 하나                                                   |
| X/Y                | 예     | 32px 배수                                                                |
| Width/Height       | 예     | 기본 32×32                                                               |
| `persistentFields` | 아니오 | `position`, `state`, `broken`, `collectible`, `collected` 중 기억할 속성 |

### 허용 타입

#### PlayerSpawn

- 챕터당 정확히 하나
- `persistentFields` 사용 불가

#### Box

- 위치 상태를 가짐
- `persistentFields`에 `position`이 있으면 RESET 후 위치 유지

#### Prop

가구와 장식처럼 게임 규칙 상태는 없지만 렌더링 또는 이동 충돌이 필요한 오브젝트입니다.

| Property         | 타입   | 필수   | 설명                        |
| ---------------- | ------ | ------ | --------------------------- |
| `assetKey`       | string | 예     | 렌더링할 manifest 키        |
| `collisionCells` | string | 아니오 | anchor 기준 상대 좌표, `0,0 | 1,0` 형식 |

#### Lever

| Property         | 타입   | 필수 | 설명                     |
| ---------------- | ------ | ---- | ------------------------ |
| `mode`           | string | 예   | `toggle` 또는 `hold`     |
| `acceptedActors` | string | 예   | 쉼표 구분: `player,echo` |

#### Switch

Switch Class는 점유 중에만 활성화되는 압력 스위치입니다. Z 입력 방식은 Lever Class의 `toggle` 또는 `hold`를 사용합니다.

Memory Object 상자는 `persistentFields=position`과 `memorySocketId`를 함께 지정합니다. 해당 ID의 Box 허용 Switch 위에서 RESET한 경우에만 상자 위치가 유지되며, Socket 밖에서 RESET하면 시작 위치로 돌아갑니다. Memory Socket Switch에는 `requiresCommittedMemory=true`를 지정하며, 상자를 올린 직후가 아니라 그 상태로 RESET하여 기억을 확정한 뒤에만 활성화됩니다.

비정형 맵은 Map Property `floorMask`에 각 행을 `0`과 `1`로 작성하고 `/`로 구분합니다. `1`은 이동 가능한 바닥, `0`은 맵 바깥 공간입니다. 외곽선을 전용 에셋으로 구성하는 맵은 `useWallLayer=false`로 설정하여 임시 Tile Wall 충돌을 끌 수 있습니다.

| Property         | 타입   | 필수   | 설명                                |
| ---------------- | ------ | ------ | ----------------------------------- |
| `acceptedActors` | string | 아니오 | 쉼표 구분, 기본값 `player,echo,box` |

#### Door

| Property           | 타입   | 필수   | 설명                                    |
| ------------------ | ------ | ------ | --------------------------------------- |
| `switchIds`        | string | 아니오 | 연결할 Switch ID 목록                   |
| `leverIds`         | string | 아니오 | 연결할 Lever ID 목록                    |
| `activationMode`   | string | 아니오 | `all`(AND, 기본값) 또는 `any`(OR)       |
| `keyId`            | string | 아니오 | 잠금 해제에 필요한 Key ID               |
| `consumesKey`      | bool   | 아니오 | 사용 시 열쇠 소모 여부                  |
| `clearOnOpen`      | bool   | 아니오 | 열릴 때 챕터 완료                       |
| `interactionCells` | string | 아니오 | 여러 칸짜리 문이 상호작용되는 상대 좌표 |
| `closedAssetKey`   | string | 아니오 | 닫힌 상태의 manifest 키                 |
| `openAssetKey`     | string | 아니오 | 열린 상태의 manifest 키                 |

문 상태는 연결된 Switch와 Lever의 활성 상태에서 파생합니다. 기본 `all`은 모든 장치가 활성화되어야 하며, `any`는 하나 이상 활성화되면 열립니다.

#### Key

| Property           | 타입   | 필수   | 설명                                                     |
| ------------------ | ------ | ------ | -------------------------------------------------------- |
| `persistentFields` | string | 아니오 | `position`, `collectible`, `collected` 쉼표 목록         |
| `collectible`      | bool   | 아니오 | 현재 상태에서 획득 가능한지 여부                         |
| `visible`          | bool   | 아니오 | 미획득 상태의 화면 표시 여부                             |
| `blocksMovement`   | bool   | 아니오 | 열쇠가 위치한 칸의 이동 차단 여부                        |
| `requiresReset`    | bool   | 아니오 | 획득 가능 상태가 된 뒤 다음 RESET부터 획득·표시할지 여부 |
| `assetKey`         | string | 아니오 | 렌더링할 manifest 키                                     |

Chapter 1의 열쇠는 `persistentFields: position,collectible`로 떨어진 위치와 획득 가능 상태만 기억합니다. `collected`는 기본 기억 속성이 아니며 레벨에서 명시적으로 허용할 때만 사용합니다.

#### PocketWatch

`visible`, `interactable`, `blocksMovement`를 선택적으로 지정할 수 있습니다. Chapter 1에서는 PocketWatch를 숨기고 Nightstand의 PuzzleObject effect로 획득합니다.

#### PuzzleObject

`initialState`, `stateAssets`, `stateCollision`, `stateInteraction`, `onInteractState`,
`onInteractEffects`, `onInteractPlayerRetreat`를 사용해 상태별 렌더링·충돌과 data-driven effect를 정의합니다.

- `stateAssets`: `standing=asset-a,fallen=asset-b`
- `stateCollision`: `standing=0,0|1,0;fallen=0,0|1,0|0,1|1,1`
- `stateInteraction`: `standing=1,0;fallen=`
- `onInteractEffects`: `set-position:object-id:8,3;set-collectible:key-id:true`
- `onInteractPlayerRetreat`: 상호작용 성공 후 안전하게 물러날 방향(`up`, `down`, `left`, `right`)

#### Exit

| Property | 타입   | 필수 | 설명                    |
| -------- | ------ | ---- | ----------------------- |
| `mode`   | string | 예   | `enter` 또는 `interact` |

## 도메인 변환 결과

```ts
type LevelDefinition = {
  schemaVersion: 1;
  id: string;
  chapterId: string;
  map: GridMap;
  playerStart: GridPosition;
  playerFacing: Direction;
  resetLimit: number;
  resetPolicy: 'disable' | 'unlimited';
  echoLimit: number;
  objects: readonly WorldObjectState[];
  finalClockStartSeconds?: number;
  finalClockDurationMs?: number;
  finalDoorId?: string;
};
```

Tiled의 GID, 레이어 인덱스, 픽셀 좌표는 변환 이후 게임 규칙에 노출하지 않습니다.

## 검증 규칙

로드 실패 시 게임을 시작하지 않고 파일, 오브젝트 ID, 좌표를 포함한 오류를 개발 화면에 표시합니다.

- `schemaVersion` 지원 여부
- 필수 레이어와 속성 존재
- `floor`, `walls` Tile Layer 데이터 크기와 GID 유효성
- 32×32 타일과 정수 그리드 정렬
- 오브젝트 ID 유일성
- PlayerSpawn 정확히 하나
- 모든 좌표가 맵 안에 존재
- PlayerSpawn과 오브젝트가 벽에 겹치지 않음
- PlayerSpawn과 상자, 문, 상호작용 오브젝트의 초기 위치 중첩 금지
- 상자, 문, 열쇠의 초기 위치 중첩 금지
- `switchIds`가 실제 Switch를 참조
- Door의 연결 ID 중복과 열쇠·장치 조건 혼용 금지
- `resetLimit >= 0`, `echoLimit >= 0`
- `disable` 정책에서는 `echoLimit <= resetLimit`
- `unlimited` 정책에서는 `resetLimit`을 적용하지 않고 `echoLimit`만 독립적으로 적용
- Final의 마지막 방에 시작 시각과 목표 시각 존재
- Final의 `finalDoorId`가 실제 Door를 참조
- 알 수 없는 Object Type과 Property는 오류 처리

## 버전 관리

- 호환되는 선택 필드 추가는 같은 `schemaVersion`을 유지합니다.
- 필드 의미 변경, 삭제, 필수화는 버전을 증가시킵니다.
- 스키마 변경 PR에는 B가 사용할 마이그레이션 방법과 샘플 변경을 포함합니다.
- 런타임은 알 수 없는 상위 버전을 추측해서 읽지 않습니다.

## B 레벨 제작 체크리스트

1. `floor`, `walls`, `objects` 레이어 이름을 정확히 사용합니다.
2. Object Class와 Custom Property는 이 문서에 정의된 이름만 사용합니다.
3. 점유 장치는 Switch, Z 상호작용 장치는 Lever로 만듭니다.
4. `persistentFields`에는 RESET 후 유지할 필드만 명시합니다.
5. JSON을 `src/levels/level-catalog.ts`의 `LEVEL_SOURCES`에 진행 순서대로 등록합니다.
6. 새 챕터라면 `src/themes/`에 `ChapterVisualTheme`을 만들고
   `src/themes/theme-catalog.ts`에 `chapterId` 기준으로 등록합니다.

## 챕터 비주얼 테마

게임 규칙과 렌더링 에셋은 분리합니다. `LevelDefinition.chapterId`로 테마를 선택하며,
`GameScene`은 특정 챕터의 에셋 이름을 직접 참조하지 않습니다.

테마에는 다음 항목을 정의합니다.

- 챕터의 `AssetManifest`
- 바닥 spritesheet와 프레임 수
- 상·하·좌·우 벽과 모서리, 출입구 에셋
- 오브젝트 ID 또는 타입별 표시 크기, 깊이, 위치 보정

따라서 Chapter 2를 추가할 때는 에셋 manifest와 테마를 등록하고 레벨 JSON의
`chapterId`를 연결하면 됩니다. 기존 `GameScene` 수정은 필요하지 않습니다. 6. JSON을 추가한 뒤 `npm run validate:levels`로 레벨 검증을 실행합니다. 7. PR 전에는 `npm run check`로 전체 품질 검사를 실행합니다.

## 레벨 검증 명령

```bash
npm run validate:levels
```

등록된 모든 Tiled JSON을 실제 카탈로그 순서대로 로드합니다. 실패하면 파일명과 잘못된 Property, 좌표, 참조 ID 등의 원인을 출력합니다.

현재 `src/levels/demo-level.json`을 Tiled JSON 계약의 기준 샘플로 사용합니다.

게임 의미가 확정되지 않은 필드는 [게임 규칙 공동 결정 체크리스트](./GAME_RULE_DECISIONS.md)의 결정을 기준으로 갱신합니다.
