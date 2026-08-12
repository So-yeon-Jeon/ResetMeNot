# GitHub 저장소 설정 체크리스트

저장소 관리자 권한이 있는 사람이 GitHub 웹에서 한 번 설정합니다.

## 1. 팀원 초대 — 필수

경로: `Settings → Collaborators`

- [x] B 담당 팀원을 `Add people`로 초대한다.
- [ ] 팀원이 브랜치 생성과 push를 할 수 있는지 확인한다.
- [ ] `Admin` 권한은 주지 않는다. 팀원이 Ruleset, Secrets 등 저장소 설정까지 공동 관리해야 할 때만 별도로 검토한다.

## 2. Pull Request 병합 방식 — 필수

경로: `Settings → General → Pull Requests`

- [ ] `Allow squash merging`만 활성화한다.
- [ ] Squash 기본 제목은 `Pull request title`로 설정한다.
- [ ] `Allow merge commits`를 비활성화한다.
- [ ] `Allow rebase merging`을 비활성화한다.
- [ ] `Automatically delete head branches`를 활성화한다.

PR 제목은 최종 커밋이 되므로 `feat(player): 4방향 그리드 이동 구현` 형식을 사용한다.

## 3. master Ruleset — 필수

경로: `Settings → Rules → Rulesets → New ruleset → New branch ruleset`

| 설정                                  | 값                       |
| ------------------------------------- | ------------------------ |
| Ruleset name                          | `protect-master`         |
| Enforcement status                    | `Active`                 |
| Target branches                       | `Include default branch` |
| Restrict deletions                    | 활성화                   |
| Block force pushes                    | 활성화                   |
| Require a pull request before merging | 활성화                   |
| Required approvals                    | `1`                      |
| Dismiss stale approvals               | 활성화                   |
| Require conversation resolution       | 활성화                   |
| Require linear history                | 활성화                   |
| Require status checks                 | 활성화                   |

필수 Status checks:

- `conventions`
- `quality`

Status check는 워크플로를 GitHub에서 최소 한 번 실행한 뒤 선택 목록에 나타날 수 있다. 처음에는 Ruleset의 나머지 항목을 저장하고, 첫 CI 실행 후 두 check를 추가한다.

해커톤 기간에는 다음 항목을 켜지 않는다.

- `Require signed commits`: 팀원의 서명 환경 설정이 먼저 필요하며 긴급 수정이 막힐 수 있다.
- `Require deployments to succeed before merging`: 프로덕션 배포는 merge 이후 실행되므로 순환 조건이 된다.

`master`에는 일반 작업 브랜치를 직접 병합하지 않고 `dev → master` 릴리스 PR만 생성한다.

## 4. dev 브랜치와 Ruleset — 필수

최초 사전 설정 PR을 `master`에 병합한 뒤 `master`에서 `dev` 브랜치를 생성한다.

경로: `Code → Branches → New branch`

- [ ] 브랜치 이름: `dev`
- [ ] Source: `master`

그다음 `protect-dev` Ruleset을 만든다.

| 설정                                | 값                        |
| ----------------------------------- | ------------------------- |
| Ruleset name                        | `protect-dev`             |
| Enforcement status                  | `Active`                  |
| Target branches                     | Branch name pattern `dev` |
| Restrict deletions                  | 활성화                    |
| Block force pushes                  | 활성화                    |
| Require a pull request before merge | 활성화                    |
| Required approvals                  | `1`                       |
| Dismiss stale approvals             | 활성화                    |
| Require conversation resolution     | 활성화                    |
| Require linear history              | 활성화                    |
| Require status checks               | `conventions`, `quality`  |

일반 기능, 버그, 레벨, 아트 PR은 모두 `dev`를 대상으로 한다.

## 5. Cloudflare Git 배포 연동 — 필수

배포는 GitHub Actions가 아니라 Cloudflare Workers Builds가 저장소를 직접 감지해 수행한다. GitHub `production` Environment와 Cloudflare Secrets는 만들지 않는다.

Cloudflare Dashboard에서 `Workers & Pages → Create application → Import a repository`로 이동한다.

