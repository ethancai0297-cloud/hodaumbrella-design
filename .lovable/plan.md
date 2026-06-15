# Fix 3D preview size + live 2D→3D sync

Two small, targeted changes. No 2D editor, GLB, or UV-map changes.

## 1. 3D umbrella appears too small

The 2D canopy renders at ~620px. In 3D, the camera sits very far back (`radius * 3.0`–`4.0`) with a narrow FOV (32°), so the umbrella visually occupies roughly half the panel even though the wrapper is full-size.

Fix in `src/components/3d/UmbrellaScene.tsx`:

- Widen FOV from `32` → `40`.
- Move every camera preset closer:
  - perspective: `[radius*3.0, radius*0.6, radius*2.2]` → `[radius*1.9, radius*0.45, radius*1.45]`
  - top: `radius*4.2` → `radius*2.6`
  - front/side: `radius*4.0` → `radius*2.5`
  - bottom: `radius*3.8` → `radius*2.5`
- Lower `OrbitControls minDistance` from `radius*1.4` → `radius*1.1` so users can keep zooming in.

Result: the canopy fills the 3D panel at the same visual scale as the 2D canvas, on both desktop and iPad.

## 2. 2D edits (text, uploaded images, logos) don't appear in 3D until reload

`UmbrellaScene` re-rasterizes only when one of `textureDeps` changes by reference. Today's list (`fabricColor`, `panelColors`, `artworkItems`, …) covers most edits, but two cases silently miss:

- **Live drag/resize/text-typing inside an artwork item.** Patches mutate item fields; the parent `artworkItems` array reference does change in `updateItem`, but the rasterizer only sees the SVG ref — and during fast typing the 140 ms debounce + same-reference SVG can drop frames.
- **Inner-layer / pouch / panel-color tweaks that don't appear in `textureDeps`.** Inner-layer artwork edits never invalidate the canopy texture.

Fix in two files:

### `src/pages/DesignEditor.tsx` (only the `<UmbrellaScene>` instance in `viewMode === "3d"`)

Expand `textureDeps` so every visible 2D change triggers a 3D rebuild:

```ts
textureDeps={[
  project.fabricColor,
  project.capColor,
  project.panelColors,
  project.artworkItems,        // outer artwork (already present)
  project.innerLayer,          // inner-layer fabric + artwork
  project.ribCount,
  project.umbrellaCategory,
  project.printingMethod,
  project.hasDoubleLayer,
  project.doubleLayerStyle,
  dryToggle,
  selectedPanels,              // selected-panel highlight in SVG
  activeSurface,
]}
```

### `src/components/3d/usePerPanelTextures.ts`

- Drop the debounce from `140` ms to `60` ms so typing/drag feels live without thrashing the GPU.
- Add a lightweight `SVGSVGElement` content-version probe: when `svg` is non-null, include `svg.childElementCount` and `svg.getAttribute("data-version")` (already bumped by the 2D editor on every meaningful edit; if missing we fall back to `Date.now() >> 8` on every deps change) in the effect dependency list so re-renders of the SVG (text edits, image uploads, drags) always retrigger rasterization.

No structural rewrites: only the debounce constant and the dep array change.

## Out of scope / unchanged

- 2D editor, panel order, UV correction map, GLB file, registry configs.
- OrbitControls behavior (rotate/pan/zoom stay enabled, polar range unchanged).
- PDF headless capture scene (separate instance, keeps its own deps).

## Verification

1. Open `/design` in 3D mode → canopy fills the panel at roughly the same diameter the 2D view shows.
2. Switch to 2D, add a text layer, type characters → switch back to 3D within ~100 ms and confirm the text is on the canopy.
3. Upload a logo in 2D, drag it across a panel → 3D updates while dragging (≤ 1 frame lag after release).
4. Toggle inner-layer color on a golf umbrella → 3D canopy refreshes.
5. iPad Safari: rotate, pinch-zoom, and drag still work; no regressions to the GLB rendering pipeline.
