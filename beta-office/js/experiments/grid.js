/**
 * BETA OFFICE experiment — Grid
 * A page-level grid overlay (column / baseline / pixel), toggled
 * independently of whether this window is open — exposed as
 * window.BetaGrid.toggle() for the `G` shortcut and the command
 * palette's "Toggle Grid", same pattern as color.js's BetaColor.invert.
 */
(function () {
  if (!window.BetaExperiments) return;

  var overlay = null;
  var mode = "column";
  var active = false;

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "beta-grid-overlay";
    overlay.setAttribute("aria-hidden", "true");
    document.body.appendChild(overlay);
  }

  function apply() {
    ensureOverlay();
    overlay.dataset.mode = mode;
    overlay.style.display = active ? "" : "none";
  }

  function setActive(next) {
    active = next;
    apply();
  }

  function setMode(next) {
    mode = next;
    apply();
  }

  window.BetaGrid = {
    toggle: function () { setActive(!active); },
    setActive: setActive,
    setMode: setMode,
    isActive: function () { return active; },
  };

  window.BetaExperiments.registerExperiment({
    id: "grid",
    name: "Grid",
    category: "GRID",
    description: "Column, baseline, pixel overlays",
    launch: function (container) {
      window.BetaControls.toggleButton(container, {
        label: "Show grid",
        active: active,
        onToggle: setActive,
      });
      window.BetaControls.toggles(container, {
        value: mode,
        options: [
          { label: "Column", value: "column" },
          { label: "Baseline", value: "baseline" },
          { label: "Pixel", value: "pixel" },
        ],
        onChange: setMode,
      });
      return function cleanup() {};
    },
    reset: function () {
      setActive(false);
      setMode("column");
    },
  });
})();
