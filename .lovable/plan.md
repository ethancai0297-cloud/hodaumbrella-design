## Goal
Make the inner "top cap" of the vented double-layer golf umbrella visually longer (extend further toward the rim) so it reads as a real tiered canopy instead of a small button.

## Change
In `src/components/UmbrellaCanopy.tsx`, increase the inner cap radius used in vented mode:

- `innerCapR`: `radius * 0.42` → `radius * 0.72` (covers ~70% of outer canopy, leaving a visible vented ring near the rim).
- Keep `ventHoleR` at `radius * 0.32` (the hole punched in the outer layer is unchanged; the top cap just overlaps more of the outer surface, creating a larger overlap zone).
- Air-gap shadow ring stays anchored to `innerCapR + 4`, so it scales automatically.

No data model, wizard, export, or i18n changes — purely a rendering tweak.

## Out of scope
- User-adjustable cap size slider.
- Changing the vent hole size.
- Double-canopy mode (already full-size).
