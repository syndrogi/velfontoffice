/**
 * BETA OFFICE experiment — Coin Flip
 * Click to flicker through heads/tails before settling, tallying both.
 */
(function () {
  if (!window.BetaExperiments) return;

  var FLICKER_MS = 60;
  var FLICKER_STEPS = 10;

  window.BetaExperiments.registerExperiment({
    id: "coinflip",
    name: "Coin Flip",
    category: "GAMES",
    number: 65,
    description: "Animated flip, heads/tails tally",
    launch: function (container) {
      var coin = window.BetaControls.sampleText(container, "H");
      coin.classList.add("beta-coin");

      var readout = window.BetaControls.readout(container);
      var state = { heads: 0, tails: 0, flipping: false, timerId: null };

      function updateReadout() {
        readout.innerHTML = "Heads: <strong>" + state.heads + "</strong>  Tails: <strong>" + state.tails + "</strong>";
      }

      function flip() {
        if (state.flipping) return;
        state.flipping = true;
        var count = 0;
        state.timerId = setInterval(function () {
          coin.textContent = Math.random() < 0.5 ? "H" : "T";
          count++;
          if (count >= FLICKER_STEPS) {
            clearInterval(state.timerId);
            state.flipping = false;
            var result = Math.random() < 0.5 ? "H" : "T";
            coin.textContent = result;
            if (result === "H") state.heads++;
            else state.tails++;
            updateReadout();
          }
        }, FLICKER_MS);
      }

      window.BetaControls.miniBtn(container, "Flip", flip);
      updateReadout();

      container._betaState = state;

      return function cleanup() {
        clearInterval(state.timerId);
      };
    },
  });
})();
