/* ===========================================================================
   Tool template — copy this file to tools/<your-tool>.js to add a new util.
   Then add  <script src="tools/<your-tool>.js"></script>  to index.html
   (before app.js). The sidebar entry and routing are wired automatically.

   Set  soon: true  to show it in the sidebar as a disabled "soon" item
   without writing the UI yet.
   =========================================================================== */

FIPU.register({
  id: "example",                 // unique slug, becomes the URL hash (#example)
  title: "Example Tool",         // sidebar + topbar label
  icon: "★",                     // any glyph / emoji
  description: "What this tool does, in one line.",
  soon: true,                    // remove once you implement mount()

  mount(view) {
    // Build the UI inside `view`. Reuse the primitives in styles.css:
    //   .tool-head, .grid.split, .card, .card-title, .field, .btn, …
    view.innerHTML = `
      <div class="tool-head">
        <h2>Example Tool</h2>
        <p>${this.description}</p>
      </div>
      <div class="card">
        <div class="card-title">Settings</div>
        <div class="field">
          <label>A field</label>
          <input type="text" placeholder="…" />
        </div>
        <button class="btn primary">Do the thing</button>
      </div>`;

    // Handy shared helpers:
    //   FIPU.el(...)        build elements
    //   FIPU.toast(msg)     show a toast
    //   FIPU.download(...)  trigger a file download
    //   FIPU.debounce(fn)   debounce input handlers
  },

  // Optional: cleanup when the user navigates away (timers, listeners on
  // window/document, object URLs, etc.). DOM inside `view` is cleared for you.
  unmount() {},
});
