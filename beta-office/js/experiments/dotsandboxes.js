/**
 * BETA OFFICE experiment — Dots and Boxes
 * Local 2-player on a 4x4 grid of dots (3x3 boxes). Click an edge
 * between two dots to claim it; completing a box's 4th edge scores it
 * for whoever drew that edge. The board is modeled as a single
 * (2N+1)x(2N+1) cell grid — even/even cells are dots, odd/odd are
 * boxes, and the rest are the two edge orientations.
 */
(function () {
  if (!window.BetaExperiments) return;

  var N = 3; // boxes per side

  window.BetaExperiments.registerExperiment({
    id: "dotsandboxes",
    name: "Dots and Boxes",
    category: "GAMES",
    number: 82,
    description: "Local 2-player — claim edges, complete boxes to score",
    launch: function (container) {
      var size = 2 * N + 1;
      var grid = document.createElement("div");
      grid.className = "beta-dab-grid";
      grid.style.gridTemplateColumns = "repeat(" + size + ", auto)";
      container.appendChild(grid);

      var readout = window.BetaControls.readout(container);
      var cellEls = [];
      var state = { turn: "A", scoreA: 0, scoreB: 0, edges: null, boxes: null };

      function idx(r, c) { return r * size + c; }

      function checkBoxesAround(r, c) {
        var boxCoords = [];
        if (r % 2 === 1 && c % 2 === 0) {
          boxCoords.push([r, c - 1], [r, c + 1]);
        } else if (r % 2 === 0 && c % 2 === 1) {
          boxCoords.push([r - 1, c], [r + 1, c]);
        }
        boxCoords.forEach(function (bc) {
          var br = bc[0];
          var bcc = bc[1];
          if (br < 0 || bcc < 0 || br >= size || bcc >= size) return;
          if (br % 2 !== 1 || bcc % 2 !== 1) return;
          if (state.boxes[idx(br, bcc)]) return;
          var top = state.edges[idx(br - 1, bcc)];
          var bottom = state.edges[idx(br + 1, bcc)];
          var left = state.edges[idx(br, bcc - 1)];
          var right = state.edges[idx(br, bcc + 1)];
          if (top && bottom && left && right) {
            state.boxes[idx(br, bcc)] = state.turn;
            if (state.turn === "A") state.scoreA++;
            else state.scoreB++;
            cellEls[idx(br, bcc)].textContent = state.turn;
            cellEls[idx(br, bcc)].classList.add("beta-is-claimed");
          }
        });
      }

      function updateReadout() {
        var total = N * N;
        if (state.scoreA + state.scoreB === total) {
          var winner = state.scoreA > state.scoreB ? "A" : state.scoreA < state.scoreB ? "B" : "Tie";
          readout.innerHTML = "<strong>" + winner + "</strong> — A:" + state.scoreA + " B:" + state.scoreB;
        } else {
          readout.innerHTML = "Turn: <strong>" + state.turn + "</strong> — A:" + state.scoreA + " B:" + state.scoreB;
        }
      }

      function onEdgeClick(r, c) {
        var i = idx(r, c);
        if (state.edges[i]) return;
        state.edges[i] = true;
        cellEls[i].classList.add("beta-is-drawn");
        checkBoxesAround(r, c);
        state.turn = state.turn === "A" ? "B" : "A";
        updateReadout();
      }

      function build() {
        grid.innerHTML = "";
        cellEls = [];
        state.edges = new Array(size * size).fill(false);
        state.boxes = new Array(size * size).fill(null);
        state.turn = "A";
        state.scoreA = 0;
        state.scoreB = 0;
        for (var r = 0; r < size; r++) {
          for (var c = 0; c < size; c++) {
            var cell = document.createElement("div");
            var isDot = r % 2 === 0 && c % 2 === 0;
            var isBox = r % 2 === 1 && c % 2 === 1;
            var isHEdge = r % 2 === 0 && c % 2 === 1;
            var isVEdge = r % 2 === 1 && c % 2 === 0;
            if (isDot) {
              cell.className = "beta-dab-dot";
            } else if (isBox) {
              cell.className = "beta-dab-box";
            } else if (isHEdge) {
              cell.className = "beta-dab-hedge";
              (function (rr, cc) {
                cell.addEventListener("click", function () { onEdgeClick(rr, cc); });
              })(r, c);
            } else if (isVEdge) {
              cell.className = "beta-dab-vedge";
              (function (rr, cc) {
                cell.addEventListener("click", function () { onEdgeClick(rr, cc); });
              })(r, c);
            }
            grid.appendChild(cell);
            cellEls.push(cell);
          }
        }
        updateReadout();
      }
      // Exposed so reset() (registered outside this closure) can start a
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
