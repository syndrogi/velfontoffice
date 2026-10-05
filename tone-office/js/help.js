/**
 * TONE OFFICE — Help
 * A searchable reference reading straight from js/modules.js — the
 * same list the dock buttons build from — so a new module shows up
 * here automatically the moment it's added there. Clicking an entry
 * opens that module's window directly.
 */
(function () {
  var btn = document.getElementById("toneHelpBtn");
  var panel = document.getElementById("toneHelpPanel");
  var search = document.getElementById("toneHelpSearch");
  var closeBtn = document.getElementById("toneHelpClose");
  var list = document.getElementById("toneHelpList");
  if (!btn || !panel || !search || !closeBtn || !list) return;

  function render() {
    var query = search.value.trim().toLowerCase();
    var modules = window.ToneModules || [];
    var items = modules.filter(function (m) {
      if (!query) return true;
      return (
        m.name.toLowerCase().indexOf(query) !== -1 ||
        m.description.toLowerCase().indexOf(query) !== -1
      );
    });

    list.innerHTML = "";
    if (!items.length) {
      var empty = document.createElement("div");
      empty.className = "tone-help-empty";
      empty.textContent = 'No modules match "' + search.value.trim() + '".';
      list.appendChild(empty);
      return;
    }

    items.forEach(function (mod) {
      var entry = document.createElement("button");
      entry.type = "button";
      entry.className = "tone-help-item";

      var name = document.createElement("div");
      name.className = "tone-help-name";
      name.textContent = mod.name;

      var desc = document.createElement("div");
      desc.className = "tone-help-desc";
      desc.textContent = mod.description;

      entry.appendChild(name);
      entry.appendChild(desc);
      entry.addEventListener("click", function () {
        close();
        if (window.ToneWM) window.ToneWM.openModule(mod.id);
      });
      list.appendChild(entry);
    });
  }

  function open() {
    panel.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    search.value = "";
    render();
    search.focus();
  }

  function close() {
    panel.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  }

  function isOpen() {
    return !panel.hidden;
  }

  btn.addEventListener("click", function () {
    isOpen() ? close() : open();
  });
  closeBtn.addEventListener("click", close);
  search.addEventListener("input", render);

  document.addEventListener("keydown", function (e) {
    if (!isOpen()) return;
    if (e.key === "Escape") close();
  });
  document.addEventListener("pointerdown", function (e) {
    if (!isOpen()) return;
    if (e.target === btn || panel.contains(e.target)) return;
    close();
  });

  window.ToneHelp = { open: open, close: close, isOpen: isOpen };
})();
