/**
 * BETA OFFICE experiment — Debug
 * Introspects the experiment registry itself: every registered id,
 * which category it's under, and whether it's currently open — a
 * live dump rather than a static about page.
 */
(function () {
  if (!window.BetaExperiments) return;

  window.BetaExperiments.registerExperiment({
    id: "debug",
    name: "Debug",
    category: "DEBUG",
    description: "Registry dump",
    launch: function (container) {
      var readout = window.BetaControls.readout(container);

      function render() {
        var lines = window.BetaExperiments.getAll().map(function (spec) {
          var open = window.BetaExperiments.isOpen(spec.id) ? "open" : "closed";
          return spec.id + " — " + spec.category + " — " + open;
        });
        readout.innerHTML = "<strong>" + lines.length + " registered</strong>\n" + lines.join("\n");
      }
      render();
      var timer = window.setInterval(render, 800);

      return function cleanup() {
        window.clearInterval(timer);
      };
    },
  });
})();
