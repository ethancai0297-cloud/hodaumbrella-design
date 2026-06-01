## Fix inner export view + recolor export bands

### 1. Inside view should match the umbrella style

Today the hidden "inner export" canopy in `src/pages/DesignEditor.tsx` (≈ lines 741-757) always renders the inner layer alone as a full canopy. That is correct for the **full double** style, but wrong for **vented**, where the client should see both layers (outer canopy as the background + small inner cap on top).

Change in `DesignEditor.tsx`:
- Pass full double-layer props to the hidden inner export `UmbrellaCanopy`, mirroring what the on-screen preview already uses:
  - `fabricColor={project.fabricColor}` (outer fabric)
  - `panelColors={project.panelColors}` (outer panels)
  - `artwork={project.artworkItems}` (outer artwork)
  - `innerLayer={{ fabricColor, panelColors, artwork }}` from `project.innerLayer`
  - `doubleLayerStyle={project.doubleLayerStyle || "vented"}`
- For `doubleLayerStyle === "double"` (full-size two layers), keep current behavior: render the inner layer alone as a full canopy (use `forceSingleLayer` + inner fabric/artwork as the main props).
- Result: vented exports show both layers stacked; full-double exports show the inner full canopy.

No change to `UmbrellaCanopy.tsx` itself — it already renders both layers when given the props.

### 2. Recolor exported file bands to light blue

In `src/lib/export.ts`, replace the dark navy band/text color used in PDF header/footer and PNG footer:
- All `setFillColor(15, 31, 61)` → light blue `setFillColor(186, 220, 240)` (a soft sky-blue).
- The PNG canvas `ctx.fillStyle = "#0f1f3d"` for the footer band and label text → `"#bae0f0"` for the band; keep label/company text readable by switching `ctx.fillStyle = "#ffffff"` → `"#0f1f3d"` for text drawn on the new light band so it stays legible.
- PDF `setTextColor(255, 255, 255)` for header text on the light band → `setTextColor(15, 31, 61)` so text remains readable.

Applies to:
- `svgToPngDataUrl` footer (lines ~43, 55, 61)
- `svgPairToPngDataUrl` footer
- `exportPdfSummary` header band + inner-layer page header band
- Pouch page header band

### Out of scope
- No data model, wizard, or i18n changes.
- No change to the on-screen preview colors — only exported PDF/PNG bands.
- No change to top cap radius.
