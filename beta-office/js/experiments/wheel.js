/**
 * BETA OFFICE experiment — Wheel
 * Spin a canvas pie wheel through several fast rotations before easing
 * to a stop, then reads off whichever slice lands under the pointer.
 */
(function () {
  if (!window.BetaExperiments) return;

  var OPTIONS = ["Yes", "No", "Maybe", "Ask again", "Definitely", "Not today"];
  var COLORS = ["#111111", "#e0261f", "#ffffff", "#8a8a8a", "#111111", "#e0261f"];
  var SPIN_MS = 2600;

  window.BetaExperiments.registerExperiment({
    id: "wheel",
    name: "Wheel",
    category: "WHEEL",
    number: 34,
    description: "Spin to pick from a list of options",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var cx = canvas.width / 2;
      var cy = canvas.height / 2;
      var radius = Math.min(cx, cy) - 8;

      var readout = window.BetaControls.readout(container);
      var state = { angle: 0, spinning: false, rafId: null };

      function draw() {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        var n = OPTIONS.length;
        var slice = (Math.PI * 2) / n;
        ctx2d.save();
        ctx2d.translate(cx, cy);
        ctx2d.rotate(state.angle);
        for (var i = 0; i < n; i++) {
          ctx2d.beginPath();
          ctx2d.moveTo(0, 0);
          ctx2d.arc(0, 0, radius, i * slice, (i + 1) * slice);
          ctx2d.closePath();
          ctx2d.fillStyle = COLORS[i % COLORS.length];
          ctx2d.fill();
          ctx2d.strokeStyle = "#000";
          ctx2d.stroke();
        }
        ctx2d.restore();

        ctx2d.fillStyle = "#000";
        ctx2d.beginPath();
        ctx2d.moveTo(cx + radius + 6, cy);
        ctx2d.lineTo(cx + radius - 6, cy - 6);
        ctx2d.lineTo(cx + radius - 6, cy + 6);
        ctx2d.closePath();
        ctx2d.fill();
      }

      function spin() {
        if (state.spinning) return;
        state.spinning = true;
        readout.textContent = "";
        var target = state.angle + Math.PI * 2 * 4 + Math.random() * Math.PI * 2;
        var startAngle = state.angle;
        var startTime = performance.now();
        function frame(now) {
          var t = Math.min(1, (now - startTime) / SPIN_MS);
          var eased = 1 - Math.pow(1 - t, 3);
          state.angle = startAngle + (target - startAngle) * eased;
          draw();
          if (t < 1) {
            state.rafId = requestAnimationFrame(frame);
          } else {
            state.spinning = false;
            var n = OPTIONS.length;
            var slice = (Math.PI * 2) / n;
            var normalized = ((-state.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            var index = Math.floor(normalized / slice) % n;
            readout.innerHTML = "Landed on: <strong>" + OPTIONS[index] + "</strong>";
          }
        }
        state.rafId = requestAnimationFrame(frame);
      }

      draw();
      window.BetaControls.miniBtn(container, "Spin", spin);

      container._betaState = state;

      return function cleanup() {
        if (state.rafId) cancelAnimationFrame(state.rafId);
      };
    },
  });
})();
