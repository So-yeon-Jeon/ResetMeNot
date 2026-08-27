import { describe, expect, it } from 'vitest';
import { OPENING_AUDIO_ASSET_MANIFEST } from '../assets/opening/audio-manifest';
import { createOpeningSequence, nextOpeningPageIndex } from './opening';

describe('createOpeningSequence', () => {
  it('builds the fixed prologue flow before gameplay', () => {
    const pages = createOpeningSequence();

    expect(pages.map((page) => page.id)).toEqual([
      'reading',
      'asleep',
      'clock-tick',
      'strange-room',
    ]);
    expect(pages.map((page) => page.assetKey)).toEqual([
      'opening-reading',
      'opening-asleep',
      'opening-clock-tick',
      'opening-strange-room',
    ]);
  });

  it('registers the prologue-only BGM asset', () => {
    expect(OPENING_AUDIO_ASSET_MANIFEST['opening-prologue']?.path).toContain('prologue.mp3');
    expect(OPENING_AUDIO_ASSET_MANIFEST['opening-title']?.path).toContain('title_opening.mp3');
  });

  it('advances each page and starts gameplay after the final page', () => {
    expect(nextOpeningPageIndex(0, 4)).toBe(1);
    expect(nextOpeningPageIndex(1, 4)).toBe(2);
    expect(nextOpeningPageIndex(2, 4)).toBe(3);
    expect(nextOpeningPageIndex(3, 4)).toBeUndefined();
  });
});
