# ResetMeNot

> The world remembers.

Phaser 3, TypeScript, Vite로 만드는 타일 기반 시간 퍼즐 게임입니다.

개발 흐름은 `작업 브랜치 → dev → master → Cloudflare Production`입니다. 프로덕션 배포는 `master`에서만 실행됩니다.

협업을 시작하기 전에 [CONTRIBUTING.md](./CONTRIBUTING.md)의 브랜치, 커밋, PR 규칙을 확인해 주세요.
일정과 일일 진행 상황은 [프로젝트 트래커](./docs/PROJECT_TRACKER.md)에서 관리합니다.
저장소 관리자는 첫 push 전에 [GitHub 설정 체크리스트](./docs/GITHUB_SETUP.md)를 완료해 주세요.

## 로컬 실행

Node.js 22 이상이 필요합니다.

```bash
npm install
npm run dev
```

## 품질 검증

```bash
npm run check
```

위 명령은 타입 검사, 린트, 포맷 검사, 테스트, 프로덕션 빌드를 순서대로 실행합니다.

## Cloudflare 배포

프로덕션은 Cloudflare Workers Static Assets와 Cloudflare Git 연동을 사용합니다. Workers Builds가 `master` 변경을 감지해 자동 배포하며 GitHub에는 Cloudflare API Token을 저장하지 않습니다.

Cloudflare 설정은 빌드 명령 `npm run build`, 배포 명령 `npx wrangler deploy`, 프로덕션 브랜치 `master`를 사용합니다. 비프로덕션 브랜치는 Preview URL만 생성합니다.

## 주요 명령

| 명령                | 용도                   |
| ------------------- | ---------------------- |
| `npm run dev`       | 개발 서버              |
| `npm run test`      | 테스트                 |
| `npm run typecheck` | TypeScript 검사        |
| `npm run lint`      | ESLint 검사            |
| `npm run build`     | 프로덕션 빌드          |
| `npm run preview`   | 빌드 결과 미리보기     |
| `npm run deploy`    | Cloudflare에 수동 배포 |
