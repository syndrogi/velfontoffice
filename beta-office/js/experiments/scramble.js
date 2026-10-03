/**
 * BETA OFFICE experiment — Scramble
 * Unscramble the shown letters back into a word from a fixed list.
 */
(function () {
  if (!window.BetaExperiments) return;

  var WORDS = ["FASHION", "ARCHIVE", "STUDIO", "PATTERN", "TEXTILE", "GARMENT", "VELFONT", "RUNWAY", "DESIGNER", "FABRIC"];

  function scramble(word) {
    var letters = word.split("");
    do {
      for (var i = letters.length - 1; i > 0; i--) {
        var j = (Math.random() * (i + 1)) | 0;
        var t = letters[i];
        letters[i] = letters[j];
        letters[j] = t;
      }
    } while (letters.join("") === word && word.length > 1);
    return letters.join("");
  }

  window.BetaExperiments.registerExperiment({
    id: "scramble",
    name: "Scramble",
    category: "WORDPLAY",
    number: 39,
    description: "Unscramble the word, keep the streak",
    launch: function (container) {
      var word = window.BetaControls.sampleText(container, "");
      word.classList.add("beta-scramble-word");

      var input = document.createElement("input");
      input.type = "text";
      input.className = "beta-text-input";
      input.autocomplete = "off";
      container.appendChild(input);

      var readout = window.BetaControls.readout(container);
      var state = { answer: "", streak: 0, nextTimer: null };

      function updateReadout(text) {
        readout.innerHTML = text != null ? text : "Streak: <strong>" + state.streak + "</strong>";
      }

      function build() {
        state.answer = WORDS[(Math.random() * WORDS.length) | 0];
        word.textContent = scramble(state.answer);
        input.value = "";
        updateReadout();
      }
      // Exposed so reset() (registered outside this closure) can deal a
      // fresh word without reaching into loose local variables.
      state.restart = build;

      function check() {
        if (input.value.trim().toUpperCase() === state.answer) {
          state.streak++;
          updateReadout("<strong>Correct!</strong>");
          state.nextTimer = setTimeout(build, 700);
        } else {
          state.streak = 0;
          updateReadout("Try again");
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
