/**
 * BETA OFFICE — Keyboard Shortcuts
 * G / R / 0 / Esc, all ignored while typing in a field (input/textarea/
 * select/contenteditable) or while the command palette is open (it
 * owns the keyboard itself while visible — see command-palette.js).
 * Also wires the small fixed KEYS button that shows the legend.
 */
(function () {
  var keysBtn = document.getElementById("betaKeysBtn");
  var keysPanel = document.getElementById("betaKeysPanel");

  function isTypingTarget(el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
  }

  function toggleKeysPanel(show) {
    if (!keysBtn || !keysPanel) return;
    var next = typeof show === "boolean" ? show : keysPanel.hidden;
    keysPanel.hidden = !next;
    keysBtn.setAttribute("aria-expanded", String(next));
  }

  if (keysBtn && keysPanel) {
    keysBtn.addEventListener("click", function () {
      toggleKeysPanel();
    });
    document.addEventListener("pointerdown", function (e) {
      if (keysPanel.hidden) return;
      if (e.target === keysBtn || keysPanel.contains(e.target)) return;
      toggleKeysPanel(false);
    });
  }

  document.addEventListener("keydown", function (e) {
    if (isTypingTarget(e.target)) return;
    if (window.BetaCommandPalette && window.BetaCommandPalette.isOpen()) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    var key = e.key.toLowerCase();
    if (key === "g") {
      window.BetaGrid && window.BetaGrid.toggle();
    } else if (key === "r") {
      window.BetaApp && window.BetaApp.randomizeAll();
    } else if (key === "0") {
      window.BetaApp && window.BetaApp.resetAll();
    } else if (e.key === "Escape") {
      if (keysPanel && !keysPanel.hidden) toggleKeysPanel(false);
    }
  });
})();
