/**
 * BETA OFFICE experiment — Guess Number
 * Classic 1-100 higher/lower guessing game, tracking attempts.
 */
(function () {
  if (!window.BetaExperiments) return;

  window.BetaExperiments.registerExperiment({
    id: "guessnumber",
    name: "Guess Number",
    category: "GAMES",
    number: 38,
    description: "1-100, higher/lower hints, fewest guesses",
    launch: function (container) {
      var input = document.createElement("input");
      input.type = "number";
      input.min = "1";
      input.max = "100";
      input.className = "beta-text-input";
      container.appendChild(input);

      var readout = window.BetaControls.readout(container);
      var state = { target: 0, tries: 0, over: false };

      function updateReadout(text) {
        readout.innerHTML = text || "Guess 1-100. Tries: <strong>" + state.tries + "</strong>";
      }

      function build() {
        state.target = 1 + ((Math.random() * 100) | 0);
        state.tries = 0;
        state.over = false;
        input.value = "";
        input.disabled = false;
        updateReadout();
      }
      // Exposed so reset() (registered outside this closure) can start a
      // fresh target without reaching into loose local variables.
      state.restart = build;

      function onGuess() {
        if (state.over) return;
        var v = parseInt(input.value, 10);
        if (!v || v < 1 || v > 100) return;
        state.tries++;
        if (v === state.target) {
          state.over = true;
          input.disabled = true;
          updateReadout("<strong>Correct!</strong> " + state.target + " in " + state.tries + " tries");
        } else {
          updateReadout((v < state.target ? "Higher" : "Lower") + " — tries: <strong>" + state.tries + "</strong>");
        }
      }

      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") onGuess();
      });
      window.BetaControls.miniBtn(container, "Guess", onGuess);
      window.BetaControls.miniBtn(container, "New number", build);

      build();

      container._betaState = state;
      return function cleanup() {};
    },
    reset: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.restart();
    },
  });
})();
