## Goal

Three fixes for the 3D preview on `/design`:
1. Live sync: 2D edits (text, images, colors) must show on the 3D canopy reliably.
2. Background: match the 2D canvas (`bg-gradient-subtle`).
3. Size: the 3D umbrella should fill the panel at the same visual scale as the 2D preview.

Folding umbrella + GLB preview only. 2D editor, GLB file, UV mapping, and panel order are untouched.

## Why edits aren't showing today

`UmbrellaScene` receives `svg={svgRef.current}` — a mutable ref read. On first 3D mount, `svgRef.current` is often `null` (the 2D canvas mounts inside a `display:none` branch, but the ref still assigns when React commits). Because reading a ref doesn't trigger a re-render, the rasterizer hook sometimes captures `svg = null` and never re-runs until a `textureDeps` value changes — and several edits (typing into a text item, dragging a logo) update array contents in place without changing references, so the effect doesn't re-fire.

## Changes

### 1. `src/pages/DesignEditor.tsx`
- Replace the `svgRef.current` read with a stateful holder: `const [svgEl, setSvgEl] = useState<SVGSVGElement | null>(null)` and pass `ref={setSvgEl}` to `<UmbrellaCanopy>` (keep `svgRef` only if other code paths need it; otherwise pass `setSvgEl` as the ref callback). This guarantees `<UmbrellaScene svg={svgEl}>` re-renders the moment the SVG node mounts.
- Bump a `data-version` attribute on the SVG via a small `useEffect` whenever `project.artworkItems`, `project.panelColors`, `project.innerLayer`, `dryToggle`, `selectedPanels`, or `activeSurface` change, so the rasterizer's `svgVersion` probe definitely flips.

### 2. `src/components/3d/UmbrellaScene.tsx`
- Background: drop the hard-coded radial gradient. Replace the wrapper `<div>` style with `className="w-full h-full bg-gradient-subtle"` and keep `<Canvas style={{ background: "transparent" }}>` so the gradient shows through.
- Bigger model: widen FOV from `40°` → `50°`; pull camera in to `[radius*1.45, radius*0.4, radius*1.1]`; update every preset (`perspective`, `top`, `front`, `side`, `bottom`) by the same ratio (~25% closer); lower `OrbitControls minDistance` from `radius*1.1` → `radius*0.9` so users can zoom further if they want.

### 3. `src/components/3d/usePerPanelTextures.ts`
- The `svgVersion` probe today reads `svg.innerHTML.length` as a fallback. Strengthen it to also include `Date.now()`-style monotonic tick only when a `data-version` attribute exists. No other behavior change; debounce stays at 60 ms.

## Out of scope
- No edits to `GLBUmbrellaModel.tsx`, the GLB file, `uvCorrection.ts`, or the 2D editor components.
- No direct 3D editing surface (per your "live sync from 2D → 3D" choice).
- Pouch, carton, display box, and procedural-fallback umbrellas are untouched.

## Verification
1. Open `/design` in 2D, add a text item and a logo to panel 1, set a panel fill color. Switch to 3D — text, logo, and color appear on the top-right wedge within ~100 ms.
2. While in 2D, drag a logo on panel 3, type into a text item — switch to 3D and confirm the latest state shows (no stale frame).
3. The 3D panel background matches the 2D panel background (`bg-gradient-subtle`).
4. The umbrella in 3D fills roughly the same screen area as the umbrella in 2D at default zoom.
5. Mouse drag still rotates, scroll zooms, right-drag pans.