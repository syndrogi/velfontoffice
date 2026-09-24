/**
 * BETA OFFICE — Command Palette
 * Cmd/Ctrl+K opens a filtered command list; ESC or an outside click
 * closes it. Commands = a small fixed set (grid/invert/reset/home/
 * randomize/close-all) plus one "Open <name>" entry auto-generated per
 * registered experiment (registry.js), so it scales for free as more
 * experiments are added — no list here to keep in sync by hand.
 */
(function () {
  var palette = document.getElementById("betaCommandPalette");
  var input = document.getElementById("betaCommandInput");
  var list = document.getElementById("betaCommandList");
  if (!palette || !input || !list) return;

  var STATIC_COMMANDS = [
    { label: "Toggle Grid", run: function () { window.BetaGrid && window.BetaGrid.toggle(); } },
    { label: "Invert Page", run: function () { window.BetaColor && window.BetaColor.invert(); } },
    { label: "Reset Experiments", run: function () { window.BetaApp && window.BetaApp.resetAll(); } },
    { label: "Open Archive", run: function () { window.location.href = "/#archive"; } },
    { label: "Go Home", run: function () { window.location.href = "/"; } },
    { label: "Randomize", run: function () { window.BetaApp && window.BetaApp.randomizeAll(); } },
    { label: "Close All Windows", run: function () { window.BetaWM && window.BetaWM.closeAll(); } },
  ];

  var activeIndex = 0;
  var filtered = [];

  function allCommands() {
    var dynamic = (window.BetaExperiments ? window.BetaExperiments.getAll() : []).map(function (spec) {
      return {
        label: "Open " + spec.name,
        run: function () {
          window.BetaWM && window.BetaWM.openExperiment(spec.id);
        },
      };
    });
    return STATIC_COMMANDS.concat(dynamic);
  }

  function render() {
    var query = input.value.trim().toLowerCase();
    var all = allCommands();
    filtered = query ? all.filter(function (c) { return c.label.toLowerCase().indexOf(query) !== -1; }) : all;
    activeIndex = 0;
    list.innerHTML = "";
    filtered.forEach(function (cmd, i) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "beta-command-item" + (i === activeIndex ? " beta-is-active" : "");
      btn.textContent = cmd.label;
      btn.addEventListener("click", function () {
        cmd.run();
        close();
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  function setActive(i) {
    var items = list.querySelectorAll(".beta-command-item");
    if (!items.length) return;
    activeIndex = ((i % items.length) + items.length) % items.length;
    items.forEach(function (el, idx) {
      el.classList.toggle("beta-is-active", idx === activeIndex);
    });
    items[activeIndex].scrollIntoView({ block: "nearest" });
  }

  function open() {
    palette.hidden = false;
    input.value = "";
    render();
    input.focus();
  }

  function close() {
    palette.hidden = true;
  }

  function isOpen() {
    return !palette.hidden;
  }

  document.addEventListener("keydown", function (e) {
    var isMeta = e.metaKey || e.ctrlKey;
    if (isMeta && e.key.toLowerCase() === "k") {
      e.preventDefault();
      isOpen() ? close() : open();
      return;
    }
    if (!isOpen()) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(activeIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(activeIndex - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      var cmd = filtered[activeIndex];
      if (cmd) {
        cmd.run();
        close();
      }
    }
  });

  input.addEventListener("input", render);

  document.addEventListener("pointerdown", function (e) {
    if (!isOpen()) return;
    if (!palette.contains(e.target)) close();
  });

  window.BetaCommandPalette = { open: open, close: close, isOpen: isOpen };
})();
