## Goal

Realign the GLB folding-umbrella panel mapping so 3D mesh `canopy_panel_01` shows the 2D editor's panel #1 (top-right wedge), `canopy_panel_02` shows panel #2, etc., in clockwise order as labeled in the reference top-down screenshot.

## Scope

Folding umbrella only (GLB-backed `folding_21in_8panel_standard`). Straight and golf models, the procedural umbrella path, the 2D editor, and the GLB file itself are untouched.

## Change

Edit `src/3d/uvCorrection.ts` — replace `panelUvCorrection` with an identity mapping so each GLB panel pulls the matching 2D panel index:

```
canopy_panel_01 → twoDIndex 0   // 2D panel #1, top-right
canopy_panel_02 → twoDIndex 1
canopy_panel_03 → twoDIndex 2
canopy_panel_04 → twoDIndex 3
canopy_panel_05 → twoDIndex 4
canopy_panel_06 → twoDIndex 5
canopy_panel_07 → twoDIndex 6
canopy_panel_08 → twoDIndex 7
```

`rotationDeg`, `flipX`, `flipY` stay at their current zero/false values. Legacy array exports auto-regenerate from the same map.

## Verification

1. In the 2D editor, add a clear marker (text "1") to panel #1 only; confirm in the 3D preview it appears on the top-right wedge.
2. Repeat with panel #5 — should appear on the bottom-left wedge.
3. Rotate the 3D view: numbering should run clockwise 1→8 starting top-right when viewed from above, matching the reference image.
4. If any panel still lands one slot off after the GLB's baked orientation, follow up by adjusting only that row's `twoDIndex` (no other code paths affected).