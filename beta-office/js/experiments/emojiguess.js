/**
 * BETA OFFICE experiment — Emoji Guess
 * Guess the movie/phrase from an emoji combo, fixed pool.
 */
(function () {
  if (!window.BetaExperiments) return;

  var PUZZLES = [
    { emoji: "🦁👑", answer: "LION KING" },
    { emoji: "🕷️👨", answer: "SPIDER MAN" },
    { emoji: "❄️👸", answer: "FROZEN" },
    { emoji: "🌟⚔️", answer: "STAR WARS" },
    { emoji: "🐠🔍", answer: "FINDING NEMO" },
    { emoji: "🏠🎈", answer: "UP" },
  ];

  window.BetaExperiments.registerExperiment({
    id: "emojiguess",
    name: "Emoji Guess",
    category: "WORDPLAY",
    number: 42,
    description: "Guess the phrase from the emoji",
    launch: function (container) {
      var box = window.BetaControls.sampleText(container, "");
      box.classList.add("beta-emoji-puzzle");

      var input = document.createElement("input");
      input.type = "text";
      input.className = "beta-text-input";
      input.autocomplete = "off";
      container.appendChild(input);

      var readout = window.BetaControls.readout(container);
      var state = { answer: "", score: 0, nextTimer: null };

      function build() {
        var p = PUZZLES[(Math.random() * PUZZLES.length) | 0];
        state.answer = p.answer;
        box.textContent = p.emoji;
        input.value = "";
        readout.innerHTML = "Score: <strong>" + state.score + "</strong>";
      }
      // Exposed so reset() (registered outside this closure) can deal a
      // fresh puzzle without reaching into loose local variables.
      state.restart = build;

      function check() {
        if (input.value.trim().toUpperCase() === state.answer) {
          state.score++;
          readout.innerHTML = "<strong>Correct!</strong> Score: " + state.score;
          state.nextTimer = setTimeout(build, 700);
        } else {
          readout.innerHTML = "Try again — Score: <strong>" + state.score + "</strong>";
        }
      }

      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") check();
      });
      window.BetaControls.miniBtn(container, "Check", check);
      window.BetaControls.miniBtn(container, "Skip", build);

      build();

      container._betaState = state;

      return function cleanup() {
        clearTimeout(state.nextTimer);
      };
    },
    reset: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.restart();
    },
  });
})();
