import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const types = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
  'art',
  'level',
  'story',
  'audio',
];
const headerPattern = new RegExp(
  `^(${types.join('|')})(\\([a-z0-9]+(?:-[a-z0-9]+)*\\))?(!)?: .{1,}$`,
);

function validate(message) {
  const header = message.trim().split(/\r?\n/, 1)[0] ?? '';

  if (/^(Merge|Revert)\b/.test(header)) return [];

  const errors = [];
  if (!headerPattern.test(header)) {
    errors.push('형식은 type(scope): subject 이어야 합니다.');
  }
  if (header.length > 100) errors.push('제목은 100자 이하여야 합니다.');
  if (header.endsWith('.')) errors.push('제목 끝에 마침표를 붙이지 않습니다.');
  return errors;
}

function messagesFromArgs() {
  const args = process.argv.slice(2);
  if (args[0] === '--range' && args[1]) {
    const output = execFileSync('git', ['log', '--format=%B%x1e', args[1]], {
      encoding: 'utf8',
    });
    return output.split('\x1e').filter((message) => message.trim());
  }
  if (args[0]) return [readFileSync(args[0], 'utf8')];
  throw new Error('커밋 메시지 파일 또는 --range <git-range>가 필요합니다.');
}

let failed = false;
for (const message of messagesFromArgs()) {
  const header = message.trim().split(/\r?\n/, 1)[0] ?? '';
  const errors = validate(message);
  if (errors.length > 0) {
    failed = true;
    console.error(`\n잘못된 커밋 메시지: ${header}`);
    for (const error of errors) console.error(`- ${error}`);
  }
}

if (failed) {
  console.error('\n예시: feat(player): add grid movement');
  process.exit(1);
}

console.log('커밋 메시지 확인 완료');
