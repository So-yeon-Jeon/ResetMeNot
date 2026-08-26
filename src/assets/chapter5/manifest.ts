import { CHAPTER1_ASSET_MANIFEST } from '../chapter1/manifest';
import type { AssetManifest } from '../asset-definition';

/** Final Room deliberately reuses the established gothic interior atlas. */
export const CHAPTER5_ASSET_MANIFEST: AssetManifest = {
  ...CHAPTER1_ASSET_MANIFEST,
  'chapter5-final-clock-base': {
    path: new URL('./furniture/final_clock_base.png', import.meta.url).href,
    width: 1414,
    height: 1112,
    placeholderColor: 0x8b5a2b,
    sourceAvailable: true,
  },
  'chapter5-final-clock-minute-hand': {
    path: new URL('./furniture/final_clock_minute_hand.png', import.meta.url).href,
    width: 1024,
    height: 1536,
    placeholderColor: 0xb87924,
    sourceAvailable: true,
  },
};
