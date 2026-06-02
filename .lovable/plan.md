## Update pouch sizes

In `src/types/design.ts`, update `POUCH_SIZE_CM`:

- folding: unchanged — `{ w: 8, h: 24 }`
- straight: `{ w: 8, h: 85 }` (was `{ w: 9, h: 27 }`)
- golf: `{ w: 8, h: 102 }` (was `{ w: 11, h: 34 }`)

Width matches folding (8 cm) for all categories. Length set to 85 cm for 23" straight umbrellas and 102 cm for golf umbrellas, per the user's specification.

No other code changes needed — `PouchCanvas` and the export logic both read from `POUCH_SIZE_CM`, so the new dimensions will flow through automatically to the on-screen preview, the size label, and the exported file.
