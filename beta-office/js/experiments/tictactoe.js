/**
 * BETA OFFICE experiment — TicTacToe
 * Local two-player 3x3 grid. No AI — pass the mouse.
 */
(function () {
  if (!window.BetaExperiments) return;

  var LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  function winner(board) {
    for (var i = 0; i < LINES.length; i++) {
      var l = LINES[i];
      if (board[l[0]] && board[l[0]] === board[l[1]] && board[l[1]] === board[l[2]]) return board[l[0]];
    }
    return null;
  }

  window.BetaExperiments.registerExperiment({
    id: "tictactoe",
    name: "TicTacToe",
    category: "TICTACTOE",
    description: "Local 2-player 3x3 grid, no AI",
    launch: function (container) {
      var grid = document.createElement("div");
      grid.className = "beta-ttt-grid";
      container.appendChild(grid);

      var readout = window.BetaControls.readout(container);
      var cells = [];
      var state = { board: null, turn: "X", over: false };

      function updateReadout() {
        if (state.over) {
          var w = winner(state.board);
          readout.innerHTML = w ? "<strong>" + w + "</strong> wins" : "Draw";
        } else {
          readout.innerHTML = "Turn: <strong>" + state.turn + "</strong>";
        }
      }

      function onPlay(idx) {
        if (state.over || state.board[idx]) return;
        state.board[idx] = state.turn;
        cells[idx].textContent = state.turn;
        var w = winner(state.board);
        if (w || state.board.every(function (v) { return v; })) {
          state.over = true;
        } else {
          state.turn = state.turn === "X" ? "O" : "X";
        }
        updateReadout();
      }

      function build() {
        state.board = new Array(9).fill(null);
        state.turn = "X";
        state.over = false;
        cells.forEach(function (c) { c.textContent = ""; });
        updateReadout();
      }
      // Exposed so reset() (registered outside this closure) can start a
      // fresh game without reaching into loose local variables.
      state.restart = build;

      for (var i = 0; i < 9; i++) {
        var cell = document.createElement("button");
        cell.type = "button";
        cell.className = "beta-ttt-cell";
        (function (idx) {
          cell.addEventListener("click", function () { onPlay(idx); });
        })(i);
        grid.appendChild(cell);
        cells.push(cell);
      }

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
