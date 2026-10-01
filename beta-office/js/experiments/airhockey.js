/**
 * BETA OFFICE experiment — Air Hockey
 * Two-paddle Pong variant: your paddle (bottom) follows the mouse, a
 * simple AI paddle (top) chases the puck's x position at a capped
 * speed. First to 5 goals wins.
 */
(function () {
  if (!window.BetaExperiments) return;

  var WIN_SCORE = 5;
  var PADDLE_W = 46;
  var PADDLE_H = 6;
  var AI_SPEED = 2.2;

  window.BetaExperiments.registerExperiment({
    id: "airhockey",
    name: "Air Hockey",
    category: "AIRHOCKEY",
    number: 77,
    description: "Mouse paddle vs a simple AI, first to 5",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var readout = window.BetaControls.readout(container);
      var state = { playerX: canvas.width / 2, aiX: canvas.width / 2, playerScore: 0, aiScore: 0, over: false };
      var puck;

      function resetPuck(dir) {
        puck = { x: canvas.width / 2, y: canvas.height / 2, vx: (Math.random() - 0.5) * 2, vy: (dir || 1) * 2.4 };
      }

      function updateReadout() {
        readout.innerHTML = state.over
          ? "<strong>" + (state.playerScore > state.aiScore ? "You win" : "AI wins") + "</strong> — click Restart"
          : "You: <strong>" + state.playerScore + "</strong>  AI: <strong>" + state.aiScore + "</strong>";
      }

      function start() {
        state.playerScore = 0;
        state.aiScore = 0;
        state.over = false;
        resetPuck(1);
        updateReadout();
      }
      // Exposed so reset() (registered outside this closure) can restart
      // the match without reaching into loose local variables.
      state.restart = start;

      stage.el.addEventListener("pointermove", function (e) {
        var r = stage.el.getBoundingClientRect();
        state.playerX = Math.max(PADDLE_W / 2, Math.min(canvas.width - PADDLE_W / 2, e.clientX - r.left));
      });

      var rafId = null;
      function step() {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);

        if (!state.over) {
          if (state.aiX < puck.x - 2) state.aiX = Math.min(state.aiX + AI_SPEED, puck.x);
          else if (state.aiX > puck.x + 2) state.aiX = Math.max(state.aiX - AI_SPEED, puck.x);
          state.aiX = Math.max(PADDLE_W / 2, Math.min(canvas.width - PADDLE_W / 2, state.aiX));

          puck.x += puck.vx;
          puck.y += puck.vy;
          if (puck.x < 4 || puck.x > canvas.width - 4) puck.vx *= -1;

          var playerY = canvas.height - 10;
          var aiY = 10;
          if (
            puck.vy > 0 && puck.y > playerY - 4 && puck.y < playerY + PADDLE_H &&
            puck.x > state.playerX - PADDLE_W / 2 && puck.x < state.playerX + PADDLE_W / 2
          ) {
            puck.vy = -Math.abs(puck.vy) - 0.15;
          } else if (
            puck.vy < 0 && puck.y < aiY + 4 && puck.y > aiY - PADDLE_H &&
            puck.x > state.aiX - PADDLE_W / 2 && puck.x < state.aiX + PADDLE_W / 2
          ) {
            puck.vy = Math.abs(puck.vy) + 0.15;
          } else if (puck.y > canvas.height) {
            state.aiScore++;
            if (state.aiScore >= WIN_SCORE) state.over = true;
            else resetPuck(-1);
            updateReadout();
          } else if (puck.y < 0) {
            state.playerScore++;
            if (state.playerScore >= WIN_SCORE) state.over = true;
            else resetPuck(1);
            updateReadout();
          }
        }

        ctx2d.fillStyle = "#000";
        ctx2d.fillRect(state.playerX - PADDLE_W / 2, canvas.height - 10, PADDLE_W, PADDLE_H);
        ctx2d.fillRect(state.aiX - PADDLE_W / 2, 4, PADDLE_W, PADDLE_H);
        ctx2d.beginPath();
        ctx2d.arc(puck.x, puck.y, 4, 0, Math.PI * 2);
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
