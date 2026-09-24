/**
 * BETA OFFICE experiment — Canvas
 * A real freehand-drawing <canvas>, brush-size control, clear.
 */
(function () {
  if (!window.BetaExperiments) return;

  window.BetaExperiments.registerExperiment({
    id: "canvas",
    name: "Canvas",
    category: "CANVAS",
    description: "Freehand draw, brush size, clear",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");

      function resizeCanvas() {
        var rect = stage.el.getBoundingClientRect();
        var prev = document.createElement("canvas");
        prev.width = canvas.width;
        prev.height = canvas.height;
        var prevCtx = prev.getContext("2d");
        if (canvas.width && canvas.height) prevCtx.drawImage(canvas, 0, 0);
        canvas.width = rect.width;
        canvas.height = rect.height;
        ctx2d.lineCap = "round";
        ctx2d.lineJoin = "round";
        if (prev.width && prev.height) ctx2d.drawImage(prev, 0, 0);
      }
      resizeCanvas();

      var state = { drawing: false, last: null, brush: 4 };

      function point(e) {
        var rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
      }

      function onDown(e) {
        state.drawing = true;
        state.last = point(e);
        canvas.setPointerCapture(e.pointerId);
      }
      function onMove(e) {
        if (!state.drawing) return;
        var p = point(e);
        ctx2d.strokeStyle = "#000";
        ctx2d.lineWidth = state.brush;
        ctx2d.beginPath();
        ctx2d.moveTo(state.last.x, state.last.y);
        ctx2d.lineTo(p.x, p.y);
        ctx2d.stroke();
        state.last = p;
      }
      function onUp() {
        state.drawing = false;
      }

      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onUp);

      window.BetaControls.slider(container, {
        label: "Brush size", min: 1, max: 24, step: 1, value: state.brush, unit: "px",
        onInput: function (v) { state.brush = v; },
      });
      window.BetaControls.miniBtn(container, "Clear", function () {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      });

      return function cleanup() {
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerup", onUp);
        canvas.removeEventListener("pointercancel", onUp);
      };
    },
  });
})();
