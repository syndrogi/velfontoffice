/**
 * BETA OFFICE experiment — Pong
 * Solo paddle-and-wall: keep the ball off the floor. The paddle follows
 * the pointer across the stage; the ball bounces off every wall except
 * the bottom. Same canvas/rAF shape as Physics/Snake/Confetti.
 */
(function () {
  if (!window.BetaExperiments) return;

  var PADDLE_W = 46;
  var PADDLE_H = 6;

  window.BetaExperiments.registerExperiment({
    id: "pong",
    name: "Pong",
    category: "PONG",
    description: "Solo paddle-and-wall, mouse control, streak score",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var readout = window.BetaControls.readout(container);
      var state = { speed: 3.2, score: 0, best: 0, over: false, paddleX: canvas.width / 2 };
      var ball;

      function resetBall() {
        ball = {
          x: canvas.width / 2,
          y: canvas.height / 2,
          vx: (Math.random() < 0.5 ? -1 : 1) * state.speed * 0.6,
          vy: state.speed,
        };
      }

      function updateReadout() {
        readout.innerHTML = state.over
          ? "Score: <strong>" + state.score + "</strong> — missed, click Restart"
          : "Score: <strong>" + state.score + "</strong>  Best: <strong>" + state.best + "</strong>";
      }

      function start() {
        state.score = 0;
        state.over = false;
        resetBall();
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
            ball.y > paddleY - 4 && ball.y < paddleY + PADDLE_H &&
            ball.x > state.paddleX - PADDLE_W / 2 && ball.x < state.paddleX + PADDLE_W / 2
          ) {
            ball.vy = -Math.abs(ball.vy);
            state.score++;
            if (state.score > state.best) state.best = state.score;
            updateReadout();
          } else if (ball.y > canvas.height) {
            state.over = true;
            updateReadout();
          }
        }

        ctx2d.fillStyle = "#000";
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
    randomize: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.speed = 1.5 + Math.random() * 4;
    },
    reset: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.speed = 3.2;
      s.restart();
    },
  });
})();
