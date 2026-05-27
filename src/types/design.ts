export type UmbrellaCategory = "folding" | "straight" | "golf";
export type RibCount = 6 | 7 | 8 | 10;
export type PrintingMethod = "silkscreen" | "digital";
export type FitMode = "cover" | "contain" | "stretch";
export type PrintArea = "single" | "selected" | "full" | "full-canopy";
export type ArtworkType = "logo" | "text" | "image";

export interface ArtworkItem {
  id: string;
  type: ArtworkType;
  // For image/logo: data URL. For text: rendered as text.
  src?: string;
  fileName?: string;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  x: number; // -1..1 within panel (0 = center)
  y: number;
  scale: number; // relative size
  rotation: number; // degrees
  panels: number[]; // panel indices the item is applied to
  fitMode?: FitMode;
  printArea?: PrintArea; // for digital
}

export type PouchView = "spread" | "front";

export interface DesignProject {
  id: string;
  projectName: string;
  customerName?: string;
  umbrellaCategory: UmbrellaCategory;
  ribCount: RibCount;
  printingMethod: PrintingMethod;
  fabricColor: string;
  panelColors?: Record<number, string>;
  artworkItems: ArtworkItem[];
  hasPouch?: boolean;
  pouchArtwork?: ArtworkItem[];
  pouchView?: PouchView;
  createdAt: number;
  updatedAt: number;
}

// Real-world pouch sizes (front face W × H in cm). Spread layout is 2× width.
export const POUCH_SIZE_CM: Record<UmbrellaCategory, { w: number; h: number }> = {
  folding: { w: 8, h: 24 },
  straight: { w: 9, h: 27 },
  golf: { w: 11, h: 34 },
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

// Real-world rib length (center → tip) in centimeters
export const PANEL_LENGTH_CM: Record<UmbrellaCategory, number> = {
  folding: 53.5,
  straight: 58.5,
  golf: 75,
};

// Real-world rib length (center → tip) in inches
export const PANEL_LENGTH_IN: Record<UmbrellaCategory, number> = {
  folding: 21,
  straight: 23,
  golf: 30,
};
