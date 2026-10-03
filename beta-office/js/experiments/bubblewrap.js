/**
 * BETA OFFICE experiment — Bubble Wrap
 * A grid of poppable bubbles. Purely satisfying, no scoring pressure.
 */
(function () {
  if (!window.BetaExperiments) return;

  var COUNT = 48;

  window.BetaExperiments.registerExperiment({
    id: "bubblewrap",
    name: "Bubble Wrap",
    category: "VISUAL",
    number: 58,
    description: "Click to pop every bubble",
    launch: function (container) {
      var grid = document.createElement("div");
      grid.className = "beta-bubblewrap-grid";
      container.appendChild(grid);

      var readout = window.BetaControls.readout(container);
      var bubbles = [];

      function updateReadout() {
        var popped = bubbles.filter(function (b) { return b.classList.contains("beta-is-popped"); }).length;
        readout.innerHTML = "Popped: <strong>" + popped + " / " + COUNT + "</strong>";
      }

      function build() {
        grid.innerHTML = "";
        bubbles = [];
        for (var i = 0; i < COUNT; i++) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "beta-bubblewrap-bubble";
          b.addEventListener("click", function () {
            this.classList.add("beta-is-popped");
            updateReadout();
          });
          grid.appendChild(b);
          bubbles.push(b);
        }
        updateReadout();
      }

      window.BetaControls.miniBtn(container, "Reset sheet", build);
      build();

      return function cleanup() {};
    },
  });
})();
