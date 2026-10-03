/**
 * BETA OFFICE experiment — Breakout
 * Mouse-controlled paddle (same follow-the-pointer approach as Pong),
 * a grid of bricks, and a ball that clears them on contact.
 */
(function () {
  if (!window.BetaExperiments) return;

  var BRICK_COLS = 6;
  var BRICK_ROWS = 3;
  var PADDLE_W = 46;
  var PADDLE_H = 6;

  window.BetaExperiments.registerExperiment({
    id: "breakout",
    name: "Breakout",
    category: "GAMES",
    number: 29,
    description: "Mouse paddle, break every brick",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var readout = window.BetaControls.readout(container);
      var brickW = canvas.width / BRICK_COLS;
      var brickH = 10;
      var state = { paddleX: canvas.width / 2, score: 0, over: false, won: false };
      var ball, bricks;

      function buildBricks() {
        bricks = [];
        for (var r = 0; r < BRICK_ROWS; r++) {
          for (var c = 0; c < BRICK_COLS; c++) {
            bricks.push({ x: c * brickW, y: r * brickH + 6, alive: true });
          }
        }
      }

      function updateReadout() {
        if (state.over) {
          readout.innerHTML = state.won
            ? "<strong>Cleared!</strong> Score: " + state.score
            : "Score: <strong>" + state.score + "</strong> — click Restart";
        } else {
          readout.innerHTML = "Score: <strong>" + state.score + "</strong>";
        }
      }

      function start() {
        buildBricks();
        state.score = 0;
        state.over = false;
        state.won = false;
        ball = { x: canvas.width / 2, y: canvas.height - 40, vx: 2, vy: -3 };
        updateReadout();
      }
      // Exposed so reset() (registered outside this closure) can restart
      // the run without reaching into loose local variables.
      state.restart = start;

      stage.el.addEventListener("pointermove", function (e) {
        var r = stage.el.getBoundingClientRect();
        state.paddleX = Math.max(PADDLE_W / 2, Math.min(canvas.width - PADDLE_W / 2, e.clientX - r.left));
      });

      var rafId = null;
      function step() {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);

        if (!state.over) {
          ball.x += ball.vx;
          ball.y += ball.vy;
          if (ball.x < 4 || ball.x > canvas.width - 4) ball.vx *= -1;
          if (ball.y < 4) ball.vy *= -1;

          var paddleY = canvas.height - 14;
          if (
            ball.vy > 0 &&
            ball.y > paddleY - 4 && ball.y < paddleY + PADDLE_H &&
            ball.x > state.paddleX - PADDLE_W / 2 && ball.x < state.paddleX + PADDLE_W / 2
          ) {
            ball.vy = -Math.abs(ball.vy);
          } else if (ball.y > canvas.height) {
            state.over = true;
            updateReadout();
          }

          bricks.forEach(function (b) {
            if (!b.alive) return;
            if (ball.x > b.x && ball.x < b.x + brickW && ball.y > b.y && ball.y < b.y + brickH) {
              b.alive = false;
              ball.vy *= -1;
              state.score++;
              updateReadout();
            }
          });
          if (!state.over && bricks.every(function (b) { return !b.alive; })) {
            state.over = true;
            state.won = true;
            updateReadout();
          }
        }

        ctx2d.fillStyle = "#000";
        bricks.forEach(function (b) {
          if (b.alive) ctx2d.fillRect(b.x + 1, b.y, brickW - 2, brickH - 3);
        });
        ctx2d.fillRect(state.paddleX - PADDLE_W / 2, canvas.height - 14, PADDLE_W, PADDLE_H);
        ctx2d.beginPath();
        ctx2d.arc(ball.x, ball.y, 4, 0, Math.PI * 2);
        ctx2d.fill();

        rafId = requestAnimationFrame(step);
      }

      start();
      rafId = requestAnimationFrame(step);
      window.BetaControls.miniBtn(container, "Restart", start);

      container._betaState = state;

      return function cleanup() {
        if (rafId) cancelAnimationFrame(rafId);
      };
    },
    reset: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.restart();
    },
  });
})();
