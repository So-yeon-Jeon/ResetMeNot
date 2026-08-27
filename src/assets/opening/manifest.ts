import type { AssetManifest } from '../asset-definition';

export const OPENING_ASSET_MANIFEST: AssetManifest = {
  'opening-title': {
    path: new URL('./title_landing.png', import.meta.url).href,
    width: 1536,
    height: 1024,
    placeholderColor: 0x090911,
    sourceAvailable: true,
  },
  'opening-reading': {
    path: new URL('./prologue_reading.png', import.meta.url).href,
    width: 1672,
    height: 941,
    placeholderColor: 0x1d1a20,
    sourceAvailable: true,
  },
  'opening-asleep': {
    path: new URL('./prologue_asleep.png', import.meta.url).href,
    width: 1672,
    height: 941,
    placeholderColor: 0x1d1a20,
    sourceAvailable: true,
  },
  'opening-clock-tick': {
    path: new URL('./prologue_clock_tick.png', import.meta.url).href,
    width: 1672,
    height: 941,
    placeholderColor: 0x11142a,
    sourceAvailable: true,
  },
  'opening-strange-room': {
    path: new URL('./prologue_strange_room.png', import.meta.url).href,
    width: 1672,
    height: 941,
    placeholderColor: 0x101321,
    sourceAvailable: true,
  },
  'opening-dialogue-window': {
    path: new URL('./dialogue_window.png', import.meta.url).href,
    width: 2172,
    height: 724,
    placeholderColor: 0x111019,
    sourceAvailable: true,
  },
};
