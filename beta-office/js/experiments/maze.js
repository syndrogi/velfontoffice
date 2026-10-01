/**
 * BETA OFFICE experiment — Maze
 * A fresh randomized-DFS maze every round, on canvas. Arrow keys walk a
 * dot from the top-left to the bottom-right, timed.
 */
(function () {
  if (!window.BetaExperiments) return;

  var COLS = 9;
  var ROWS = 9;

  function generateMaze() {
    var cells = [];
    for (var i = 0; i < COLS * ROWS; i++) {
      cells.push({ N: false, S: false, E: false, W: false, visited: false });
    }
    function idx(x, y) { return y * COLS + x; }

    var DIRS = [
      { dx: 0, dy: -1, from: "N", to: "S" },
      { dx: 0, dy: 1, from: "S", to: "N" },
      { dx: 1, dy: 0, from: "E", to: "W" },
      { dx: -1, dy: 0, from: "W", to: "E" },
    ];

    var stack = [{ x: 0, y: 0 }];
    cells[0].visited = true;
    while (stack.length) {
      var cur = stack[stack.length - 1];
      var options = DIRS.filter(function (d) {
        var nx = cur.x + d.dx;
        var ny = cur.y + d.dy;
        return nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && !cells[idx(nx, ny)].visited;
      });
      if (!options.length) {
        stack.pop();
        continue;
      }
      var d = options[(Math.random() * options.length) | 0];
      var nx = cur.x + d.dx;
      var ny = cur.y + d.dy;
      cells[idx(cur.x, cur.y)][d.from] = true;
      cells[idx(nx, ny)][d.to] = true;
      cells[idx(nx, ny)].visited = true;
      stack.push({ x: nx, y: ny });
    }
    return cells;
  }

  window.BetaExperiments.registerExperiment({
    id: "maze",
    name: "Maze",
    category: "MAZE",
    number: 32,
    description: "Arrow keys to the exit, timed",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var cellSize = Math.min(canvas.width / COLS, canvas.height / ROWS);
      var offsetX = (canvas.width - cellSize * COLS) / 2;
      var offsetY = (canvas.height - cellSize * ROWS) / 2;

      var readout = window.BetaControls.readout(container);
      var state = { cells: null, px: 0, py: 0, startTime: 0, solved: false, tickTimer: null };

      function draw() {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        ctx2d.strokeStyle = "#000";
        ctx2d.lineWidth = 1.5;
        for (var y = 0; y < ROWS; y++) {
          for (var x = 0; x < COLS; x++) {
            var c = state.cells[y * COLS + x];
            var px0 = offsetX + x * cellSize;
            var py0 = offsetY + y * cellSize;
            ctx2d.beginPath();
            if (!c.N) { ctx2d.moveTo(px0, py0); ctx2d.lineTo(px0 + cellSize, py0); }
            if (!c.W) { ctx2d.moveTo(px0, py0); ctx2d.lineTo(px0, py0 + cellSize); }
            if (x === COLS - 1 && !c.E) { ctx2d.moveTo(px0 + cellSize, py0); ctx2d.lineTo(px0 + cellSize, py0 + cellSize); }
            if (y === ROWS - 1 && !c.S) { ctx2d.moveTo(px0, py0 + cellSize); ctx2d.lineTo(px0 + cellSize, py0 + cellSize); }
            ctx2d.stroke();
          }
        }
        ctx2d.fillStyle = "rgba(224, 38, 31, 0.35)";
        ctx2d.fillRect(
          offsetX + (COLS - 1) * cellSize + cellSize * 0.25,
          offsetY + (ROWS - 1) * cellSize + cellSize * 0.25,
          cellSize * 0.5,
          cellSize * 0.5
        );
        ctx2d.fillStyle = "#000";
        ctx2d.beginPath();
        ctx2d.arc(
          offsetX + state.px * cellSize + cellSize / 2,
          offsetY + state.py * cellSize + cellSize / 2,
          cellSize * 0.28,
          0,
          Math.PI * 2
        );
        ctx2d.fill();
      }

      function updateReadout() {
        var secs = ((performance.now() - state.startTime) / 1000).toFixed(1);
        readout.innerHTML = state.solved
          ? "<strong>Solved</strong> in " + secs + "s"
          : "Time: <strong>" + secs + "s</strong>";
      }

      function start() {
        state.cells = generateMaze();
        state.px = 0;
        state.py = 0;
        state.solved = false;
        state.startTime = performance.now();
        draw();
        updateReadout();
      }
      // Exposed so reset() (registered outside this closure) can generate
      // a fresh maze without reaching into loose local variables.
      state.restart = start;

      function onKey(e) {
        if (state.solved) return;
        var c = state.cells[state.py * COLS + state.px];
        var moved = false;
        if (e.key === "ArrowUp" && c.N) { state.py--; moved = true; }
        else if (e.key === "ArrowDown" && c.S) { state.py++; moved = true; }
        else if (e.key === "ArrowLeft" && c.W) { state.px--; moved = true; }
        else if (e.key === "ArrowRight" && c.E) { state.px++; moved = true; }
        if (!moved) return;
        e.preventDefault();
        if (state.px === COLS - 1 && state.py === ROWS - 1) state.solved = true;
        draw();
        updateReadout();
      }
      document.addEventListener("keydown", onKey);

      start();
      state.tickTimer = setInterval(function () {
        if (!state.solved) updateReadout();
      }, 200);
      window.BetaControls.miniBtn(container, "New maze", start);

      container._betaState = state;

      return function cleanup() {
        document.removeEventListener("keydown", onKey);
        clearInterval(state.tickTimer);
      };
    },
    reset: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.restart();
    },
  });
})();
