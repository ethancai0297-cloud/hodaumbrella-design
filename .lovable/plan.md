## Goal
Allow each umbrella panel to have its own fabric color, and add 7 as a rib-count option alongside 6/8/10.

## Changes

### 1. Rib counts (add 7)
- `src/types/design.ts`: change `RibCount` to `6 | 7 | 8 | 10`.
- `src/components/editor/WizardPanel.tsx`: add `7` to the `ribs` array so the picker shows 6 / 7 / 8 / 10.
- `src/components/UmbrellaCanopy.tsx` already builds panels dynamically from `ribCount`, so 7-panel geometry will render automatically (heptagon outline, 7 wedges).

### 2. Per-panel fabric colors
- `src/types/design.ts`: add an optional `panelColors?: Record<number, string>` to `DesignProject`. Keep the existing single `fabricColor` as the default/base color (used for any panel without an override and for new panels when rib count changes).
- `src/lib/storage.ts`: include `panelColors: {}` in `withDefaults` so old saved projects load cleanly.
- `src/components/UmbrellaCanopy.tsx`:
  - Accept a new `panelColors` prop.
  - When rendering each `<path>` panel, use `panelColors[i] ?? fabricColor` for fill.
  - The base hexagon/heptagon/etc. polygon and the outline keep using `fabricColor` (so seams between differently colored panels stay clean — the per-panel paths paint on top).
  - Recompute `isLight` / `ribStroke` per panel so rib lines stay visible on both light and dark panels. (Outline stroke stays based on `fabricColor`.)
- `src/pages/DesignEditor.tsx`:
  - Add `panelColors` state synced with the project.
  - When the user has one or more panels selected (existing selection mechanism) and picks a swatch from the color section, apply that color to each selected panel in `panelColors` instead of overwriting the global `fabricColor`. When no panels are selected, the swatch updates `fabricColor` (current behavior) and also acts as the default for un-overridden panels.
  - Add a small "Reset panel colors" button that clears `panelColors` back to the base color.
  - Pass `panelColors` through to `UmbrellaCanopy` (both the editor canvas and any preview instance, e.g. on the Projects card and Landing preview if they render the canopy).
- `src/lib/export.ts`: pass `panelColors` through to the canopy used in PNG/PDF/AI exports so the multicolor canopy exports correctly. The AI export already renders the same SVG, so once the component reads `panelColors` the vector export inherits it.
- `src/i18n/i18n.tsx`: add strings for "Panel color", "Applies to selected panels", "Reset panel colors", and update the rib-count helper text if needed.

### 3. UX notes
- Selection model is unchanged: click a panel on the canopy to select it (multi-select already supported), then pick a color swatch — only the selected panels change. This matches how artwork is already applied to selected panels.
- The existing pouch feature is unaffected (pouch color is not per-panel).

## Out of scope
- Custom hex picker per panel (still uses the existing `FABRIC_PRESETS` swatches).
- Different colors on the pouch.
- Gradient or pattern fills per panel.
