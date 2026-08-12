# ResetMeNot 협업 규칙

이 저장소는 `작업 브랜치 → dev → master` 흐름을 사용합니다. `dev`는 기능 통합 브랜치이고, `master`는 항상 프로덕션에 배포 가능한 상태여야 합니다.

## 1. 작업 흐름

1. 작업 전에 `dev`를 최신 상태로 갱신합니다.
2. 이슈 또는 작업 단위별 브랜치를 생성합니다.
3. 작은 단위로 커밋하고 push합니다.
4. `dev`를 대상으로 Pull Request를 열고 CI 통과와 팀원 리뷰를 확인합니다.
5. **Squash and merge**로 `dev`에 병합합니다.
6. 릴리스 후보가 검증되면 `dev → master` Pull Request를 생성합니다.
7. `master` 병합 후 Cloudflare 프로덕션 배포를 확인합니다.
8. 병합된 작업 브랜치는 삭제합니다.

직접 `dev`나 `master`에 push하지 않습니다. 긴급 수정도 `fix/* → dev → master` 순서를 원칙으로 합니다.

```text
feat/* ─┐
fix/*  ─┼─> dev ──릴리스 PR──> master ──> Cloudflare Production
level/*─┘
```

## 2. 브랜치 컨벤션

형식:

```text
<type>/<짧은-kebab-case-설명>
```

허용 타입:

| 타입       | 용도                         | 예시                     |
| ---------- | ---------------------------- | ------------------------ |
| `feat`     | 기능 추가                    | `feat/grid-movement`     |
| `fix`      | 버그 수정                    | `fix/echo-box-collision` |
| `docs`     | 문서 변경                    | `docs/level-format`      |
| `art`      | 이미지·애니메이션·사운드     | `art/chapter-one-tiles`  |
| `level`    | 맵·퍼즐·레벨 데이터          | `level/chapter-one-room` |
| `refactor` | 동작을 바꾸지 않는 구조 개선 | `refactor/reset-state`   |
| `test`     | 테스트 추가·수정             | `test/echo-replay`       |
| `chore`    | 설정·의존성·기타 유지보수    | `chore/update-vite`      |
| `release`  | 출시 준비                    | `release/v0-1-0`         |

규칙:

- 소문자 영문, 숫자, 하이픈만 사용합니다.
- 설명은 2~5단어를 권장합니다.
- 사람 이름이나 `a-work`, `temp`, `new`처럼 의미 없는 이름은 사용하지 않습니다.
- 이슈 번호가 있으면 끝에 붙일 수 있습니다: `feat/grid-movement-12`.

## 3. 커밋 컨벤션

[Conventional Commits](https://www.conventionalcommits.org/) 형식을 사용합니다.

```text
<type>(<scope>): <subject>
```

`scope`는 선택 사항입니다. 게임 영역을 드러낼 때 사용합니다.

```text
feat(player): 4방향 그리드 이동 구현
fix(echo): 재생 중 막힌 상자 밀기 무시
level(ch01): 기억하는 열쇠 배치
art(ui): 리셋 카운터 아이콘 추가
docs: 레벨 JSON 스키마 문서화
chore: Cloudflare 배포 설정
```

허용 타입:

- `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`
- `build`, `ci`, `chore`, `revert`
- 프로젝트 전용 `art`, `level`, `story`, `audio`

세부 규칙:

- 제목 전체는 100자 이하로 작성합니다.
- 타입과 scope는 소문자 kebab-case를 사용합니다.
- 타입과 scope는 영어로, subject는 한국어로 작성합니다.
- subject는 변경 내용을 간결하게 작성하고 마침표를 붙이지 않습니다.
- 한 커밋에는 하나의 논리적 변경만 담습니다.
- 게임 동작과 무관한 포맷 변경을 기능 커밋에 섞지 않습니다.
- 호환성이 깨지는 변경은 `feat(core)!: ...`와 본문의 `BREAKING CHANGE:`로 표시합니다.
- 예외적으로 라이브러리명, API명, 고유명사는 원문 영문을 사용할 수 있습니다.

## 4. Pull Request 규칙

- 제목도 커밋 컨벤션 형식으로 작성합니다. Squash merge 시 최종 커밋 제목이 됩니다.
- 일반 작업 PR의 base는 `dev`, 릴리스 PR의 base만 `master`로 지정합니다.
- 가능한 한 하나의 기능 또는 이슈만 포함합니다.
- 게임 동작이 바뀌면 스크린샷, GIF 또는 테스트 방법을 남깁니다.
- 핵심 메커닉 규칙 변경은 A와 B 모두의 동의가 필요합니다.
- B가 편집하는 레벨 데이터 계약 변경은 반드시 `breaking` 여부와 마이그레이션 방법을 적습니다.
- `npm run check`가 통과해야 병합할 수 있습니다.

## 5. 버전과 릴리스

[Semantic Versioning](https://semver.org/)을 사용합니다.

- `0.x.y`: 해커톤 및 얼리 액세스 단계
- patch: 버그 수정·콘텐츠 미세 조정
- minor: 새 챕터·기능 추가
- major: 저장 데이터나 레벨 포맷 등 호환성이 깨지는 변경

릴리스 태그는 `v0.1.0` 형식을 사용합니다. `dev`에서 검증한 뒤 `master`에 병합하고, 제출 커밋에 태그를 생성합니다.

## 6. 로컬 자동 검사

`npm install` 시 저장소의 Git 훅이 자동 활성화됩니다.

- commit 전: 브랜치 이름 검사
- commit 메시지 작성 후: 커밋 컨벤션 검사
- push 전: 전체 `npm run check`

긴급 상황에서도 `--no-verify`로 우회하지 않는 것을 원칙으로 합니다.
