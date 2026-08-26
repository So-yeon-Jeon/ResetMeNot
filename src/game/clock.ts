export function formatClockTime(startSeconds: number, elapsedMs: number): string {
  const currentSeconds = (startSeconds + Math.floor(elapsedMs / 1000)) % 86_400;
  const hours = Math.floor(currentSeconds / 3600);
  const minutes = Math.floor((currentSeconds % 3600) / 60);
  const seconds = currentSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

export type ClockHandAngles = Readonly<{
  minute: number;
  second: number;
}>;

export function calculateFinalClockHandAngles(
  elapsedMs: number,
  wallMessageAtMs: number,
  motionAtMs: number,
  durationMs: number,
): ClockHandAngles {
  if (elapsedMs >= durationMs) return { minute: 0, second: 0 };
  if (elapsedMs >= motionAtMs) return { minute: 240, second: 0 };
  if (elapsedMs >= wallMessageAtMs) return { minute: 120, second: 0 };
  return { minute: 0, second: 0 };
}