| 설정              | 값                        |
| ----------------- | ------------------------- |
| Repository        | `So-yeon-Jeon/ResetMeNot` |
| Worker name       | `reset-me-not`            |
| Production branch | `master`                  |
| Build command     | `npm run build`           |
| Deploy command    | `npx wrangler deploy`     |
| Root directory    | `/`                       |
| Node.js version   | `22`                      |

- [ ] Production branch를 `master`로 지정한다.
- [ ] Non-production branch builds를 활성화한다.
- [ ] `dev`와 작업 브랜치가 Preview URL만 만들고 프로덕션을 바꾸지 않는지 확인한다.
- [ ] `master` 반영 때만 프로덕션 URL이 갱신되는지 확인한다.

Cloudflare 프로젝트 이름은 `wrangler.jsonc`의 `name`인 `reset-me-not`과 같아야 한다. GitHub 저장소에는 Cloudflare API Token을 등록하지 않는다.

## 6. Actions 권한 — 필수

경로: `Settings → Actions → General`

- [ ] Actions 사용을 허용한다.
- [ ] Workflow permissions는 `Read repository contents permission`을 선택한다.
- [ ] `Allow GitHub Actions to create and approve pull requests`는 비활성화한다.

워크플로별 `permissions`도 `contents: read`로 제한되어 있다.

## 7. 보안 설정 — 권장

경로: `Settings → Code security and analysis`

- [ ] Dependabot alerts 활성화
- [ ] Dependabot security updates 활성화
- [ ] Secret scanning 활성화(현재 요금제에서 제공될 경우)
- [ ] Push protection 활성화(현재 요금제에서 제공될 경우)

Dependabot 버전 업데이트 PR은 저장소의 `.github/dependabot.yml`이 매주 생성한다.

## 8. 저장소 기본 정보 — 권장

경로: 저장소 우측 `About`의 설정 아이콘

- [ ] Description: `A time-loop puzzle game where the world remembers.`
- [ ] Topics: `phaser`, `typescript`, `vite`, `puzzle-game`, `game-jam`
- [ ] Website: 최초 Cloudflare 배포 후 플레이 URL 입력

경로: `Settings → General`

- [ ] Default branch가 `master`인지 확인한다.
- [ ] Issues 활성화
- [ ] Wiki는 사용하지 않으면 비활성화해 문서 위치를 저장소와 Notion으로 한정한다.
- [ ] GitHub Pages는 사용하지 않는다. 배포 대상은 Cloudflare 하나로 유지한다.

## 9. 첫 설정 검증

1. 최초 설정은 `chore/bootstrap-project → master` PR로 병합한다.
2. `master`에서 `dev` 브랜치를 생성하고 `protect-dev` Ruleset을 적용한다.
3. 이후 작업 브랜치를 `dev` 대상으로 PR을 열어 `conventions`, `quality`를 확인한다.
4. 팀원 1명이 승인하지 않으면 `dev`에 merge할 수 없는지 확인한다.
5. `dev → master` 릴리스 PR을 Squash merge한다.
6. `master` 병합 때만 Cloudflare Workers Build가 프로덕션 배포를 실행하는지 확인한다.
7. 배포 URL에서 게임 화면과 키보드 입력을 확인한다.

## 설정 완료 기록

| 항목                   | 담당 | 상태 | 완료일 | 비고            |
| ---------------------- | ---- | ---- | ------ | --------------- |
| B Collaborator 초대    | A    | ✅   | 08.12  | Add people 완료 |
| Squash merge 설정      |      | ⬜   |        |                 |
| master Ruleset         |      | ⬜   |        |                 |
| dev 브랜치와 Ruleset   |      | ⬜   |        |                 |
| production Environment |      | ⬜   |        |                 |
| Cloudflare Secrets     |      | ⬜   |        |                 |
| Actions 권한           |      | ⬜   |        |                 |
| 보안 기능              |      | ⬜   |        |                 |
| 첫 PR/배포 검증        |      | ⬜   |        |                 |
