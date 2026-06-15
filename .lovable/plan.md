# Fix 2D → 3D Texture Flow (Folding 21" 8-panel)

Scope: only the GLB preview path. No changes to the 2D editor behavior, registry scope (already Folding+8), camera framing, or material whitelist (already correct).

## Diagnosis

Pipeline today:
```
DesignEditor → svgEl (UmbrellaCanopy ref)
            → UmbrellaScene(svg, textureDeps, debugPanelNumbers)
              → GLBUmbrellaModel
                → usePerPanelTextures(svg, ribCount, deps)
                  → rasterize(svg) → unrollPanel × 8 → CanvasTexture × 8
                → assign mat.map per canopy_panel_NN via getPanelUv
```

Likely failure points (need confirmation via logs):
1. `svgEl` is null because `<UmbrellaCanopy ref={setCanopySvg}>` may not forward the inner `<svg>` element — need to confirm.
2. `rasterize()` swallows errors silently (`catch {}`), so a tainted image / bad SVG returns `null` and `setTextures` is never called → panels stay solid fabric. The user sees "no artwork on 3D".
3. SVG container uses `display:none` while in 3D mode — `Image.onload` of a serialized SVG normally still works, but worth verifying with a log.
4. `textureDeps` references mutated arrays (`project.artworkItems`); identity may not change → effect uses `svgVersion` (data-version attribute) as fallback, which is set in a separate `useEffect`. If `svgEl` is null at first paint, the `data-version` write is skipped → texture rebuild doesn't fire after upload.

## Part 1 — Instrumentation (temporary)

Add `console.log` (gated behind `import.meta.env.DEV`) in three places:

- `DesignEditor.tsx` — inside the `viewMode==='3d'` effect, also log `svgEl?.outerHTML?.length` and `svgEl?.getAttribute('data-version')`.
- `UmbrellaScene.tsx` — log `{ hasSvg, svgOuterHTMLLength, fabricColor, textureDeps, debugPanelNumbers, config: config.model_id }` whenever GLB path mounts and on prop change.
- `GLBUmbrellaModel.tsx` — same log, plus log of detected mesh names (`canopy_panel_*`) and which materials got bound.
- `usePerPanelTextures.ts` — log `{ hasSvg, svgLength, ribCount, textureDeps, svgVersion, debugPanelNumbers }` on every effect run; log when `rasterize` returns null, when `Image.onerror` fires (replace silent `catch` with `console.warn`), and log final canvas count.

Keep logs concise, prefixed `[3D]` so they're easy to filter. Remove after we confirm green.

## Part 2 — Fix SVG ref & version stamping

- Confirm `UmbrellaCanopy` forwards the inner `<svg>`. If it currently passes a wrapper `<div>` or `forwardRef` returns the wrong node, fix it so `setCanopySvg` receives the actual `SVGSVGElement`.
- Move the `data-version` stamping into `UmbrellaCanopy` itself (or do it synchronously on each render via a `useLayoutEffect`) so it happens on the same paint as the SVG content update — not after a `useEffect` chain that can race with the rasterize.
- Ensure version stamping does not require `svgEl` state to be set; do it via the canopy ref directly.

## Part 3 — Make rasterize loud and robust

In `usePerPanelTextures.ts`:
- Replace `try { ... } catch {}` with explicit `console.warn('[3D] rasterize failed', err)`.
- Add `img.crossOrigin = 'anonymous'` before `i.src = url` (defensive — even though we inline blob/data URLs).
- After `drawImage`, do a quick `getImageData(0,0,1,1)` probe inside `try/catch`; if it throws (tainted canvas), log it. If safe, continue.
- If `buildAll` returns null, fall back to `buildSolid` (fabric color) so the 3D preview still updates instead of staying stale.

## Part 4 — Hard "panel debug" toggle (already wired, verify)

`debugPanelNumbers` toggle exists in `DesignEditor` and `buildDebug` already renders numbers 1–8. Verify in browser:
- Toggle on → numbers 1–8 appear on the GLB panels. If yes, GLB material pipeline is healthy and the bug is purely in 2D-state → texture generation. If no, the material binding loop in `GLBUmbrellaModel` is wrong (mesh names mismatch, materials never `.needsUpdate = true`, or root is cloned after material assignment).

No code change expected unless verification fails.

## Part 5 — Camera fit

Already implemented (auto-normalize to 3.2 units, camera `[0,1.2,4.2]`, controls target `(0,0,0)`). No change unless logs show the model is loaded but invisible.

## Part 6 — Registry scope

Already enforced: `findModel` returns null unless `category==='folding' && ribCount===8 && model_id==='folding_21in_8panel_standard'`. No change.

## Part 7 — Texture settings

Already correct (`ClampToEdgeWrapping`, `needsUpdate`, fabric pre-fill, whitelist-only material binding, `MeshStandardMaterial` per panel). No change.

## Verification

After the edits, switch to 3D in the preview and check the console (`[3D]` prefix):

1. Toggle "3D Panel Debug" → expect 1–8 on canopy panels.
2. Upload an image in 2D → switch to 3D → expect `svgOuterHTMLLength` grow log, `[3D] rasterize ok`, and artwork visible on selected panel.
3. Change fabric color → expect fabric color update + rebuild log.
4. Per-panel repeat and full-canopy print already encoded in the source SVG, so they will appear once rasterize works.

## Technical details (files touched)

- `src/components/UmbrellaCanopy.tsx` — ensure `forwardRef` returns the `<svg>` and stamp `data-version` on render.
- `src/components/3d/UmbrellaScene.tsx` — add dev-only log.
- `src/components/3d/GLBUmbrellaModel.tsx` — add dev-only logs (props + bound meshes).
- `src/components/3d/usePerPanelTextures.ts` — verbose error logging, fallback to solid on rasterize failure, crossOrigin on Image.
- `src/pages/DesignEditor.tsx` — expand the existing `viewMode==='3d'` log with svg length + data-version; remove the now-redundant `useEffect` that bumps `data-version` (handled in canopy).

No new dependencies. No schema/migration changes. No 2D editor behavior change.