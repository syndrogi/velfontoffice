/**
 * BETA OFFICE experiment — Physics
 * A small self-contained gravity + bounce ball-pit on its own canvas
 * and rAF loop — no external physics engine (the root site already
 * pulls in matter-js for its own Physics lab; this stays independent
 * and deliberately simple).
 */
(function () {
  if (!window.BetaExperiments) return;

  window.BetaExperiments.registerExperiment({
    id: "physics",
    name: "Physics",
    category: "PHYSICS",
    description: "Gravity + bounce ball-pit",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var state = { gravity: 0.35, bounce: 0.72 };
      var balls = [];
      function spawnBall() {
        balls.push({
          x: Math.random() * canvas.width,
          y: 10,
          vx: (Math.random() - 0.5) * 4,
          vy: 0,
          r: 5 + Math.random() * 6,
        });
      }
      for (var i = 0; i < 8; i++) spawnBall();

      var rafId = null;
      function step() {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        ctx2d.fillStyle = "#000";
        balls.forEach(function (b) {
          b.vy += state.gravity;
          b.x += b.vx;
          b.y += b.vy;
          if (b.y + b.r > canvas.height) { b.y = canvas.height - b.r; b.vy *= -state.bounce; }
          if (b.y - b.r < 0) { b.y = b.r; b.vy *= -state.bounce; }
          if (b.x + b.r > canvas.width) { b.x = canvas.width - b.r; b.vx *= -state.bounce; }
          if (b.x - b.r < 0) { b.x = b.r; b.vx *= -state.bounce; }
          ctx2d.beginPath();
          ctx2d.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx2d.fill();
        });
        rafId = requestAnimationFrame(step);
      }
      rafId = requestAnimationFrame(step);

      window.BetaControls.slider(container, {
        label: "Gravity", min: 0, max: 1.2, step: 0.05, value: state.gravity,
        onInput: function (v) { state.gravity = v; },
      });
      window.BetaControls.slider(container, {
        label: "Bounciness", min: 0.2, max: 0.98, step: 0.02, value: state.bounce,
        onInput: function (v) { state.bounce = v; },
      });
      window.BetaControls.miniBtn(container, "Add ball", spawnBall);

      container._betaState = state;

      return function cleanup() {
        if (rafId) cancelAnimationFrame(rafId);
      };
    },
    randomize: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.gravity = Math.random() * 1.1;
      s.bounce = 0.3 + Math.random() * 0.6;
    },
    reset: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.gravity = 0.35;
      s.bounce = 0.72;
    },
  });
})();
