/* ===========================================================================
   Tool: Email Signature
   Generates a UNIPU / FIPU HTML email signature. Port of tania.unipu.hr/potpisi:
   fill fields → pick faculty (swaps logo + accent colour) → live preview →
   copy the HTML or download it for your mail client.

   Faculty data (names, logos, colours, sites) mirrors the original
   sastavnice.js; UI labels mirror languages.js. Logos are referenced by URL
   from www.unipu.hr so they resolve inside email clients (same as the
   original tool — nothing is bundled).
   =========================================================================== */

FIPU.register({
  id: "signature",
  title: "Email Signature",
  icon: "✎",
  description: "Build a UNIPU/FIPU HTML email signature. Pick your faculty, fill in your details, then copy or download it into your mail client.",

  mount(view) {
    const toast = FIPU.toast;

    // ---- faculty data (HR / EN / IT) -------------------------------------
    // index = faculty; arrays per language pulled from the original tool.
    const FAX = {
      hr: "Sveučilište Jurja Dobrile u Puli",
      en: "Juraj Dobrila University of Pula",
      it: "Università Juraj Dobrila di Pola",
    };
    // shared across languages
    const COLOR = [
      "rgb(109,207,246)", "#9e0b0f", "#0066b3", "#00a5a5", "rgb(247,148,30)",
      "rgb(0,174,239)", "#1b1464", "rgb(237,9,115)", "rgb(200,172,118)",
      "rgb(163,207,98)", "rgb(179,161,0)", "#ed1c24", "#00441e",
    ];
    const SITE = [
      "https://fipu.unipu.hr", "https://fet.unipu.hr", "https://ffpu.unipu.hr",
      "https://fooz.unipu.hr", "https://mapu.unipu.hr", "https://fpz.unipu.hr",
      "https://tfpu.unipu.hr", "https://scpu.unipu.hr", "https://skpu.unipu.hr",
      "https://visio.unipu.hr", "https://www.unipu.hr", "https://mfpu.unipu.hr",
      "https://sric.unipu.hr",
    ];
    const REPO = "https://www.unipu.hr/_download/repository/";
    const LOGO_BASE = [
      "FIPU", "FET", "FFPU", "FOOZ", "MAPU", "FPZ", "TFPU", "SCPU", "SKPU",
      "VISIO", "SVE", "MFPU", "SRIC",
    ];
    // logo file suffix per language (SVE has a different naming scheme; MFPU &
    // SRIC only ship the HR file in the source — keep that behaviour)
    function logoUrl(fac, lang) {
      const base = LOGO_BASE[fac];
      if (fac === 10) return REPO + "SVE_kolor_s_nazivom_" + lang.toUpperCase() + ".png"; // UNIPU
      if (fac === 11 || fac === 12) return REPO + base + "_horiz_kolor_HR.png";
      return REPO + base + "_horiz_kolor_" + lang.toUpperCase() + ".png";
    }
    const FAC_NAMES = {
      hr: [
        "Fakultet informatike",
        "Fakultet ekonomije i turizma Dr. Mijo Mirković",
        "Filozofski fakultet",
        "Fakultet za odgojne i obrazovne znanosti",
        "Muzička akademija u Puli",
        "Fakultet prirodnih znanosti u Puli",
        "Tehnički fakultet u Puli",
        "Studentski centar Pula",
        "Sveučilišna knjižnica u Puli",
        "Znanstveno-tehnološki institut VISIO",
        "Sveučilište Jurja Dobrile u Puli",
        "Medicinski fakultet u Puli",
        "Sveučilišni računski i informacijski centar u Puli",
      ],
      en: [
        "Faculty of Informatics",
        "Faculty of Economics and Tourism Dr. Mijo Mirković",
        "Faculty of Humanities",
        "Faculty of Educational Sciences",
        "Academy of Music in Pula",
        "Faculty of Natural Sciences",
        "Faculty of Engineering",
        "Pula Student Centre",
        "The University Library of Pula",
        "Science and Technology Institute VISIO",
        "Juraj Dobrila University of Pula",
        "Faculty of Medicine",
        "University Computing and Information Centre",
      ],
      it: [
        "Facoltà di Informatica",
        "Facoltà di Economia e Turismo Dr. Mijo Mirković",
        "Facoltà di Lettere e Filosofia",
        "Facoltà di Scienze della Formazione",
        "Accademia di Musica di Pula",
        "Facoltà di Scienze Naturali",
        "Facoltà di Ingegneria",
        "Centro studenti di Pola",
        "La Biblioteca universitaria di Pola",
        "Istituto di scienza e tecnologia VISIO",
        "Università Juraj Dobrila di Pola",
        "Facoltà di Medicina",
        "Centro universitario di calcolo e d'informazione",
      ],
    };
    const KRATICA = ["FIPU", "FET", "FFPU", "FOOZ", "MAPU", "FPZ", "TFPU",
      "SCPU", "SKPU", "VISIO", "UNIPU", "MFPU", "SRIC"];

    // ---- UI strings ------------------------------------------------------
    const I18N = {
      hr: { ime: "Ime i prezime (titula)", uloga: "Zvanje ili titula",
        funkcija: "Funkcija", org1: "Organizacijska jedinica 1",
        org2: "Organizacijska jedinica 2", katedra: "Katedra (odsjek) / uloga",
        mobile: "Broj mobitela", phone: "Broj telefona", sastavnica: "Sastavnica",
        adresa: "Adresa", web: "Web", mail: "Mail" },
      en: { ime: "Name and surname (title)", uloga: "Role or title",
        funkcija: "Function", org1: "Organisational unit 1",
        org2: "Organisational unit 2", katedra: "Department / role",
        mobile: "Mobile number", phone: "Telephone number", sastavnica: "Faculty / component",
        adresa: "Address", web: "Web", mail: "Mail" },
      it: { ime: "Nome e cognome (titolo)", uloga: "Ruolo o titolo",
        funkcija: "Funzione", org1: "Unità organizzativa 1",
        org2: "Unità organizzativa 2", katedra: "Dipartimento / ruolo",
        mobile: "Numero di cellulare", phone: "Numero telefonico", sastavnica: "Componente",
        adresa: "Indirizzo", web: "Web", mail: "Mail" },
    };

    // input fields, in order. optional ones hide in the preview when empty.
    const FIELDS = [
      { name: "ime", optional: false },
      { name: "uloga", optional: false },
      { name: "funkcija", optional: true },
      { name: "org1", optional: true },
      { name: "org2", optional: true },
      { name: "katedra", optional: true },
      { name: "mobile", optional: true },
      { name: "phone", optional: true },
      { name: "adresa", optional: false },
      { name: "web", optional: false },
      { name: "mail", optional: false },
    ];

    // ---- markup ----------------------------------------------------------
    view.innerHTML = `
      <div class="tool-head">
        <h2>Email Signature</h2>
        <p>${this.description}</p>
      </div>
      <div class="grid split sg-split">
        <div class="card">
          <div class="card-title">Details</div>
          <div class="grid-2">
            <div class="field">
              <label for="sg-lang">Language</label>
              <select id="sg-lang">
                <option value="hr">Hrvatski</option>
                <option value="en">English</option>
                <option value="it">Italiano</option>
              </select>
            </div>
            <div class="field">
              <label for="sg-fac" id="sg-lbl-fac">Faculty</label>
              <select id="sg-fac"></select>
            </div>
          </div>
          <div id="sg-fields"></div>
        </div>

        <div class="card preview-card">
          <div class="card-title">Preview</div>
          <div class="sg-stage">
            <div id="sg-preview" class="sg-sig"></div>
          </div>
          <div class="actions">
            <button class="btn primary" id="sg-copy">⧉ Copy HTML</button>
            <button class="btn" id="sg-dl">↓ Download .html</button>
          </div>
          <p class="sg-hint">Paste into your mail client's signature settings
            (Outlook: <em>File → Options → Mail → Signatures</em>; Gmail:
            <em>Settings → Signature</em>). Logos load from unipu.hr.</p>
        </div>
      </div>`;

    const $ = (id) => view.querySelector("#" + id);
    const langEl = $("sg-lang"), facEl = $("sg-fac"), fieldsEl = $("sg-fields");
    const preview = $("sg-preview"), facLbl = $("sg-lbl-fac");

    // ---- state -----------------------------------------------------------
    const values = {}; // name -> string
    FIELDS.forEach((f) => (values[f.name] = ""));
    values.web = "https://";

    function lang() { return langEl.value; }
    function fac() { return parseInt(facEl.value, 10) || 0; }
    function esc(s) {
      return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    // ---- build the input fields for the current language -----------------
    function buildFields() {
      const t = I18N[lang()];
      fieldsEl.innerHTML = "";
      FIELDS.forEach((f) => {
        const wrap = FIPU.el("div.field");
        wrap.appendChild(FIPU.el("label", { text: t[f.name], for: "sg-in-" + f.name }));
        const input = FIPU.el("input", {
          type: "text", id: "sg-in-" + f.name, "data-name": f.name,
          value: values[f.name] || "",
        });
        input.addEventListener("input", () => { values[f.name] = input.value; render(); });
        wrap.appendChild(input);
        fieldsEl.appendChild(wrap);
      });
    }

    // ---- populate faculty dropdown ---------------------------------------
    function buildFacultyOptions() {
      const keep = facEl.value;
      facEl.innerHTML = "";
      FAC_NAMES[lang()].forEach((nm, i) => {
        facEl.appendChild(FIPU.el("option", { value: i, text: nm }));
      });
      if (keep) facEl.value = keep;
      facLbl.textContent = I18N[lang()].sastavnica;
    }

    // ---- the signature HTML (this is what gets copied / downloaded) ------
    function signatureHTML() {
      const l = lang(), f = fac(), color = COLOR[f];
      const v = values;
      const row = (label, content) =>
        `<span style="display:inline-block;width:20px;color:${color}">${label}</span>${content}`;

      const optLine = (val, inner) =>
        val ? `<div style="color:#333333;font-size:12px;font-family:Georgia;margin-bottom:3px">${inner}</div>` : "";

      const webHref = v.web && v.web !== "https://" ? esc(v.web) : "";
      const webText = webHref ? webHref.replace(/^https?:\/\//, "") : "";

      const contact = [];
      if (v.adresa) contact.push(row("A:", `<span>${esc(v.adresa)}</span>`));
      if (v.phone) contact.push(row("T:", `<span>${esc(v.phone)}</span>`));
      if (v.mobile) contact.push(row("M:", `<span>${esc(v.mobile)}</span>`));
      if (webHref) contact.push(row("W:", `<a style="color:${color};text-decoration:none" href="${webHref}">${esc(webText)}</a>`));
      if (v.mail) contact.push(row("E:", `<a style="color:${color};text-decoration:none" href="mailto:${esc(v.mail)}">${esc(v.mail)}</a>`));

      return `<table style="font-family:Georgia" border="0" cellspacing="0" cellpadding="0"><tbody><tr>` +
        `<td style="border:none;min-width:400px;padding-left:20px;padding-right:10px;border-left-width:16px;border-left-style:solid;border-left-color:${color}" valign="top">` +
        `<a href="${SITE[f]}"><img src="${logoUrl(f, l)}" alt="logotip ${KRATICA[f]}" style="max-height:90px;border:0"/></a>` +
        `<div style="padding-left:10px;padding-top:20px">` +
        `<div style="padding-bottom:5px;color:${color};font-size:16px;font-family:Georgia">${esc(v.ime)}</div>` +
        optLine(v.uloga, `<em>${esc(v.uloga)}</em>`) +
        optLine(v.funkcija, `<em>${esc(v.funkcija)}</em>`) +
        optLine(v.katedra, `<span>${esc(v.katedra)}</span>`) +
        optLine(v.org1, `<span>${esc(v.org1)}</span>`) +
        optLine(v.org2, `<span>${esc(v.org2)}</span>`) +
        `<div style="color:#333333;font-size:12px;font-family:Georgia;margin-bottom:3px"><span>${esc(FAC_NAMES[l][f])}</span></div>` +
        `<div style="padding-bottom:5px;color:#333333;font-size:12px;font-family:Georgia"><strong>${esc(FAX[l])}</strong></div>` +
        `<div style="color:#333333;font-size:12px;font-family:Georgia;padding-top:15px;line-height:140%">` +
        contact.join("<br/>") +
        `</div></div></td></tr></tbody></table>`;
    }

    function fullDocument() {
      return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>` +
        signatureHTML() + `</body></html>`;
    }

    function render() { preview.innerHTML = signatureHTML(); }

    // ---- actions ---------------------------------------------------------
    function fileStub() {
      const name = (values.ime || "signature").trim().toLowerCase()
        .replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      return (name || "signature") + "-unipu.html";
    }
    async function copyHTML() {
      const html = signatureHTML();
      try {
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({
              "text/html": new Blob([html], { type: "text/html" }),
              "text/plain": new Blob([html], { type: "text/plain" }),
            }),
          ]);
        } else {
          await navigator.clipboard.writeText(html);
        }
        toast("Signature copied — paste into your mail client");
      } catch (e) {
        // fallback: select the rendered preview so the user can Ctrl+C
        const range = document.createRange();
        range.selectNodeContents(preview);
        const sel = window.getSelection();
        sel.removeAllRanges(); sel.addRange(range);
        toast("Press Ctrl/Cmd+C to copy the selected signature");
      }
    }
    function downloadHTML() {
      FIPU.download(new Blob([fullDocument()], { type: "text/html;charset=utf-8" }), fileStub());
      toast("Signature downloaded");
    }

    // ---- wire events -----------------------------------------------------
    langEl.addEventListener("change", () => { buildFacultyOptions(); buildFields(); render(); });
    facEl.addEventListener("change", render);
    $("sg-copy").addEventListener("click", copyHTML);
    $("sg-dl").addEventListener("click", downloadHTML);

    // ---- init ------------------------------------------------------------
    buildFacultyOptions();
    buildFields();
    render();
  },
});
