/**
 * BETA OFFICE experiment — Pixel Paint
 * A 16x16 grid of plain divs (not canvas — click/drag needs per-cell hit
 * targets, and there are few enough cells that DOM nodes are cheap here).
 */
(function () {
  if (!window.BetaExperiments) return;

  var GRID = 16;
  var COLORS = ["#111111", "#e0261f", "#ffffff", "#8a8a8a"];

  window.BetaExperiments.registerExperiment({
    id: "pixelpaint",
    name: "Pixel Paint",
    category: "VISUAL",
    number: 67,
    description: "16x16 grid, click-drag to paint",
    launch: function (container) {
      var palette = document.createElement("div");
      palette.className = "beta-pixelpaint-palette";
      container.appendChild(palette);

      var state = { color: COLORS[0], painting: false };
      var swatchButtons = [];
      COLORS.forEach(function (c) {
        var sw = document.createElement("button");
        sw.type = "button";
        sw.className = "beta-pixelpaint-swatch";
        sw.style.backgroundColor = c;
        sw.classList.toggle("beta-is-active", c === state.color);
        sw.addEventListener("click", function () {
          state.color = c;
          swatchButtons.forEach(function (b) { b.classList.remove("beta-is-active"); });
          sw.classList.add("beta-is-active");
        });
        palette.appendChild(sw);
        swatchButtons.push(sw);
      });

      var grid = document.createElement("div");
      grid.className = "beta-pixelpaint-grid";
      container.appendChild(grid);

      var cells = [];
      for (var i = 0; i < GRID * GRID; i++) {
        var cell = document.createElement("div");
        cell.className = "beta-pixelpaint-cell";
        cell.addEventListener("pointerdown", function () {
          state.painting = true;
          this.style.backgroundColor = state.color;
        });
        cell.addEventListener("pointerenter", function () {
          if (state.painting) this.style.backgroundColor = state.color;
        });
        grid.appendChild(cell);
        cells.push(cell);
      }
      function stopPainting() { state.painting = false; }
      document.addEventListener("pointerup", stopPainting);

      window.BetaControls.miniBtn(container, "Clear", function () {
        cells.forEach(function (c) { c.style.backgroundColor = ""; });
      });

      return function cleanup() {
        document.removeEventListener("pointerup", stopPainting);
      };
    },
  });
})();
