import { describe, expect, it } from 'vitest';
import { actionFeedback, FEEDBACK_MESSAGES, resetBlockedFeedback } from './feedback-messages';

describe('feedback messages', () => {
  it.each([
    ['locked', FEEDBACK_MESSAGES.resetLocked],
    ['empty-run', FEEDBACK_MESSAGES.resetEmptyRun],
    ['limit', FEEDBACK_MESSAGES.resetExhausted],
  ] as const)('RESET 실패 원인 %s를 안내 문구로 변환한다', (reason, message) => {
    expect(resetBlockedFeedback(reason)).toBe(message);
  });

  it('실패 원인이 없으면 안내하지 않는다', () => {
    expect(resetBlockedFeedback(undefined)).toBeUndefined();
  });

  it.each([
    ['reset-unlocked', FEEDBACK_MESSAGES.resetUnlocked],
    ['key-acquired', FEEDBACK_MESSAGES.keyAcquired],
    ['key-required', FEEDBACK_MESSAGES.keyRequired],
  ] as const)('게임 이벤트 %s를 안내 문구로 변환한다', (event, message) => {
    expect(actionFeedback(event)).toBe(message);
  });
});
