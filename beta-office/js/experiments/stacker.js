/**
 * BETA OFFICE experiment — Stacker
 * A marker sweeps left-right along the top row; click to drop a block
 * into whichever column it's over. Blocks stack upward in that column
 * — overflow a column's height and the run ends.
 */
(function () {
  if (!window.BetaExperiments) return;

  var COLS = 8;
  var ROWS = 10;

  window.BetaExperiments.registerExperiment({
    id: "stacker",
    name: "Stacker",
    category: "STACKER",
    number: 76,
    description: "Click to drop blocks, don't overflow a column",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var cellW = canvas.width / COLS;
      var cellH = canvas.height / ROWS;

      var readout = window.BetaControls.readout(container);
      var state = { heights: null, indicatorCol: 0, dir: 1, score: 0, over: false, tickTimer: null };

      function updateReadout() {
        readout.innerHTML = state.over
          ? "Score: <strong>" + state.score + "</strong> — overflowed, click New game"
          : "Score: <strong>" + state.score + "</strong>";
      }

      function draw() {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        ctx2d.fillStyle = "#000";
        for (var c = 0; c < COLS; c++) {
          for (var h = 0; h < state.heights[c]; h++) {
            ctx2d.fillRect(c * cellW + 1, canvas.height - (h + 1) * cellH + 1, cellW - 2, cellH - 2);
          }
        }
        if (!state.over) {
          ctx2d.fillStyle = "#e0261f";
          ctx2d.fillRect(state.indicatorCol * cellW + 1, 1, cellW - 2, cellH - 2);
        }
      }

      function drop() {
        if (state.over) return;
        var c = state.indicatorCol;
        state.heights[c]++;
        if (state.heights[c] >= ROWS) {
          state.over = true;
        } else {
          state.score++;
        }
        updateReadout();
        draw();
      }

      function start() {
        state.heights = new Array(COLS).fill(0);
        state.indicatorCol = 0;
        state.dir = 1;
        state.score = 0;
        state.over = false;
        updateReadout();
        draw();
      }
      // Exposed so reset() (registered outside this closure) can start a
      // fresh board without reaching into loose local variables.
      state.restart = start;

      canvas.addEventListener("pointerdown", drop);

      state.tickTimer = setInterval(function () {
        if (state.over) return;
        state.indicatorCol += state.dir;
        if (state.indicatorCol >= COLS - 1 || state.indicatorCol <= 0) state.dir *= -1;
        draw();
      }, 120);

      window.BetaControls.miniBtn(container, "New game", start);
      start();

      container._betaState = state;

      return function cleanup() {
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
