/**
 * BETA OFFICE experiment — Text Blast
 * Renders text to an offscreen canvas, samples it into a particle field,
 * then lets a click scatter the particles before they ease back home.
 */
(function () {
  if (!window.BetaExperiments) return;

  var TEXT = "VELFONT";
  var FONT_SIZE = 26;
  var SAMPLE_STEP = 3;
  var REFORM_MS = 1400;

  window.BetaExperiments.registerExperiment({
    id: "textblast",
    name: "Text Blast",
    category: "TEXTBLAST",
    description: "Click the text to explode and reform it",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var particles = [];
      var state = { exploded: false, reformTimer: null };

      function buildParticles() {
        var off = document.createElement("canvas");
        off.width = canvas.width;
        off.height = canvas.height;
        var offCtx = off.getContext("2d");
        offCtx.font = "bold " + FONT_SIZE + "px monospace";
        offCtx.fillStyle = "#000";
        offCtx.textBaseline = "middle";
        var textWidth = offCtx.measureText(TEXT).width;
        offCtx.fillText(TEXT, (canvas.width - textWidth) / 2, canvas.height / 2);
        var data = offCtx.getImageData(0, 0, off.width, off.height).data;

        particles = [];
        for (var y = 0; y < off.height; y += SAMPLE_STEP) {
          for (var x = 0; x < off.width; x += SAMPLE_STEP) {
            var i = (y * off.width + x) * 4;
            if (data[i + 3] > 128) {
              particles.push({ homeX: x, homeY: y, x: x, y: y, vx: 0, vy: 0 });
            }
          }
        }
      }
      buildParticles();

      function explode() {
        if (state.exploded) return;
        state.exploded = true;
        particles.forEach(function (p) {
          p.vx = (Math.random() - 0.5) * 8;
          p.vy = (Math.random() - 0.5) * 8;
        });
        clearTimeout(state.reformTimer);
        state.reformTimer = setTimeout(function () {
          state.exploded = false;
        }, REFORM_MS);
      }
      canvas.addEventListener("pointerdown", explode);

      var rafId = null;
      function step() {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        ctx2d.fillStyle = "#000";
        particles.forEach(function (p) {
          if (state.exploded) {
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.96;
            p.vy *= 0.96;
          } else {
            p.x += (p.homeX - p.x) * 0.12;
            p.y += (p.homeY - p.y) * 0.12;
          }
          ctx2d.fillRect(p.x, p.y, 2, 2);
        });
        rafId = requestAnimationFrame(step);
      }
      rafId = requestAnimationFrame(step);

      return function cleanup() {
        if (rafId) cancelAnimationFrame(rafId);
        clearTimeout(state.reformTimer);
      };
    },
  });
})();
