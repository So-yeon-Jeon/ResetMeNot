# 레벨 데이터 기술 규격

이 문서는 A가 관리하는 Tiled JSON 계약의 초안입니다. B가 실제 Tiled 샘플 맵으로 편집 편의성을 검토한 뒤 `schemaVersion: 1`을 확정합니다.

## 파이프라인

```text
Tiled 편집 → JSON export → 런타임 검증 → 도메인 레벨 변환 → Phaser 렌더링
```

게임 규칙은 Tiled 원본 구조를 직접 참조하지 않습니다. 로더가 Tiled JSON을 검증한 뒤 `LevelDefinition`으로 변환합니다.

## 맵 규격

| 항목           | 값              |
| -------------- | --------------- |
| Orientation    | Orthogonal      |
| Render order   | Right Down      |
| Tile size      | 32×32 px        |
| 전체 크기      | 기본 12×10 타일 |
| 내부 이동 영역 | 기본 10×8 타일  |
| Export         | JSON            |

## 필수 레이어

레이어 이름은 계약이므로 정확히 사용합니다.

| 레이어    | Tiled 타입   | 용도                   |
| --------- | ------------ | ---------------------- |
| `floor`   | Tile Layer   | 바닥 표현              |
| `walls`   | Tile Layer   | 벽 표현과 기본 충돌    |
| `objects` | Object Layer | Player와 퍼즐 오브젝트 |

장식 전용 Tile Layer는 `decor-*` 이름으로 추가할 수 있으며 게임 규칙에서 무시합니다.

## Map Custom Properties

| 이름               | 타입   | 필수   | 예시                 | 설명                        |
| ------------------ | ------ | ------ | -------------------- | --------------------------- |
| `schemaVersion`    | int    | 예     | `1`                  | 데이터 계약 버전            |
| `levelId`          | string | 예     | `chapter-01-room-01` | 전역 고유 ID                |
| `chapterId`        | string | 예     | `chapter-01`         | 챕터 ID                     |
| `resetLimit`       | int    | 예     | `3`                  | 허용 RESET 횟수             |
| `echoLimit`        | int    | 예     | `3`                  | 동시에 유지할 Echo 최대 수  |
| `resetPolicy`      | string | 예     | `disable`            | 한도 소진 후 RESET 비활성화 |
| `finalClockStart`  | string | 조건부 | `11:59:50`           | Final 시계 시작 시각        |
| `finalClockTarget` | string | 조건부 | `12:00:00`           | 종과 해결 연출의 목표 시각  |

Final의 마지막 방에만 `finalClockStart`와 `finalClockTarget`이 필요합니다.

## Object Layer 계약

Tiled Object의 위치는 픽셀 좌표이지만 로더에서 32로 나눠 그리드 좌표로 변환합니다. 모든 오브젝트는 타일 좌측 상단에 정렬되어야 합니다.

### 공통 필드

| 필드               | 필수   | 규칙                              |
| ------------------ | ------ | --------------------------------- |
| Name               | 예     | 챕터 안에서 유일한 ID, kebab-case |
| Type/Class         | 예     | 아래 허용 타입 중 하나            |
| X/Y                | 예     | 32px 배수                         |
| Width/Height       | 예     | 기본 32×32                        |
| `persistentFields` | 아니오 | 기억할 속성의 쉼표 구분 목록      |

### 허용 타입

#### PlayerSpawn

- 챕터당 정확히 하나
- `persistentFields` 사용 불가

#### Box

- 위치 상태를 가짐
- `persistentFields`에 `position`이 있으면 RESET 후 위치 유지

#### Lever

| Property         | 타입   | 필수 | 설명                     |
| ---------------- | ------ | ---- | ------------------------ |
| `mode`           | string | 예   | `toggle` 또는 `hold`     |
| `acceptedActors` | string | 예   | 쉼표 구분: `player,echo` |

#### Switch

Switch Class는 점유 중에만 활성화되는 압력 스위치입니다. Z 입력 방식은 Lever Class의 `toggle` 또는 `hold`를 사용합니다.

