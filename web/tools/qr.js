/* ===========================================================================
   Tool: QR Generator
   Client-side QR code with a custom logo. Mirrors qrGenerator.py:
   build matrix → carve centered safe zone → render SVG → embed logo →
   export SVG (vector) or high-res PNG (raster).
   =========================================================================== */

FIPU.register({
  id: "qr",
  title: "QR Generator",
  icon: "▦",
  description: "Make a QR code with your logo. Upload or pick a logo, tweak the look, and download a high-quality PNG or SVG.",

  mount(view) {
    const MODULE = 10; // px per module in base SVG space
    const toast = FIPU.toast;

    // preset logos (served from /assets next to the site)
    const PRESETS = [
      { name: "FIPU",  src: "assets/fipu.svg" },
      { name: "UNIPU", src: "assets/Unipu-logo.png" },
    ];

    // ---- markup (kept as a template for readability) ----------------------
    view.innerHTML = `
      <div class="tool-head">
        <h2>QR Generator</h2>
        <p>${this.description}</p>
      </div>
      <div class="grid split">
        <div class="card">
          <div class="card-title">Content</div>
          <div class="field">
            <label>Type</label>
            <div class="qr-types" id="qr-types">
              <button type="button" class="qr-type is-on" data-type="url">🔗 Link / Text</button>
              <button type="button" class="qr-type" data-type="wifi">📶 Wi-Fi</button>
              <button type="button" class="qr-type" data-type="email">✉ Email</button>
              <button type="button" class="qr-type" data-type="sms">💬 SMS</button>
              <button type="button" class="qr-type" data-type="tel">📞 Phone</button>
              <button type="button" class="qr-type" data-type="vcard">👤 Contact</button>
            </div>
          </div>
          <div class="qr-form" id="qr-form"><!-- per-type fields injected here --></div>

          <div class="card-title" style="margin-top:24px">Style</div>
          <div class="field">
            <label>Logo</label>
            <div class="drop" id="qr-drop">
              <input type="file" id="qr-file" accept="image/png,image/jpeg,image/svg+xml,image/webp" />
              <div class="dz-ico">⤢</div>
              <div class="dz-main">Drag &amp; drop or <b>browse</b></div>
              <div class="dz-sub">png · jpg · svg · webp</div>
            </div>
            <div class="presets" id="qr-presets">
              <div class="pre none" title="No logo">∅</div>
            </div>
            <div class="logo-chip" id="qr-chip">
              <img id="qr-thumb" alt="" />
              <div class="meta">
                <div class="nm" id="qr-lname">logo</div>
                <div class="dim" id="qr-ldim">—</div>
              </div>
              <button id="qr-lclear">remove</button>
            </div>
          </div>
          <div class="grid-2">
            <div class="field slider-field">
              <div class="top"><label style="margin:0">Logo size</label><span class="val" id="qr-lsval">25%</span></div>
              <input type="range" id="qr-lsize" min="12" max="38" value="25" />
            </div>
            <div class="field">
              <label for="qr-ecc">Error correction</label>
              <select id="qr-ecc">
                <option value="L">L — 7%</option>
                <option value="M">M — 15%</option>
                <option value="Q">Q — 25%</option>
                <option value="H" selected>H — 30% (best)</option>
              </select>
            </div>
          </div>
          <div class="grid-2">
            <div class="field">
              <label>Code color</label>
              <div class="swatch-row"><span class="swatch"><input type="color" id="qr-fg" value="#1d2733" /></span><span class="hex" id="qr-fghex">#1d2733</span></div>
            </div>
            <div class="field">
              <label>Background</label>
              <div class="swatch-row"><span class="swatch"><input type="color" id="qr-bg" value="#ffffff" /></span><span class="hex" id="qr-bghex">#ffffff</span></div>
            </div>
          </div>
          <div class="grid-2">
            <div class="field slider-field">
              <div class="top"><label style="margin:0">Quiet zone</label><span class="val" id="qr-mval">4</span></div>
              <input type="range" id="qr-margin" min="0" max="8" value="4" />
            </div>
            <div class="field">
              <label for="qr-style">Module style</label>
              <select id="qr-style">
                <option value="square" selected>Square</option>
                <option value="dots">Dots</option>
                <option value="rounded">Rounded</option>
              </select>
            </div>
          </div>
        </div>

        <div class="card preview-card">
          <div class="card-title">Preview</div>
          <div class="stage">
            <div class="qr-frame" id="qr-frame" style="display:none"></div>
            <div class="empty" id="qr-empty"><span class="big">⬚</span>enter content to begin</div>
          </div>
          <div class="readout">
            <div><div class="k">Version</div><div class="v" id="qr-rover">—</div></div>
            <div><div class="k">Modules</div><div class="v" id="qr-romod">—</div></div>
            <div><div class="k">Level</div><div class="v" id="qr-roecc">—</div></div>
          </div>
          <div class="field" style="margin-bottom:14px">
            <label for="qr-px">PNG resolution</label>
            <select id="qr-px">
              <option value="512">512 × 512 px</option>
              <option value="1024" selected>1024 × 1024 px</option>
              <option value="2048">2048 × 2048 px — print</option>
              <option value="4096">4096 × 4096 px — large</option>
            </select>
          </div>
          <div class="actions">
            <button class="btn primary" id="qr-dlpng" disabled>↓ PNG</button>
            <button class="btn" id="qr-dlsvg" disabled>↓ SVG</button>
          </div>
        </div>
      </div>`;

    // ---- element refs -----------------------------------------------------
    const $ = (id) => view.querySelector("#" + id);
    const typesEl = $("qr-types"), formEl = $("qr-form");
    const fileEl = $("qr-file"), dropEl = $("qr-drop");
    const presetsEl = $("qr-presets"), chip = $("qr-chip"), thumb = $("qr-thumb");
    const lname = $("qr-lname"), ldim = $("qr-ldim"), lclear = $("qr-lclear");
    const lsize = $("qr-lsize"), lsval = $("qr-lsval"), eccEl = $("qr-ecc");
    const fgEl = $("qr-fg"), bgEl = $("qr-bg"), fghex = $("qr-fghex"), bghex = $("qr-bghex");
    const marginEl = $("qr-margin"), mval = $("qr-mval"), styleEl = $("qr-style");
    const pxEl = $("qr-px"), frame = $("qr-frame"), empty = $("qr-empty");
    const rover = $("qr-rover"), romod = $("qr-romod"), roecc = $("qr-roecc");
    const dlpng = $("qr-dlpng"), dlsvg = $("qr-dlsvg");

    // logo: {kind:'svg',inner,viewBox} | {kind:'raster',href,w,h} | null
    let logo = null;
    let lastSVG = null;

    // ---- QR content types -------------------------------------------------
    // Each type renders its own little form and assembles the QR payload
    // string from the field values. Everything downstream reads payload().
    const esc = (s) => (s || "").replace(/([\\;,:"])/g, "\\$1"); // for wifi/vcard

    const TYPES = {
      url: {
        fields: `<div class="field">
            <label>Link or text <span class="req">*</span></label>
            <textarea data-k="text" placeholder="https://example.com  ·  any text…">https://www.fipu.unipu.hr</textarea>
          </div>`,
        build: (v) => v.text || "",
      },
      wifi: {
        fields: `<div class="field">
            <label>Network name (SSID) <span class="req">*</span></label>
            <input type="text" data-k="ssid" placeholder="MyWiFi" />
          </div>
          <div class="grid-2">
            <div class="field">
              <label>Security</label>
              <select data-k="enc">
                <option value="WPA" selected>WPA / WPA2</option>
                <option value="WEP">WEP</option>
                <option value="nopass">None (open)</option>
              </select>
            </div>
            <div class="field">
              <label>Password</label>
              <input type="text" data-k="pass" placeholder="password" />
            </div>
          </div>
          <label class="qr-check"><input type="checkbox" data-k="hidden" /> Hidden network</label>`,
        build: (v) => {
          if (!v.ssid) return "";
          const enc = v.enc || "WPA";
          const pass = enc === "nopass" ? "" : `P:${esc(v.pass)};`;
          return `WIFI:T:${enc};S:${esc(v.ssid)};${pass}${v.hidden ? "H:true;" : ""};`;
        },
      },
      email: {
        fields: `<div class="field">
            <label>To <span class="req">*</span></label>
            <input type="text" data-k="to" placeholder="name@example.com" />
          </div>
          <div class="field">
            <label>Subject</label>
            <input type="text" data-k="subject" placeholder="Subject" />
          </div>
          <div class="field">
            <label>Message</label>
            <textarea data-k="body" placeholder="Body…"></textarea>
          </div>`,
        build: (v) => {
          if (!v.to) return "";
          const q = [];
          if (v.subject) q.push("subject=" + encodeURIComponent(v.subject));
          if (v.body) q.push("body=" + encodeURIComponent(v.body));
          return `mailto:${v.to.trim()}${q.length ? "?" + q.join("&") : ""}`;
        },
      },
      sms: {
        fields: `<div class="field">
            <label>Phone number <span class="req">*</span></label>
            <input type="text" data-k="num" placeholder="+385 91 234 5678" />
          </div>
          <div class="field">
            <label>Message</label>
            <textarea data-k="body" placeholder="Text…"></textarea>
          </div>`,
        build: (v) => {
          if (!v.num) return "";
          const n = v.num.replace(/[^\d+]/g, "");
          return `SMSTO:${n}:${v.body || ""}`;
        },
      },
      tel: {
        fields: `<div class="field">
            <label>Phone number <span class="req">*</span></label>
            <input type="text" data-k="num" placeholder="+385 91 234 5678" />
          </div>`,
        build: (v) => (v.num ? "tel:" + v.num.replace(/[^\d+]/g, "") : ""),
      },
      vcard: {
        fields: `<div class="grid-2">
            <div class="field"><label>First name <span class="req">*</span></label><input type="text" data-k="first" placeholder="Ada" /></div>
            <div class="field"><label>Last name</label><input type="text" data-k="last" placeholder="Lovelace" /></div>
          </div>
          <div class="grid-2">
            <div class="field"><label>Phone</label><input type="text" data-k="phone" placeholder="+385 …" /></div>
            <div class="field"><label>Email</label><input type="text" data-k="email" placeholder="name@example.com" /></div>
          </div>
          <div class="grid-2">
            <div class="field"><label>Organisation</label><input type="text" data-k="org" placeholder="FIPU" /></div>
            <div class="field"><label>Job title</label><input type="text" data-k="title" placeholder="Role" /></div>
          </div>
          <div class="field"><label>Website</label><input type="text" data-k="url" placeholder="https://…" /></div>`,
        build: (v) => {
          if (!v.first && !v.last) return "";
          const L = ["BEGIN:VCARD", "VERSION:3.0"];
          L.push(`N:${esc(v.last)};${esc(v.first)};;;`);
          L.push(`FN:${[v.first, v.last].filter(Boolean).join(" ")}`);
          if (v.org) L.push(`ORG:${esc(v.org)}`);
          if (v.title) L.push(`TITLE:${esc(v.title)}`);
          if (v.phone) L.push(`TEL;TYPE=CELL:${v.phone}`);
          if (v.email) L.push(`EMAIL:${v.email}`);
          if (v.url) L.push(`URL:${v.url}`);
          L.push("END:VCARD");
          return L.join("\n");
        },
      },
    };

    let curType = "url";
    const rerender = FIPU.debounce(() => render(), 120);

    // read every [data-k] field in the form into a plain object
    function formValues() {
      const v = {};
      formEl.querySelectorAll("[data-k]").forEach((el) => {
        v[el.dataset.k] = el.type === "checkbox" ? el.checked : el.value;
      });
      return v;
    }
    // current QR payload string for the selected type
    function payload() {
      return TYPES[curType].build(formValues()).trim();
    }

    function buildForm() {
      formEl.innerHTML = TYPES[curType].fields;
      formEl.querySelectorAll("textarea, input, select").forEach((el) => {
        const ev = el.tagName === "SELECT" || el.type === "checkbox" ? "change" : "input";
        el.addEventListener(ev, ev === "change" ? render : rerender);
      });
      render();
    }

    // ---- QR build ---------------------------------------------------------
    function buildMatrix(text, ecc) {
      const qr = qrcode(0, ecc);
      qr.addData(text); qr.make();
      const n = qr.getModuleCount(), m = [];
      for (let r = 0; r < n; r++) { const row = []; for (let c = 0; c < n; c++) row.push(qr.isDark(r, c)); m.push(row); }
      return { matrix: m, count: n };
    }
    const versionFromCount = (n) => Math.round((n - 17) / 4);

    function moduleShape(c, r, fill, style) {
      const x = c * MODULE, y = r * MODULE;
      if (style === "dots") return `<circle cx="${x + MODULE / 2}" cy="${y + MODULE / 2}" r="${MODULE * 0.46}" fill="${fill}"/>`;
      if (style === "rounded") return `<rect x="${x}" y="${y}" width="${MODULE}" height="${MODULE}" rx="${MODULE * 0.28}" fill="${fill}"/>`;
      return `<rect x="${x}" y="${y}" width="${MODULE + 0.5}" height="${MODULE + 0.5}" fill="${fill}"/>`;
    }

    function buildSVG(o) {
      const { matrix, count } = buildMatrix(o.text, o.ecc);
      const quiet = o.margin, grid = count + quiet * 2, size = grid * MODULE;
      let start = 0, end = 0;
      if (logo) {
        const span = Math.floor(count * o.logoRatio);
        const center = Math.floor(count / 2), half = Math.floor(span / 2);
        start = center - half; end = center + half;
      }
      let modules = "";
      for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) {
        if (logo && r >= start && r < end && c >= start && c < end) continue;
        if (matrix[r][c]) modules += moduleShape(c + quiet, r + quiet, o.fg, o.style);
      }
      let logoEl = "";
      if (logo) {
        const lx = (start + quiet) * MODULE, ly = (start + quiet) * MODULE;
        const lw = (end - start) * MODULE, lh = (end - start) * MODULE, pad = MODULE * 0.6;
        logoEl += `<rect x="${lx - pad}" y="${ly - pad}" width="${lw + pad * 2}" height="${lh + pad * 2}" rx="${MODULE * 0.5}" fill="${o.bg}"/>`;
        if (logo.kind === "svg")
          logoEl += `<svg x="${lx}" y="${ly}" width="${lw}" height="${lh}" viewBox="${logo.viewBox}" preserveAspectRatio="xMidYMid meet">${logo.inner}</svg>`;
        else
          logoEl += `<image x="${lx}" y="${ly}" width="${lw}" height="${lh}" href="${logo.href}" preserveAspectRatio="xMidYMid meet"/>`;
      }
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="${o.bg}"/><g>${modules}</g>${logoEl}</svg>`;
      return { svg, count };
    }

    function opts() {
      return {
        text: payload(), ecc: eccEl.value, fg: fgEl.value, bg: bgEl.value,
        margin: parseInt(marginEl.value, 10), logoRatio: parseInt(lsize.value, 10) / 100, style: styleEl.value,
      };
    }

    function render() {
      const o = opts();
      if (!o.text) {
        frame.style.display = "none"; empty.style.display = "block";
        empty.innerHTML = '<span class="big">⬚</span>fill in the fields to begin';
        rover.textContent = romod.textContent = roecc.textContent = "—";
        dlpng.disabled = dlsvg.disabled = true; lastSVG = null; return;
      }
      let res;
      try { res = buildSVG(o); }
      catch (e) {
        frame.style.display = "none"; empty.style.display = "block";
        empty.innerHTML = '<span class="big">⚠</span>content too long — lower error correction';
        dlpng.disabled = dlsvg.disabled = true; lastSVG = null; return;
      }
      lastSVG = res.svg;
      frame.innerHTML = res.svg; frame.style.display = "block"; empty.style.display = "none";
      rover.textContent = versionFromCount(res.count);
      romod.innerHTML = `${res.count} <small>× ${res.count}</small>`;
      roecc.textContent = o.ecc;
      dlpng.disabled = dlsvg.disabled = false;
    }

    // ---- downloads --------------------------------------------------------
    function fileStub() {
      if (curType === "url") {
        try { return ("qr-" + new URL(payload()).hostname.replace(/^www\./, "")).replace(/[^a-z0-9.-]/gi, "_"); }
        catch (_) { /* not a URL — fall through */ }
      }
      return "qr-" + curType;
    }
    function downloadSVG() {
      if (!lastSVG) return;
      FIPU.download(new Blob([lastSVG], { type: "image/svg+xml;charset=utf-8" }), fileStub() + ".svg");
      toast("SVG exported");
    }
    function downloadPNG() {
      if (!lastSVG) return;
      const px = parseInt(pxEl.value, 10);
      const img = new Image();
      const url = URL.createObjectURL(new Blob([lastSVG], { type: "image/svg+xml;charset=utf-8" }));
      img.onload = () => {
        const cv = document.createElement("canvas"); cv.width = cv.height = px;
        const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, px, px); URL.revokeObjectURL(url);
        cv.toBlob((b) => { FIPU.download(b, fileStub() + "-" + px + ".png"); toast(px + "×" + px + " PNG exported"); }, "image/png");
      };
      img.onerror = () => { URL.revokeObjectURL(url); toast("PNG export failed"); };
      img.src = url;
    }

    // ---- logo handling ----------------------------------------------------
    function showChip(t, name, dim) { thumb.src = t; lname.textContent = name; ldim.textContent = dim; chip.classList.add("show"); }
    function setRaster(dataURL, name) {
      const probe = new Image();
      probe.onload = () => { logo = { kind: "raster", href: dataURL, w: probe.width, h: probe.height }; showChip(dataURL, name, probe.width + "×" + probe.height); render(); };
      probe.src = dataURL;
    }
    function setSVG(text, name) {
      const root = new DOMParser().parseFromString(text, "image/svg+xml").querySelector("svg");
      if (!root) { toast("Couldn't read SVG"); return; }
      let vb = root.getAttribute("viewBox");
      if (!vb) { const w = parseFloat(root.getAttribute("width")) || 100, h = parseFloat(root.getAttribute("height")) || 100; vb = `0 0 ${w} ${h}`; }
      logo = { kind: "svg", inner: root.innerHTML, viewBox: vb };
      showChip("data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(text))), name, "vector"); render();
    }
    function handleFile(file) {
      if (!file) return;
      const reader = new FileReader();
      if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name)) { reader.onload = (e) => setSVG(e.target.result, file.name); reader.readAsText(file); }
      else { reader.onload = (e) => setRaster(e.target.result, file.name); reader.readAsDataURL(file); }
    }
    function loadPreset(src) {
      fetch(src).then((r) => { if (!r.ok) throw 0; return r; })
        .then((r) => {
          const name = src.split("/").pop();
          if (/\.svg$/i.test(src)) return r.text().then((t) => setSVG(t, name));
          return r.blob().then((b) => { const fr = new FileReader(); fr.onload = (e) => setRaster(e.target.result, name); fr.readAsDataURL(b); });
        }).catch(() => toast("Preset not found — host /assets with the site"));
    }
    function clearLogo() { logo = null; chip.classList.remove("show"); fileEl.value = ""; render(); }

    PRESETS.forEach((p) => {
      const d = FIPU.el("div.pre", { title: p.name, html: `<img src="${p.src}" alt="${p.name}" onerror="this.parentElement.style.display='none'"/>` });
      d.addEventListener("click", () => loadPreset(p.src));
      presetsEl.appendChild(d);
    });

    // ---- wire events ------------------------------------------------------
    typesEl.querySelectorAll(".qr-type").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.type === curType) return;
        curType = btn.dataset.type;
        typesEl.querySelectorAll(".qr-type").forEach((b) => b.classList.toggle("is-on", b === btn));
        buildForm();
      });
    });
    eccEl.addEventListener("change", render);
    styleEl.addEventListener("change", render);
    marginEl.addEventListener("input", () => { mval.textContent = marginEl.value; rerender(); });
    lsize.addEventListener("input", () => { lsval.textContent = lsize.value + "%"; rerender(); });
    fgEl.addEventListener("input", () => { fghex.textContent = fgEl.value; rerender(); });
    bgEl.addEventListener("input", () => { bghex.textContent = bgEl.value; rerender(); });
    fileEl.addEventListener("change", (e) => handleFile(e.target.files[0]));
    dropEl.addEventListener("click", () => fileEl.click());
    presetsEl.querySelector(".none").addEventListener("click", clearLogo);
    lclear.addEventListener("click", clearLogo);
    ["dragenter", "dragover"].forEach((ev) => dropEl.addEventListener(ev, (e) => { e.preventDefault(); dropEl.classList.add("over"); }));
    ["dragleave", "drop"].forEach((ev) => dropEl.addEventListener(ev, (e) => { e.preventDefault(); dropEl.classList.remove("over"); }));
    dropEl.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) handleFile(f); });
    dlsvg.addEventListener("click", downloadSVG);
    dlpng.addEventListener("click", downloadPNG);

    buildForm(); // builds the initial (url) form and renders
  },
});
