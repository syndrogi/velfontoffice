/**
 * BETA OFFICE experiment — Experiments (index)
 * The "EXPERIMENTS" category's own window: a flat list of every other
 * registered experiment, each opening its own window on click — plays
 * the same role the root site's old Labs grid played, just generated
 * from the registry instead of hand-listed. Numbered #99 — the last
 * slot in the 1-99 lineup is this index itself, rather than one more
 * one-off toy.
 */
(function () {
  if (!window.BetaExperiments) return;

  window.BetaExperiments.registerExperiment({
    id: "experiments-index",
    name: "Experiments",
    category: "EXPERIMENTS",
    number: 99,
    description: "Every tool, one list",
    launch: function (container) {
      var list = document.createElement("div");
      window.BetaExperiments.getAll()
        .filter(function (spec) { return spec.id !== "experiments-index"; })
        .sort(function (a, b) { return (a.number || 0) - (b.number || 0); })
        .forEach(function (spec) {
          var label = (spec.number != null ? "#" + spec.number + " " : "") + spec.category + " — " + spec.name;
          var btn = window.BetaControls.miniBtn(list, label, function () {
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
