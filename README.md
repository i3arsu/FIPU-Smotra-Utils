# FIPU-Smotra-Utils

A small, fully **client-side** toolbox for FIPU — a static website with a
sidebar of tools. Nothing is uploaded; everything runs in the browser, so it
works offline and hosts as plain static files anywhere.

The app lives in [`web/`](web/). Current tools:

- **QR Generator** — QR codes with a custom logo, exported as high-res PNG / SVG.
- **Email Signature** — UNIPU/FIPU HTML email signatures (HR/EN/IT, per-faculty
  logo & colour); copy or download into your mail client.
- **PDF Signer** — sign a PDF in-browser: draw & save a signature, drop it on the
  page (with auto-detected spots), download the stamped PDF.

## Run locally

```bash
cd web
python3 -m http.server 8000
# open http://localhost:8000
```

(Any static server works. Don't open `index.html` via `file://` — preset assets
load with `fetch`, which browsers block on the file protocol.)

See [`web/README.md`](web/README.md) for the full layout, deploy options, and how
to add a new tool.
