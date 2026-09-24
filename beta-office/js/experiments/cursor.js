/**
 * BETA OFFICE experiment — Cursor
 * Swaps the pointer for crosshair / large-circle / coordinates-readout
 * / trailing-lag modes. Scoped to this document only (a document-level
 * html class + a couple of appended overlay elements, both fully
 * removed on cleanup) — never touches the root VELFONT OFFICE site.
 */
(function () {
  if (!window.BetaExperiments) return;

  window.BetaExperiments.registerExperiment({
    id: "cursor",
    name: "Cursor",
    category: "CURSOR",
    description: "Crosshair, circle, coords, trailing",
    launch: function (container) {
      var html = document.documentElement;
      var dot = document.createElement("div");
      dot.className = "beta-cursor-dot";
      dot.style.display = "none";
      var coords = document.createElement("div");
      coords.className = "beta-cursor-coords";
      coords.style.display = "none";
      document.body.appendChild(dot);
      document.body.appendChild(coords);

      var state = { mode: "default", x: 0, y: 0, dotX: 0, dotY: 0 };
      var rafId = null;

      function applyMode() {
        html.classList.remove("beta-cursor-crosshair", "beta-cursor-circle");
        dot.style.display = "none";
        coords.style.display = "none";
        if (state.mode === "crosshair") {
          html.classList.add("beta-cursor-crosshair");
        } else if (state.mode === "circle" || state.mode === "trailing") {
          html.classList.add("beta-cursor-circle");
          dot.style.display = "";
        } else if (state.mode === "coordinates") {
          coords.style.display = "";
        }
      }

      function onMove(e) {
        state.x = e.clientX;
        state.y = e.clientY;
        if (state.mode === "circle") {
          dot.style.left = state.x + "px";
          dot.style.top = state.y + "px";
        } else if (state.mode === "coordinates") {
          coords.style.left = state.x + "px";
          coords.style.top = state.y + "px";
          coords.textContent = Math.round(state.x) + ", " + Math.round(state.y);
        }
      }
      document.addEventListener("pointermove", onMove);

      function trailFrame() {
        if (state.mode === "trailing") {
          state.dotX += (state.x - state.dotX) * 0.12;
          state.dotY += (state.y - state.dotY) * 0.12;
          dot.style.left = state.dotX + "px";
          dot.style.top = state.dotY + "px";
        }
        rafId = requestAnimationFrame(trailFrame);
      }
      rafId = requestAnimationFrame(trailFrame);

      window.BetaControls.toggles(container, {
        value: state.mode,
        options: [
          { label: "Default", value: "default" },
          { label: "Crosshair", value: "crosshair" },
          { label: "Circle", value: "circle" },
          { label: "Coords", value: "coordinates" },
          { label: "Trailing", value: "trailing" },
        ],
        onChange: function (v) { state.mode = v; applyMode(); },
      });
      applyMode();

      container._betaState = state;

      return function cleanup() {
        if (rafId) cancelAnimationFrame(rafId);
        document.removeEventListener("pointermove", onMove);
        html.classList.remove("beta-cursor-crosshair", "beta-cursor-circle");
        dot.remove();
        coords.remove();
      };
    },
  });
})();
