/**
 * BETA OFFICE experiment — Target
 * A target shrinks over 1.8s at a random spot; click it before it
 * disappears to score and spawn the next one. Letting it vanish, or
 * missing the click, resets the streak to zero.
 */
(function () {
  if (!window.BetaExperiments) return;

  var LIFE_MS = 1800;

  window.BetaExperiments.registerExperiment({
    id: "target",
    name: "Target",
    category: "SKILL",
    number: 90,
    description: "Click the target before it shrinks away, score streak",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var readout = window.BetaControls.readout(container);
      var state = { score: 0, target: null, rafId: null };

      function spawnTarget() {
        state.target = {
          x: 20 + Math.random() * (canvas.width - 40),
          y: 20 + Math.random() * (canvas.height - 40),
          r: 18,
          born: performance.now(),
        };
      }
      spawnTarget();

      canvas.addEventListener("pointerdown", function (e) {
        if (!state.target) return;
        var r = canvas.getBoundingClientRect();
        var x = e.clientX - r.left;
        var y = e.clientY - r.top;
        if (Math.hypot(state.target.x - x, state.target.y - y) < state.target.r) {
          state.score++;
          readout.innerHTML = "Score: <strong>" + state.score + "</strong>";
          spawnTarget();
        }
      });

      function step() {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        if (state.target) {
          var age = performance.now() - state.target.born;
          if (age > LIFE_MS) {
            state.score = 0;
            readout.innerHTML = "Missed! Score: <strong>0</strong>";
            spawnTarget();
          } else {
            var shrink = 1 - age / LIFE_MS;
            ctx2d.beginPath();
            ctx2d.arc(state.target.x, state.target.y, state.target.r * shrink, 0, Math.PI * 2);
            ctx2d.fillStyle = "#e0261f";
            ctx2d.fill();
          }
        }
        state.rafId = requestAnimationFrame(step);
      }
      state.rafId = requestAnimationFrame(step);

      readout.innerHTML = "Score: <strong>0</strong>";

      return function cleanup() {
        if (state.rafId) cancelAnimationFrame(state.rafId);
      };
    },
  });
})();
