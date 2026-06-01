## Goal
1. Make the center cap color user-selectable (FABRIC_PRESETS swatches + custom hex input).
2. For 30" golf umbrellas, add a "double layer" option: an outer vented canopy over an inner canopy, each with independently customizable per-panel colors and artwork.

## Changes

### 1. Cap color
- `src/types/design.ts`: add `capColor?: string` to `DesignProject` (default `#111111`).
- `src/lib/storage.ts`: include `capColor: "#111111"` in `withDefaults`.
- `src/components/UmbrellaCanopy.tsx`: accept `capColor` prop; use it instead of hardcoded `#111111` for the center cap circle. Keep the existing "hide cap when full-canopy image present" logic.
- `src/pages/DesignEditor.tsx`: new "Cap color" section in the right panel showing the same `FABRIC_PRESETS` swatches plus a small hex input (`<input type="color">` + text field). Pass `capColor` to `UmbrellaCanopy`.
- `src/lib/export.ts`: pass `capColor` through to canopy exports.
- `src/i18n/i18n.tsx`: add `cap.title`, `cap.custom` strings.

### 2. Double-layer golf umbrella
- `src/types/design.ts`:
  - Add `hasDoubleLayer?: boolean`.
  - Add `innerLayer?: { fabricColor: string; panelColors?: Record<number, string>; artworkItems: ArtworkItem[] }`.
  - Only meaningful when `umbrellaCategory === "golf"`.
- `src/lib/storage.ts`: default `hasDoubleLayer: false`, `innerLayer: { fabricColor: "#f5f6f8", panelColors: {}, artworkItems: [] }`.
- `src/components/editor/WizardPanel.tsx`: when `category === "golf"`, show a new toggle "Double-layer canopy" (same toggle style as the pouch toggle). Hidden for folding/straight. Wire `hasDoubleLayer` + `onHasDoubleLayer`.
- `src/components/UmbrellaCanopy.tsx`:
  - Add optional props `innerLayer?: { fabricColor, panelColors, artwork }`, `showAsOuterVented?: boolean`, and `ventRingRatio` (default `0.78`).
  - When `showAsOuterVented` is true: render outer canopy panels with an inner cut-out ring (use a clip-path that is the outer polygon minus a smaller polygon at `ventRingRatio * radius`) so the inner layer shows through as a vent. The vent gap reveals the inner layer geometry.
  - Inner layer is rendered as a second, smaller canopy (radius * `ventRingRatio` minus a small overlap so it peeks through) drawn first, using the same `panelPath`/rib logic with its own `fabricColor`, `panelColors`, and `artwork`. Reuse the same `panelCentroid` math for inner artwork placement.
  - Selection still works on outer panels by default. Inner-layer interaction is driven by a new `activeLayer` prop (`"outer" | "inner"`); when `"inner"`, click handlers target inner panels and the outer is rendered with `pointerEvents: none` overlay.
- `src/pages/DesignEditor.tsx`:
  - Extend `activeSurface` state to include `"inner-canopy"` (existing values are `"canopy"` and `"pouch"`); only available when `hasDoubleLayer && category === "golf"`.
  - Add a tab in the top-center surface switcher: Canopy | Inner Layer | Pouch (Pouch and Inner Layer only show when their respective toggles are on; Inner Layer only when category is golf).
  - Route panel-color swatch picks, fabric color picks, and artwork CRUD (add/update/delete/select) to the correct layer based on `activeSurface`. Reuse the existing artwork helpers by parameterizing them with a `(get, set)` accessor for the active layer's `{ fabricColor, panelColors, artworkItems, selectedPanels }`.
  - When user switches `category` away from golf, force `hasDoubleLayer = false` and `activeSurface = "canopy"`.
  - Keep both SVG refs mounted (display toggle) for export, same pattern as pouch.
- `src/lib/export.ts`:
  - When `hasDoubleLayer && category === "golf"`, add a second canopy page to the PDF/AI export: "Inner layer" rendered as a normal full canopy (no vent) showing inner panel colors and artwork, plus pass `capColor` through.
  - Outer-layer export uses `showAsOuterVented` and includes the inner layer beneath, so the printed proof matches the on-screen composite.
- `src/i18n/i18n.tsx`: add `wiz.doubleLayer`, `wiz.doubleLayer.desc`, `surface.outer`, `surface.inner`, `surface.pouch`.

### 3. UX notes
- Cap color picker lives directly under the existing "Fabric color" section. The hex input mirrors selected swatch and vice versa.
- Inner-layer editing mirrors outer-layer: same per-panel selection model, same swatches, same artwork tools — only the data target changes via `activeSurface`.
- Vent ring thickness is fixed (≈22% of radius) for a clean visual; no UI to tune it.

## Out of scope
- Double layer for folding/straight categories.
- Per-rib structural detail (vent shape stays a simple inner polygon cut-out).
- Different cap shapes/materials, only color.
- Independent pouch for inner layer.
