/**
 * BETA OFFICE experiment — Bingo
 * A random 5x5 card (standard B-I-N-G-O column ranges, free center).
 * Click a number to mark it; any complete row, column, or diagonal wins.
 */
(function () {
  if (!window.BetaExperiments) return;

  var RANGES = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]];

  var LINES = (function () {
    var lines = [];
    for (var r = 0; r < 5; r++) lines.push([r * 5, r * 5 + 1, r * 5 + 2, r * 5 + 3, r * 5 + 4]);
    for (var c = 0; c < 5; c++) lines.push([c, c + 5, c + 10, c + 15, c + 20]);
    lines.push([0, 6, 12, 18, 24]);
    lines.push([4, 8, 12, 16, 20]);
    return lines;
  })();

  function uniqueRandoms(min, max, count) {
    var pool = [];
    for (var i = min; i <= max; i++) pool.push(i);
    for (var i = pool.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var t = pool[i];
      pool[i] = pool[j];
      pool[j] = t;
    }
    return pool.slice(0, count);
  }

  window.BetaExperiments.registerExperiment({
    id: "bingo",
    name: "Bingo",
    category: "GAMES",
    number: 36,
    description: "Random 5x5 card, click to mark, get a line",
    launch: function (container) {
      var grid = document.createElement("div");
      grid.className = "beta-bingo-grid";
      container.appendChild(grid);

      var readout = window.BetaControls.readout(container);
      var cells = [];
      var state = { marked: null, won: false };

      function checkWin() {
        return LINES.some(function (line) {
          return line.every(function (i) { return state.marked[i]; });
        });
      }

      function updateReadout() {
        readout.innerHTML = state.won ? "<strong>BINGO!</strong>" : "Click numbers as they're called";
      }

      function onMark(i) {
        if (state.won || state.marked[i]) return;
        state.marked[i] = true;
        cells[i].classList.add("beta-is-marked");
        if (checkWin()) state.won = true;
        updateReadout();
      }

      function build() {
        grid.innerHTML = "";
        cells = [];
        state.marked = new Array(25).fill(false);
        state.won = false;
        var columns = RANGES.map(function (r) { return uniqueRandoms(r[0], r[1], 5); });
        for (var row = 0; row < 5; row++) {
          for (var col = 0; col < 5; col++) {
            var i = row * 5 + col;
            var isFree = row === 2 && col === 2;
            var cell = document.createElement("button");
            cell.type = "button";
            cell.className = "beta-bingo-cell";
            cell.textContent = isFree ? "FREE" : String(columns[col][row]);
            if (isFree) {
              state.marked[i] = true;
              cell.classList.add("beta-is-marked");
            }
            (function (idx) {
              cell.addEventListener("click", function () { onMark(idx); });
            })(i);
            grid.appendChild(cell);
            cells.push(cell);
          }
        }
        updateReadout();
      }
      // Exposed so reset() (registered outside this closure) can deal a
      // fresh card without reaching into loose local variables.
      state.restart = build;

      window.BetaControls.miniBtn(container, "New card", build);
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
