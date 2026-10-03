/**
 * BETA OFFICE experiment — Big Clock
 * A live, oversized local-time digital clock. No controls.
 */
(function () {
  if (!window.BetaExperiments) return;

  window.BetaExperiments.registerExperiment({
    id: "bigclock",
    name: "Big Clock",
    category: "UTILITY",
    number: 87,
    description: "A live, oversized digital clock",
    launch: function (container) {
      var clock = window.BetaControls.sampleText(container, "");
      clock.classList.add("beta-bigclock");

      function pad(n) { return (n < 10 ? "0" : "") + n; }
      function render() {
        var now = new Date();
        clock.textContent = pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
      }
      render();
      var timer = setInterval(render, 1000);

      return function cleanup() {
        clearInterval(timer);
      };
    },
  });
})();
