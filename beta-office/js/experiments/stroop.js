/**
 * BETA OFFICE experiment — Stroop
 * A color name rendered in a mismatched ink color — click the button
 * matching the ink, not the word. The classic Stroop-effect test.
 */
(function () {
  if (!window.BetaExperiments) return;

  var COLOR_NAMES = ["Red", "Black", "Blue", "Green"];
  var COLOR_VALUES = { Red: "#e0261f", Black: "#111111", Blue: "#2b5fd9", Green: "#1f9e5a" };

  window.BetaExperiments.registerExperiment({
    id: "stroop",
    name: "Stroop",
    category: "STROOP",
    description: "Click the ink color, not the word",
    launch: function (container) {
      var word = window.BetaControls.sampleText(container, "");
      word.classList.add("beta-stroop-word");

      var row = document.createElement("div");
      row.className = "beta-toggle-row";
      container.appendChild(row);

      var readout = window.BetaControls.readout(container);
      var state = { inkColor: "", streak: 0, best: 0 };

      function next() {
        var wordName = COLOR_NAMES[(Math.random() * COLOR_NAMES.length) | 0];
        var inkName = COLOR_NAMES[(Math.random() * COLOR_NAMES.length) | 0];
        word.textContent = wordName;
        word.style.color = COLOR_VALUES[inkName];
        state.inkColor = inkName;
      }

      function updateReadout() {
        readout.innerHTML = "Streak: <strong>" + state.streak + "</strong>  Best: <strong>" + state.best + "</strong>";
      }

      function answer(name) {
        if (name === state.inkColor) {
          state.streak++;
          if (state.streak > state.best) state.best = state.streak;
        } else {
          state.streak = 0;
        }
        updateReadout();
        next();
      }

      COLOR_NAMES.forEach(function (name) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "beta-mini-btn";
        btn.textContent = name;
        btn.addEventListener("click", function () { answer(name); });
        row.appendChild(btn);
      });

      next();
      updateReadout();

      return function cleanup() {};
    },
  });
})();
