import { execFileSync } from 'node:child_process';
import { chmodSync } from 'node:fs';

const hooks = ['.githooks/pre-commit', '.githooks/commit-msg', '.githooks/pre-push'];

try {
  execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { stdio: 'ignore' });
  for (const hook of hooks) chmodSync(hook, 0o755);
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'ignore' });
  console.log('ResetMeNot Git 훅을 활성화했습니다.');
} catch {
  console.log('Git 저장소가 아니므로 훅 설정을 건너뜁니다.');
}