| Property         | 타입   | 필수   | 설명                                |
| ---------------- | ------ | ------ | ----------------------------------- |
| `acceptedActors` | string | 아니오 | 쉼표 구분, 기본값 `player,echo,box` |

#### Door

| Property         | 타입   | 필수   | 설명                              |
| ---------------- | ------ | ------ | --------------------------------- |
| `switchIds`      | string | 아니오 | 연결할 Switch ID 목록             |
| `leverIds`       | string | 아니오 | 연결할 Lever ID 목록              |
| `activationMode` | string | 아니오 | `all`(AND, 기본값) 또는 `any`(OR) |
| `keyId`          | string | 아니오 | 잠금 해제에 필요한 Key ID         |
| `consumesKey`    | bool   | 아니오 | 사용 시 열쇠 소모 여부            |

문 상태는 연결된 Switch와 Lever의 활성 상태에서 파생합니다. 기본 `all`은 모든 장치가 활성화되어야 하며, `any`는 하나 이상 활성화되면 열립니다.

#### Key

| Property           | 타입   | 필수   | 설명                              |
| ------------------ | ------ | ------ | --------------------------------- |
| `persistentFields` | string | 아니오 | `position`, `collected` 쉼표 목록 |

Chapter 1의 열쇠는 `persistentFields: position`으로 떨어진 위치만 기억합니다. `collected`는 기본 기억 속성이 아니며 레벨에서 명시적으로 허용할 때만 사용합니다.

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
  size: { width: number; height: number };
  reset: {
    limit: number;
    echoLimit: number;
    policy: 'disable';
    finalClockStart?: string;
    finalClockTarget?: string;
  };
  playerStart: GridPosition;
  walls: ReadonlySet<string>;
  objects: readonly LevelObjectDefinition[];
};
```

Tiled의 GID, 레이어 인덱스, 픽셀 좌표는 변환 이후 게임 규칙에 노출하지 않습니다.

## 검증 규칙

로드 실패 시 게임을 시작하지 않고 파일, 오브젝트 ID, 좌표를 포함한 오류를 개발 화면에 표시합니다.

- `schemaVersion` 지원 여부
- 필수 레이어와 속성 존재
- 32×32 타일과 정수 그리드 정렬
- 오브젝트 ID 유일성
- PlayerSpawn 정확히 하나
- 모든 좌표가 맵 안에 존재
- PlayerSpawn과 오브젝트가 벽에 겹치지 않음
- 상자, 문, 열쇠의 초기 위치 중첩 금지
- `switchId`가 실제 Switch를 참조
- `resetLimit >= 0`, `echoLimit >= 0`
- `echoLimit <= resetLimit`
- Final의 마지막 방에 시작 시각과 목표 시각 존재
- 알 수 없는 Object Type과 Property는 오류 처리

## 버전 관리

- 호환되는 선택 필드 추가는 같은 `schemaVersion`을 유지합니다.
- 필드 의미 변경, 삭제, 필수화는 버전을 증가시킵니다.
- 스키마 변경 PR에는 B가 사용할 마이그레이션 방법과 샘플 변경을 포함합니다.
- 런타임은 알 수 없는 상위 버전을 추측해서 읽지 않습니다.

## B 검토 요청

1. 레이어 이름과 오브젝트 Type/Class 입력이 편한가?
2. `persistentFields`, `switchId`를 Custom Property로 편집하기 쉬운가?
3. Switch의 `pressure/interact` 구분이 레벨 설계에 필요한가?
4. 외곽 벽을 매번 타일로 두는 방식이 아트 제작에 적합한가?
5. Chapter 1 샘플을 이 계약으로 코드 수정 없이 표현할 수 있는가?

검토 후 샘플 `.tmj` 또는 `.json` 한 개를 저장소에 추가하고 로더 구현의 기준 fixture로 사용합니다.

게임 의미가 확정되지 않은 필드는 [게임 규칙 공동 결정 체크리스트](./GAME_RULE_DECISIONS.md)의 결정을 기준으로 갱신합니다.
