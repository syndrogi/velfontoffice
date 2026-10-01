/**
 * BETA OFFICE experiment — Matrix Rain
 * Falling glyph columns on canvas, classic "digital rain" look.
 */
(function () {
  if (!window.BetaExperiments) return;

  var CHARS = "01アイウエオカキクケコ";
  var FONT_SIZE = 12;

  window.BetaExperiments.registerExperiment({
    id: "matrixrain",
    name: "Matrix Rain",
    category: "MATRIXRAIN",
    number: 47,
    description: "Falling glyph columns, speed slider",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var cols = Math.floor(canvas.width / FONT_SIZE);
      var drops = new Array(cols).fill(0);
      var state = { speed: 2 };

      var rafId = null;
      var frame = 0;
      function step() {
        frame++;
        ctx2d.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx2d.fillRect(0, 0, canvas.width, canvas.height);
        if (frame % Math.max(1, 4 - state.speed) === 0) {
          ctx2d.fillStyle = "#000";
          ctx2d.font = FONT_SIZE + "px monospace";
          for (var i = 0; i < cols; i++) {
            var ch = CHARS.charAt((Math.random() * CHARS.length) | 0);
            ctx2d.fillText(ch, i * FONT_SIZE, drops[i] * FONT_SIZE);
            if (drops[i] * FONT_SIZE > canvas.height && Math.random() > 0.975) {
              drops[i] = 0;
            }
            drops[i]++;
          }
        }
        rafId = requestAnimationFrame(step);
      }
      rafId = requestAnimationFrame(step);

      window.BetaControls.slider(container, {
        label: "Speed", min: 1, max: 3, step: 1, value: state.speed,
        onInput: function (v) { state.speed = v; },
      });

      container._betaState = state;

      return function cleanup() {
        if (rafId) cancelAnimationFrame(rafId);
      };
    },
  });
})();
