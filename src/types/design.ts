export type UmbrellaCategory = "folding" | "straight" | "golf";
export type RibCount = 6 | 7 | 8 | 10;
export type PrintingMethod = "silkscreen" | "digital" | "color-change";
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

/** Surface finish of the BSS-ST-1 insert (盖片) and middle-section accent: matte or gloss only. */
export type HandleInsertFinish = "matte" | "gloss";

/** Older saved designs may still say "metal"; treat anything unknown as matte. */
export const normalizeFinish = (f?: string): HandleInsertFinish => (f === "gloss" ? "gloss" : "matte");

/** Customization of the BSS-ST-1 handle insert, a 15 × 70 mm plate on the handle. */
export interface HandleInsertOptions {
  color: string;
  finish?: HandleInsertFinish;
  /** Data URL of the logo printed / engraved on the insert. */
  logoSrc?: string;
  logoFileName?: string;
  /** Legacy logo size (0.2–1); superseded by artScale. */
  logoScale?: number;
  /** Text printed on the insert (with or after the logo). */
  text?: string;
  textColor?: string;
  /**
   * Artwork placement in the insert's horizontal frame (as in the horizontal
   * view: canopy end on the left). x/y: offset from centre as a fraction of
   * the plate's length/width (-0.5..0.5); scale: 1 = fits the plate height;
   * rotation: degrees, clockwise.
   */
  artX?: number;
  artY?: number;
  artScale?: number;
  artRotation?: number;
}

export const DEFAULT_HANDLE_INSERT: HandleInsertOptions = {
  color: "#8a8d8f",
  finish: "matte",
  logoScale: 0.6,
};

/** Printable area of the insert, millimetres. */
export const HANDLE_INSERT_SIZE_MM = { w: 15, h: 70 };

/**
 * A preset color swatch. `pantone` is the Pantone Solid Coated code the hex
 * comes from; the hex is the same one lib/pantone.ts returns for that code,
 * so picking the swatch and typing the code give the same color.
 * Hex values are lowercase to match what <input type="color"> reports.
 */
export interface ColorPreset {
  name: string;
  value: string;
  pantone?: string;
}

/** Handle insert and middle-section colors (plastic or plated parts). */
export const HANDLE_INSERT_PRESETS: ColorPreset[] = [
  { name: "Silver", value: "#8a8d8f", pantone: "877 C" },
  { name: "Gold", value: "#b9975b", pantone: "465 C" },
  { name: "Black", value: "#101820", pantone: "Black 6 C" },
  { name: "White", value: "#f5f5f3" },
  { name: "Navy", value: "#0c2340", pantone: "289 C" },
  { name: "Royal Blue", value: "#0033a0", pantone: "286 C" },
  { name: "Red", value: "#c8102e", pantone: "186 C" },
  { name: "Dark Green", value: "#154734", pantone: "3435 C" },
];

/**
 * Colors of the middle section (中段 / open button) above the BSS-ST-1 handle.
 * Two independent zones; an unset color means "same as the handle".
 */
export interface MidSectionOptions {
  /** Main body (the wide band). */
  bodyColor?: string;
  /** Accent parts: top/bottom rims, button frame, chevrons. */
  accentColor?: string;
  accentFinish?: HandleInsertFinish;
}

export const MID_SECTION_PRESETS: ColorPreset[] = HANDLE_INSERT_PRESETS;

/**
 * Open button on handles that have a separate button mesh (`handle_button`,
 * e.g. the 21" folding carabiner handle). Unset color = same as the handle.
 */
export interface HandleButtonOptions {
  color?: string;
  finish?: HandleInsertFinish;
}

/** Handle body colors (BSS-ST-1). Unset = the model's default handle color. */
export const HANDLE_COLOR_PRESETS: ColorPreset[] = [
  { name: "Black", value: "#101820", pantone: "Black 6 C" },
  { name: "Charcoal", value: "#333f48", pantone: "432 C" },
  { name: "Grey", value: "#707372", pantone: "424 C" },
  { name: "White", value: "#f5f5f3" },
  { name: "Navy", value: "#0c2340", pantone: "289 C" },
  { name: "Red", value: "#c8102e", pantone: "186 C" },
  { name: "Dark Green", value: "#154734", pantone: "3435 C" },
  { name: "Brown", value: "#693f23", pantone: "469 C" },
];

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
  /** Only used by models whose handle has a customizable insert (golf + BSS-ST-1). */
  handleInsert?: HandleInsertOptions;
  /** Handle body color (golf + BSS-ST-1). Unset = model default. */
  handleColor?: string;
  /** Only used by models with a customizable middle section (golf + BSS-ST-1). */
  midSection?: MidSectionOptions;
  /** Only used by models with a separate open-button mesh (folding + carabiner handle). */
  handleButton?: HandleButtonOptions;
  /** Rib tip (珠尾) color, for models whose tips are customizable (straight 23"). */
  tipColor?: string;
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

/** Canopy fabric colors that are commonly ordered, as Pantone Solid Coated codes. */
export const FABRIC_PRESETS: ColorPreset[] = [
  { name: "Black", value: "#101820", pantone: "Black 6 C" },
  { name: "Grey", value: "#707372", pantone: "424 C" },
  { name: "White", value: "#f5f5f3" },
  { name: "Navy", value: "#0c2340", pantone: "289 C" },
  { name: "Royal Blue", value: "#0033a0", pantone: "286 C" },
  { name: "Sky Blue", value: "#62b5e5", pantone: "2915 C" },
  { name: "Dark Green", value: "#154734", pantone: "3435 C" },
  { name: "Green", value: "#007a33", pantone: "356 C" },
  { name: "Red", value: "#c8102e", pantone: "186 C" },
  { name: "Burgundy", value: "#8a1538", pantone: "202 C" },
  { name: "Orange", value: "#ff671f", pantone: "165 C" },
  { name: "Yellow", value: "#ffcd00", pantone: "116 C" },
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
