/**
 * BETA OFFICE experiment — Type Race
 * Type the shown sentence as fast as possible; reports words-per-minute
 * once the typed text matches exactly.
 */
(function () {
  if (!window.BetaExperiments) return;

  var SENTENCES = [
    "the quick brown fox jumps over the lazy dog",
    "velfont office ships one collection at a time",
    "pack the archive before the season ends",
    "measure twice and cut the pattern once",
    "the studio stays open past midnight in march",
  ];

  window.BetaExperiments.registerExperiment({
    id: "typerace",
    name: "Type Race",
    category: "TYPERACE",
    description: "Type the sentence, get your WPM",
    launch: function (container) {
      var prompt = window.BetaControls.sampleText(container, "");
      prompt.classList.add("beta-typerace-prompt");

      var input = document.createElement("textarea");
      input.className = "beta-textarea";
      input.rows = 2;
      container.appendChild(input);

      var readout = window.BetaControls.readout(container);
      var state = { text: "", startTime: 0, started: false };

      function build() {
        state.text = SENTENCES[(Math.random() * SENTENCES.length) | 0];
        state.started = false;
        prompt.textContent = state.text;
        input.value = "";
        input.disabled = false;
        readout.textContent = "Start typing to begin";
      }
      // Exposed so reset() (registered outside this closure) can deal a
      // fresh sentence without reaching into loose local variables.
      state.restart = build;

      input.addEventListener("input", function () {
        if (!state.started) {
          state.started = true;
          state.startTime = performance.now();
        }
        if (input.value === state.text) {
          var minutes = (performance.now() - state.startTime) / 60000;
          var words = state.text.split(" ").length;
          var wpm = Math.round(words / Math.max(minutes, 0.01));
          readout.innerHTML = "<strong>" + wpm + " WPM</strong> — click New sentence";
          input.disabled = true;
        } else {
          readout.textContent = "Typing...";
        }
      });

      window.BetaControls.miniBtn(container, "New sentence", build);

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
