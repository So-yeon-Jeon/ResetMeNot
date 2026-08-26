import type { ActionResult } from '../game/game-state';

export const FEEDBACK_MESSAGES = {
  resetLocked: 'RESET LOCKED · FIND THE POCKET WATCH',
  resetEmptyRun: 'NOTHING TO RESET',
  resetExhausted: 'RESET EXHAUSTED',
  chapter4CodeRequired: 'ENTER 924 BEFORE THE FOURTH RESET',
  echoSpaceOccupied: 'ECHO SPACE OCCUPIED',
  echoLimitReached: 'ECHO LIMIT REACHED',
  resetUnlocked: 'RESET UNLOCKED · PRESS R',
  keyAcquired: 'KEY ACQUIRED',
  keyRequired: 'THE DOOR REQUIRES A KEY',
  doorOpen: 'THE DOOR IS OPEN',
} as const;

export function actionFeedback(event: ActionResult['feedbackEvent']): string | undefined {
  if (event === 'reset-unlocked') return FEEDBACK_MESSAGES.resetUnlocked;
  if (event === 'key-acquired') return FEEDBACK_MESSAGES.keyAcquired;
  if (event === 'key-required') return FEEDBACK_MESSAGES.keyRequired;
  return undefined;
}

export function resetBlockedFeedback(reason: ActionResult['resetBlocked']): string | undefined {
  if (reason === 'locked') return FEEDBACK_MESSAGES.resetLocked;
  if (reason === 'empty-run') return FEEDBACK_MESSAGES.resetEmptyRun;
  if (reason === 'limit') return FEEDBACK_MESSAGES.resetExhausted;
  if (reason === 'chapter4-code-required') return FEEDBACK_MESSAGES.chapter4CodeRequired;
  return undefined;
}
