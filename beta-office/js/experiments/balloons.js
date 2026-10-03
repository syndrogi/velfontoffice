/**
 * BETA OFFICE experiment — Balloons
 * Balloons rise from the bottom; click one before it floats off the top.
 * Three misses ends the round.
 */
(function () {
  if (!window.BetaExperiments) return;

  var SPAWN_MS = 900;
  var LIVES_START = 3;

  window.BetaExperiments.registerExperiment({
    id: "balloons",
    name: "Balloons",
    category: "VISUAL",
    number: 59,
    description: "Pop rising balloons before they float off, 3 lives",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var readout = window.BetaControls.readout(container);
      var balloons = [];
      var state = { score: 0, lives: LIVES_START, over: false, spawnTimer: null };

      function updateReadout() {
        readout.innerHTML = state.over
          ? "<strong>Game over</strong> — score " + state.score
          : "Score: <strong>" + state.score + "</strong>  Lives: <strong>" + state.lives + "</strong>";
      }

      function spawn() {
        if (state.over) return;
        balloons.push({
          x: 12 + Math.random() * (canvas.width - 24),
          y: canvas.height + 10,
          r: 8 + Math.random() * 5,
          vy: -(0.6 + Math.random() * 0.8),
          popped: false,
        });
        state.spawnTimer = setTimeout(spawn, SPAWN_MS);
      }

      function start() {
        clearTimeout(state.spawnTimer);
        balloons = [];
        state.score = 0;
        state.lives = LIVES_START;
        state.over = false;
        spawn();
        updateReadout();
      }
      // Exposed so reset() (registered outside this closure) can start a
      // fresh round without reaching into loose local variables.
      state.restart = start;

      canvas.addEventListener("pointerdown", function (e) {
        if (state.over) return;
        var r = canvas.getBoundingClientRect();
        var x = e.clientX - r.left;
        var y = e.clientY - r.top;
        for (var i = 0; i < balloons.length; i++) {
          var b = balloons[i];
          if (!b.popped && Math.hypot(b.x - x, b.y - y) < b.r + 4) {
            b.popped = true;
            state.score++;
            updateReadout();
            break;
          }
        }
      });

      var rafId = null;
      function step() {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        ctx2d.fillStyle = "#e0261f";
        balloons.forEach(function (b) {
          if (b.popped) return;
          b.y += b.vy;
          ctx2d.beginPath();
          ctx2d.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx2d.fill();
        });
        balloons = balloons.filter(function (b) {
          if (b.popped) return false;
          if (b.y + b.r < 0) {
            state.lives--;
            if (state.lives <= 0) {
              state.over = true;
              clearTimeout(state.spawnTimer);
            }
            updateReadout();
            return false;
          }
          return true;
        });
        rafId = requestAnimationFrame(step);
      }
      rafId = requestAnimationFrame(step);

      window.BetaControls.miniBtn(container, "New game", start);
      start();

      container._betaState = state;

      return function cleanup() {
        if (rafId) cancelAnimationFrame(rafId);
        clearTimeout(state.spawnTimer);
      };
    },
    reset: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.restart();
    },
  });
})();
