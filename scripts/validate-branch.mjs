const allowedTypes = [
  'feat',
  'fix',
  'docs',
  'art',
  'level',
  'refactor',
  'test',
  'chore',
  'release',
];

const branch = process.argv[2] ?? '';
const protectedBranches = new Set(['master', 'main', 'dev']);
const pattern = new RegExp(`^(${allowedTypes.join('|')})/[a-z0-9]+(?:-[a-z0-9]+)*$`);
const dependabotPattern = /^dependabot\/(npm_and_yarn|github_actions)\/[a-zA-Z0-9._/-]+$/;

if (!branch) {
  console.error('브랜치 이름을 전달해야 합니다.');
  process.exit(1);
}

if (!protectedBranches.has(branch) && !pattern.test(branch) && !dependabotPattern.test(branch)) {
  console.error(`유효하지 않은 브랜치 이름: ${branch}`);
  console.error('예시: feat/grid-movement, level/chapter-one-room');
  process.exit(1);
}

console.log(`브랜치 이름 확인 완료: ${branch}`);
