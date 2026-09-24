/**
 * BETA OFFICE experiment — Whack
 * A mole lights up in a random cell of a 3x3 grid on every beat — click
 * it before the beat moves on. 30-second round, running score.
 */
(function () {
  if (!window.BetaExperiments) return;

  var ROUND_MS = 30000;
  var BEAT_MS = 700;

  window.BetaExperiments.registerExperiment({
    id: "whack",
    name: "Whack",
    category: "WHACK",
    description: "30s timed mole-grid clicker, score",
    launch: function (container) {
      var grid = document.createElement("div");
      grid.className = "beta-whack-grid";
      container.appendChild(grid);

      var cells = [];
      for (var i = 0; i < 9; i++) {
        var cell = document.createElement("button");
        cell.type = "button";
        cell.className = "beta-whack-cell";
        (function (idx) {
          cell.addEventListener("click", function () { onHit(idx); });
        })(i);
        grid.appendChild(cell);
        cells.push(cell);
      }

      var readout = window.BetaControls.readout(container);
      var state = {
        score: 0, running: false, active: -1,
        beatTimer: null, endTimer: null, tickTimer: null, endAt: 0,
      };

      function updateReadout() {
        var secsLeft = state.running ? Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000)) : 0;
        readout.innerHTML = state.running
          ? "Score: <strong>" + state.score + "</strong>  Time: <strong>" + secsLeft + "s</strong>"
          : "Score: <strong>" + state.score + "</strong> — click Start";
      }

      function setActive(idx) {
        if (state.active >= 0) cells[state.active].classList.remove("beta-is-active");
        state.active = idx;
        if (idx >= 0) cells[idx].classList.add("beta-is-active");
      }

      function beat() {
        setActive((Math.random() * 9) | 0);
        state.beatTimer = setTimeout(beat, BEAT_MS);
      }

      function onHit(idx) {
        if (!state.running || idx !== state.active) return;
        state.score++;
        setActive(-1);
        updateReadout();
      }

      function stop() {
        state.running = false;
        clearTimeout(state.beatTimer);
        clearTimeout(state.endTimer);
        clearInterval(state.tickTimer);
        setActive(-1);
        updateReadout();
      }

      function start() {
        stop();
        state.running = true;
        state.score = 0;
        state.endAt = Date.now() + ROUND_MS;
        updateReadout();
        beat();
        state.endTimer = setTimeout(stop, ROUND_MS);
        state.tickTimer = setInterval(updateReadout, 250);
      }
      // Exposed so reset() (registered outside this closure) can start a
      // fresh round without reaching into loose local variables.
      state.restart = start;

      window.BetaControls.miniBtn(container, "Start", start);
      updateReadout();

      container._betaState = state;

      return function cleanup() {
        clearTimeout(state.beatTimer);
        clearTimeout(state.endTimer);
        clearInterval(state.tickTimer);
      };
    },
    reset: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.restart();
    },
  });
})();
