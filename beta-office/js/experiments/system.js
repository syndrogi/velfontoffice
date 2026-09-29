/**
 * BETA OFFICE experiment — System
 * Build/registry info, distinct from Browser's raw viewport/mouse
 * metrics: how many experiments exist, how many windows are open right
 * now, when this page was loaded.
 */
(function () {
  if (!window.BetaExperiments) return;

  window.BetaExperiments.registerExperiment({
    id: "system",
    name: "System",
    category: "SYSTEM",
    description: "Build, registry, open windows",
    launch: function (container) {
      var loadedAt = new Date().toLocaleTimeString();
      var readout = window.BetaControls.readout(container);

      function render() {
        var categories = window.BetaExperiments.getCategories().length;
        var experiments = window.BetaExperiments.getAll().length;
        var open = window.BetaWM ? window.BetaWM.openCount() : 0;
        readout.innerHTML =
          "<strong>build</strong> 0.1 — experimental\n" +
          "<strong>categories</strong> " + categories + "\n" +
          "<strong>experiments</strong> " + experiments + "\n" +
          "<strong>open windows</strong> " + open + "\n" +
          "<strong>loaded</strong> " + loadedAt;
      }
      var timer = null;
      function start() {
        render();
        if (!timer) timer = window.setInterval(render, 600);
      }
      function stop() {
        window.clearInterval(timer);
        timer = null;
      }
      start();

      return { cleanup: stop, onHide: stop, onShow: start };
    },
  });
})();
