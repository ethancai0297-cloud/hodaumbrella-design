
## Goal

Fix the artwork mapping on the Folding 21" 8-panel GLB so each 2D panel lands on the correct 3D `canopy_panel_0X` mesh, with no stripe/wrap artifacts and a debug overlay to verify panel order before trusting real artwork. Keep the 2D editor and overall workflow unchanged.

## Scope

Only these files change. No 2D editor, storage, i18n schema, or export-pipeline rewrites.

- `src/3d/models/registry.ts` — gate GLB to Folding + 8 panels
- `src/3d/uvCorrection.ts` — formalize `panelUvCorrection` map + helpers
- `src/components/3d/usePerPanelTextures.ts` — fix sampling, add fabric bg fill, debug-number mode, configurable `flipY`
- `src/components/3d/GLBUmbrellaModel.tsx` — strict canopy-only material binding, per-panel mapping via UV correction, fabric color on unselected panels, debug pass-through
- `src/components/3d/UmbrellaScene.tsx` — pass `debugPanelNumbers` + `flipY` props through
- `src/pages/DesignEditor.tsx` — add temporary "Show panel numbers" toggle next to existing 3D controls (only visible in 3D mode for Folding 8-panel)

## Fixes

### 1. GLB only for Folding + 8 panels
In `registry.ts::findModel`, only return the folding GLB entry when `category === "folding" && ribCount === 8`. Straight/Golf and any other rib count fall back to the procedural `UmbrellaModel`. Removes the chance of the wrong mesh being skinned with sliced wedges. Other configs lose `model_file` so the existing `useGLB` check in `UmbrellaScene` keeps working.

### 2. Stripe / wrapping artifact root cause
The current `unrollPanel` samples one wedge of the rasterized full-canopy SVG and writes into a rect texture. Stripes happen because (a) pixels at `v→0` (apex) all collapse to a single source pixel, smearing it horizontally; (b) UVs that land just outside the wedge bleed into adjacent panels because the texture has `ClampToEdgeWrapping` but the edge pixels are transparent over a white-cleared canvas — three.js then averages with neighbors creating vertical seams; (c) panels are indexed by `panelIndex - 0.5` but the 2D editor's `panelPath` actually starts at `-π/2 + i * sliceAngle - sliceAngle/2`, so the rotation offset is one half-slice off compared to the GLB which starts at upper-right (panel 1 = top-right per spec).

Fixes in `usePerPanelTextures.ts`:
- Pre-fill output canvas with the **fabric color** (opaque), not transparent. Eliminates seam bleed and gives unselected panels a clean look.
- Add a **1-px guard inset** when sampling near `u=0` and `u=1` so we never read across the wedge boundary.
- Replace per-pixel `ImageData` write with `ctx.drawImage` + a polar→cartesian mesh-grid using `save/clip` on a wedge `Path2D`, then warp via a single nearest-neighbor pass that snaps `r ≥ 1` (skips apex singularity row). Apex row is filled with the sampled center pixel only — kills the apex smear stripe.
- Expose `flipY` as a parameter (default `true`, matching three.js convention) and apply it before the polar transform so PANEL_UV_FLIP_Y composes correctly.
- Add `debugPanelNumbers: boolean` mode: when on, skip rasterization entirely and draw a fabric-color rect with the panel number (1–8) in large bold white text, centered. Returns one canvas per panel.

### 3. Correct panel index mapping
Per spec: GLB `canopy_panel_01` = upper-right when viewed from top, going clockwise. The 2D editor numbers panel 0 = top, clockwise. So GLB panel 1 corresponds to 2D panel 0 or 1 depending on the half-slice offset — verified via the new debug numbers.

In `uvCorrection.ts` replace the loose arrays with a single canonical map:
```ts
export const panelUvCorrection: Record<string, {
  twoDIndex: number; rotationDeg: number; flipX: boolean; flipY: boolean;
}> = {
  canopy_panel_01: { twoDIndex: 0, rotationDeg: 0, flipX: false, flipY: false },
  canopy_panel_02: { twoDIndex: 1, rotationDeg: 0, flipX: false, flipY: false },
  // ... through 08
};
```
Keep legacy exports as thin wrappers so existing imports still compile.

### 4. Material binding (GLBUmbrellaModel.tsx)
- Whitelist: only meshes whose lowercased name matches `^canopy_panel_(\d+)$` get a new material. Everything else (`shaft*`, `handle*`, `handle_string*`, `rib_frame*`, root group) keeps its baked material — explicit comment + early return per mesh.
- For each canopy mesh: look up its entry in `panelUvCorrection`, fetch `panelTextures[entry.twoDIndex]`, set on the material. When `printArea === "selected"` and the 2D panel isn't in the selected set, set `mat.map = null` and `mat.color = fabricColor` instead.
- `texture.wrapS/T = ClampToEdgeWrapping`, `flipY` from prop, `needsUpdate = true`. Never `RepeatWrapping`.
- Per-panel material instances so toggling selection on one panel doesn't invalidate others.

### 5. Per-panel repeat & selected modes
`usePerPanelTextures` already receives the SVG of the full canopy. Add a `mode: "wrap" | "repeat" | "selected"` + `selectedPanels: number[]` param. Logic:
- **wrap** → slice the full canopy raster (current behavior, with fixes above).
- **repeat** → rasterize one panel wedge (panel 0) and clone its canvas to all selected; non-selected get a fabric-color canvas.
- **selected** → same as repeat but unselected panels return a plain fabric canvas (no artwork).

DesignEditor passes `printArea`, `selectedPanels`, and `fabricColor` through props.

### 6. Debug "Show panel numbers" toggle
- Add `const [debugPanelNumbers, setDebugPanelNumbers] = useState(false)` in `DesignEditor`.
- Render a small ghost button alongside the existing "Show/Hide frame" button, only when `viewMode==="3d"` and the active model is `folding_21in_8panel_standard`.
- Pass through `UmbrellaScene` → `GLBUmbrellaModel` → `usePerPanelTextures`. When true, hook returns the number-stamped canvases regardless of SVG state.

### 7. iPad Safari smoothness
- Already using `dpr={[1, 2]}` — keep.
- Debounce texture rebuild already exists (140 ms). Bump panel canvases to `256×256` when `debugPanelNumbers` is true to cut GPU upload cost.
- Ensure we dispose old textures (already done) and don't recreate `MeshStandardMaterial` per render — current code already memoizes; verify no new allocation per panel-select change.

## Technical Notes

- No GLB edits. All correction lives in `uvCorrection.ts`.
- `flipY` default = `true` (three.js convention). If after debug numbers look mirrored, flip to `false` in the registry's UV correction without touching code.
- The 2D wedge angle offset will be visually confirmed via debug numbers; if `canopy_panel_01` shows "2" rather than "1", we shift `twoDIndex` values by one in `panelUvCorrection` only — no other code changes.

## Out of Scope

Procedural model styling, 2D editor, PDF/export pipeline, i18n strings beyond the toggle label, pouch/double-layer, opening/closing animation.

## Verification Checklist

1. Switch to Folding + 8 panels, enter 3D mode, toggle "Show panel numbers" → digits 1–8 appear once each, in clockwise order starting upper-right.
2. Turn off debug; load a wrap-mode design → no vertical stripes, no apex smear, panel boundaries crisp.
3. Switch to "Per-panel repeat" with 3 selected → only those 3 panels show artwork; rest are fabric color.
4. Switch to Straight or 6-panel → falls back to procedural model (no GLB load).
5. Rotate the model on touch device → smooth, no texture rebuild on rotation.
