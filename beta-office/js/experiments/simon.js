/**
 * BETA OFFICE experiment — Simon
 * Watch the sequence flash, then repeat it by clicking the same four
 * pads in order. One wrong tap ends the round. Pads are shaded within
 * the existing monochrome + accent-red palette, not a new hue.
 */
(function () {
  if (!window.BetaExperiments) return;

  var FLASH_MS = 380;
  var GAP_MS = 180;

  window.BetaExperiments.registerExperiment({
    id: "simon",
    name: "Simon",
    category: "SIMON",
    description: "Watch, then repeat the flashing sequence",
    launch: function (container) {
      var grid = document.createElement("div");
      grid.className = "beta-simon-grid";
      container.appendChild(grid);

      var pads = [];
      for (var i = 0; i < 4; i++) {
        var pad = document.createElement("button");
        pad.type = "button";
        pad.className = "beta-simon-pad";
        (function (idx) {
          pad.addEventListener("click", function () { onPad(idx); });
        })(i);
        grid.appendChild(pad);
        pads.push(pad);
      }

      var readout = window.BetaControls.readout(container);
      var state = { sequence: [], input: [], playing: false, timers: [] };

      function updateReadout(text) {
        readout.innerHTML = text != null ? text : "Round: <strong>" + state.sequence.length + "</strong>";
      }

      function flash(idx, cb) {
        pads[idx].classList.add("beta-is-active");
        var t1 = setTimeout(function () {
          pads[idx].classList.remove("beta-is-active");
          var t2 = setTimeout(function () { if (cb) cb(); }, GAP_MS);
          state.timers.push(t2);
        }, FLASH_MS);
        state.timers.push(t1);
      }

      function playSequence() {
        state.playing = true;
        state.input = [];
        var i = 0;
        function step() {
          if (i >= state.sequence.length) {
            state.playing = false;
            updateReadout();
            return;
          }
          flash(state.sequence[i], function () {
            i++;
            step();
          });
        }
        step();
      }

      function nextRound() {
        state.sequence.push((Math.random() * 4) | 0);
        updateReadout("Watch...");
        playSequence();
      }
      // Exposed so reset() (registered outside this closure) can start a
      // fresh round without reaching into loose local variables.
      state.restart = function () {
        state.timers.forEach(clearTimeout);
        state.timers = [];
        state.sequence = [];
        nextRound();
      };

      function onPad(idx) {
        if (state.playing) return;
        pads[idx].classList.add("beta-is-active");
        setTimeout(function () { pads[idx].classList.remove("beta-is-active"); }, 150);

        state.input.push(idx);
        var pos = state.input.length - 1;
        if (state.input[pos] !== state.sequence[pos]) {
          updateReadout("Wrong — round <strong>" + state.sequence.length + "</strong>, click New game");
          return;
        }
        if (state.input.length === state.sequence.length) {
          setTimeout(nextRound, 400);
        }
      }

      window.BetaControls.miniBtn(container, "New game", state.restart);
      state.restart();

      container._betaState = state;

      return function cleanup() {
        state.timers.forEach(clearTimeout);
      };
    },
    reset: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.restart();
    },
  });
})();
