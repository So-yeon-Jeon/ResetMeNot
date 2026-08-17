export function formatClockTime(startSeconds: number, elapsedMs: number): string {
  const currentSeconds = (startSeconds + Math.floor(elapsedMs / 1000)) % 86_400;
  const hours = Math.floor(currentSeconds / 3600);
  const minutes = Math.floor((currentSeconds % 3600) / 60);
  const seconds = currentSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}
