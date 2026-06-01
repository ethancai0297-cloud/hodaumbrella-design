## Goal
Fix the double-layer golf umbrella so it matches real-world styles:
1. **Vented** — main canopy is full-size with a central vent opening; a smaller top cap sits above it (covering the vent center) with a visible air gap. Both split into the same number of panels, ribs aligned.
2. **Double canopy** — two full-size canopies of identical radius, both split into the same panel count, edited independently.

Today's behavior (outer rendered as a thin ring, inner shown underneath) is wrong and gets replaced.

## Changes

### 1. Data model — `src/types/design.ts`
- Add `doubleLayerStyle?: "vented" | "double"` (default `"vented"`) to `DesignProject`.
- Keep existing `hasDoubleLayer` and `innerLayer` shape.

### 2. Storage — `src/lib/storage.ts`
- Default `doubleLayerStyle: "vented"` in `withDefaults`.

### 3. Wizard — `src/components/editor/WizardPanel.tsx`
- When `hasDoubleLayer && category === "golf"`, show a small segmented control under the existing toggle: **Vented top cap** | **Double canopy**.
- Wire `doubleLayerStyle` + setter.

### 4. Canopy renderer — `src/components/UmbrellaCanopy.tsx`
Replace the current "outer ring over inner smaller canopy" composite with two style branches:

**Vented (`doubleLayerStyle === "vented"`):**
- Outer = full canopy at `radius`, split into `ribCount` panels (existing `panelPath`), with a circular vent hole punched in the center. Implement via a `<mask>`: white full polygon minus a black circle at `radius * 0.32` (vent opening). All outer panels clip through this mask so the vent shows through.
- Inner = a smaller "top cap" canopy at `radius * 0.42` (slightly larger than the vent so it overlaps the outer by ~10 px, creating the visible cover-with-air-gap look). Same `ribCount`, same angular split → rib seams align with outer.
- Inner is drawn ON TOP of outer (z-order flipped vs. today). Drop shadow under inner to imply the air gap.
- Cap circle stays at the very center, on top of inner.

**Double (`doubleLayerStyle === "double"`):**
- Inner radius = outer radius (both full size, same panel split).
- Only one layer is visible at a time in the editor — driven by `activeLayer`. Render the active layer full-size; render the other layer as a faint dimmed preview (or hidden, controlled by an `editMode` flag) so the user can edit each cleanly.
- Both ribs/panels obviously align since same count and radius.

Shared:
- Inner layer always uses `ribCount` panels (today already true) — confirm panel paths, rib lines, and centroids all use `ribCount`, not a different count.
- Selection, artwork placement, drag math reuse existing `renderLayer` helper; only `outerR` / `innerR` per layer change.
- Remove `ventInnerR` / `innerOuterR` ring-cutout logic; replace with the mask-based vent for vented style.
- Add `doubleLayerStyle` prop; default behaves like today's single layer when `hasInner` is false.

### 5. Editor — `src/pages/DesignEditor.tsx`
- Pass `doubleLayerStyle` to `UmbrellaCanopy`.
- When `doubleLayerStyle === "double"`, the Outer/Inner tab switch also controls which layer is rendered visibly (other layer dimmed at ~25% opacity for spatial reference).
- Force `doubleLayerStyle = "vented"` whenever `hasDoubleLayer` is toggled on for the first time.

### 6. Export — `src/lib/export.ts`
- Vented: single composite page (outer with vent + inner cap on top) + a second page showing the inner cap flat for the printer.
- Double: two full-canopy pages (Outer, Inner), each rendered without the dim/preview overlay.

### 7. i18n — `src/i18n/i18n.tsx`
- Add `wiz.layerStyle`, `wiz.layerStyle.vented`, `wiz.layerStyle.double`.

## Out of scope
- Adjustable vent hole size / cap overlap (fixed ratios).
- Animated air-gap shadow.
- Per-panel structural shapes (still flat triangles).
- Double-layer for folding/straight categories.
