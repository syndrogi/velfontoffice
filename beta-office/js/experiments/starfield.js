/**
 * BETA OFFICE experiment — Starfield
 * Warp-speed particle starfield flying outward from center. Speed slider.
 */
(function () {
  if (!window.BetaExperiments) return;

  var COUNT = 120;

  window.BetaExperiments.registerExperiment({
    id: "starfield",
    name: "Starfield",
    category: "VISUAL",
    number: 46,
    description: "Warp-speed starfield, speed slider",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var cx = canvas.width / 2;
      var cy = canvas.height / 2;
      var state = { speed: 4 };
      var stars = [];

      function resetStar(s) {
        s.x = (Math.random() - 0.5) * canvas.width;
        s.y = (Math.random() - 0.5) * canvas.height;
        s.z = Math.random() * canvas.width;
      }
      for (var i = 0; i < COUNT; i++) {
        var s = {};
        resetStar(s);
        stars.push(s);
      }

      var rafId = null;
      function step() {
        ctx2d.fillStyle = "#fff";
        ctx2d.fillRect(0, 0, canvas.width, canvas.height);
        ctx2d.fillStyle = "#000";
        stars.forEach(function (star) {
          star.z -= state.speed;
          if (star.z <= 1) resetStar(star);
          var sx = cx + (star.x / star.z) * canvas.width;
          var sy = cy + (star.y / star.z) * canvas.width;
          var size = (1 - star.z / canvas.width) * 3;
          if (sx >= 0 && sx <= canvas.width && sy >= 0 && sy <= canvas.height) {
            ctx2d.fillRect(sx, sy, size, size);
          }
        });
        rafId = requestAnimationFrame(step);
      }
      rafId = requestAnimationFrame(step);

      window.BetaControls.slider(container, {
        label: "Speed", min: 1, max: 15, step: 1, value: state.speed,
        onInput: function (v) { state.speed = v; },
      });

      container._betaState = state;

      return function cleanup() {
        if (rafId) cancelAnimationFrame(rafId);
      };
    },
    randomize: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.speed = 1 + Math.random() * 14;
    },
    reset: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.speed = 4;
    },
  });
})();
