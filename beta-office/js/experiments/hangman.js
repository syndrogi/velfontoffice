/**
 * BETA OFFICE experiment — Hangman
 * Guess the word one letter at a time via an on-screen A-Z keyboard.
 * Six wrong guesses end the round.
 */
(function () {
  if (!window.BetaExperiments) return;

  var WORDS = ["VELFONT", "ARCHIVE", "PATTERN", "GARMENT", "TEXTILE", "SILHOUETTE", "STUDIO", "RUNWAY"];
  var MAX_WRONG = 6;

  window.BetaExperiments.registerExperiment({
    id: "hangman",
    name: "Hangman",
    category: "HANGMAN",
    number: 30,
    description: "Guess the word, 6 wrong guesses allowed",
    launch: function (container) {
      var wordBox = window.BetaControls.sampleText(container, "");
      wordBox.classList.add("beta-hangman-word");

      var readout = window.BetaControls.readout(container);

      var keyboard = document.createElement("div");
      keyboard.className = "beta-hangman-keys";
      container.appendChild(keyboard);

      var state = { word: "", guessed: null, wrong: 0, over: false, won: false };
      var keyButtons = {};

      function render() {
        wordBox.textContent = state.word
          .split("")
          .map(function (ch) { return state.guessed[ch] ? ch : "_"; })
          .join(" ");
        readout.innerHTML = state.over
          ? state.won
            ? "<strong>Solved!</strong>"
            : "<strong>Out of guesses</strong> — it was " + state.word
          : "Wrong: <strong>" + state.wrong + " / " + MAX_WRONG + "</strong>";
      }

      function guess(ch) {
        if (state.over || state.guessed[ch]) return;
        state.guessed[ch] = true;
        keyButtons[ch].disabled = true;
        if (state.word.indexOf(ch) === -1) {
          state.wrong++;
          keyButtons[ch].classList.add("beta-is-wrong");
          if (state.wrong >= MAX_WRONG) state.over = true;
        } else {
          keyButtons[ch].classList.add("beta-is-correct");
          if (state.word.split("").every(function (c) { return state.guessed[c]; })) {
            state.over = true;
            state.won = true;
          }
        }
        render();
      }

      function build() {
        state.word = WORDS[(Math.random() * WORDS.length) | 0];
        state.guessed = {};
        state.wrong = 0;
        state.over = false;
        state.won = false;
        Object.keys(keyButtons).forEach(function (ch) {
          keyButtons[ch].disabled = false;
          keyButtons[ch].classList.remove("beta-is-wrong", "beta-is-correct");
        });
        render();
      }
      // Exposed so reset() (registered outside this closure) can deal a
      // fresh word without reaching into loose local variables.
      state.restart = build;

      "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(function (ch) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "beta-hangman-key";
        btn.textContent = ch;
        btn.addEventListener("click", function () { guess(ch); });
        keyboard.appendChild(btn);
        keyButtons[ch] = btn;
      });

      window.BetaControls.miniBtn(container, "New word", build);
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
