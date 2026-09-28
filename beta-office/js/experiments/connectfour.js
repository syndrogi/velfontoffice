/**
 * BETA OFFICE experiment — Connect Four
 * Local two-player, click a column to drop. Red vs black rather than
 * the usual red/yellow, to stay inside the existing monochrome +
 * accent-red palette.
 */
(function () {
  if (!window.BetaExperiments) return;

  var COLS = 7;
  var ROWS = 6;

  function winner(board) {
    function get(x, y) { return board[y * COLS + x]; }
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var v = get(x, y);
        if (!v) continue;
        if (x + 3 < COLS && v === get(x + 1, y) && v === get(x + 2, y) && v === get(x + 3, y)) return v;
        if (y + 3 < ROWS && v === get(x, y + 1) && v === get(x, y + 2) && v === get(x, y + 3)) return v;
        if (x + 3 < COLS && y + 3 < ROWS && v === get(x + 1, y + 1) && v === get(x + 2, y + 2) && v === get(x + 3, y + 3)) return v;
        if (x - 3 >= 0 && y + 3 < ROWS && v === get(x - 1, y + 1) && v === get(x - 2, y + 2) && v === get(x - 3, y + 3)) return v;
      }
    }
    return null;
  }

  window.BetaExperiments.registerExperiment({
    id: "connectfour",
    name: "Connect Four",
    category: "CONNECTFOUR",
    description: "Local 2-player, click a column to drop",
    launch: function (container) {
      var grid = document.createElement("div");
      grid.className = "beta-c4-grid";
      container.appendChild(grid);

      var readout = window.BetaControls.readout(container);
      var cells = [];
      var state = { board: null, turn: "R", over: false };

      function updateReadout() {
        if (state.over) {
          var w = winner(state.board);
          readout.innerHTML = w ? "<strong>" + (w === "R" ? "Red" : "Black") + "</strong> wins" : "Draw";
        } else {
          readout.innerHTML = "Turn: <strong>" + (state.turn === "R" ? "Red" : "Black") + "</strong>";
        }
      }

      function drop(x) {
        if (state.over) return;
        for (var y = ROWS - 1; y >= 0; y--) {
          var i = y * COLS + x;
          if (!state.board[i]) {
            state.board[i] = state.turn;
            cells[i].classList.add(state.turn === "R" ? "beta-is-red" : "beta-is-black");
            var w = winner(state.board);
            if (w || state.board.every(Boolean)) {
              state.over = true;
            } else {
              state.turn = state.turn === "R" ? "B" : "R";
            }
            updateReadout();
            return;
          }
        }
      }

      function build() {
        grid.innerHTML = "";
        cells = [];
        state.board = new Array(COLS * ROWS).fill(null);
        state.turn = "R";
        state.over = false;
        for (var y = 0; y < ROWS; y++) {
          for (var x = 0; x < COLS; x++) {
            var cell = document.createElement("button");
            cell.type = "button";
            cell.className = "beta-c4-cell";
            (function (col) {
              cell.addEventListener("click", function () { drop(col); });
            })(x);
            grid.appendChild(cell);
            cells.push(cell);
          }
        }
        updateReadout();
      }
      // Exposed so reset() (registered outside this closure) can start a
      // fresh game without reaching into loose local variables.
      state.restart = build;

      window.BetaControls.miniBtn(container, "New game", build);
      build();

      container._betaState = state;
      return function cleanup() {};
    },
    reset: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.restart();
    },
  });
})();
