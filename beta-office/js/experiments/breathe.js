/**
 * BETA OFFICE experiment — Breathe
 * A slow guided-breathing circle: in (4s), hold (2s), out (4s),
 * hold (2s), looping. No controls — just watch and breathe with it.
 */
(function () {
  if (!window.BetaExperiments) return;

  var PHASES = [
    { label: "Breathe in", ms: 4000, scale: 1.4 },
    { label: "Hold", ms: 2000, scale: 1.4 },
    { label: "Breathe out", ms: 4000, scale: 1 },
    { label: "Hold", ms: 2000, scale: 1 },
  ];

  window.BetaExperiments.registerExperiment({
    id: "breathe",
    name: "Breathe",
    category: "BREATHE",
    number: 88,
    description: "A slow, guided breathing circle",
    launch: function (container) {
      var circle = document.createElement("div");
      circle.className = "beta-breathe-circle";
      container.appendChild(circle);

      var label = window.BetaControls.readout(container);

      var index = 0;
      var timerId = null;
      function nextPhase() {
        var phase = PHASES[index % PHASES.length];
        circle.style.transitionDuration = phase.ms + "ms";
        circle.style.transform = "scale(" + phase.scale + ")";
        label.innerHTML = "<strong>" + phase.label + "</strong>";
        index++;
        timerId = setTimeout(nextPhase, phase.ms);
      }
      nextPhase();

      return function cleanup() {
        clearTimeout(timerId);
      };
    },
  });
})();
