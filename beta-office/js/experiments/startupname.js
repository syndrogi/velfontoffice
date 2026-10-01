/**
 * BETA OFFICE experiment — Startup Name
 * Click for a fake startup name, combining a random prefix and suffix.
 */
(function () {
  if (!window.BetaExperiments) return;

  var PREFIXES = ["Vel", "Loop", "Nimbus", "Crate", "Fable", "Hatch", "Quill", "Drift", "Fold", "Ambient"];
  var SUFFIXES = ["ly", "ify", "io", "Labs", "Works", "Studio", "Collective", "co", "Atlas", "Field"];

  window.BetaExperiments.registerExperiment({
    id: "startupname",
    name: "Startup Name",
    category: "STARTUPNAME",
    number: 70,
    description: "Click for a fake startup name",
    launch: function (container) {
      var box = window.BetaControls.sampleText(container, "Click Generate.");
      window.BetaControls.miniBtn(container, "Generate", function () {
        var prefix = PREFIXES[(Math.random() * PREFIXES.length) | 0];
        var suffix = SUFFIXES[(Math.random() * SUFFIXES.length) | 0];
        box.textContent = prefix + suffix;
      });
      return function cleanup() {};
    },
  });
})();
