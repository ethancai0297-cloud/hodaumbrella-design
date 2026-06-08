## Goal

Add an optional 3D preview mode to the existing Design Editor without changing the 2D editing experience. The 3D view reflects the live design state (artwork, colors, panels, layout, fit mode) and supports OrbitControls, preset camera views, frame toggle, PNG screenshot, and a new PDF page with top/front/side captures.

## Decisions (from clarifying answers)
- **GLB source:** Placeholder GLBs now, swap later. Registry + loader fully wired so production-quality GLBs drop in with no code changes.
- **Texture pipeline:** Rasterize the existing 2D `UmbrellaCanopy` SVG output per panel into canvas textures (debounced on edits).
- **PDF screenshots:** Auto-captured headlessly during PDF export by mounting the 3D scene offscreen.
- **Scope:** Canopy only in v1. Pouch and golf inner layer stay 2D-only.

## Changes

### 1. Dependencies
Add (exact versions, React 18 compatible):
- `three@^0.160` · `@react-three/fiber@^8.18` · `@react-three/drei@^9.122` · `three-stdlib` (for `GLTFLoader`).

### 2. Model registry — `src/3d/models/registry.ts` + JSON configs
Create a typed registry plus one JSON file per model under `src/3d/models/configs/`:
- `folding_21in_8panel_standard.json`
- `straight_23in_8panel_standard.json`
- `golf_30in_8panel_standard.json`

Each JSON matches the user-specified schema (model_id, category, display_name, rib_count, panel_count, rib_length_inch/cm, canopy_diameter_cm, canopy_height_cm, canopy_arc_length_cm, shaft_length_cm, shaft_diameter_mm, shaft_color, top_cap_style/dimensions/color, rib_tip_style/dimensions, ferrule_style, handle_style/material/color, canopy_material, canopy_layer, model_file, uv_template_file).

`registry.ts` exports `findModel(category, ribCount)` returning the config or `null`.

### 3. Placeholder GLB assets
Add three placeholder `.glb` files under `public/models/` with the required named meshes (`canopy_panel_01`..`canopy_panel_08`, `top_cap`, `shaft`, `rib_frame`, `rib_tip`, `handle`) and per-panel UVs. They are built once with a small Node script (`scripts/build-placeholder-glbs.mjs`, run manually) using `three`'s exporter so the runtime only loads finished `.glb`s. Real GLBs drop into the same path later.

### 4. 3D preview components — `src/components/3d/`
- `UmbrellaScene.tsx` — `<Canvas>` host: lighting, ground shadow, `OrbitControls`, ref-forwarded `gl` for screenshots.
- `UmbrellaModel.tsx` — loads the model GLB via `useGLTF`, locates named meshes, applies per-panel materials/textures and shaft/handle/cap colors from the config + project state. Honors `showFrame` to hide/show `rib_frame` + `rib_tip`.
- `useCanopyTextures.ts` — debounced hook that renders the existing `UmbrellaCanopy` SVG (offscreen, single panel at a time for per-panel/selected layouts, or one atlas for full-canopy wrap) to `HTMLCanvasElement`s and returns `CanvasTexture[]` keyed by panel index. Reuses scale/rotation/offset/fit-mode/printArea values verbatim.
- `CameraPresets.tsx` — buttons (Top / Front / Side / Bottom / Reset) that tween the OrbitControls target+position.
- `ScreenshotButton.tsx` — calls `gl.domElement.toDataURL("image/png")` after a forced render, downloads via existing `downloadDataUrl`.

### 5. Editor integration — `src/pages/DesignEditor.tsx`
- Add `viewMode: "2d" | "3d"` state. Add a segmented toggle `[ 2D Design | 3D Preview ]` next to the existing zoom controls.
- 2D mode: unchanged.
- 3D mode: render `<UmbrellaScene>` in the same canvas slot. Pass the current `project` (category, ribCount, fabricColor, panelColors, capColor, artworkItems, selectedPanels). Show frame toggle and preset buttons in the toolbar.
- If `findModel(category, ribCount)` returns null, render a centered message with the exact copy:
  > "3D preview is not available for this specification yet. Please use the 2D preview or contact our sales team."
  Add the same string to `i18n.tsx` (EN + ZH).
- No change to existing save/undo/reset/PNG/AI export.

### 6. PDF upgrade — `src/lib/export.ts`
- Add new function parameter `threeDCaptures?: { top: string; front: string; side: string; modelId: string; topCap: string; handle: string }` to `exportPdfSummary`.
- When provided, append a new page titled **"3D Sales Preview"** containing the three captures in a row, a small spec table (Model ID, Top cap style, Handle style), and the disclaimer:
  > "The 3D preview is for sales visualization only. Final production details must be confirmed by the factory designer."
- In `DesignEditor.tsx`'s PDF export handler, if a 3D model exists for the spec, mount `<UmbrellaScene>` inside a hidden 512×512 container, capture three preset views via `gl.domElement.toDataURL`, unmount, then call `exportPdfSummary` with the captures.

### 7. i18n — `src/i18n/i18n.tsx`
Add keys (EN + ZH): `view.2d`, `view.3d`, `threeD.unavailable`, `threeD.showFrame`, `threeD.hideFrame`, `threeD.top`, `threeD.front`, `threeD.side`, `threeD.bottom`, `threeD.reset`, `threeD.screenshot`, `pdf.threeDTitle`, `pdf.threeDDisclaimer`.

## Out of scope (v1)
- Pouch 3D, double-layer inner-canopy 3D, opening/closing animations, replacing 2D PNG export, mobile-specific orbit gestures beyond drei defaults, real photogrammetry GLBs.

## Technical notes
- Texture updates are debounced (~150 ms) and use `CanvasTexture.needsUpdate = true` to avoid GPU churn while sliders move.
- Per-panel UVs in placeholder GLBs cover `[0,1]` so the rasterized SVG slice maps 1:1.
- OrbitControls min/max distance derived from `canopy_diameter_cm` so all sizes frame correctly.
- Screenshot capture forces `gl.render(scene, camera)` synchronously before `toDataURL` to avoid blank frames.
