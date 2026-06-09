## Goal

Make the existing 3D preview look like the Goudainc reference photo (soft studio shot, scalloped canopy, realistic wood handle, 3/4 side view) while keeping every existing feature: 2D editor, view-mode toggle, frame toggle, camera presets, screenshot, headless PDF capture, save/undo/reset/PNG/AI, language switcher, pouch, double-layer.

Reference: https://goudainc.com/product/custom-wood-frame-umbrellas/ (hero image — black floral all-over print on a wood-frame straight umbrella, soft cream backdrop).

## What changes vs. today

Today the canopy is a smooth dome made of flat-ish wedges with a sphere top cap and a flat blue-gray background. The reference shows:

1. Each panel **bows outward between adjacent ribs** (visible scalloped silhouette), and the fabric **dips back up at the rib tip** (the classic "pagoda" droop).
2. A **sharper, pointier apex** (no visible sphere cap on top).
3. **Wood J-hook handle** with warm wood material (not a flat brown cylinder section).
4. **Soft cream/off-white studio backdrop** with a gentle floor gradient and a soft contact shadow — not a flat panel color.
5. **3/4 side default camera** (slightly below canopy equator) instead of a high overhead angle.
6. Richer fabric shading: ACES tone mapping, slightly lower ambient, stronger key light, fill light, subtle rim light.

## Files touched (all existing — no new files)

- `src/components/3d/buildUmbrellaGeometry.ts` — new panel profile with per-panel bow + tip droop; UVs updated to follow the bowed surface so artwork still maps correctly per wedge.
- `src/components/3d/UmbrellaModel.tsx` — remove visible sphere top cap (replace with a tiny dark finial flush to apex), tune rib-tip size, refine J-hook curve, wood material (warmer color + lower roughness when handle_material is "wood").
- `src/components/3d/UmbrellaScene.tsx` — cream gradient background, ACES filmic tone mapping, exposure tweak, key+fill+rim lighting, softer/larger contact shadow, default camera moved to 3/4 side (slightly below canopy), OrbitControls min polar tightened so users can't flip under the floor.
- (No changes to 2D code, registry JSONs, export pipeline, i18n, or DesignEditor — the scene API/props stay identical.)

## Geometry detail (panel bow + tip droop)

For each panel the current code samples a `(rows × cols)` grid between rib angles `aA..aB`. New profile per vertex at radial `t` and angular `s` (`0..1` across the wedge):

```text
bow(s)   = sin(pi * s)                 // 0 at rib edges, 1 mid-panel
droop(t) = max(0, (t - 0.85)) * k_tip  // small dip near rim
y = height * cos(t*pi/2)
    - height * 0.10 * t^2              // base droop
    + height * 0.08 * bow(s) * t       // panels puff outward
    - height * 0.18 * droop(t)         // rib-tip dip
r_offset = radius * 0.04 * bow(s) * t  // panel pushes out radially mid-wedge
```

UVs keep the existing top-down `(0.5 + 0.5·cos(angle)·t, 0.5 + 0.5·sin(angle)·t)` mapping so the rasterized SVG continues to land on the correct wedge — the bow only displaces position/normals, not UVs.

Bump `radialSegments` to 16 and `angularSegments` to 10 for smooth scallops without a noticeable perf cost.

## Lighting & background

- `gl.toneMapping = ACESFilmicToneMapping`, `toneMappingExposure ≈ 1.05`.
- Background: CSS gradient on the `<Canvas>` wrapper from `#f7f3ec` (top) to `#e9e3d6` (bottom) — keeps existing `background` prop as override.
- Lights: ambient 0.35, directional key 1.2 (upper-front-right, shadow on), directional fill 0.4 (opposite side, no shadow), directional rim 0.25 (behind, slightly above).
- `ContactShadows`: opacity 0.55, blur 3.0, scale `radius * 5`, positioned just under the handle tip.

## Camera

Default position changes from `[r·2.4, r·1.8, r·2.4]` (high 3/4) to `[r·3.0, r·0.6, r·2.2]` (lower 3/4 side, similar to reference). `OrbitControls` `maxPolarAngle = Math.PI * 0.52` so the camera can't go below the floor. Existing Top/Front/Side/Bottom/Reset presets stay; "Reset" now restores this new default.

## Out of scope (unchanged)

- Texture pipeline (`useCanopyTexture.ts`) — already produces the correct top-down rasterization.
- Model registry, GLB swap path, PDF export, headless capture, 2D editor, i18n keys, pouch, double-layer toggle, animations.

## Risk / verification

- Verify per-panel artwork still aligns at rib seams after bow (UVs unchanged, so it should — visually confirm in preview with a striped test design).
- Verify headless PDF capture still works (no scene API change).
- Verify mobile perf: bumped segments add ~480 verts per panel × 8 = ~3.8k extra — negligible.
