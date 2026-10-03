/**
 * BETA OFFICE experiment — Fish Tank
 * Ambient swimming fish — each wanders left/right across the canvas
 * with a gentle vertical bob. Click to add more, up to a small cap.
 */
(function () {
  if (!window.BetaExperiments) return;

  var MAX_FISH = 30;

  function makeFish(canvas) {
    return {
      x: Math.random() * canvas.width,
      y: 20 + Math.random() * (canvas.height - 40),
      vx: (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.8),
      phase: Math.random() * Math.PI * 2,
      size: 4 + Math.random() * 4,
    };
  }

  window.BetaExperiments.registerExperiment({
    id: "fishtank",
    name: "Fish Tank",
    category: "VISUAL",
    number: 79,
    description: "Ambient swimming fish, click to add more",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var fish = [];
      for (var i = 0; i < 6; i++) fish.push(makeFish(canvas));

      canvas.addEventListener("pointerdown", function () {
        if (fish.length < MAX_FISH) fish.push(makeFish(canvas));
      });

      var rafId = null;
      function step() {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        ctx2d.fillStyle = "#000";
        fish.forEach(function (f) {
          f.phase += 0.05;
          f.x += f.vx;
          if (f.x < -10) f.x = canvas.width + 10;
          if (f.x > canvas.width + 10) f.x = -10;
          var y = f.y + Math.sin(f.phase) * 4;
          ctx2d.save();
          ctx2d.translate(f.x, y);
          ctx2d.scale(f.vx < 0 ? -1 : 1, 1);
          ctx2d.beginPath();
          ctx2d.moveTo(-f.size, 0);
          ctx2d.lineTo(f.size, -f.size * 0.6);
          ctx2d.lineTo(f.size, f.size * 0.6);
          ctx2d.closePath();
          ctx2d.fill();
          ctx2d.restore();
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
