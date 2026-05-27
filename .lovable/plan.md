## Goal
Add an optional **Pouch Design** feature to the umbrella design editor. A pouch is the fabric case for a folded umbrella, and the customer often wants their logo/artwork printed on it too. Users can toggle pouch design on/off, and when on, design it in two layouts:

1. **Full spread** — the pouch unfolded flat (full width = front + back wrap).
2. **Front only** — just the visible front face (half the spread width).

Both layouts share the same artwork data — they're just two views of the same pouch.

## Pouch sizes (derived from rib length)

The reference is `8 × 24 cm` for a 21" 3-fold umbrella. Scaling proportionally to rib length for the other categories:

| Category | Rib length | Pouch (W × H, front face) | Spread (W × H) |
|---|---|---|---|
| Folding (21") | 53.5 cm | 8 × 24 cm | 16 × 24 cm |
| Straight (23") | 58.5 cm | 9 × 27 cm | 18 × 27 cm |
| Golf (30") | 75 cm | 11 × 34 cm | 22 × 34 cm |

(Spread width = 2 × front width, since the pouch wraps around.)

These will live in `src/types/design.ts` as `POUCH_SIZE_CM: Record<UmbrellaCategory, { front: [w,h]; spread: [w,h] }>` so they can be edited later in one place.

## UX

### In the design editor sidebar (`WizardPanel` / new section)
- New toggle: **"Add pouch design"** (off by default).
- When on, a new "Pouch" tab/section appears next to the canopy editor with:
  - **Layout switch**: `Full spread` ⟷ `Front only`
  - A pouch canvas (new component `PouchCanvas`) that renders a dashed-bordered rectangle matching the pouch proportions, with a center fold line (dashed) when in spread view.
  - Same artwork tools as the canopy: upload image / add text, drag to position, scale, rotation. Reuse `ArtworkProperties` UI (text + image only, no per-panel logic — the pouch has no panels).
  - A small label showing the real size, e.g. `Pouch: 8 × 24 cm (front) · spread 16 × 24 cm`.

### Data model
Extend `DesignProject` with:
```ts
hasPouch: boolean;
pouchArtwork: ArtworkItem[];      // separate from canopy artwork
pouchView: "spread" | "front";    // last-used layout in the editor
```
Reuse `ArtworkItem` (x/y are -1..1 within the active pouch face, scale & rotation work the same). `panels` is ignored for pouch items.

### Export
- **PNG / PDF summary** (`exportPngSnapshot`, `exportPdfSummary`): when `hasPouch` is true, add a second rendered image — the pouch spread layout — beneath the canopy preview, with a "Pouch — spread layout" caption and the pouch dimensions in the spec table (new rows: `Pouch size (front)` and `Pouch spread`).
- **AI export** (`exportAiFile`): emit a second page in the same PDF/AI file containing the pouch spread SVG at true vector scale, so the fabric supplier gets a print-ready pouch artwork sheet alongside the canopy.
- If `hasPouch` is false, nothing changes in exports.

### Landing page
No change — the landing preview stays canopy-only.

## File-level changes

- **`src/types/design.ts`** — add `POUCH_SIZE_CM`, extend `DesignProject` with `hasPouch`, `pouchArtwork`, `pouchView`.
- **`src/components/PouchCanvas.tsx`** (new) — SVG renderer for the pouch, takes `category`, `view` (`"spread" | "front"`), `artwork`, fabric color, and emits drag events identical to `UmbrellaCanopy`'s drag pattern so artwork can be moved with the mouse.
- **`src/components/editor/WizardPanel.tsx`** — add the "Add pouch design" switch.
- **`src/pages/DesignEditor.tsx`** — add a `Tabs` switch (`Canopy` / `Pouch`) above the preview when `hasPouch` is on; route artwork CRUD to either `artworkItems` or `pouchArtwork` based on active tab; add the spread/front layout toggle; add a pouch SVG ref for export.
- **`src/lib/export.ts`** — render the pouch SVG to PNG and append it to the PDF summary; add a second page to the AI export with the pouch spread.
- **`src/i18n/i18n.tsx`** — strings: `pouch.add`, `pouch.title`, `pouch.spread`, `pouch.front`, `pouch.size`, etc. (EN + ZH).
- **`src/lib/storage.ts`** — backfill defaults (`hasPouch: false`, `pouchArtwork: []`, `pouchView: "spread"`) when loading older saved projects so nothing breaks.

## Out of scope
- Editing pouch dimensions per project (sizes are fixed per category for now).
- Pouch-only printing-method choice — pouch uses the same printing method as the canopy.
- Drawstring, piping, or zipper graphics — the pouch is rendered as a clean rectangle with a fold line.
