/**
 * BETA OFFICE experiment — Buzzword
 * Click for a corporate-jargon phrase assembled from three word banks.
 */
(function () {
  if (!window.BetaExperiments) return;

  var VERBS = ["Leverage", "Synergize", "Optimize", "Disrupt", "Streamline", "Democratize", "Operationalize"];
  var ADJECTIVES = ["scalable", "agile", "cross-functional", "data-driven", "bleeding-edge", "customer-centric", "turnkey"];
  var NOUNS = ["synergies", "bandwidth", "paradigms", "deliverables", "touchpoints", "ecosystems", "value streams"];

  function pick(list) { return list[(Math.random() * list.length) | 0]; }

  window.BetaExperiments.registerExperiment({
    id: "buzzword",
    name: "Buzzword",
    category: "WORDPLAY",
    number: 69,
    description: "Click for a corporate-jargon phrase",
    launch: function (container) {
      var box = window.BetaControls.sampleText(container, "Click Generate for wisdom.");
      window.BetaControls.miniBtn(container, "Generate", function () {
        box.textContent = pick(VERBS) + " our " + pick(ADJECTIVES) + " " + pick(NOUNS) + ".";
      });
      return function cleanup() {};
    },
  });
})();
