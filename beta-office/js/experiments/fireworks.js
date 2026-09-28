/**
 * BETA OFFICE experiment — Fireworks
 * Auto-looping: rockets launch from the bottom on a random cadence,
 * rise to a random height, and burst into fading sparks. A toggle
 * pauses new launches (existing sparks still play out) without
 * stopping the render loop itself.
 */
(function () {
  if (!window.BetaExperiments) return;

  var COLORS = ["#e0261f", "#111111", "#2b5fd9", "#e0b400", "#1f9e5a"];

  window.BetaExperiments.registerExperiment({
    id: "fireworks",
    name: "Fireworks",
    category: "FIREWORKS",
    description: "Auto-looping rocket launch and burst",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var rockets = [];
      var sparks = [];
      var state = { launchTimer: null };

      function launch() {
        rockets.push({
          x: 20 + Math.random() * (canvas.width - 40),
          y: canvas.height,
          vy: -(4 + Math.random() * 2),
          targetY: canvas.height * (0.2 + Math.random() * 0.4),
          color: COLORS[(Math.random() * COLORS.length) | 0],
        });
      }

      function explode(x, y, color) {
        for (var i = 0; i < 40; i++) {
          var angle = Math.random() * Math.PI * 2;
          var speed = 1 + Math.random() * 3;
          sparks.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 40 + Math.random() * 20,
            color: color,
          });
        }
      }

      var rafId = null;
      function step() {
        ctx2d.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx2d.fillRect(0, 0, canvas.width, canvas.height);

        rockets.forEach(function (r) {
          r.y += r.vy;
          ctx2d.fillStyle = r.color;
          ctx2d.fillRect(r.x - 1.5, r.y - 4, 3, 8);
        });
        rockets = rockets.filter(function (r) {
          if (r.y <= r.targetY) {
            explode(r.x, r.y, r.color);
            return false;
          }
          return true;
        });

        sparks.forEach(function (s) {
          s.vy += 0.05;
          s.x += s.vx;
          s.y += s.vy;
          s.life -= 1;
          ctx2d.fillStyle = s.color;
          ctx2d.fillRect(s.x - 1, s.y - 1, 2, 2);
        });
        sparks = sparks.filter(function (s) { return s.life > 0; });

        rafId = requestAnimationFrame(step);
      }
      rafId = requestAnimationFrame(step);

      function scheduleLaunch() {
        launch();
        state.launchTimer = setTimeout(scheduleLaunch, 700 + Math.random() * 700);
      }
      scheduleLaunch();

      window.BetaControls.toggleButton(container, {
        label: "Running",
        active: true,
        onToggle: function (active) {
          if (active) {
            scheduleLaunch();
          } else {
            clearTimeout(state.launchTimer);
          }
        },
      });

      return function cleanup() {
        if (rafId) cancelAnimationFrame(rafId);
        clearTimeout(state.launchTimer);
      };
    },
  });
})();
