import type { AssetManifest } from '../asset-definition';

export const ENDING_ASSET_MANIFEST: AssetManifest = {
  'ending-room': {
    path: new URL('./ending_room.png', import.meta.url).href,
    width: 1672,
    height: 941,
    placeholderColor: 0x8b674e,
    sourceAvailable: true,
  },
  'ending-book': {
    path: new URL('./ending_book.png', import.meta.url).href,
    width: 1672,
    height: 941,
    placeholderColor: 0xc69b68,
    sourceAvailable: true,
  },
  'ending-trace': {
    path: new URL('./ending_trace.png', import.meta.url).href,
    width: 1672,
    height: 941,
    placeholderColor: 0x675d72,
    sourceAvailable: true,
  },
  'ending-title': {
    path: new URL('./ending_title.png', import.meta.url).href,
    width: 1254,
    height: 1254,
    placeholderColor: 0x17162b,
    sourceAvailable: true,
  },
};
