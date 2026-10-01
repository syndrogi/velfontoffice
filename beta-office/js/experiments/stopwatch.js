/**
 * BETA OFFICE experiment — Stopwatch
 * Start, stop, lap (keeps the last 5), reset.
 */
(function () {
  if (!window.BetaExperiments) return;

  window.BetaExperiments.registerExperiment({
    id: "stopwatch",
    name: "Stopwatch",
    category: "STOPWATCH",
    number: 64,
    description: "Start, stop, lap, reset",
    launch: function (container) {
      var readout = window.BetaControls.readout(container);
      var lapsBox = document.createElement("div");
      lapsBox.className = "beta-stopwatch-laps";
      container.appendChild(lapsBox);

      var state = { running: false, elapsed: 0, startedAt: 0, timerId: null, laps: [] };

      function format(ms) {
        var totalSec = ms / 1000;
        var m = Math.floor(totalSec / 60);
        var s = (totalSec % 60).toFixed(2);
        return m + ":" + (Number(s) < 10 ? "0" : "") + s;
      }

      function currentElapsed() {
        return state.elapsed + (state.running ? performance.now() - state.startedAt : 0);
      }

      function render() {
        readout.innerHTML = "<strong>" + format(currentElapsed()) + "</strong>";
      }

      window.BetaControls.miniBtn(container, "Start", function () {
        if (state.running) return;
        state.running = true;
        state.startedAt = performance.now();
        state.timerId = setInterval(render, 33);
      });
      window.BetaControls.miniBtn(container, "Stop", function () {
        if (!state.running) return;
        state.elapsed += performance.now() - state.startedAt;
        state.running = false;
        clearInterval(state.timerId);
        render();
      });
      window.BetaControls.miniBtn(container, "Lap", function () {
        state.laps.unshift(format(currentElapsed()));
        if (state.laps.length > 5) state.laps.length = 5;
        lapsBox.textContent = state.laps.join(" · ");
      });
      window.BetaControls.miniBtn(container, "Reset", function () {
        state.running = false;
        clearInterval(state.timerId);
        state.elapsed = 0;
        state.laps = [];
        lapsBox.textContent = "";
        render();
      });

      render();

      container._betaState = state;

      return function cleanup() {
        clearInterval(state.timerId);
      };
    },
  });
})();
