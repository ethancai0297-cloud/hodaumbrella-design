/**
 * Per-panel UV correction for the GLB-based 3D umbrella preview.
 *
 * The 2D editor numbers panels starting at the top panel (index 0) going
 * clockwise. The GLB names canopy panels `canopy_panel_01..08` starting at
 * the upper-right panel going clockwise (per model spec).
 *
 * If the GLB UVs don't perfectly match the unrolled wedge orientation we
 * generate from the 2D raster, tweak these maps WITHOUT editing the GLB.
 *
 *   - PANEL_INDEX_MAP[k] = 2D panel index used to texture GLB
 *     canopy_panel_(k+1). Default rotates 2D top→3D upper-right.
 *   - PANEL_UV_ROTATION_DEG[k] = extra texture rotation (0/90/180/270)
 *     applied to panel k. Use 180 if the artwork is upside-down on a panel,
 *     90/270 if it's sideways.
 *   - PANEL_UV_FLIP_X[k] / PANEL_UV_FLIP_Y[k] = mirror correction.
 */
export const PANEL_INDEX_MAP: number[] = [
  // GLB panel 01..08 -> 2D panel index
  // Default identity: GLB panel 01 = 2D panel 0. Adjust on QA.
  0, 1, 2, 3, 4, 5, 6, 7,
];

export const PANEL_UV_ROTATION_DEG: number[] = [0, 0, 0, 0, 0, 0, 0, 0];
export const PANEL_UV_FLIP_X: boolean[] = [false, false, false, false, false, false, false, false];
export const PANEL_UV_FLIP_Y: boolean[] = [false, false, false, false, false, false, false, false];
