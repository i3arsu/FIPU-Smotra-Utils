# FIPU Utils

A small, fully **client-side** toolbox for FIPU. It's a static site with a
sidebar of tools. More utilities can be dropped in over time.

Current tools:

- **QR Generator** — QR codes with a custom logo, high-quality PNG/SVG export.
- **Email Signature** — UNIPU/FIPU HTML email signatures (HR/EN/IT, per-faculty
  logo & colour); copy or download into your mail client.
- **PDF Signer** — sign a PDF in-browser: draw & save a signature (kept in
  `localStorage`), drop it on the page (with auto-detected spots), download the
  stamped PDF. Uses bundled pdf-lib (MIT) + pdf.js (Apache-2.0).

Nothing is uploaded — everything runs in the browser, so it works offline and
hosts as plain static files anywhere.

## Run locally

```bash
cd web
python3 -m http.server 8000
# open http://localhost:8000
```

(Any static server works. Don't double-click `index.html` — preset logos load
via `fetch`, which browsers block on `file://`.)

## Deploy

- **GitHub Pages** — point Pages at the `web/` folder (or move its contents to
  the repo root).
- **Netlify / Vercel** — publish directory = `web`, or drag the folder onto the
  dashboard.
- **Any host** — upload the contents of `web/`, keeping `vendor/`, `tools/`, and
  `assets/` next to `index.html`.

## Layout

```
web/
├── index.html      shell: sidebar + main; lists <script> tags for each tool
├── styles.css      shared shell + reusable tool primitives + per-tool styles
├── core.js         FIPU.* helpers + the tool registry
├── app.js          boot + router (builds nav, switches tools via #hash)
├── tools/
│   ├── qr.js         the QR Generator tool
│   └── _template.js  copy this to add a new tool
├── vendor/qrcode.js  bundled QR library (MIT), offline-safe
└── assets/           logos (FIPU / Unipu) + anything tools need
```

## Add a new tool

1. Copy `tools/_template.js` → `tools/<name>.js` and fill in `mount(view)`.
2. Add `<script src="tools/<name>.js"></script>` in `index.html` (before
   `app.js`).

That's it — the sidebar entry, routing (`#<id>`), and active-state are handled
automatically. Each tool calls `FIPU.register({ id, title, icon, description,
mount, unmount })`. Set `soon: true` to show a disabled "soon" placeholder in the
sidebar before the UI exists.

Shared helpers available to every tool: `FIPU.el()`, `FIPU.toast()`,
`FIPU.download()`, `FIPU.debounce()`. Reuse the CSS primitives in `styles.css`
(`.card`, `.field`, `.btn`, `.grid.split`, sliders, swatches…) before writing new
styles.

## QR tool notes

- Drag-drop or upload a logo (PNG/JPG/SVG/WebP); SVG logos stay vector.
- Preset logos are configurable in the `PRESETS` array in `tools/qr.js`.
- Error correction **H** (default) tolerates ~30% loss; keep the logo ≤30% and
  test-scan before printing.
