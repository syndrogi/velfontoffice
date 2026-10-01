/**
 * BETA OFFICE experiment — Flock
 * A small boids simulation — cohesion pulls each boid toward its local
 * neighbors' average position/heading, separation pushes it away from
 * whichever neighbors get too close.
 */
(function () {
  if (!window.BetaExperiments) return;

  var COUNT = 40;
  var NEIGHBOR_DIST = 60;
  var SEPARATION_DIST = 18;
  var MAX_SPEED = 2.5;

  window.BetaExperiments.registerExperiment({
    id: "flock",
    name: "Flock",
    category: "FLOCK",
    number: 72,
    description: "Simple boids flocking simulation",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var boids = [];
      for (var i = 0; i < COUNT; i++) {
        boids.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
        });
      }

      var state = { cohesion: 0.005, separation: 0.05 };

      var rafId = null;
      function step() {
        boids.forEach(function (b) {
          var avgX = 0, avgY = 0, avgVX = 0, avgVY = 0, count = 0;
          var sepX = 0, sepY = 0;
          boids.forEach(function (other) {
            if (other === b) return;
            var dx = other.x - b.x;
            var dy = other.y - b.y;
            var dist = Math.sqrt(dx * dx + dy * dy) || 1;
            if (dist < NEIGHBOR_DIST) {
              avgX += other.x;
              avgY += other.y;
              avgVX += other.vx;
              avgVY += other.vy;
              count++;
              if (dist < SEPARATION_DIST) {
                sepX -= dx / dist;
                sepY -= dy / dist;
              }
            }
          });
          if (count > 0) {
            avgX /= count;
            avgY /= count;
            avgVX /= count;
            avgVY /= count;
            b.vx += (avgX - b.x) * state.cohesion + (avgVX - b.vx) * 0.05;
            b.vy += (avgY - b.y) * state.cohesion + (avgVY - b.vy) * 0.05;
          }
          b.vx += sepX * state.separation;
          b.vy += sepY * state.separation;

          var speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          if (speed > MAX_SPEED) {
            b.vx = (b.vx / speed) * MAX_SPEED;
            b.vy = (b.vy / speed) * MAX_SPEED;
          }

          b.x += b.vx;
          b.y += b.vy;
          if (b.x < 0) b.x = canvas.width;
          if (b.x > canvas.width) b.x = 0;
          if (b.y < 0) b.y = canvas.height;
          if (b.y > canvas.height) b.y = 0;
        });

        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        ctx2d.fillStyle = "#000";
        boids.forEach(function (b) {
          ctx2d.beginPath();
          ctx2d.arc(b.x, b.y, 2, 0, Math.PI * 2);
          ctx2d.fill();
        });

        rafId = requestAnimationFrame(step);
      }
      rafId = requestAnimationFrame(step);

      window.BetaControls.slider(container, {
        label: "Cohesion", min: 0, max: 0.02, step: 0.001, value: state.cohesion,
        onInput: function (v) { state.cohesion = v; },
      });
      window.BetaControls.slider(container, {
        label: "Separation", min: 0, max: 0.2, step: 0.01, value: state.separation,
        onInput: function (v) { state.separation = v; },
      });

      container._betaState = state;

      return function cleanup() {
        if (rafId) cancelAnimationFrame(rafId);
      };
    },
    randomize: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.cohesion = Math.random() * 0.02;
      s.separation = Math.random() * 0.2;
    },
    reset: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.cohesion = 0.005;
      s.separation = 0.05;
    },
  });
})();
