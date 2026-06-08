## Goal

Make the color-change preview trigger only when the cursor is directly over a printed artwork item. When the mouse leaves the artwork, the design returns to white. Keep the Dry / Wet buttons as a manual override; Auto becomes the hover-driven mode.

## Changes

### 1. `src/components/UmbrellaCanopy.tsx`

- Add an optional `onArtworkHoverChange?: (hovered: boolean) => void` prop.
- Wrap each rendered artwork `<g>` (the full-canopy image group at ~L261 and per-panel groups at ~L290 for both image and text items) with `onPointerEnter={() => onArtworkHoverChange?.(true)}` and `onPointerLeave={() => onArtworkHoverChange?.(false)}`.
- Apply the same wiring to the inner-layer artwork render path so double-layer golf umbrellas behave the same.
- No change to how `dryMode` is consumed — the parent still owns the boolean.

### 2. `src/pages/DesignEditor.tsx`

- Rename `canopyHover` → `artworkHover` (state + setter) and stop using the wrapper `<div>`'s `onMouseEnter`/`onMouseLeave` for it (remove those two handlers on L719–720; the wrapper div stays for layout).
- Pass `onArtworkHoverChange={setArtworkHover}` to `<UmbrellaCanopy>`.
- Update the `dryMode` expression on L737–740 to read:
  `project.printingMethod === "color-change" && (dryToggle === "dry" || (dryToggle === "auto" && !artworkHover))`
- Keep the Auto / Dry / Wet segmented toggle (L639–650) untouched — Auto = hover-driven, Dry = always white, Wet = always colored.

### 3. Copy tweak — `src/i18n/i18n.tsx`

- Update the `canvas.colorChangeHint` string (EN + ZH) so it reflects the new behavior, e.g. "Hover over the artwork to preview the wet color; move away to see it dry."

## Out of scope

- No changes to the pouch surface, exports, artwork transforms, or the print-method selector.
- No styling or layout changes to the canvas toolbar.
