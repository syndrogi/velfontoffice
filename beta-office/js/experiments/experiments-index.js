/**
 * BETA OFFICE experiment — Experiments (index)
 * The "EXPERIMENTS" category's own window: a flat list of every other
 * registered experiment, each opening its own window on click — plays
 * the same role the root site's old Labs grid played, just generated
 * from the registry instead of hand-listed.
 */
(function () {
  if (!window.BetaExperiments) return;

  window.BetaExperiments.registerExperiment({
    id: "experiments-index",
    name: "Experiments",
    category: "EXPERIMENTS",
    description: "Every tool, one list",
    launch: function (container) {
      var list = document.createElement("div");
      window.BetaExperiments.getAll()
        .filter(function (spec) { return spec.id !== "experiments-index"; })
        .forEach(function (spec) {
          var btn = window.BetaControls.miniBtn(list, spec.category + " — " + spec.name, function () {
            window.BetaWM.openExperiment(spec.id);
          });
          btn.style.display = "block";
          btn.style.width = "100%";
          btn.style.textAlign = "left";
          btn.style.marginBottom = "6px";
        });
      container.appendChild(list);
      return function cleanup() {};
    },
  });
})();
