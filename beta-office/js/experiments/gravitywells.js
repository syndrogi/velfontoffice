/**
 * BETA OFFICE experiment — Gravity Wells
 * Click to place up to 4 attractor points; a field of small particles
 * gets pulled toward all of them at once, orbiting and swirling.
 */
(function () {
  if (!window.BetaExperiments) return;

  var PARTICLE_COUNT = 80;
  var MAX_WELLS = 4;

  window.BetaExperiments.registerExperiment({
    id: "gravitywells",
    name: "Gravity Wells",
    category: "VISUAL",
    number: 53,
    description: "Click to place attractors, particles orbit",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var wells = [{ x: canvas.width / 2, y: canvas.height / 2 }];
      var particles = [];
      for (var i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: 0, vy: 0 });
      }

      canvas.addEventListener("pointerdown", function (e) {
        var r = canvas.getBoundingClientRect();
        wells.push({ x: e.clientX - r.left, y: e.clientY - r.top });
        if (wells.length > MAX_WELLS) wells.shift();
      });

      var rafId = null;
      function step() {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        ctx2d.fillStyle = "#e0261f";
        wells.forEach(function (w) {
          ctx2d.beginPath();
          ctx2d.arc(w.x, w.y, 4, 0, Math.PI * 2);
          ctx2d.fill();
        });

        ctx2d.fillStyle = "#000";
        particles.forEach(function (p) {
          wells.forEach(function (w) {
            var dx = w.x - p.x;
            var dy = w.y - p.y;
            var distSq = Math.max(dx * dx + dy * dy, 100);
            var force = 40 / distSq;
            var dist = Math.sqrt(distSq);
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          });
          p.vx *= 0.99;
          p.vy *= 0.99;
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
          ctx2d.fillRect(p.x - 1, p.y - 1, 2, 2);
        });

        rafId = requestAnimationFrame(step);
      }
      rafId = requestAnimationFrame(step);

      window.BetaControls.miniBtn(container, "Clear wells", function () {
        wells = [];
      });

      return function cleanup() {
        if (rafId) cancelAnimationFrame(rafId);
      };
    },
  });
})();
