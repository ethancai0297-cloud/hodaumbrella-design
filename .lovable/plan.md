# Color-changing silkscreen printing method

Add a third printing method, "Color-changing silkscreen", to the umbrella editor. When selected, the canopy preview renders the artwork in its **dry (white)** state by default. The user can reveal the real (wet) colors by either hovering the canopy, or toggling a Dry / Wet switch on the canvas toolbar.

## What changes for the user

1. In the Printing Method step of the wizard, a new option appears next to Silkscreen and Digital:
   - **Color-changing silkscreen** — "Prints turn white when dry and reveal full color when wet."
2. When selected:
   - The canopy preview shows all uploaded artwork (logos, images, text) as solid white silhouettes.
   - A small **Dry / Wet** toggle appears in the canvas toolbar (next to zoom).
   - Hovering anywhere over the canopy temporarily switches to the wet (real-color) state; moving the mouse away returns to dry. The manual toggle overrides hover and pins one state.
3. Pouch preview and exports keep showing the real (wet) colors so factories still get the artwork to print. A note on the canvas reads: "Preview shows dry/wet effect. Production files use the real colors."
4. No new uploads required — the dry state is derived automatically from whatever artwork is already placed (logos, images, text).

## Technical notes

- `src/types/design.ts`: extend `PrintingMethod` to `"silkscreen" | "digital" | "color-change"`.
- `src/components/editor/WizardPanel.tsx`: add a third selector card; add i18n keys `wiz.colorChange` / `wiz.colorChange.desc` in `src/i18n/i18n.tsx` (EN + ZH).
- `src/components/UmbrellaCanopy.tsx`: add two optional props `dryMode?: boolean` and `onHoverDryChange?: (hovering: boolean) => void`. When `dryMode` is true:
  - Text artwork renders with `fill="#ffffff"`.
  - Image / logo artwork is wrapped in an SVG `<filter>` that maps any non-transparent pixel to white (use `feColorMatrix` to desaturate + brighten, or `feComponentTransfer` setting RGB to 1 while preserving alpha). Apply via `filter="url(#dry-white)"` on the `<image>` elements only.
  - Center cap unaffected.
- `src/pages/DesignEditor.tsx`:
  - New local state `dryToggle: "dry" | "wet" | "auto"` (default `"auto"` when method is color-change).
  - New local state `hovering: boolean` driven by `onMouseEnter` / `onMouseLeave` on the canvas wrapper.
  - Effective `dryMode = method==='color-change' && (toggle==='dry' || (toggle==='auto' && !hovering))`.
  - Render a small `ToggleGroup` (Dry / Wet / Auto) in the existing canvas toolbar, only when method is color-change.
  - Pass `dryMode={false}` to the pouch canvas and to the offscreen SVG used by `exportAiFile` / `svgToPngDataUrl` so exports always reflect the real colors.
- Existing silkscreen color-limit warning (`SILKSCREEN_LIMITS`) also applies to color-change (same screen count rules).

No backend, storage, or schema changes. No new dependencies.
