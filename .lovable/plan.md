## Two adjustments for double-layer umbrellas

### 1. Top cap radius → 50%
`src/components/UmbrellaCanopy.tsx` line 102
- `const innerCapR = radius * 0.72;` → `const innerCapR = radius * 0.50;`

### 2. PNG export — include both outside and inside views

Currently `Download PNG` only saves the outer (top) view. For double-layer golf umbrellas the client can't see the inner layer in the PNG.

**`src/lib/export.ts`** — add a new helper:
```ts
export async function svgPairToPngDataUrl(
  outer: SVGSVGElement,
  inner: SVGSVGElement,
  scale = 2
): Promise<string>
```
Renders both SVGs side-by-side on one canvas with labels "Outside view" and "Inside view", plus the same branded footer used today.

**`src/pages/DesignEditor.tsx`** `handleExportPng`:
- If `hasDoubleLayer && category === "golf"` and `innerOnlySvgRef.current` exists, call `svgPairToPngDataUrl(outer, inner)` instead of the single-view path.
- Filename: `{project}_outside_inside.png`.

### 3. PDF / AI exports — label pages clearly

The PDF already adds an inner-layer page, but it's titled only "Inner layer — full canopy". Update titles so the client immediately understands they are looking at the two sides of one umbrella:

`src/lib/export.ts`
- PDF summary inner page title: `"Inside view (inner layer) — full canopy"`. Also rename the rendering above it from untitled to `"Outside view (outer canopy)"` printed just above the main image on page 1, only when `hasDoubleLayer`.
- AI export inner page footer label: `"{projectName} — inside view (inner layer)"`; outer page footer adds `" — outside view"` suffix when `hasDoubleLayer`.

### Out of scope
- No change to vent hole size, panel splitting, slider for cap size, or non-golf double-layer support.
- No data model / wizard / i18n changes beyond the literal page titles inside `export.ts`.
