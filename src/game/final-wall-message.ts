export function finalWallMessage(elapsedMs: number): string {
  if (elapsedMs >= 30_000) return 'LET TIME GO.';
  if (elapsedMs >= 27_000) return '언제까지 같은 페이지를 읽을 거니?';
  if (elapsedMs >= 20_000) return '또 처음으로 돌아가려고 하는구나.';
  if (elapsedMs >= 10_000) return '꼭 돌아가야만 하는 걸까?';
  return '';
}
