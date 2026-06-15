## Two fixes for 3D preview

### 1. Allow viewing the umbrella from underneath
`OrbitControls` in `src/components/3d/UmbrellaScene.tsx` currently has `maxPolarAngle={Math.PI * 0.52}`, which locks the camera at the canopy equator. The "bottom" preset button can't actually swing the camera there either because the same clamp applies.

Fix:
- Set `minPolarAngle={0}` and `maxPolarAngle={Math.PI}` so the user can orbit fully above and below the canopy.
- Drop the `ContactShadows` floor disc to `opacity={0.35}` and lower it slightly so it doesn't sit visibly between the user and the underside when looking up.
- Keep the existing "bottom" camera preset; it will now reach the position without being clamped.

### 2. Lines that shouldn't be on the 3D canopy
Root cause: `src/components/UmbrellaCanopy.tsx` renders every 2D panel `<path>` with `stroke={ribStroke}` `strokeWidth={1.2}` plus rib divider strokes on top. When `usePerPanelTextures` rasterizes that SVG and slices it per wedge, those strokes get baked into the canopy texture as faint radial lines on the 3D model.

Fix in `src/components/3d/usePerPanelTextures.ts::rasterize`:
- Before serializing the SVG, clone it (`svg.cloneNode(true)`), then walk the clone and on every `<path>` / `<line>` / `<polyline>` / `<polygon>` set `stroke="none"` and remove `stroke-width`. This kills the rib/panel outline rendering for the 3D texture only — the on-screen 2D editor SVG is untouched.
- Also drop any element with the selection-dash style (`stroke-dasharray`) so the blue selection outline never bleeds into the 3D texture.

### Scope
Only `src/components/3d/UmbrellaScene.tsx` and `src/components/3d/usePerPanelTextures.ts`. No changes to the 2D editor, GLB, registry, or UV correction map.

### Verification
1. In 3D mode, drag the canopy down past the equator — should see the underside of the ribs/canopy with no clipping.
2. Apply a single-color fabric with no artwork → 3D canopy is uniformly that color, no radial lines.
3. Add artwork → artwork still appears correctly; only the structural rib/panel strokes are gone from the 3D view.
