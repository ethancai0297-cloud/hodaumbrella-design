## Goal
Change the small dot at the center of the umbrella canopy (the "tip cap") so it adapts to context:

- **Silkscreen mode with no uploaded image** → keep the cap visible and black.
- **As soon as any image/logo artwork is uploaded** (silkscreen logo, digital print, full-canopy wrap) → make the cap fully transparent so it doesn't cover artwork at the center.

Applies on both the Landing page preview and the Design editor preview.

## Changes

### `src/components/UmbrellaCanopy.tsx`
- Compute `hasImageArtwork = artwork.some(a => (a.type === "image" || a.type === "logo") && a.src)`.
- At the bottom of the SVG, replace the two center circles (`circle r={centerR+2}` and `circle r={centerR}`) with a single circle:
  - If `hasImageArtwork` → render with `fill="transparent"` and no stroke (effectively hidden), or skip rendering entirely.
  - Else → render as a solid black dot (`fill="#111"`), regardless of fabric color (per request: "When it's only silk screen, make it black").
- Text-only artwork still counts as "no image", so the black dot remains for pure silkscreen text designs.

### `src/pages/Landing.tsx`
- No code change needed — it consumes the same `UmbrellaCanopy` component, so the behavior follows automatically. If the landing preview has a hardcoded sample with no artwork it will show the black dot; once an image is added it disappears.

### `src/pages/DesignEditor.tsx`
- No change needed — same component.

## Out of scope
- Rib lines, panel outline, fabric color, artwork placement, drag logic — all untouched.
