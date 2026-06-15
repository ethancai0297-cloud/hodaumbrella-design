/**
 * Per-panel UV correction for the GLB-based 3D umbrella preview.
 *
 * The 2D editor numbers panels starting at the top panel (index 0) going
 * clockwise. The GLB names canopy panels `canopy_panel_01..08` starting at
 * the upper-right panel going clockwise.
 *
 * If the GLB UVs don't perfectly match the unrolled wedge orientation we
 * generate from the 2D raster, tweak this map WITHOUT editing the GLB.
 */
export interface PanelUvEntry {
  /** Which 2D panel (0-based, top=0, clockwise) feeds this 3D panel. */
  twoDIndex: number;
  /** Extra texture rotation in degrees (0/90/180/270). */
  rotationDeg: number;
  flipX: boolean;
  flipY: boolean;
}

export const panelUvCorrection: Record<string, PanelUvEntry> = {
  canopy_panel_01: { twoDIndex: 0, rotationDeg: 0, flipX: false, flipY: false },
  canopy_panel_02: { twoDIndex: 1, rotationDeg: 0, flipX: false, flipY: false },
  canopy_panel_03: { twoDIndex: 2, rotationDeg: 0, flipX: false, flipY: false },
  canopy_panel_04: { twoDIndex: 3, rotationDeg: 0, flipX: false, flipY: false },
  canopy_panel_05: { twoDIndex: 4, rotationDeg: 0, flipX: false, flipY: false },
  canopy_panel_06: { twoDIndex: 5, rotationDeg: 0, flipX: false, flipY: false },
  canopy_panel_07: { twoDIndex: 6, rotationDeg: 0, flipX: false, flipY: false },
  canopy_panel_08: { twoDIndex: 7, rotationDeg: 0, flipX: false, flipY: false },
};

export function getPanelUv(name: string): PanelUvEntry | null {
  const key = name.toLowerCase().replace(/\s+/g, "_");
  return panelUvCorrection[key] ?? null;
}

// Legacy exports — kept so older imports still resolve.
export const PANEL_INDEX_MAP: number[] = Array.from({ length: 8 }, (_, k) => {
  const e = panelUvCorrection[`canopy_panel_${String(k + 1).padStart(2, "0")}`];
  return e?.twoDIndex ?? k;
});
export const PANEL_UV_ROTATION_DEG: number[] = Array.from({ length: 8 }, (_, k) => {
  const e = panelUvCorrection[`canopy_panel_${String(k + 1).padStart(2, "0")}`];
  return e?.rotationDeg ?? 0;
});
export const PANEL_UV_FLIP_X: boolean[] = Array.from({ length: 8 }, (_, k) => {
  const e = panelUvCorrection[`canopy_panel_${String(k + 1).padStart(2, "0")}`];
  return e?.flipX ?? false;
});
export const PANEL_UV_FLIP_Y: boolean[] = Array.from({ length: 8 }, (_, k) => {
  const e = panelUvCorrection[`canopy_panel_${String(k + 1).padStart(2, "0")}`];
  return e?.flipY ?? false;
});
