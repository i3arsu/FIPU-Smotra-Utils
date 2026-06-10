/* ===========================================================================
   FIPU Utils — core
   --------------------------------------------------------------------------
   Shared infrastructure used by every tool. Tools register themselves with
   FIPU.register({...}); app.js builds the nav and routes between them.

   To add a new tool, create web/tools/<name>.js:

     FIPU.register({
       id: "slug",                // unique, used in the URL hash (#slug)
       title: "My Tool",          // sidebar + topbar label
       icon: "★",                 // any glyph / emoji
       description: "One line.",   // shown under the tool heading
       mount(view) { ... },        // build the UI inside `view` (an element)
       unmount() { ... }           // optional cleanup when leaving the tool
     });

   …then add <script src="tools/<name>.js"></script> to index.html.
   =========================================================================== */

window.FIPU = (function () {
  "use strict";

  const tools = [];

  function register(tool) {
    if (!tool || !tool.id) throw new Error("Tool needs an id");
    if (tools.some((t) => t.id === tool.id)) {
      console.warn("Duplicate tool id:", tool.id);
      return;
    }
    tools.push(tool);
  }

  // ---- tiny DOM helper: el("div.card", {id:"x"}, [children|strings]) ------
  function el(spec, attrs, children) {
    const parts = spec.split(/(?=[.#])/);
    const tag = parts[0] || "div";
    const node = document.createElement(tag);
    parts.slice(1).forEach((p) => {
      if (p[0] === ".") node.classList.add(p.slice(1));
      else if (p[0] === "#") node.id = p.slice(1);
    });
    if (attrs) {
      for (const k in attrs) {
        if (k === "html") node.innerHTML = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k.startsWith("on") && typeof attrs[k] === "function")
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else if (attrs[k] != null) node.setAttribute(k, attrs[k]);
      }
    }
    (children || []).forEach((c) =>
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c)
    );
    return node;
  }

  // ---- toast --------------------------------------------------------------
  let toastTimer;
  function toast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  // ---- file download ------------------------------------------------------
  function download(blobOrUrl, filename) {
    const url = typeof blobOrUrl === "string" ? blobOrUrl : URL.createObjectURL(blobOrUrl);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    if (typeof blobOrUrl !== "string") setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---- debounce -----------------------------------------------------------
  function debounce(fn, ms) {
    let t;
    return function () { clearTimeout(t); t = setTimeout(() => fn.apply(this, arguments), ms); };
  }

  return { register, tools, el, toast, download, debounce };
})();
