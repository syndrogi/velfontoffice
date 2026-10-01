/**
 * BETA OFFICE experiment — Tongue Twister
 * Click for a random tongue twister from a fixed pool.
 */
(function () {
  if (!window.BetaExperiments) return;

  var TWISTERS = [
    "She sells seashells by the seashore.",
    "Peter Piper picked a peck of pickled peppers.",
    "How much wood would a woodchuck chuck.",
    "Fuzzy Wuzzy was a bear.",
    "Red lorry, yellow lorry.",
    "Six slippery snails slid slowly seaward.",
    "Irish wristwatch, Swiss wristwatch.",
    "Unique New York, unique New York.",
  ];

  window.BetaExperiments.registerExperiment({
    id: "tonguetwister",
    name: "Tongue Twister",
    category: "TONGUETWISTER",
    number: 94,
    description: "Click for a tongue twister, say it 3 times fast",
    launch: function (container) {
      var box = window.BetaControls.sampleText(container, "Click Generate.");
      window.BetaControls.miniBtn(container, "Generate", function () {
        box.textContent = TWISTERS[(Math.random() * TWISTERS.length) | 0];
      });
      return function cleanup() {};
    },
  });
})();
