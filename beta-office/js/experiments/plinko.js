/**
 * BETA OFFICE experiment — Plinko
 * Drop a ball through a triangular peg field; it bounces a random
 * left/right step at each row before landing in one of several scoring
 * slots at the bottom. One ball in flight at a time.
 */
(function () {
  if (!window.BetaExperiments) return;

  var ROWS = 7;
  var SLOT_VALUES = [10, 5, 2, 1, 2, 5, 10];

  window.BetaExperiments.registerExperiment({
    id: "plinko",
    name: "Plinko",
    category: "PLINKO",
    number: 89,
    description: "Drop a ball through the pegs into a scoring slot",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var readout = window.BetaControls.readout(container);
      var pegRowGap = (canvas.height - 24) / ROWS;
      var balls = [];
      var state = { totalScore: 0, dropping: false };

      function pegsInRow(row) { return row + 2; }
      function pegX(row, i) {
        var count = pegsInRow(row);
        var spacing = canvas.width / (count + 1);
        return spacing * (i + 1);
      }

      function drop() {
        if (state.dropping) return;
        state.dropping = true;
        balls.push({ x: canvas.width / 2 + (Math.random() - 0.5) * 4, y: 4, row: 0, vy: 0 });
      }

      var rafId = null;
      function step() {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);

        ctx2d.fillStyle = "#000";
        for (var row = 0; row < ROWS; row++) {
          var count = pegsInRow(row);
          for (var i = 0; i < count; i++) {
            ctx2d.beginPath();
            ctx2d.arc(pegX(row, i), 20 + row * pegRowGap, 2, 0, Math.PI * 2);
            ctx2d.fill();
          }
        }

        var slotW = canvas.width / SLOT_VALUES.length;
        ctx2d.font = "9px monospace";
        ctx2d.textAlign = "center";
        SLOT_VALUES.forEach(function (v, i) {
          ctx2d.strokeRect(i * slotW, canvas.height - 14, slotW, 14);
          ctx2d.fillText(String(v), i * slotW + slotW / 2, canvas.height - 4);
        });

        balls.forEach(function (b) {
          var targetY = 20 + b.row * pegRowGap;
          if (b.y < targetY) {
            b.vy += 0.15;
            b.y += b.vy;
          } else if (b.row < ROWS) {
            b.y = targetY;
            b.x += (Math.random() < 0.5 ? -1 : 1) * (canvas.width / (ROWS * 4));
            b.x = Math.max(4, Math.min(canvas.width - 4, b.x));
            b.row++;
            b.vy = 0;
          } else if (b.y < canvas.height - 14) {
            b.vy += 0.15;
            b.y += b.vy;
          } else {
            var slotIndex = Math.min(SLOT_VALUES.length - 1, Math.max(0, Math.floor(b.x / slotW)));
            state.totalScore += SLOT_VALUES[slotIndex];
            readout.innerHTML = "Landed in slot worth <strong>" + SLOT_VALUES[slotIndex] + "</strong> — Total: <strong>" + state.totalScore + "</strong>";
            b.done = true;
            state.dropping = false;
          }
          ctx2d.beginPath();
          ctx2d.arc(b.x, b.y, 3, 0, Math.PI * 2);
          ctx2d.fillStyle = "#e0261f";
          ctx2d.fill();
        });
        balls = balls.filter(function (b) { return !b.done; });

        rafId = requestAnimationFrame(step);
      }
      rafId = requestAnimationFrame(step);

      window.BetaControls.miniBtn(container, "Drop ball", drop);
      readout.textContent = "Click Drop ball";

      return function cleanup() {
        if (rafId) cancelAnimationFrame(rafId);
      };
    },
  });
})();
