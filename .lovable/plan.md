## Goal
Fix two issues sales reported when sending files to the fabric supplier:
1. Umbrella size specs are off — update rib lengths to match real production.
2. Add an Illustrator-compatible (`.ai`) export alongside PNG/PDF so the supplier gets a vector file.

## 1. Correct rib-length measurements

Update the per-category rib length used in specs and (optionally) for visual scale:

| Category | Rib length |
|---|---|
| Folding | 21" (53.5 cm) |
| Straight | 23" (58.5 cm) |
| Golf | 30" (75 cm) |

Changes:
- `src/types/design.ts` — replace `PANEL_LENGTH_CM` values with `{ folding: 53.5, straight: 58.5, golf: 75 }` and add a matching `PANEL_LENGTH_IN` map (21 / 23 / 30) so we can show both units.
- `src/lib/export.ts` — extend the PDF Specification block with a new "Rib length" row showing `21" (53.5 cm)` style text per category, plus an approximate canopy diameter computed from rib length.
- `src/components/UmbrellaCanopy.tsx` — adjust the visual radius constants so the three umbrella types render at proportional sizes that match the real ratio (golf clearly larger than straight, straight larger than folding). Visual only — does not affect artwork placement math meaningfully (still normalised coords).

## 2. Add `.ai` (Illustrator) export

Approach: produce a true vector file (not a rasterised PNG). Illustrator opens PDFs saved with the `.ai` extension natively, so we embed the live SVG as vectors into a PDF and save it as `<projectName>.ai`. This keeps text, paths, and logos crisp for the supplier.

Changes:
- Install `svg2pdf.js` (works with the existing `jspdf` dep) to render SVG → vector PDF.
- `src/lib/export.ts` — add `exportAiFile(project, svg)`:
  - Create a `jsPDF` sized to the canopy bounding box (with a small margin).
  - Use `svg2pdf` to draw `svgRef.current` as vectors.
  - Add a small footer line with project name, category, rib length spec, and date.
  - Save with `.ai` extension.
- `src/pages/DesignEditor.tsx`:
  - Add `handleExportAi` that calls `exportAiFile(project, svgRef.current)`.
  - Add a new "Export .ai" button in the top-bar export group, next to PNG / PDF, using a vector-style icon (e.g. `FileCode` from lucide).
  - Add i18n strings `editor.exportAi` / `editor.aiFail` in `src/i18n/i18n.tsx` (EN + ZH).

## Notes / non-goals
- No backend changes; everything runs client-side.
- Artwork placement, panel logic, drag interactions, Pantone inputs, and digital-printing panel selection are untouched.
- The `.ai` file is technically a PDF inside; this is the same trick Illustrator itself uses for "PDF-compatible" `.ai` files and is what suppliers expect.
