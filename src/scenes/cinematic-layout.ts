export type DisplaySize = Readonly<{ width: number; height: number }>;

export function containDisplaySize(source: DisplaySize, bounds: DisplaySize): DisplaySize {
  if (source.width <= 0 || source.height <= 0 || bounds.width <= 0 || bounds.height <= 0) {
    return { width: 0, height: 0 };
  }

  const scale = Math.min(bounds.width / source.width, bounds.height / source.height);
  return {
    width: source.width * scale,
    height: source.height * scale,
  };
}
