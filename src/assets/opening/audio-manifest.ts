export type OpeningAudioAsset = Readonly<{
  path: string;
}>;

export const OPENING_AUDIO_ASSET_MANIFEST: Readonly<Record<string, OpeningAudioAsset>> = {
  'opening-title': {
    path: new URL('./title_opening.mp3', import.meta.url).href,
  },
  'opening-prologue': {
    path: new URL('./prologue.mp3', import.meta.url).href,
  },
};
