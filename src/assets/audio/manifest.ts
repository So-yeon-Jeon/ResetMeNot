export type BgmAsset = Readonly<{
  path: string;
}>;

export const BGM_ASSET_MANIFEST: Readonly<Record<string, BgmAsset>> = {
  'bgm-chapter1-2': {
    path: new URL('./chapter1-2.mp3', import.meta.url).href,
  },
  'bgm-chapter3': {
    path: new URL('./chapter3.mp3', import.meta.url).href,
  },
  'bgm-chapter4': {
    path: new URL('./chapter4.mp3', import.meta.url).href,
  },
  'bgm-chapter5': {
    path: new URL('./chapter5.mp3', import.meta.url).href,
  },
};
