# Hero redesign + Undo/Reset button fix

## 1. Landing hero — Layered trio + branding

Replace the right-side hero card on `/` with the chosen "Layered trio" composition: three umbrellas stacked at offset angles inside a rounded card with ambient color glows behind it. Left column (badge, headline, subhead, CTAs, trust line) stays as-is.

- Background umbrella (back): rose→orange gradient, rotated +12°, with a subtle white-dot polka pattern, dimmed to 40% opacity.
- Middle umbrella: indigo→violet gradient, rotated −6°, with rib lines and a dark center hub.
- Front umbrella: dark slate-900 fabric with a soft emerald glow + faint italic "HODA" wordmark in the corner, drawn rib lines, prominent drop shadow.
- Floating tags around the front umbrella:
  - Top-right: "Silk Print Active" pill with a rose dot.
  - Bottom-left: "+12 Colors" pill with three overlapping color avatars.
- Card: white, `rounded-3xl`, indigo-tinted shadow, soft border. Two ambient `blur-[100px]` glows (indigo + rose) behind the card.
- Keep all umbrellas as octagons via `clip-path: polygon(50% 0%, 85% 15%, 100% 50%, 85% 85%, 50% 100%, 15% 85%, 0% 50%, 15% 15%)`.

The headline keeps its existing solid color; do not switch it to a gradient (matches the rest of the site's voice and the current bilingual headline).

Bilingual: the floating tag labels go through `useI18n` with new keys (`landing.tag.silk`, `landing.tag.colors`) in both EN and ZH.

Files: `src/pages/Landing.tsx`, `src/i18n/i18n.tsx`.

## 2. Undo vs Reset — clearer, swapped

Currently both the canopy-area "Reset" button and the top-bar "Undo" button use the `RotateCcw` icon, which is causing real confusion (user has been hitting Reset thinking it's Undo).

- Swap the two icons:
  - **Undo** (top bar): keep `RotateCcw` (the curved-arrow-back icon).
  - **Reset** (canvas toolbar): use `Trash2` to clearly signal "clear everything".
- Swap their positions per the user's request:
  - Move **Reset** out of the canvas zoom toolbar and into the **top bar**, placed to the right of Undo (so Undo sits first / leftmost of the pair).
  - Remove the Reset button from the canvas zoom toolbar; that toolbar only keeps zoom in/out + percentage.
- Add a confirmation dialog before Reset actually clears: small `AlertDialog` titled "Reset design?" with body "This clears all panel colors, artwork, and selections for this project. This cannot be undone." and buttons Cancel / Reset.
- Add clear labels next to each icon in the top bar (`Undo` and `Reset`) so the difference is unambiguous, matching the existing labelled buttons (Save, PNG, AI, PDF).

Files: `src/pages/DesignEditor.tsx` (move/relabel buttons, wire AlertDialog), `src/i18n/i18n.tsx` (add `editor.reset` EN/ZH; `editor.undo` already exists).

No data, schema, dependency, or route changes.
