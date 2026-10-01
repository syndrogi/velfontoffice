/**
 * BETA OFFICE experiment — Battleship
 * Single-player: a 3/2/2-length fleet is placed randomly (no overlaps)
 * on a hidden 6x6 grid. Click cells to hit or miss; sink the whole
 * fleet to win.
 */
(function () {
  if (!window.BetaExperiments) return;

  var SIZE = 6;
  var SHIP_SIZES = [3, 2, 2];

  function placeShips() {
    var occupied = new Array(SIZE * SIZE).fill(false);
    var ships = [];
    SHIP_SIZES.forEach(function (len) {
      var placed = false;
      var attempts = 0;
      while (!placed && attempts < 200) {
        attempts++;
        var horizontal = Math.random() < 0.5;
        var x = (Math.random() * SIZE) | 0;
        var y = (Math.random() * SIZE) | 0;
        var coords = [];
        var ok = true;
        for (var i = 0; i < len; i++) {
          var cx = horizontal ? x + i : x;
          var cy = horizontal ? y : y + i;
          if (cx >= SIZE || cy >= SIZE || occupied[cy * SIZE + cx]) {
            ok = false;
            break;
          }
          coords.push(cy * SIZE + cx);
        }
        if (ok) {
          coords.forEach(function (i) { occupied[i] = true; });
          ships.push(coords);
          placed = true;
        }
      }
    });
    return ships;
  }

  window.BetaExperiments.registerExperiment({
    id: "battleship",
    name: "Battleship",
    category: "BATTLESHIP",
    number: 78,
    description: "Click cells to find and sink the hidden fleet",
    launch: function (container) {
      var grid = document.createElement("div");
      grid.className = "beta-battleship-grid";
      container.appendChild(grid);

      var readout = window.BetaControls.readout(container);
      var cells = [];
      var state = { ships: null, hitsLeft: 0, over: false };

      function updateReadout() {
        readout.innerHTML = state.over ? "<strong>Fleet sunk!</strong>" : "Hits left: <strong>" + state.hitsLeft + "</strong>";
      }

      function shipAt(idx) {
        return state.ships.findIndex(function (ship) { return ship.indexOf(idx) !== -1; });
      }

      function onClick(idx) {
        if (state.over) return;
        if (cells[idx].classList.contains("beta-is-hit") || cells[idx].classList.contains("beta-is-miss")) return;
        if (shipAt(idx) !== -1) {
          cells[idx].classList.add("beta-is-hit");
          state.hitsLeft--;
          if (state.hitsLeft <= 0) state.over = true;
        } else {
          cells[idx].classList.add("beta-is-miss");
        }
        updateReadout();
      }

      function build() {
        grid.innerHTML = "";
        cells = [];
        state.ships = placeShips();
        state.hitsLeft = SHIP_SIZES.reduce(function (a, b) { return a + b; }, 0);
        state.over = false;
        for (var i = 0; i < SIZE * SIZE; i++) {
          var cell = document.createElement("button");
          cell.type = "button";
          cell.className = "beta-battleship-cell";
          (function (idx) {
            cell.addEventListener("click", function () { onClick(idx); });
          })(i);
          grid.appendChild(cell);
          cells.push(cell);
        }
        updateReadout();
      }
      // Exposed so reset() (registered outside this closure) can place a
      // fresh fleet without reaching into loose local variables.
      state.restart = build;

      window.BetaControls.miniBtn(container, "New fleet", build);
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
