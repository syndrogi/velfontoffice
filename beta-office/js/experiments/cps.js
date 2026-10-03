/**
 * BETA OFFICE experiment — CPS
 * Click as fast as possible for a fixed 5-second window; reports clicks
 * per second, keeps the best run.
 */
(function () {
  if (!window.BetaExperiments) return;

  var DURATION_MS = 5000;

  window.BetaExperiments.registerExperiment({
    id: "cps",
    name: "CPS",
    category: "SKILL",
    number: 43,
    description: "Click as fast as you can for 5 seconds",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, false);
      stage.el.classList.add("beta-cps-stage");
      stage.el.textContent = "Click to start";

      var readout = window.BetaControls.readout(container);
      var state = { running: false, clicks: 0, endTimer: null, best: null };

      function finish() {
        state.running = false;
        var cpsValue = Number((state.clicks / (DURATION_MS / 1000)).toFixed(1));
        if (state.best == null || cpsValue > state.best) state.best = cpsValue;
        stage.el.textContent = "Click to start";
        readout.innerHTML = "Last: <strong>" + cpsValue + " cps</strong>  Best: <strong>" + state.best + " cps</strong>";
      }

      stage.el.addEventListener("click", function () {
        if (!state.running) {
          state.running = true;
          state.clicks = 0;
          stage.el.textContent = "GO";
          readout.textContent = "";
          state.endTimer = setTimeout(finish, DURATION_MS);
          return;
        }
        state.clicks++;
        stage.el.textContent = String(state.clicks);
      });

      return function cleanup() {
        clearTimeout(state.endTimer);
      };
    },
  });
})();
