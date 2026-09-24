/**
 * BETA OFFICE experiment — Snake
 * Classic grid snake on its own canvas — arrow keys steer, walls and
 * your own tail both end the run. No external game engine, same
 * self-contained canvas/timer-loop shape as Physics.
 */
(function () {
  if (!window.BetaExperiments) return;

  var CELL = 12;
  var TICK_MS = 130;

  window.BetaExperiments.registerExperiment({
    id: "snake",
    name: "Snake",
    category: "SNAKE",
    description: "Grid snake, arrow keys, score",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var cols = Math.max(4, Math.floor(canvas.width / CELL));
      var rows = Math.max(4, Math.floor(canvas.height / CELL));

      var readout = window.BetaControls.readout(container);
      var state = { cols: cols, rows: rows, snake: null, dir: null, nextDir: null, food: null, score: 0, over: false };

      // Bounded — if the snake ever grows to fill the whole board, this
      // gives up rather than looping forever with nowhere left to place food.
      function randomFreeCell() {
        var attempts = state.cols * state.rows * 2;
        var p;
        do {
          p = { x: (Math.random() * state.cols) | 0, y: (Math.random() * state.rows) | 0 };
          attempts--;
        } while (attempts > 0 && state.snake.some(function (s) { return s.x === p.x && s.y === p.y; }));
        return p;
      }

      function updateReadout() {
        readout.innerHTML = state.over
          ? "Score: <strong>" + state.score + "</strong> — game over"
          : "Score: <strong>" + state.score + "</strong>";
      }

      function draw() {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        ctx2d.fillStyle = "#000";
        state.snake.forEach(function (s) {
          ctx2d.fillRect(s.x * CELL, s.y * CELL, CELL - 1, CELL - 1);
        });
        ctx2d.strokeStyle = "#000";
        ctx2d.strokeRect(state.food.x * CELL + 2, state.food.y * CELL + 2, CELL - 5, CELL - 5);
      }

      function startGame() {
        state.snake = [{ x: state.cols >> 1, y: state.rows >> 1 }];
        state.dir = { x: 1, y: 0 };
        state.nextDir = state.dir;
        state.food = randomFreeCell();
        state.score = 0;
        state.over = false;
        updateReadout();
      }
      // Exposed so reset() (registered outside this closure) can restart
      // the run without reaching into loose local variables.
      state.restart = function () {
        startGame();
        draw();
      };

      function tick() {
        if (state.over) return;
        state.dir = state.nextDir;
        var head = state.snake[0];
        var next = { x: head.x + state.dir.x, y: head.y + state.dir.y };

        var hitWall = next.x < 0 || next.y < 0 || next.x >= state.cols || next.y >= state.rows;
        var hitSelf = state.snake.some(function (s) { return s.x === next.x && s.y === next.y; });
        if (hitWall || hitSelf) {
          state.over = true;
          updateReadout();
          return;
        }

        state.snake.unshift(next);
        if (next.x === state.food.x && next.y === state.food.y) {
          state.score++;
          state.food = randomFreeCell();
          updateReadout();
        } else {
          state.snake.pop();
        }
        draw();
      }

      var ARROW_DELTAS = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
      };
      function onKey(e) {
        var d = ARROW_DELTAS[e.key];
        if (!d) return;
        e.preventDefault();
        // Ignore a reversal straight into the current tail segment.
        if (state.snake.length > 1 && d.x === -state.dir.x && d.y === -state.dir.y) return;
        state.nextDir = d;
      }
      document.addEventListener("keydown", onKey);

      window.BetaControls.miniBtn(container, "Restart", state.restart);

      startGame();
      draw();
      var timerId = setInterval(tick, TICK_MS);

      container._betaState = state;

      return function cleanup() {
        clearInterval(timerId);
        document.removeEventListener("keydown", onKey);
      };
    },
    randomize: function (container) {
      var s = container._betaState;
      if (!s || s.over) return;
      s.food = { x: (Math.random() * s.cols) | 0, y: (Math.random() * s.rows) | 0 };
    },
    reset: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.restart();
    },
  });
})();
