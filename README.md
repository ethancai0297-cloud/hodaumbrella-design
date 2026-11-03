# Umbrella Design Studio

Build a professional web application for an umbrella manufacturing company to help clients and salespeople create umbrella rendering previews without an in-house designer.

Purpose:
The app should let users upload customer artwork and generate a realistic umbrella mockup/rendering based on umbrella category, rib count, and printing method. The main goal is fast sales quotation and design confirmation before production.

Target users:
1. External clients who want to preview their umbrella design.
2. Internal sales team members who need to quickly create renderings for customer proposals.
3. Admin/managers who may later manage umbrella templates, pricing notes, and export files.

Core product categories:
- Folding umbrella
- Straight umbrella
- Golf umbrella

Umbrella structure options:
- 6 ribs / 6 panels
- 8 ribs / 8 panels
- 10 ribs / 10 panels

Printing methods:

1. Silkscreen printing mode
Users can upload a logo or type text. The logo/text should be placed on umbrella panels.
Options needed:
- Upload logo file: PNG, JPG, SVG, PDF if possible.
- Add custom text with font, size, color, rotation.
- Choose placement panel count: 1 panel, 2 panels, 4 panels, or 8 panels maximum.
- Select exact panels by clicking on the umbrella canopy diagram.
- Logo/text can be moved, resized, rotated, and centered within the selected panel.
- Basic warning: silkscreen is recommended for small-area logo/text, not full-photo artwork.
- Show a note that final production artwork should be confirmed by factory designer before mass production.

2. Digital printing mode
Users can upload a full picture or full artwork.
Options needed:
- Upload full image: PNG/JPG, ideally high resolution.
- Choose print area: one panel only, selected panels, or full cover/full canopy.
- For one-panel digital print: crop/fit/fill the image inside the selected panel.
- For full cover print: apply the image across the full canopy layout, visually split across all panels according to rib count.
- Users can reposition, scale, crop, and rotate the picture.
- Show a warning if image resolution is too low.
- Include fit modes: cover, contain, stretch.

Main user flow:
1. Landing page explains: “Create umbrella rendering previews for silkscreen logos or full digital print designs.”
2. User clicks “Start Design”.
3. Step 1: Choose umbrella category: Folding / Straight / Golf.
4. Step 2: Choose rib count: 6 / 8 / 10.
5. Step 3: Choose printing method: Silkscreen / Digital Printing.
6. Step 4: Upload artwork or add text.
7. Step 5: Select panels and adjust artwork placement.
8. Step 6: Preview rendering.
9. Step 7: Export/download result as PNG/PDF and optionally save project.

Rendering requirements:
- Use a clean realistic but MVP-friendly umbrella top-view canopy rendering.
- Show panel boundaries clearly enough for user placement.
- Include a 3D-style preview if feasible, but at minimum include a polished 2D top-view mockup.
- Umbrella canopy should update when category and rib count changes.
- Panel shapes should adjust for 6, 8, or 10 rib designs.
- For golf umbrella, make canopy visually larger/wider.
- For folding umbrella, make it compact and include optional folded umbrella preview placeholder.
- For straight umbrella, standard classic canopy preview.
- Use SVG/canvas-based rendering so users can interact with artwork placement.

Key editor features:
- Drag and drop uploaded artwork onto umbrella panel.
- Resize handles.
- Rotate handle.
- Delete artwork.
- Duplicate artwork to multiple selected panels.
- Center artwork in panel.
- Undo/redo if possible.
- Zoom in/out.
- Reset design.
- Background color selector for umbrella fabric.
- Optional preset fabric colors: black, navy, white, red, yellow, green, royal blue, grey.

Export features:
- Download mockup as PNG.
- Download summary PDF including:
  - umbrella category
  - rib count
  - printing method
  - selected panels
  - uploaded artwork name
  - fabric color
  - notes/warnings
  - rendering image
- Save project locally in browser if backend is not implemented.

Data model suggestion:
DesignProject:
- id
- projectName
- customerName optional
- umbrellaCategory: folding | straight | golf
- ribCount: 6 | 8 | 10
- printingMethod: silkscreen | digital
- fabricColor
- panels: array of panel definitions
- artworkItems: array containing file URL, type logo/text/image, x, y, scale, rotation, selected panels, fit mode
- createdAt
- updatedAt

MVP technical preference:
- Build with a modern responsive web interface.
- Prioritize usable front-end mockup generation over complex backend.
- Use client-side canvas/SVG rendering where possible.
- Store designs in localStorage for MVP.
- Clean component structure so backend/account features can be added later.

Design style:
- Professional B2B manufacturing look.
- Clean, modern, trustworthy.
- Colors: white background, dark navy accents, light grey panels, subtle blue highlights.
- Include company-neutral branding for now: “Umbrella Render Studio”.
- The UI should feel suitable for an umbrella factory sales team and international clients.

Important manufacturing logic:
- Silkscreen mode should emphasize logo/text on limited panels: 1, 2, 4, or 8 panels.
- Digital print mode should allow either one-panel image print or full-cover artwork.
- Rib count equals panel count for the visual layout: 6 ribs = 6 panels, 8 ribs = 8 panels, 10 ribs = 10 panels.
- Show notes that silkscreen is generally for small logo areas, while digital printing is for photo/full-surface artwork.

Pages/components needed:
- Landing page
- Design wizard/editor page
- Left sidebar for options
- Central umbrella preview canvas
- Right sidebar for artwork properties and production notes
- Export modal
- Saved projects/local history page

Build the MVP so it is functional enough to demonstrate the concept to clients and internal sales. Use placeholder umbrella templates if necessary, but the interaction should work: upload artwork, choose printing method, select panels, adjust placement, preview, and export.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://hodaumbrella-design.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1d78438d-ec59-4097-b2dd-687568c02afc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
