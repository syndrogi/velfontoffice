/**
 * BETA OFFICE experiment — Rock Paper Scissors
 * Endless best-of against a random computer pick, running W/L/T tally.
 */
(function () {
  if (!window.BetaExperiments) return;

  var OPTIONS = ["Rock", "Paper", "Scissors"];
  var BEATS = { Rock: "Scissors", Paper: "Rock", Scissors: "Paper" };

  window.BetaExperiments.registerExperiment({
    id: "rockpaperscissors",
    name: "Rock Paper Scissors",
    category: "ROCKPAPERSCISSORS",
    description: "Endless rounds vs the computer, W/L/T tally",
    launch: function (container) {
      var readout = window.BetaControls.readout(container);
      var state = { wins: 0, losses: 0, ties: 0 };

      function updateReadout(last) {
        readout.innerHTML =
          (last ? last + "<br>" : "") +
          "W: <strong>" + state.wins + "</strong>  L: <strong>" + state.losses + "</strong>  T: <strong>" + state.ties + "</strong>";
      }

      function play(choice) {
        var cpu = OPTIONS[(Math.random() * OPTIONS.length) | 0];
        var result;
        if (choice === cpu) {
          state.ties++;
          result = "Tie";
        } else if (BEATS[choice] === cpu) {
          state.wins++;
          result = "You win";
        } else {
          state.losses++;
          result = "You lose";
        }
        updateReadout(choice + " vs " + cpu + " — " + result);
      }

      OPTIONS.forEach(function (opt) {
        window.BetaControls.miniBtn(container, opt, function () { play(opt); });
      });

      updateReadout();

      return function cleanup() {};
    },
  });
})();
