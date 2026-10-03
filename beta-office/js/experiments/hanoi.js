/**
 * BETA OFFICE experiment — Tower of Hanoi
 * Classic 3-peg, 4-disk puzzle. Click a peg to pick up its top disk,
 * click another peg to place it there (only if it's empty or the top
 * disk there is bigger). Move every disk onto the third peg to win.
 */
(function () {
  if (!window.BetaExperiments) return;

  var DISK_COUNT = 4;

  window.BetaExperiments.registerExperiment({
    id: "hanoi",
    name: "Tower of Hanoi",
    category: "GAMES",
    number: 92,
    description: "Click a peg to pick up, click another to place",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var readout = window.BetaControls.readout(container);
      var state = { pegs: null, selected: null, moves: 0, over: false };

      var pegX = [canvas.width * 0.2, canvas.width * 0.5, canvas.width * 0.8];
      var baseY = canvas.height - 10;
      var diskH = 10;

      function updateReadout() {
        readout.innerHTML = state.over
          ? "<strong>Solved</strong> in " + state.moves + " moves"
          : "Moves: <strong>" + state.moves + "</strong>";
      }

      function draw() {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        ctx2d.strokeStyle = "#000";
        pegX.forEach(function (x, i) {
          ctx2d.beginPath();
          ctx2d.moveTo(x, baseY);
          ctx2d.lineTo(x, baseY - DISK_COUNT * diskH - 10);
          ctx2d.stroke();
          if (state.selected === i) {
            ctx2d.strokeRect(x - 30, baseY - DISK_COUNT * diskH - 14, 60, DISK_COUNT * diskH + 20);
          }
        });
        state.pegs.forEach(function (peg, pi) {
          peg.forEach(function (disk, level) {
            var w = 16 + disk * 10;
            var y = baseY - (level + 1) * diskH;
            ctx2d.fillStyle = "#000";
            ctx2d.fillRect(pegX[pi] - w / 2, y, w, diskH - 2);
          });
        });
      }

      function build() {
        state.pegs = [[], [], []];
        for (var i = DISK_COUNT; i >= 1; i--) state.pegs[0].push(i);
        state.selected = null;
        state.moves = 0;
        state.over = false;
        draw();
        updateReadout();
      }
      // Exposed so reset() (registered outside this closure) can start a
      // fresh tower without reaching into loose local variables.
      state.restart = build;

      canvas.addEventListener("pointerdown", function (e) {
        if (state.over) return;
        var r = canvas.getBoundingClientRect();
        var x = e.clientX - r.left;
        var closest = 0;
        var best = Infinity;
        pegX.forEach(function (px, i) {
          var d = Math.abs(px - x);
          if (d < best) {
            best = d;
            closest = i;
          }
        });
        if (state.selected === null) {
          if (state.pegs[closest].length) state.selected = closest;
        } else {
          var from = state.selected;
          var to = closest;
          if (from !== to) {
            var disk = state.pegs[from][state.pegs[from].length - 1];
            var topTo = state.pegs[to][state.pegs[to].length - 1];
            if (topTo === undefined || disk < topTo) {
              state.pegs[from].pop();
              state.pegs[to].push(disk);
              state.moves++;
              if (state.pegs[2].length === DISK_COUNT) state.over = true;
            }
          }
          state.selected = null;
        }
        draw();
        updateReadout();
      });

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
