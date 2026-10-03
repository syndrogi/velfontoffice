/**
 * BETA OFFICE experiment — HiLo
 * Guess whether the next card ranks higher or lower than the one shown.
 * A wrong guess (or a tie) resets the streak.
 */
(function () {
  if (!window.BetaExperiments) return;

  var RANKS = { 1: "A", 11: "J", 12: "Q", 13: "K" };

  function randCard() { return 1 + ((Math.random() * 13) | 0); }
  function label(n) { return RANKS[n] || String(n); }

  window.BetaExperiments.registerExperiment({
    id: "hilo",
    name: "HiLo",
    category: "GAMES",
    number: 35,
    description: "Guess higher or lower, build a streak",
    launch: function (container) {
      var state = { current: randCard(), streak: 0, best: 0 };

      var card = window.BetaControls.sampleText(container, label(state.current));
      card.classList.add("beta-hilo-card");

      var readout = window.BetaControls.readout(container);

      function updateReadout() {
        readout.innerHTML = "Streak: <strong>" + state.streak + "</strong>  Best: <strong>" + state.best + "</strong>";
      }

      function guess(dir) {
        var next = randCard();
        var correct = dir === "higher" ? next >= state.current : next <= state.current;
        card.textContent = label(next);
        if (correct) {
          state.streak++;
          if (state.streak > state.best) state.best = state.streak;
        } else {
          state.streak = 0;
        }
        state.current = next;
        updateReadout();
      }

      window.BetaControls.miniBtn(container, "Higher", function () { guess("higher"); });
      window.BetaControls.miniBtn(container, "Lower", function () { guess("lower"); });

      updateReadout();

      return function cleanup() {};
    },
  });
})();
