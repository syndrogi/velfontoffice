/**
 * BETA OFFICE — Bootstrap
 * Runs last (after every experiment module has self-registered, and
 * after registry/window-manager/sphere/command-palette/keyboard are
 * all wired). Renders one control-area tile per registered category
 * and exposes window.BetaApp = { randomizeAll, resetAll } — the single
 * thing the RANDOMIZE/RESET buttons, the command palette, and the `R`/
 * `0` keyboard shortcuts all call into, so there's one source of truth
 * for "what does randomize/reset actually do" (sections 15).
 */
(function () {
  if (!window.BetaExperiments || !window.BetaWM) return;

  var tilesEl = document.getElementById("betaCategoryTiles");
  var randomizeBtn = document.getElementById("betaRandomizeBtn");
  var resetBtn = document.getElementById("betaResetBtn");

  function renderTiles() {
    if (!tilesEl) return;
    tilesEl.innerHTML = "";
    window.BetaExperiments.getCategories().forEach(function (category) {
      var specs = window.BetaExperiments.getByCategory(category);
      if (!specs.length) return;
      var tile = document.createElement("button");
      tile.type = "button";
      tile.className = "beta-tile";

      var name = document.createElement("span");
      name.className = "beta-tile-name";
      name.textContent = category;

      var count = document.createElement("span");
      count.className = "beta-tile-count";
      count.textContent = specs[0].description || specs.length + " tool" + (specs.length > 1 ? "s" : "");

      tile.appendChild(name);
      tile.appendChild(count);
      tile.addEventListener("click", function () {
        window.BetaWM.openExperiment(specs[0].id);
      });
      tilesEl.appendChild(tile);
    });
  }

  function randomizeAll() {
    if (window.BetaSphere) window.BetaSphere.randomize();
    window.BetaExperiments.getOpenInstances().forEach(function (instance) {
      if (instance.spec && typeof instance.spec.randomize === "function") {
        try {
          instance.spec.randomize(instance.container);
        } catch (e) {
          /* one experiment misbehaving shouldn't stop the others */
        }
      }
    });
  }

  function resetAll() {
    if (window.BetaSphere) window.BetaSphere.reset();
    window.BetaExperiments.getOpenInstances().forEach(function (instance) {
      if (instance.spec && typeof instance.spec.reset === "function") {
        try {
          instance.spec.reset(instance.container);
        } catch (e) {
          /* same as above */
        }
      }
    });
  }

  if (randomizeBtn) randomizeBtn.addEventListener("click", randomizeAll);
  if (resetBtn) resetBtn.addEventListener("click", resetAll);

  renderTiles();

  window.BetaApp = { randomizeAll: randomizeAll, resetAll: resetAll };
})();
