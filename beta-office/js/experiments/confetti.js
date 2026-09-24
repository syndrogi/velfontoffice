/**
 * BETA OFFICE experiment — Confetti
 * Click the stage (or hit Burst) to fire a handful of tumbling, colored
 * squares under simple gravity. The one deliberately colorful moment in
 * an otherwise monochrome + accent-red toolkit — same canvas/rAF shape
 * as Physics, just with a burst instead of a standing simulation.
 */
(function () {
  if (!window.BetaExperiments) return;

  var COLORS = ["#e0261f", "#111111", "#2b5fd9", "#e0b400", "#1f9e5a"];

  window.BetaExperiments.registerExperiment({
    id: "confetti",
    name: "Confetti",
    category: "CONFETTI",
    description: "Click to burst, count + gravity sliders",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var state = { count: 60, gravity: 0.18 };
      var pieces = [];

      function burst(x, y) {
        for (var i = 0; i < state.count; i++) {
          var angle = Math.random() * Math.PI * 2;
          var speed = 2 + Math.random() * 5;
          pieces.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 3,
            size: 3 + Math.random() * 4,
            rot: Math.random() * Math.PI,
            vr: (Math.random() - 0.5) * 0.4,
            color: COLORS[(Math.random() * COLORS.length) | 0],
            life: 90 + Math.random() * 40,
          });
        }
      }

      canvas.addEventListener("pointerdown", function (e) {
        var r = canvas.getBoundingClientRect();
        burst(e.clientX - r.left, e.clientY - r.top);
      });

      var rafId = null;
      function step() {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        pieces.forEach(function (p) {
          p.vy += state.gravity;
          p.x += p.vx;
          p.y += p.vy;
          p.rot += p.vr;
          p.life -= 1;
          ctx2d.save();
          ctx2d.translate(p.x, p.y);
          ctx2d.rotate(p.rot);
          ctx2d.fillStyle = p.color;
          ctx2d.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx2d.restore();
        });
        pieces = pieces.filter(function (p) {
          return p.life > 0 && p.y < canvas.height + 20;
        });
        rafId = requestAnimationFrame(step);
      }
      rafId = requestAnimationFrame(step);

      window.BetaControls.slider(container, {
        label: "Pieces", min: 10, max: 200, step: 10, value: state.count,
        onInput: function (v) { state.count = v; },
      });
      window.BetaControls.slider(container, {
        label: "Gravity", min: 0, max: 0.6, step: 0.02, value: state.gravity,
        onInput: function (v) { state.gravity = v; },
      });
      window.BetaControls.miniBtn(container, "Burst", function () {
        burst(canvas.width / 2, canvas.height / 2);
      });

      container._betaState = state;

      return function cleanup() {
        if (rafId) cancelAnimationFrame(rafId);
      };
    },
    randomize: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.count = 10 + Math.floor(Math.random() * 190);
      s.gravity = Math.random() * 0.5;
    },
    reset: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.count = 60;
      s.gravity = 0.18;
    },
  });
})();
