/**
 * BETA OFFICE experiment — Dice
 * Click to roll — a quick flicker through random faces before settling,
 * with a running log of the last few results.
 */
(function () {
  if (!window.BetaExperiments) return;

  var FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  var FLICKER_MS = 40;
  var FLICKER_STEPS = 10;
  var HISTORY_MAX = 6;

  window.BetaExperiments.registerExperiment({
    id: "dice",
    name: "Dice",
    category: "DICE",
    description: "Click to roll, flicker settle, history",
    launch: function (container) {
      var face = window.BetaControls.sampleText(container, FACES[0]);
      face.classList.add("beta-dice-face");

      var readout = window.BetaControls.readout(container);
      var history = [];
      var state = { rolling: false, timerId: null };

      function render() {
        readout.textContent = history.length ? "Last rolls: " + history.join(" ") : "";
      }

      function roll() {
        if (state.rolling) return;
        state.rolling = true;
        var steps = 0;
        state.timerId = setInterval(function () {
          face.textContent = FACES[(Math.random() * 6) | 0];
          steps++;
          if (steps >= FLICKER_STEPS) {
            clearInterval(state.timerId);
            state.rolling = false;
            var result = (Math.random() * 6) | 0;
            face.textContent = FACES[result];
            history.unshift(result + 1);
            if (history.length > HISTORY_MAX) history.length = HISTORY_MAX;
            render();
          }
        }, FLICKER_MS);
      }

      window.BetaControls.miniBtn(container, "Roll", roll);

      container._betaState = state;

      return function cleanup() {
        clearInterval(state.timerId);
      };
    },
  });
})();
