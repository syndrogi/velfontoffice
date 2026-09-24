/**
 * BETA OFFICE experiment — Memory
 * Classic flip-two-cards matching game on a 4x3 grid of symbols. Pure
 * DOM (a button grid) — no canvas needed.
 */
(function () {
  if (!window.BetaExperiments) return;

  var SYMBOLS = ["A", "B", "C", "D", "E", "F"];

  window.BetaExperiments.registerExperiment({
    id: "memory",
    name: "Memory",
    category: "MEMORY",
    description: "Flip-and-match card grid, move counter",
    launch: function (container) {
      var grid = document.createElement("div");
      grid.className = "beta-memory-grid";
      container.appendChild(grid);

      var readout = window.BetaControls.readout(container);
      var state = { moves: 0, matched: 0, busy: false, first: null, timerId: null };

      function shuffled() {
        var deck = SYMBOLS.concat(SYMBOLS);
        for (var i = deck.length - 1; i > 0; i--) {
          var j = (Math.random() * (i + 1)) | 0;
          var t = deck[i];
          deck[i] = deck[j];
          deck[j] = t;
        }
        return deck;
      }

      function updateReadout() {
        readout.innerHTML = state.matched >= SYMBOLS.length
          ? "Solved in <strong>" + state.moves + "</strong> moves"
          : "Moves: <strong>" + state.moves + "</strong>";
      }

      function onFlip(card) {
        if (state.busy) return;
        if (card.classList.contains("beta-is-flipped") || card.classList.contains("beta-is-matched")) return;

        card.classList.add("beta-is-flipped");
        card.textContent = card.dataset.symbol;

        if (!state.first) {
          state.first = card;
          return;
        }

        state.moves++;
        var a = state.first;
        var b = card;
        state.first = null;

        if (a.dataset.symbol === b.dataset.symbol) {
          a.classList.add("beta-is-matched");
          b.classList.add("beta-is-matched");
          state.matched++;
          updateReadout();
          return;
        }

        state.busy = true;
        updateReadout();
        state.timerId = setTimeout(function () {
          a.classList.remove("beta-is-flipped");
          b.classList.remove("beta-is-flipped");
          a.textContent = "";
          b.textContent = "";
          state.busy = false;
        }, 650);
      }

      function build() {
        grid.innerHTML = "";
        state.moves = 0;
        state.matched = 0;
        state.busy = false;
        state.first = null;
        shuffled().forEach(function (symbol) {
          var card = document.createElement("button");
          card.type = "button";
          card.className = "beta-memory-card";
          card.dataset.symbol = symbol;
          card.addEventListener("click", function () { onFlip(card); });
          grid.appendChild(card);
        });
        updateReadout();
      }
      // Exposed so reset() (registered outside this closure) can deal a
      // fresh board without reaching into loose local variables.
      state.restart = build;

      window.BetaControls.miniBtn(container, "New game", build);
      build();

      container._betaState = state;

      return function cleanup() {
        clearTimeout(state.timerId);
      };
    },
    reset: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.restart();
    },
  });
})();
