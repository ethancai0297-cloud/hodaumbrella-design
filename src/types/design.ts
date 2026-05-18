export type UmbrellaCategory = "folding" | "straight" | "golf";
export type RibCount = 6 | 8 | 10;
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

export interface DesignProject {
  id: string;
  projectName: string;
  customerName?: string;
  umbrellaCategory: UmbrellaCategory;
  ribCount: RibCount;
  printingMethod: PrintingMethod;
  fabricColor: string;
  artworkItems: ArtworkItem[];
  createdAt: number;
  updatedAt: number;
}

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
