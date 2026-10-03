/**
 * BETA OFFICE experiment — Riddle
 * Click for a riddle, click again to reveal its answer.
 */
(function () {
  if (!window.BetaExperiments) return;

  var RIDDLES = [
    { q: "What has keys but no locks?", a: "A piano." },
    { q: "What has to be broken before you can use it?", a: "An egg." },
    { q: "What gets wetter the more it dries?", a: "A towel." },
    { q: "What has a face and two hands but no arms or legs?", a: "A clock." },
    { q: "What can you catch but not throw?", a: "A cold." },
    { q: "The more you take, the more you leave behind. What am I?", a: "Footsteps." },
  ];

  window.BetaExperiments.registerExperiment({
    id: "riddle",
    name: "Riddle",
    category: "WORDPLAY",
    number: 95,
    description: "Click for a riddle, click again to reveal the answer",
    launch: function (container) {
      var box = window.BetaControls.sampleText(container, "Click New riddle.");
      var state = { current: null };

      function next() {
        state.current = RIDDLES[(Math.random() * RIDDLES.length) | 0];
        box.textContent = state.current.q;
      }

      window.BetaControls.miniBtn(container, "New riddle", next);
      window.BetaControls.miniBtn(container, "Reveal answer", function () {
        if (!state.current) return;
        box.textContent = state.current.a;
      });

      next();

      return function cleanup() {};
    },
  });
})();
