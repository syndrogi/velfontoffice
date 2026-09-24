/**
 * BETA OFFICE experiment — Reflex
 * Click to arm, wait for the stage to flip, click again as fast as
 * possible — measures reaction time in ms. Clicking before the flip is
 * a false start. Just best/last, no tunable params, so no randomize/
 * reset (same shape as Debug/DOM/Grid).
 */
(function () {
  if (!window.BetaExperiments) return;

  window.BetaExperiments.registerExperiment({
    id: "reflex",
    name: "Reflex",
    category: "REFLEX",
    description: "Click-to-arm reaction timer, best/last ms",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, false);
      stage.el.classList.add("beta-reflex-stage");
      stage.el.textContent = "Click to start";

      var readout = window.BetaControls.readout(container);
      var state = { phase: "idle", armedAt: 0, timerId: null, best: null, last: null };

      function updateReadout() {
        readout.innerHTML =
          "Best: <strong>" + (state.best != null ? state.best + "ms" : "—") + "</strong>" +
          "  Last: <strong>" + (state.last != null ? state.last + "ms" : "—") + "</strong>";
      }

      function setPhase(phase, text) {
        state.phase = phase;
        stage.el.classList.remove("beta-is-go", "beta-is-early");
        if (phase === "go") stage.el.classList.add("beta-is-go");
        if (phase === "early") stage.el.classList.add("beta-is-early");
        stage.el.textContent = text;
      }

      stage.el.addEventListener("click", function () {
        if (state.phase === "armed") {
          clearTimeout(state.timerId);
          setPhase("early", "Too soon — click to retry");
          return;
        }
        if (state.phase === "go") {
          state.last = Math.round(performance.now() - state.armedAt);
          if (state.best == null || state.last < state.best) state.best = state.last;
          updateReadout();
          setPhase("result", "Click to go again");
          return;
        }
        // idle / early / result — arm a fresh round.
        setPhase("armed", "Wait...");
        state.timerId = setTimeout(function () {
          state.armedAt = performance.now();
          setPhase("go", "Click!");
        }, 800 + Math.random() * 1700);
      });

      updateReadout();

      return function cleanup() {
        clearTimeout(state.timerId);
      };
    },
  });
})();
