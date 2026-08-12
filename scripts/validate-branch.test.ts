import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

function validateBranch(branch: string): string {
  return execFileSync('node', ['scripts/validate-branch.mjs', branch], { encoding: 'utf8' });
}

describe('branch convention', () => {
  it.each([
    'feat/grid-movement',
    'chore/dependabot-policy',
    'dependabot/npm_and_yarn/npm-minor-and-patch-1234abcd',
    'dependabot/github_actions/actions-minor-and-patch-5678abcd',
  ])('allows %s', (branch) => {
    expect(validateBranch(branch)).toContain('브랜치 이름 확인 완료');
  });

  it('rejects arbitrary branch names', () => {
    expect(() => validateBranch('temporary-work')).toThrow();
  });
});
