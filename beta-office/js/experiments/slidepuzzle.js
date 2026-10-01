/**
 * BETA OFFICE experiment — Slide Puzzle
 * The classic 15-puzzle. A naive random shuffle is solvable only half
 * the time (the blank-row-parity + inversion-count invariant), so
 * shuffledTiles() checks that invariant and swaps one pair of tiles to
 * fix it when the shuffle lands in the unsolvable half.
 */
(function () {
  if (!window.BetaExperiments) return;

  var SIZE = 4;

  function isSolvable(tiles) {
    var flat = tiles.filter(function (t) { return t != null; });
    var inversions = 0;
    for (var i = 0; i < flat.length; i++) {
      for (var j = i + 1; j < flat.length; j++) {
        if (flat[i] > flat[j]) inversions++;
      }
    }
    var blankIndex = tiles.indexOf(null);
    var blankRow = (blankIndex / SIZE) | 0;
    var rowFromBottom = SIZE - blankRow;
    return (inversions + rowFromBottom) % 2 === 0;
  }

  function shuffledTiles() {
    var tiles = [];
    for (var i = 1; i < SIZE * SIZE; i++) tiles.push(i);
    tiles.push(null);
    for (var i = tiles.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var t = tiles[i];
      tiles[i] = tiles[j];
      tiles[j] = t;
    }
    if (!isSolvable(tiles)) {
      // Swap the first two non-blank tiles found — flips exactly one
      // inversion, which flips the invariant into the solvable class.
      outer:
      for (var a = 0; a < tiles.length; a++) {
        for (var b = a + 1; b < tiles.length; b++) {
          if (tiles[a] != null && tiles[b] != null) {
            var tmp = tiles[a];
            tiles[a] = tiles[b];
            tiles[b] = tmp;
            break outer;
          }
        }
      }
    }
    return tiles;
  }

  window.BetaExperiments.registerExperiment({
    id: "slidepuzzle",
    name: "Slide Puzzle",
    category: "SLIDEPUZZLE",
    number: 91,
    description: "Classic 15-puzzle — slide tiles into numeric order",
    launch: function (container) {
      var grid = document.createElement("div");
      grid.className = "beta-slide-grid";
      container.appendChild(grid);

      var readout = window.BetaControls.readout(container);
      var cells = [];
      var state = { tiles: null, moves: 0, over: false };

      function solved() {
        for (var i = 0; i < SIZE * SIZE - 1; i++) {
          if (state.tiles[i] !== i + 1) return false;
        }
        return state.tiles[SIZE * SIZE - 1] == null;
      }

      function render() {
        cells.forEach(function (cell, i) {
          cell.textContent = state.tiles[i] != null ? String(state.tiles[i]) : "";
          cell.classList.toggle("beta-is-blank", state.tiles[i] == null);
        });
        readout.innerHTML = state.over
          ? "<strong>Solved</strong> in " + state.moves + " moves"
          : "Moves: <strong>" + state.moves + "</strong>";
      }

      function onClick(i) {
        if (state.over) return;
        var blankIndex = state.tiles.indexOf(null);
        var row = (i / SIZE) | 0;
        var col = i % SIZE;
        var brow = (blankIndex / SIZE) | 0;
        var bcol = blankIndex % SIZE;
        var adjacent = (Math.abs(row - brow) === 1 && col === bcol) || (Math.abs(col - bcol) === 1 && row === brow);
        if (!adjacent) return;
        state.tiles[blankIndex] = state.tiles[i];
        state.tiles[i] = null;
        state.moves++;
        if (solved()) state.over = true;
        render();
      }

      function build() {
        state.tiles = shuffledTiles();
        state.moves = 0;
        state.over = solved();
        render();
      }
      // Exposed so reset() (registered outside this closure) can shuffle
      // a fresh board without reaching into loose local variables.
      state.restart = build;

      for (var i = 0; i < SIZE * SIZE; i++) {
        var cell = document.createElement("button");
        cell.type = "button";
        cell.className = "beta-slide-cell";
        (function (idx) {
          cell.addEventListener("click", function () { onClick(idx); });
        })(i);
        grid.appendChild(cell);
        cells.push(cell);
      }

      window.BetaControls.miniBtn(container, "Shuffle", build);
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
