/**
 * BETA OFFICE experiment — 2048
 * Arrow-key slide-and-merge on a 4x4 grid. Same document-level keydown
 * approach as Snake, cleaned up on window close.
 */
(function () {
  if (!window.BetaExperiments) return;

  var SIZE = 4;

  window.BetaExperiments.registerExperiment({
    id: "2048",
    name: "2048",
    category: "GAMES",
    number: 27,
    description: "Arrow-key slide and merge, reach 2048",
    launch: function (container) {
      var grid = document.createElement("div");
      grid.className = "beta-2048-grid";
      container.appendChild(grid);

      var cells = [];
      for (var i = 0; i < SIZE * SIZE; i++) {
        var cell = document.createElement("div");
        cell.className = "beta-2048-cell";
        grid.appendChild(cell);
        cells.push(cell);
      }

      var readout = window.BetaControls.readout(container);
      var state = { board: null, score: 0, over: false };

      function render() {
        cells.forEach(function (c, i) {
          var v = state.board[i];
          c.textContent = v ? String(v) : "";
        });
        readout.innerHTML = state.over
          ? "Score: <strong>" + state.score + "</strong> — no moves left"
          : "Score: <strong>" + state.score + "</strong>";
      }

      function emptyCells() {
        var out = [];
        state.board.forEach(function (v, i) {
          if (!v) out.push(i);
        });
        return out;
      }

      function addRandomTile() {
        var empties = emptyCells();
        if (!empties.length) return;
        var i = empties[(Math.random() * empties.length) | 0];
        state.board[i] = Math.random() < 0.9 ? 2 : 4;
      }

      function build() {
        state.board = new Array(SIZE * SIZE).fill(0);
        state.score = 0;
        state.over = false;
        addRandomTile();
        addRandomTile();
        render();
      }
      // Exposed so reset() (registered outside this closure) can start a
      // fresh board without reaching into loose local variables.
      state.restart = build;

      function lineIndices(line, dir) {
        var idx = [];
        for (var k = 0; k < SIZE; k++) idx.push(k);
        if (dir === "left" || dir === "right") {
          idx = idx.map(function (k) { return line * SIZE + k; });
          if (dir === "right") idx.reverse();
        } else {
          idx = idx.map(function (k) { return k * SIZE + line; });
          if (dir === "down") idx.reverse();
        }
        return idx;
      }

      function slide(dir) {
        var moved = false;
        for (var line = 0; line < SIZE; line++) {
          var idx = lineIndices(line, dir);
          var vals = idx.map(function (i) { return state.board[i]; }).filter(Boolean);
          var merged = [];
          for (var i = 0; i < vals.length; i++) {
            if (i + 1 < vals.length && vals[i] === vals[i + 1]) {
              var sum = vals[i] * 2;
              merged.push(sum);
              state.score += sum;
              i++;
            } else {
              merged.push(vals[i]);
            }
          }
          while (merged.length < SIZE) merged.push(0);
          idx.forEach(function (cellIdx, k) {
            if (state.board[cellIdx] !== merged[k]) moved = true;
            state.board[cellIdx] = merged[k];
          });
        }
        return moved;
      }

      function hasMoves() {
        if (emptyCells().length) return true;
        for (var y = 0; y < SIZE; y++) {
          for (var x = 0; x < SIZE; x++) {
            var v = state.board[y * SIZE + x];
            if (x + 1 < SIZE && state.board[y * SIZE + x + 1] === v) return true;
            if (y + 1 < SIZE && state.board[(y + 1) * SIZE + x] === v) return true;
          }
        }
        return false;
      }

      var DIR_KEYS = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
      function onKey(e) {
        var dir = DIR_KEYS[e.key];
        if (!dir || state.over) return;
        e.preventDefault();
        if (slide(dir)) {
          addRandomTile();
          if (!hasMoves()) state.over = true;
        }
        render();
      }
      document.addEventListener("keydown", onKey);

      window.BetaControls.miniBtn(container, "New game", build);
      build();

      container._betaState = state;

      return function cleanup() {
        document.removeEventListener("keydown", onKey);
      };
    },
    reset: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.restart();
    },
  });
})();
