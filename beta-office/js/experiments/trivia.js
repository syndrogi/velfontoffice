/**
 * BETA OFFICE experiment — Trivia
 * A fixed pool of multiple-choice questions, shuffled each round, with a
 * running score.
 */
(function () {
  if (!window.BetaExperiments) return;

  var QUESTIONS = [
    { q: "What color is a ruby?", options: ["Red", "Blue", "Green", "Yellow"], answer: "Red" },
    { q: "How many sides does a hexagon have?", options: ["5", "6", "7", "8"], answer: "6" },
    { q: "What is the capital of France?", options: ["Berlin", "Madrid", "Paris", "Rome"], answer: "Paris" },
    { q: "How many continents are there?", options: ["5", "6", "7", "8"], answer: "7" },
    { q: "What gas do plants absorb?", options: ["Oxygen", "CO2", "Nitrogen", "Helium"], answer: "CO2" },
    { q: "What's the largest ocean?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], answer: "Pacific" },
  ];

  function shuffledIndices() {
    var idx = QUESTIONS.map(function (_, i) { return i; });
    for (var i = idx.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var t = idx[i];
      idx[i] = idx[j];
      idx[j] = t;
    }
    return idx;
  }

  window.BetaExperiments.registerExperiment({
    id: "trivia",
    name: "Trivia",
    category: "WORDPLAY",
    number: 40,
    description: "Multiple-choice questions, running score",
    launch: function (container) {
      var qBox = window.BetaControls.sampleText(container, "");
      qBox.classList.add("beta-trivia-q");

      var optRow = document.createElement("div");
      optRow.className = "beta-trivia-options";
      container.appendChild(optRow);

      var readout = window.BetaControls.readout(container);
      var state = { index: 0, score: 0, order: null, nextTimer: null };

      function loadQuestion() {
        var q = QUESTIONS[state.order[state.index % state.order.length]];
        qBox.textContent = q.q;
        optRow.innerHTML = "";
        q.options.forEach(function (opt) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "beta-mini-btn";
          btn.textContent = opt;
          btn.addEventListener("click", function () { answer(opt, q.answer); });
          optRow.appendChild(btn);
        });
        readout.innerHTML = "Score: <strong>" + state.score + "</strong>";
      }

      function answer(picked, correct) {
        if (picked === correct) state.score++;
        readout.innerHTML =
          (picked === correct ? "Correct! " : "Nope — it was " + correct + ". ") +
          "Score: <strong>" + state.score + "</strong>";
        state.index++;
        state.nextTimer = setTimeout(loadQuestion, 900);
      }

      function build() {
        state.index = 0;
        state.score = 0;
        state.order = shuffledIndices();
        loadQuestion();
      }
      // Exposed so reset() (registered outside this closure) can start a
      // fresh round without reaching into loose local variables.
      state.restart = build;

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
