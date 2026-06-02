export type UmbrellaCategory = "folding" | "straight" | "golf";
export type RibCount = 6 | 7 | 8 | 10;
export type PrintingMethod = "silkscreen" | "digital";
export type FitMode = "cover" | "contain" | "stretch";
export type PrintArea = "single" | "selected" | "full" | "full-canopy";
export type ArtworkType = "logo" | "text" | "image";

export interface ArtworkItem {
  id: string;
  type: ArtworkType;
  src?: string;
  fileName?: string;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  panels: number[];
  fitMode?: FitMode;
  printArea?: PrintArea;
}

export type PouchView = "spread" | "front";
export type DoubleLayerStyle = "vented" | "double";

export interface InnerLayerData {
  fabricColor: string;
  panelColors?: Record<number, string>;
  artworkItems: ArtworkItem[];
}

export interface DesignProject {
  id: string;
  projectName: string;
  customerName?: string;
  umbrellaCategory: UmbrellaCategory;
  ribCount: RibCount;
  printingMethod: PrintingMethod;
  fabricColor: string;
  panelColors?: Record<number, string>;
  capColor?: string;
  artworkItems: ArtworkItem[];
  hasPouch?: boolean;
  pouchArtwork?: ArtworkItem[];
  pouchView?: PouchView;
  hasDoubleLayer?: boolean;
  doubleLayerStyle?: DoubleLayerStyle;
  innerLayer?: InnerLayerData;
  createdAt: number;
  updatedAt: number;
}

export const POUCH_SIZE_CM: Record<UmbrellaCategory, { w: number; h: number }> = {
  folding: { w: 8, h: 24 },
  straight: { w: 8, h: 85 },
  golf: { w: 8, h: 102 },
};

export const FABRIC_PRESETS: { name: string; value: string }[] = [
  { name: "Black", value: "#111418" },
  { name: "Navy", value: "#0f1f3d" },
  { name: "White", value: "#f5f6f8" },
  { name: "Red", value: "#c0252c" },
  { name: "Yellow", value: "#f2c14e" },
  { name: "Green", value: "#1f7a4d" },
  { name: "Royal Blue", value: "#1f56c3" },
  { name: "Grey", value: "#6b7280" },
];

export const PANEL_LENGTH_CM: Record<UmbrellaCategory, number> = {
  folding: 53.5,
  straight: 58.5,
  golf: 75,
};

export const PANEL_LENGTH_IN: Record<UmbrellaCategory, number> = {
  folding: 21,
  straight: 23,
  golf: 30,
};
