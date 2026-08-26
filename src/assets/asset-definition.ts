export type AssetDefinition = Readonly<{
  path: string;
  width: number;
  height: number;
  placeholderColor: number;
  sourceAvailable: boolean;
  kind?: 'image' | 'spritesheet';
  frameWidth?: number;
  frameHeight?: number;
}>;

export type AssetManifest = Readonly<Record<string, AssetDefinition>>;
