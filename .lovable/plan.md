# Fix 3D preview: orbit rotation + missing artwork

Two regressions on the Folding 21-inch 8-panel GLB preview. Both have a clear root cause.

## Problem 1 — Can't rotate, only "drag" the umbrella

`UmbrellaScene.tsx` wraps the GLB in `<Bounds fit clip observe margin={1.25}>`. The `observe` flag tells `Bounds` to **refit the camera every time the children mutate**. Our per-panel material pipeline triggers mutations constantly (`mat.needsUpdate = true`, texture swaps, frame visibility, etc.), so the camera keeps snapping back to a fitted pose. The user perceives this as: panning works (the controls "drag" the canopy translation feel), but rotation never sticks because Bounds yanks the camera back on every artwork/color change. That also explains why it feels worse when artwork is added.

## Problem 2 — Uploaded images / text not showing on the 3D canopy

The 2D SVG contains `<image href={item.src}>` for uploaded artwork and logos (`src/components/UmbrellaCanopy.tsx` lines 275 / 321). `usePerPanelTextures.ts → rasterize()` clones the SVG, calls `XMLSerializer`, wraps it in an `image/svg+xml` blob and loads it through `new Image()`. When the browser renders that SVG-as-image, **nested `<image href="…">` resources are subject to a separate fetch with no document context**:

- `blob:` URLs created by the editor are scoped to the parent document; the SVG-as-image fetch can't read them.
- Remote/object URLs without `crossOrigin` will either fail or taint and silently render as empty.

Result: the SVG rasterizes the panel outlines and solid fills but **omits every uploaded image and any text that depends on a remote font**, so the 3D canopy shows only the fabric colour — exactly the symptom reported.

Text-as-`<text>` elements with system fonts do render, but the user's flow puts artwork through `<image>`, so nothing visible reaches the texture.

## Fix plan

Scope: `src/components/3d/UmbrellaScene.tsx` and `src/components/3d/usePerPanelTextures.ts` only. No changes to the 2D editor, GLB, registry, or UV correction map.

### 1. Restore free orbit rotation

In `UmbrellaScene.tsx`:
- Remove `Bounds` entirely. The camera is already positioned from `config` and the preset buttons (`perspective` / `top` / `front` / `side` / `bottom`) handle reframing, so `Bounds` is redundant.
- Render `<GLBUmbrellaModel … />` directly inside `<Suspense>`.
- Keep `OrbitControls` as-is (`enableDamping`, `minPolarAngle={0}`, `maxPolarAngle={Math.PI}`, `enableRotate`/`enablePan`/`enableZoom` all default-true). Add explicit `enableRotate` / `enablePan` / `enableZoom` props set to `true` for clarity and to defend against any future helper that flips them.

### 2. Make uploaded artwork actually rasterize

In `usePerPanelTextures.ts → rasterize()`, before serializing the clone:

1. Walk every `<image>` element in the clone (both `href` and the legacy `xlink:href`).
2. For each, fetch the current `href` into a Blob, then convert that Blob to a `data:` URL via `FileReader.readAsDataURL`.
3. Replace `href` (and `xlink:href`) on the clone with the inline data URL.
4. Await all replacements (`Promise.all`) before calling `XMLSerializer`.

This works for blob URLs, object URLs, and same-origin uploads. For cross-origin URLs the `fetch` will throw → catch per-image, leave the original `href` in place, and continue (so a single bad image never breaks the whole canopy).

Also, to keep text crisp regardless of font availability inside the SVG-as-image render path, leave existing `<text>` nodes untouched (no change needed).

### 3. Verification

- Open the folding model in 3D. Left-drag should rotate freely around the canopy (top, side, bottom). Right-drag should pan. Wheel should zoom. None of these should "snap back".
- Toggle `Show frame` and change fabric colour — camera position must stay where the user left it.
- Upload an image artwork in the 2D editor, switch to 3D — the image should appear on the mapped panel(s) within ~150 ms (existing debounce).
- Add a text artwork — text should appear on the 3D canopy with no radial stripes.
- The `#1–8` debug toggle should still stamp panel numbers correctly.

## Files touched

- `src/components/3d/UmbrellaScene.tsx` — drop `Bounds`, render GLB model directly, keep controls explicit.
- `src/components/3d/usePerPanelTextures.ts` — inline `<image>` hrefs as data URLs inside `rasterize()` before serialization.
