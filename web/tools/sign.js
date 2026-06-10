/* ===========================================================================
   Tool: PDF Signer
   Visual signature stamping, 100% client-side (no upload, no license):
     • pdf.js   (Apache-2.0) renders pages to a canvas so the user can see/place
     • pdf-lib  (MIT)        stamps the signature image onto the real PDF
   The user draws a signature (reusable via localStorage), drops it on the page
   — manually or onto an auto-suggested spot found by scanning the text layer
   for "signature / potpis / sign here / firma / ____" — then downloads.
   =========================================================================== */

FIPU.register({
  id: "sign",
  title: "PDF Signer",
  icon: "✍",
  description: "Sign a PDF in your browser. Upload a PDF, draw (and save) your signature, then drop it where it belongs — we suggest spots we detect. Nothing leaves your device.",

  mount(view) {
    const toast = FIPU.toast;
    const LS_KEY = "fipu.signatures";
    const pdfjsLib = window.pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";

    // ---- markup ----------------------------------------------------------
    view.innerHTML = `
      <div class="tool-head">
        <h2>PDF Signer</h2>
        <p>${this.description}</p>
      </div>

      <div class="sign-wrap">
        <!-- LEFT: the document -->
        <div class="card sign-doc-card">
          <div class="card-title">Document</div>

          <div class="drop" id="sg-drop">
            <input type="file" id="sg-file" accept="application/pdf" />
            <div class="dz-ico">⬆</div>
            <div class="dz-main">Drop a PDF or <b>browse</b></div>
            <div class="dz-sub">stays on your device</div>
          </div>

          <div class="sign-toolbar" id="sg-toolbar" style="display:none">
            <button class="btn mini" id="sg-prev">‹</button>
            <span class="sign-pageno" id="sg-pageno">—</span>
            <button class="btn mini" id="sg-next">›</button>
            <span class="sign-spacer"></span>
            <button class="btn mini" id="sg-suggest">⌖ Find spots</button>
            <button class="btn mini" id="sg-place" disabled>＋ Place signature</button>
          </div>

          <div class="sign-stage" id="sg-stage">
            <div class="sign-canvas-wrap" id="sg-cwrap" style="display:none">
              <canvas id="sg-page"></canvas>
              <div class="sign-overlay" id="sg-overlay"></div>
            </div>
            <div class="empty" id="sg-empty"><span class="big">📄</span>upload a PDF to begin</div>
          </div>
        </div>

        <!-- RIGHT: the signature -->
        <div class="card">
          <div class="card-title">Your signature</div>

          <div class="sign-tabs" id="sg-tabs">
            <button class="sign-tab active" data-mode="draw">Draw</button>
            <button class="sign-tab" data-mode="type">Type</button>
            <button class="sign-tab" data-mode="upload">Upload</button>
          </div>

          <!-- DRAW -->
          <div class="sign-mode" data-mode="draw">
            <div class="sign-pad-wrap">
              <canvas id="sg-pad" class="sign-pad" width="600" height="200"></canvas>
              <div class="sign-pad-hint" id="sg-padhint">draw here</div>
            </div>
            <div class="sign-pad-actions">
              <button class="btn mini" id="sg-clearpad">Clear</button>
              <button class="btn mini primary" id="sg-savepad">Save to library</button>
            </div>
          </div>

          <!-- TYPE -->
          <div class="sign-mode" data-mode="type" style="display:none">
            <div class="field">
              <input type="text" id="sg-typein" placeholder="Type your name…" autocomplete="off" />
            </div>
            <div class="sign-font-row" id="sg-fonts"></div>
            <div class="sign-type-preview" id="sg-typeprev"><span>Your name</span></div>
            <div class="sign-pad-actions">
              <button class="btn mini primary" id="sg-savetype">Save to library</button>
            </div>
          </div>

          <!-- UPLOAD -->
          <div class="sign-mode" data-mode="upload" style="display:none">
            <div class="drop" id="sg-updrop">
              <input type="file" id="sg-upfile" accept="image/png,image/jpeg,image/webp" />
              <div class="dz-ico">⤢</div>
              <div class="dz-main">Drop an image or <b>browse</b></div>
              <div class="dz-sub">png (transparent) · jpg · webp</div>
            </div>
            <div class="sign-up-preview" id="sg-upprev" style="display:none">
              <img id="sg-upimg" alt="signature preview" />
            </div>
            <div class="sign-pad-actions" id="sg-upactions" style="display:none">
              <button class="btn mini" id="sg-upclear">Clear</button>
              <button class="btn mini primary" id="sg-upsave">Save to library</button>
            </div>
          </div>

          <div class="field" style="margin-top:18px">
            <label>Saved signatures</label>
            <div class="sign-library" id="sg-library"></div>
          </div>

          <div class="field">
            <div class="top slider-top"><label style="margin:0">Signature size</label><span class="val" id="sg-szval">160 px</span></div>
            <input type="range" id="sg-size" min="60" max="320" value="160" />
          </div>

          <button class="btn primary sign-download" id="sg-download" disabled>↓ Download signed PDF</button>
          <p class="sg-hint">Draw, type, or upload a signature (transparent PNGs
            keep their transparency) and save it. Then pick it, click <em>Place
            signature</em> or an auto-detected spot, drag to position, and download.</p>
        </div>
      </div>`;

    const $ = (id) => view.querySelector("#" + id);
    const fileEl = $("sg-file"), dropEl = $("sg-drop"), toolbar = $("sg-toolbar");
    const stage = $("sg-stage"), cwrap = $("sg-cwrap"), emptyEl = $("sg-empty");
    const pageCanvas = $("sg-page"), overlay = $("sg-overlay");
    const pageNoEl = $("sg-pageno"), prevBtn = $("sg-prev"), nextBtn = $("sg-next");
    const suggestBtn = $("sg-suggest"), placeBtn = $("sg-place");
    const pad = $("sg-pad"), padHint = $("sg-padhint");
    const libraryEl = $("sg-library"), sizeEl = $("sg-size"), szval = $("sg-szval");
    const downloadBtn = $("sg-download");
    const tabsEl = $("sg-tabs");
    const typeInEl = $("sg-typein"), fontsEl = $("sg-fonts"), typePrev = $("sg-typeprev");
    const upDrop = $("sg-updrop"), upFile = $("sg-upfile"), upPrev = $("sg-upprev");
    const upImg = $("sg-upimg"), upActions = $("sg-upactions");

    // ---- state -----------------------------------------------------------
    let pdfDoc = null;          // pdf.js doc (for rendering)
    let rawBytes = null;        // original PDF bytes (for pdf-lib stamping)
    let pageNum = 1, pageCount = 0;
    let viewport = null;        // current pdf.js viewport (CSS px == canvas px)
    let renderTask = null;
    let activeSig = null;       // dataURL of the chosen signature image
    // placements: { page, xRatio, yRatio, wRatio, hRatio, dataURL, el }
    // ratios are 0..1 relative to the *unrotated* PDF page box.
    const placements = [];

    // ===================================================================
    //  Signature pad (draw + localStorage library)
    // ===================================================================
    const pctx = pad.getContext("2d");
    let drawing = false, dirty = false, last = null;
    pctx.lineWidth = 2.6; pctx.lineCap = "round"; pctx.lineJoin = "round"; pctx.strokeStyle = "#16314a";

    function padPos(e) {
      const r = pad.getBoundingClientRect();
      const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
      return { x: cx * (pad.width / r.width), y: cy * (pad.height / r.height) };
    }
    function startDraw(e) { e.preventDefault(); drawing = true; last = padPos(e); padHint.style.display = "none"; }
    function moveDraw(e) {
      if (!drawing) return; e.preventDefault();
      const p = padPos(e);
      pctx.beginPath(); pctx.moveTo(last.x, last.y); pctx.lineTo(p.x, p.y); pctx.stroke();
      last = p; dirty = true;
    }
    function endDraw() { drawing = false; }
    pad.addEventListener("mousedown", startDraw);
    pad.addEventListener("mousemove", moveDraw);
    window.addEventListener("mouseup", endDraw);
    pad.addEventListener("touchstart", startDraw, { passive: false });
    pad.addEventListener("touchmove", moveDraw, { passive: false });
    pad.addEventListener("touchend", endDraw);

    function clearPad() { pctx.clearRect(0, 0, pad.width, pad.height); dirty = false; padHint.style.display = "block"; }
    $("sg-clearpad").addEventListener("click", clearPad);

    // trim transparent margins so the stamp hugs the ink
    function trimmedDataURL(srcCanvas) {
      const w = srcCanvas.width, h = srcCanvas.height;
      const data = srcCanvas.getContext("2d").getImageData(0, 0, w, h).data;
      let x0 = w, y0 = h, x1 = 0, y1 = 0, found = false;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 8) {
          found = true;
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      if (!found) return null;
      const pad2 = 8;
      x0 = Math.max(0, x0 - pad2); y0 = Math.max(0, y0 - pad2);
      x1 = Math.min(w - 1, x1 + pad2); y1 = Math.min(h - 1, y1 + pad2);
      const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
      const out = document.createElement("canvas"); out.width = cw; out.height = ch;
      out.getContext("2d").drawImage(srcCanvas, x0, y0, cw, ch, 0, 0, cw, ch);
      return out.toDataURL("image/png");
    }

    function loadLibrary() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch (_) { return []; } }
    function saveLibrary(list) { try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch (_) { toast("Couldn't save (storage full?)"); } }

    function renderLibrary() {
      const list = loadLibrary();
      libraryEl.innerHTML = "";
      if (!list.length) { libraryEl.appendChild(FIPU.el("div.sign-lib-empty", { text: "No saved signatures yet." })); return; }
      list.forEach((item, i) => {
        const cell = FIPU.el("div.sign-lib-item", { title: "Use this signature" }, [
          FIPU.el("img", { src: item, alt: "signature " + (i + 1) }),
        ]);
        if (activeSig === item) cell.classList.add("active");
        cell.addEventListener("click", () => { activeSig = item; renderLibrary(); placeBtn.disabled = !pdfDoc; toast("Signature selected"); });
        const del = FIPU.el("button.sign-lib-del", { title: "Delete", text: "×" });
        del.addEventListener("click", (e) => {
          e.stopPropagation();
          const l2 = loadLibrary(); l2.splice(i, 1); saveLibrary(l2);
          if (activeSig === item) activeSig = null;
          renderLibrary();
        });
        cell.appendChild(del);
        libraryEl.appendChild(cell);
      });
    }

    // shared: add a signature dataURL to the library and make it active
    function commitSignature(url) {
      if (!url) { toast("Nothing to save"); return false; }
      const list = loadLibrary(); list.unshift(url);
      if (list.length > 12) list.length = 12;
      saveLibrary(list);
      activeSig = url;
      renderLibrary();
      placeBtn.disabled = !pdfDoc;
      toast("Saved to your signature library");
      return true;
    }

    $("sg-savepad").addEventListener("click", () => {
      if (!dirty) { toast("Draw a signature first"); return; }
      if (commitSignature(trimmedDataURL(pad))) clearPad();
    });

    // ===================================================================
    //  Mode B: type a name (rendered in a handwriting font)
    // ===================================================================
    const FONTS = [
      { label: "Signature", css: '"Dancing Script", cursive' },
      { label: "Script",    css: '"Great Vibes", cursive' },
      { label: "Casual",    css: '"Caveat", cursive' },
    ];
    let typeFont = FONTS[0].css;

    FONTS.forEach((f, i) => {
      const b = FIPU.el("button.sign-font", { type: "button", text: f.label });
      b.style.fontFamily = f.css;
      if (i === 0) b.classList.add("active");
      b.addEventListener("click", () => {
        typeFont = f.css;
        fontsEl.querySelectorAll(".sign-font").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        updateTypePreview();
      });
      fontsEl.appendChild(b);
    });

    function updateTypePreview() {
      const txt = typeInEl.value.trim();
      typePrev.style.fontFamily = typeFont;
      typePrev.innerHTML = `<span>${txt ? txt.replace(/</g, "&lt;") : "Your name"}</span>`;
      typePrev.classList.toggle("empty", !txt);
    }
    typeInEl.addEventListener("input", updateTypePreview);

    // render the typed name onto a transparent canvas, trimmed
    function renderTypedSignature() {
      const txt = typeInEl.value.trim();
      if (!txt) return null;
      const fontPx = 120;
      const probe = document.createElement("canvas");
      const pc = probe.getContext("2d");
      pc.font = `${fontPx}px ${typeFont}`;
      const w = Math.ceil(pc.measureText(txt).width) + 60;
      const h = Math.ceil(fontPx * 1.8);
      probe.width = w; probe.height = h;
      const ctx = probe.getContext("2d");
      ctx.font = `${fontPx}px ${typeFont}`;
      ctx.fillStyle = "#16314a";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText(txt, w / 2, h / 2);
      return trimmedDataURL(probe);
    }

    $("sg-savetype").addEventListener("click", async () => {
      const txt = typeInEl.value.trim();
      if (!txt) { toast("Type your name first"); return; }
      // make sure the handwriting font is loaded before rasterising to canvas,
      // otherwise the canvas silently falls back to a default font
      try { await document.fonts.load(`120px ${typeFont}`, txt); } catch (_) {}
      const url = renderTypedSignature();
      if (commitSignature(url)) { typeInEl.value = ""; updateTypePreview(); }
    });

    // ===================================================================
    //  Mode C: upload an image (PNG transparency preserved)
    // ===================================================================
    let uploadURL = null;
    function handleUpload(file) {
      if (!file) return;
      if (!/^image\/(png|jpeg|webp)$/.test(file.type) && !/\.(png|jpe?g|webp)$/i.test(file.name)) {
        toast("Please choose a PNG, JPG or WebP image"); return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        // normalise to PNG so transparency is preserved on stamp/embed
        const probe = new Image();
        probe.onload = () => {
          const cv = document.createElement("canvas");
          cv.width = probe.naturalWidth; cv.height = probe.naturalHeight;
          cv.getContext("2d").drawImage(probe, 0, 0);
          uploadURL = cv.toDataURL("image/png");
          upImg.src = uploadURL;
          upPrev.style.display = "flex"; upActions.style.display = "grid";
        };
        probe.onerror = () => toast("Couldn't read that image");
        probe.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
    function clearUpload() {
      uploadURL = null; upFile.value = "";
      upPrev.style.display = "none"; upActions.style.display = "none"; upImg.removeAttribute("src");
    }
    upFile.addEventListener("change", (e) => handleUpload(e.target.files[0]));
    upDrop.addEventListener("click", () => upFile.click());
    ["dragenter", "dragover"].forEach((ev) => upDrop.addEventListener(ev, (e) => { e.preventDefault(); upDrop.classList.add("over"); }));
    ["dragleave", "drop"].forEach((ev) => upDrop.addEventListener(ev, (e) => { e.preventDefault(); upDrop.classList.remove("over"); }));
    upDrop.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) handleUpload(f); });
    $("sg-upclear").addEventListener("click", clearUpload);
    $("sg-upsave").addEventListener("click", () => {
      if (!uploadURL) { toast("Upload an image first"); return; }
      if (commitSignature(uploadURL)) clearUpload();
    });

    // ---- tab switching ----------------------------------------------------
    tabsEl.querySelectorAll(".sign-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const mode = tab.dataset.mode;
        tabsEl.querySelectorAll(".sign-tab").forEach((t) => t.classList.toggle("active", t === tab));
        view.querySelectorAll(".sign-mode").forEach((m) => {
          m.style.display = m.dataset.mode === mode ? "" : "none";
        });
      });
    });
    updateTypePreview();

    // ===================================================================
    //  PDF load + render
    // ===================================================================
    function handleFile(file) {
      if (!file) return;
      if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) { toast("Please choose a PDF"); return; }
      const reader = new FileReader();
      reader.onload = (e) => openPDF(new Uint8Array(e.target.result));
      reader.readAsArrayBuffer(file);
    }

    async function openPDF(bytes) {
      rawBytes = bytes;
      try {
        // pdf.js transfers/detaches the buffer it reads, so hand it a copy
        pdfDoc = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
      } catch (err) {
        console.error(err); toast("Couldn't read that PDF"); return;
      }
      pageCount = pdfDoc.numPages; pageNum = 1;
      placements.length = 0; overlay.innerHTML = "";
      emptyEl.style.display = "none"; cwrap.style.display = "block"; toolbar.style.display = "flex";
      placeBtn.disabled = !activeSig;
      await renderPage();
      updateDownload();
      toast("PDF loaded — " + pageCount + " page" + (pageCount > 1 ? "s" : ""));
    }

    async function renderPage() {
      if (renderTask) { try { renderTask.cancel(); } catch (_) {} }
      const page = await pdfDoc.getPage(pageNum);
      const avail = Math.max(320, stage.clientWidth - 4);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(2, avail / base.width);
      viewport = page.getViewport({ scale });
      const ratio = window.devicePixelRatio || 1;
      pageCanvas.width = Math.floor(viewport.width * ratio);
      pageCanvas.height = Math.floor(viewport.height * ratio);
      pageCanvas.style.width = viewport.width + "px";
      pageCanvas.style.height = viewport.height + "px";
      cwrap.style.width = viewport.width + "px";
      cwrap.style.height = viewport.height + "px";
      const ctx = pageCanvas.getContext("2d");
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      renderTask = page.render({ canvasContext: ctx, viewport });
      await renderTask.promise.catch(() => {});
      pageNoEl.textContent = pageNum + " / " + pageCount;
      prevBtn.disabled = pageNum <= 1; nextBtn.disabled = pageNum >= pageCount;
      drawOverlay();
    }

    prevBtn.addEventListener("click", () => { if (pageNum > 1) { pageNum--; renderPage(); } });
    nextBtn.addEventListener("click", () => { if (pageNum < pageCount) { pageNum++; renderPage(); } });

    // ===================================================================
    //  Placement overlay (drag + resize, stored as page-relative ratios)
    // ===================================================================
    function addPlacement(xRatio, yRatio, opts) {
      if (!activeSig) { toast("Pick or draw a signature first"); return; }
      const probe = new Image();
      probe.onload = () => {
        const wPx = parseInt(sizeEl.value, 10);
        const hPx = wPx * (probe.height / probe.width);
        const p = {
          page: pageNum,
          wRatio: wPx / viewport.width,
          hRatio: hPx / viewport.height,
          xRatio, yRatio, dataURL: activeSig, el: null,
        };
        // keep inside the page
        p.xRatio = Math.min(Math.max(0, xRatio), 1 - p.wRatio);
        p.yRatio = Math.min(Math.max(0, yRatio), 1 - p.hRatio);
        placements.push(p);
        drawOverlay();
        updateDownload();
        if (opts && opts.toast) toast(opts.toast);
      };
      probe.src = activeSig;
    }

    function drawOverlay() {
      overlay.innerHTML = "";
      placements.filter((p) => p.page === pageNum).forEach((p) => {
        const box = FIPU.el("div.sign-box");
        box.style.left = (p.xRatio * viewport.width) + "px";
        box.style.top = (p.yRatio * viewport.height) + "px";
        box.style.width = (p.wRatio * viewport.width) + "px";
        box.style.height = (p.hRatio * viewport.height) + "px";
        box.style.backgroundImage = `url(${p.dataURL})`;
        const del = FIPU.el("button.sign-box-del", { text: "×", title: "Remove" });
        del.addEventListener("click", (e) => {
          e.stopPropagation();
          placements.splice(placements.indexOf(p), 1); drawOverlay(); updateDownload();
        });
        const grip = FIPU.el("div.sign-box-grip", { title: "Resize" });
        box.appendChild(del); box.appendChild(grip);
        p.el = box;
        enableDrag(box, p, grip);
        overlay.appendChild(box);
      });
    }

    function enableDrag(box, p, grip) {
      let mode = null, sx, sy, ox, oy, ow, oh;
      const down = (e, m) => {
        e.preventDefault(); e.stopPropagation();
        mode = m;
        const pt = e.touches ? e.touches[0] : e;
        sx = pt.clientX; sy = pt.clientY;
        ox = p.xRatio; oy = p.yRatio; ow = p.wRatio; oh = p.hRatio;
        window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
        window.addEventListener("touchmove", move, { passive: false }); window.addEventListener("touchend", up);
      };
      const move = (e) => {
        const pt = e.touches ? e.touches[0] : e;
        const dx = (pt.clientX - sx) / viewport.width;
        const dy = (pt.clientY - sy) / viewport.height;
        if (mode === "move") {
          p.xRatio = Math.min(Math.max(0, ox + dx), 1 - p.wRatio);
          p.yRatio = Math.min(Math.max(0, oy + dy), 1 - p.hRatio);
        } else {
          const ar = oh / ow;
          p.wRatio = Math.min(Math.max(0.03, ow + dx), 1 - p.xRatio);
          p.hRatio = p.wRatio * ar;
        }
        box.style.left = (p.xRatio * viewport.width) + "px";
        box.style.top = (p.yRatio * viewport.height) + "px";
        box.style.width = (p.wRatio * viewport.width) + "px";
        box.style.height = (p.hRatio * viewport.height) + "px";
      };
      const up = () => {
        mode = null;
        window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up);
        window.removeEventListener("touchmove", move); window.removeEventListener("touchend", up);
      };
      box.addEventListener("mousedown", (e) => down(e, "move"));
      box.addEventListener("touchstart", (e) => down(e, "move"), { passive: false });
      grip.addEventListener("mousedown", (e) => down(e, "resize"));
      grip.addEventListener("touchstart", (e) => down(e, "resize"), { passive: false });
    }

    // place at center of the current view
    placeBtn.addEventListener("click", () => {
      const wGuess = parseInt(sizeEl.value, 10) / viewport.width;
      addPlacement(0.5 - wGuess / 2, 0.45, { toast: "Drag it into place" });
    });

    sizeEl.addEventListener("input", () => { szval.textContent = sizeEl.value + " px"; });

    // ===================================================================
    //  Auto-suggest: scan the text layer for signature cues
    // ===================================================================
    const CUES = [/signature/i, /\bsign(ed)?\b/i, /sign here/i, /potpis/i, /\bfirma\b/i, /\bfirmato\b/i, /_{4,}/];
    async function suggestSpots() {
      if (!pdfDoc) return;
      const page = await pdfDoc.getPage(pageNum);
      const vp = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      let hits = [];
      content.items.forEach((it) => {
        const str = (it.str || "").trim();
        if (!str) return;
        if (CUES.some((re) => re.test(str))) {
          // pdf.js transform: [a,b,c,d,e,f]; e,f = baseline origin in PDF space
          const tx = it.transform, x = tx[4], yTop = vp.height - tx[5];
          hits.push({ x, yTop, w: it.width || 80, h: it.height || 12, str });
        }
      });
      if (!hits.length) { toast("No signature cues found on this page — place it manually"); return; }
      // suggest a spot just above each cue (where a signature usually goes)
      hits.slice(0, 4).forEach((hit) => {
        const wPx = parseInt(sizeEl.value, 10);
        const xRatio = (hit.x / vp.width) * (viewport.width / viewport.width); // hit.x already PDF px == css ratio basis
        const xr = hit.x / vp.width;
        const yr = Math.max(0, (hit.yTop - hit.h - parseInt(sizeEl.value, 10) * (vp.height / viewport.height)) / vp.height);
        markSuggestion(xr, yr, hit.str);
      });
      toast("Found " + Math.min(hits.length, 4) + " spot" + (hits.length > 1 ? "s" : "") + " — click a marker to sign there");
    }

    function markSuggestion(xr, yr, label) {
      const m = FIPU.el("button.sign-suggest", { title: "Place signature here (“" + label.slice(0, 24) + "”)", text: "✍ sign here" });
      m.style.left = (xr * viewport.width) + "px";
      m.style.top = (yr * viewport.height) + "px";
      m.addEventListener("click", () => {
        if (!activeSig) { toast("Pick or draw a signature first"); return; }
        addPlacement(xr, yr, { toast: "Placed — adjust if needed" });
        m.remove();
      });
      overlay.appendChild(m);
    }
    suggestBtn.addEventListener("click", suggestSpots);

    // ===================================================================
    //  Stamp with pdf-lib and download
    // ===================================================================
    function updateDownload() { downloadBtn.disabled = placements.length === 0; }

    async function buildSigned() {
      const { PDFDocument } = PDFLib;
      const doc = await PDFDocument.load(rawBytes);
      const pages = doc.getPages();
      // cache embedded images by dataURL
      const cache = new Map();
      for (const p of placements) {
        const page = pages[p.page - 1];
        if (!page) continue;
        const { width: pw, height: ph } = page.getSize();
        let img = cache.get(p.dataURL);
        if (!img) {
          const b = await (await fetch(p.dataURL)).arrayBuffer();
          img = await doc.embedPng(b); cache.set(p.dataURL, img);
        }
        const w = p.wRatio * pw, h = p.hRatio * ph;
        const x = p.xRatio * pw;
        const y = ph - (p.yRatio * ph) - h; // ratios are top-left; PDF origin is bottom-left
        page.drawImage(img, { x, y, width: w, height: h });
      }
      return doc.save();
    }

    downloadBtn.addEventListener("click", async () => {
      if (!placements.length) return;
      downloadBtn.disabled = true; const txt = downloadBtn.textContent; downloadBtn.textContent = "Signing…";
      try {
        const bytes = await buildSigned();
        FIPU.download(new Blob([bytes], { type: "application/pdf" }), "signed.pdf");
        toast("Signed PDF downloaded");
      } catch (e) {
        console.error(e); toast("Signing failed — see console");
      } finally {
        downloadBtn.textContent = txt; downloadBtn.disabled = placements.length === 0;
      }
    });

    // ===================================================================
    //  File input wiring + re-render on resize
    // ===================================================================
    fileEl.addEventListener("change", (e) => handleFile(e.target.files[0]));
    dropEl.addEventListener("click", () => fileEl.click());
    ["dragenter", "dragover"].forEach((ev) => dropEl.addEventListener(ev, (e) => { e.preventDefault(); dropEl.classList.add("over"); }));
    ["dragleave", "drop"].forEach((ev) => dropEl.addEventListener(ev, (e) => { e.preventDefault(); dropEl.classList.remove("over"); }));
    dropEl.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) handleFile(f); });

    let resizeT;
    this._onResize = () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (pdfDoc) renderPage(); }, 150); };
    window.addEventListener("resize", this._onResize);

    // ---- init ------------------------------------------------------------
    renderLibrary();
  },

  unmount() {
    if (this._onResize) window.removeEventListener("resize", this._onResize);
  },
});
