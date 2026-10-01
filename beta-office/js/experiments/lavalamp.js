/**
 * BETA OFFICE experiment — Lava Lamp
 * Ambient blurred blobs drifting up and down. Purely decorative — no
 * controls, no state to reset.
 */
(function () {
  if (!window.BetaExperiments) return;

  var COUNT = 6;

  window.BetaExperiments.registerExperiment({
    id: "lavalamp",
    name: "Lava Lamp",
    category: "LAVALAMP",
    number: 51,
    description: "Ambient drifting blurred blobs",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var blobs = [];
      for (var i = 0; i < COUNT; i++) {
        blobs.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: 16 + Math.random() * 18,
          vy: -0.3 - Math.random() * 0.5,
          phase: Math.random() * Math.PI * 2,
        });
      }

      var rafId = null;
      function step() {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        ctx2d.filter = "blur(6px)";
        ctx2d.fillStyle = "#000";
        blobs.forEach(function (b) {
          b.phase += 0.02;
          b.y += b.vy;
          if (b.y < -b.r) b.y = canvas.height + b.r;
          if (b.y > canvas.height + b.r) b.y = -b.r;
          var x = b.x + Math.sin(b.phase) * 10;
          ctx2d.beginPath();
          ctx2d.arc(x, b.y, b.r, 0, Math.PI * 2);
          ctx2d.fill();
        });
        ctx2d.filter = "none";
        rafId = requestAnimationFrame(step);
      }
      rafId = requestAnimationFrame(step);

      return function cleanup() {
        if (rafId) cancelAnimationFrame(rafId);
      };
    },
  });
})();
