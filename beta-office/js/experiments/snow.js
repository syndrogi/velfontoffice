/**
 * BETA OFFICE experiment — Snow
 * Ambient falling snow, each flake swaying side to side as it drifts
 * down and wraps back to the top.
 */
(function () {
  if (!window.BetaExperiments) return;

  var COUNT = 60;

  window.BetaExperiments.registerExperiment({
    id: "snow",
    name: "Snow",
    category: "SNOW",
    number: 80,
    description: "Ambient falling snow",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var flakes = [];
      for (var i = 0; i < COUNT; i++) {
        flakes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: 1 + Math.random() * 2,
          vy: 0.4 + Math.random() * 0.8,
          phase: Math.random() * Math.PI * 2,
        });
      }

      var rafId = null;
      function step() {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        ctx2d.fillStyle = "#9fb3c8";
        flakes.forEach(function (f) {
          f.phase += 0.02;
          f.y += f.vy;
          if (f.y > canvas.height) {
            f.y = -4;
            f.x = Math.random() * canvas.width;
          }
          var x = f.x + Math.sin(f.phase) * 8;
          ctx2d.beginPath();
          ctx2d.arc(x, f.y, f.r, 0, Math.PI * 2);
          ctx2d.fill();
        });
        rafId = requestAnimationFrame(step);
      }
      rafId = requestAnimationFrame(step);

      return function cleanup() {
        if (rafId) cancelAnimationFrame(rafId);
      };
    },
  });
})();
