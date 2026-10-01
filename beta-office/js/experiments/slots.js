/**
 * BETA OFFICE experiment — Slots
 * Three independently-timed flickering reels settle in sequence; match
 * all three for a jackpot message.
 */
(function () {
  if (!window.BetaExperiments) return;

  var SYMBOLS = ["🍒", "🍋", "🔔", "⭐", "7️⃣", "🍇"];

  window.BetaExperiments.registerExperiment({
    id: "slots",
    name: "Slots",
    category: "SLOTS",
    number: 33,
    description: "Spin 3 reels, match all 3 to win",
    launch: function (container) {
      var row = document.createElement("div");
      row.className = "beta-slots-row";
      container.appendChild(row);

      var reels = [];
      for (var i = 0; i < 3; i++) {
        var reel = document.createElement("div");
        reel.className = "beta-slots-reel";
        reel.textContent = SYMBOLS[0];
        row.appendChild(reel);
        reels.push(reel);
      }

      var readout = window.BetaControls.readout(container);
      var state = { spinning: false, timers: [] };

      function spin() {
        if (state.spinning) return;
        state.spinning = true;
        state.timers = [];
        readout.textContent = "";
        var results = [];
        reels.forEach(function (reel, i) {
          var steps = 12 + i * 6;
          var count = 0;
          var t = setInterval(function () {
            reel.textContent = SYMBOLS[(Math.random() * SYMBOLS.length) | 0];
            count++;
            if (count >= steps) {
              clearInterval(t);
              var final = SYMBOLS[(Math.random() * SYMBOLS.length) | 0];
              reel.textContent = final;
              results.push(final);
              if (results.length === reels.length) {
                state.spinning = false;
                readout.innerHTML = results.every(function (s) { return s === results[0]; })
                  ? "<strong>Jackpot!</strong>"
                  : "No match — spin again";
              }
            }
          }, 60);
          state.timers.push(t);
        });
      }

      window.BetaControls.miniBtn(container, "Spin", spin);

      container._betaState = state;

      return function cleanup() {
        state.timers.forEach(clearInterval);
      };
    },
  });
})();
