/**
 * BETA OFFICE experiment — Minesweeper
 * 8x8 grid, 10 mines. Left-click reveals (flood-fills through zeros),
 * right-click flags. Reveal a mine and the round ends, all mines shown.
 */
(function () {
  if (!window.BetaExperiments) return;

  var COLS = 8;
  var ROWS = 8;
  var MINES = 10;

  window.BetaExperiments.registerExperiment({
    id: "minesweeper",
    name: "Minesweeper",
    category: "GAMES",
    number: 26,
    description: "8x8 grid, flag with right-click, avoid the mines",
    launch: function (container) {
      var grid = document.createElement("div");
      grid.className = "beta-mine-grid";
      container.appendChild(grid);

      var readout = window.BetaControls.readout(container);
      var cells = [];
      var state = { board: null, revealed: null, flagged: null, over: false, won: false };

      function neighbors(i) {
        var x = i % COLS;
        var y = (i / COLS) | 0;
        var out = [];
        for (var dx = -1; dx <= 1; dx++) {
          for (var dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            var nx = x + dx;
            var ny = y + dy;
            if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) out.push(ny * COLS + nx);
          }
        }
        return out;
      }

      function updateReadout() {
        readout.innerHTML = state.over
          ? state.won
            ? "<strong>Cleared!</strong>"
            : "<strong>Boom</strong> — click New game"
          : "Mines: <strong>" + MINES + "</strong>";
      }

      function toggleFlag(i) {
        if (state.over || state.revealed[i]) return;
        state.flagged[i] = !state.flagged[i];
        cells[i].textContent = state.flagged[i] ? "?" : "";
        cells[i].classList.toggle("beta-is-flagged", state.flagged[i]);
      }

      function reveal(i) {
        if (state.over || state.revealed[i] || state.flagged[i]) return;
        state.revealed[i] = true;
        cells[i].classList.add("beta-is-revealed");

        if (state.board[i] === -1) {
          state.over = true;
          cells.forEach(function (c, idx) {
            if (state.board[idx] === -1) {
              c.classList.add("beta-is-revealed");
              c.textContent = "*";
            }
          });
          updateReadout();
          return;
        }

        cells[i].textContent = state.board[i] > 0 ? String(state.board[i]) : "";
        if (state.board[i] === 0) {
          neighbors(i).forEach(function (n) {
            if (!state.revealed[n]) reveal(n);
          });
        }

        var revealedCount = state.revealed.filter(Boolean).length;
        if (revealedCount === COLS * ROWS - MINES) {
          state.over = true;
          state.won = true;
        }
        updateReadout();
      }

      function build() {
        grid.innerHTML = "";
        cells = [];
        state.over = false;
        state.won = false;
        state.board = new Array(COLS * ROWS).fill(0);
        state.revealed = new Array(COLS * ROWS).fill(false);
        state.flagged = new Array(COLS * ROWS).fill(false);

        var placed = 0;
        while (placed < MINES) {
          var m = (Math.random() * COLS * ROWS) | 0;
          if (state.board[m] === -1) continue;
          state.board[m] = -1;
          placed++;
        }
        for (var i = 0; i < COLS * ROWS; i++) {
          if (state.board[i] === -1) continue;
          state.board[i] = neighbors(i).filter(function (n) {
            return state.board[n] === -1;
          }).length;
        }

        for (var c = 0; c < COLS * ROWS; c++) {
          var cell = document.createElement("button");
          cell.type = "button";
          cell.className = "beta-mine-cell";
          (function (idx) {
            cell.addEventListener("click", function () { reveal(idx); });
            cell.addEventListener("contextmenu", function (e) {
              e.preventDefault();
              toggleFlag(idx);
            });
          })(c);
          grid.appendChild(cell);
          cells.push(cell);
        }
        updateReadout();
      }
      // Exposed so reset() (registered outside this closure) can deal a
      // fresh board without reaching into loose local variables.
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
