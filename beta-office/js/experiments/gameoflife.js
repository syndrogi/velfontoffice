/**
 * BETA OFFICE experiment — Game of Life
 * Conway's cellular automaton on a 30x22 grid. Click to seed while
 * paused, then Play. Wraps at the edges (a torus, not a hard boundary).
 */
(function () {
  if (!window.BetaExperiments) return;

  var COLS = 30;
  var ROWS = 22;

  window.BetaExperiments.registerExperiment({
    id: "gameoflife",
    name: "Game of Life",
    category: "GAMEOFLIFE",
    number: 48,
    description: "Conway's life — click to seed, play/pause",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var cellW = canvas.width / COLS;
      var cellH = canvas.height / ROWS;

      var state = { grid: new Array(COLS * ROWS).fill(false), running: false, timerId: null, redraw: null };

      function idx(x, y) { return y * COLS + x; }

      function draw() {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        ctx2d.fillStyle = "#000";
        for (var y = 0; y < ROWS; y++) {
          for (var x = 0; x < COLS; x++) {
            if (state.grid[idx(x, y)]) ctx2d.fillRect(x * cellW, y * cellH, cellW - 0.5, cellH - 0.5);
          }
        }
      }
      // Exposed so randomize()/reset() (registered outside this closure)
      // can repaint after mutating state.grid directly.
      state.redraw = draw;

      function countNeighbors(x, y) {
        var count = 0;
        for (var dx = -1; dx <= 1; dx++) {
          for (var dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            var nx = (x + dx + COLS) % COLS;
            var ny = (y + dy + ROWS) % ROWS;
            if (state.grid[idx(nx, ny)]) count++;
          }
        }
        return count;
      }

      function tick() {
        var next = new Array(COLS * ROWS).fill(false);
        for (var y = 0; y < ROWS; y++) {
          for (var x = 0; x < COLS; x++) {
            var alive = state.grid[idx(x, y)];
            var n = countNeighbors(x, y);
            next[idx(x, y)] = alive ? n === 2 || n === 3 : n === 3;
          }
        }
        state.grid = next;
        draw();
      }

      canvas.addEventListener("pointerdown", function (e) {
        var r = canvas.getBoundingClientRect();
        var x = Math.floor((e.clientX - r.left) / cellW);
        var y = Math.floor((e.clientY - r.top) / cellH);
        if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
          state.grid[idx(x, y)] = !state.grid[idx(x, y)];
          draw();
        }
      });

      function setRunning(running) {
        state.running = running;
        clearInterval(state.timerId);
        if (running) state.timerId = setInterval(tick, 150);
      }

      window.BetaControls.toggleButton(container, { label: "Play", onToggle: setRunning });
      window.BetaControls.miniBtn(container, "Random", function () {
        state.grid = state.grid.map(function () { return Math.random() < 0.3; });
        draw();
      });
      window.BetaControls.miniBtn(container, "Clear", function () {
        state.grid = new Array(COLS * ROWS).fill(false);
        draw();
      });

      draw();

      container._betaState = state;

      return function cleanup() {
        clearInterval(state.timerId);
      };
    },
    randomize: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.grid = s.grid.map(function () { return Math.random() < 0.3; });
      if (s.redraw) s.redraw();
    },
    reset: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.grid = new Array(COLS * ROWS).fill(false);
      s.running = false;
      clearInterval(s.timerId);
      if (s.redraw) s.redraw();
    },
  });
})();
