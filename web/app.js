/* ===========================================================================
   FIPU Utils — boot + router
   Builds the sidebar from the tool registry and switches the active tool
   based on the URL hash (#tool-id). Runs after all tools have registered.
   =========================================================================== */

(function () {
  "use strict";

  const tools = FIPU.tools;
  const view = document.getElementById("view");
  const navEl = document.getElementById("sideNav");
  const toolTitle = document.getElementById("toolTitle");
  const toolIcon = document.getElementById("toolIcon");
  const app = document.querySelector(".app");

  let current = null;

  // ---- build sidebar nav --------------------------------------------------
  function buildNav() {
    navEl.appendChild(FIPU.el("div.nav-head", { text: "Tools" }));
    tools.forEach((tool) => {
      const btn = FIPU.el("button.nav-item", { "data-id": tool.id }, [
        FIPU.el("span.ni-ico", { text: tool.icon || "▦" }),
        FIPU.el("span", { text: tool.title }),
      ]);
      if (tool.soon) {
        btn.classList.add("disabled");
        btn.appendChild(FIPU.el("span.soon", { text: "soon" }));
      } else {
        btn.addEventListener("click", () => { location.hash = tool.id; closeNav(); });
      }
      navEl.appendChild(btn);
    });
  }

  function setActiveNav(id) {
    navEl.querySelectorAll(".nav-item").forEach((b) =>
      b.classList.toggle("active", b.dataset.id === id)
    );
  }

  // ---- routing ------------------------------------------------------------
  function go(id) {
    const tool = tools.find((t) => t.id === id && !t.soon) || tools.find((t) => !t.soon);
    if (!tool) return;

    if (current && current.unmount) {
      try { current.unmount(); } catch (e) { console.error(e); }
    }

    view.innerHTML = "";
    current = tool;
    setActiveNav(tool.id);
    toolTitle.textContent = tool.title;
    toolIcon.textContent = tool.icon || "▦";
    document.title = tool.title + " · FIPU Utils";

    tool.mount(view);
  }

  function route() {
    const id = location.hash.replace(/^#/, "");
    go(id);
  }

  // ---- mobile nav ---------------------------------------------------------
  function closeNav() { app.classList.remove("nav-open"); }
  document.getElementById("menuBtn").addEventListener("click", () =>
    app.classList.toggle("nav-open")
  );
  app.addEventListener("click", (e) => {
    // tap the dark overlay (the ::after sits on .app) to close
    if (app.classList.contains("nav-open") && e.target === app) closeNav();
  });

  // ---- boot ---------------------------------------------------------------
  buildNav();
  window.addEventListener("hashchange", route);
  route();
})();
