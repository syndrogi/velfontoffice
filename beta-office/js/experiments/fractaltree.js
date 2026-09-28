/**
 * BETA OFFICE experiment — Fractal Tree
 * Recursive branching tree drawn on canvas. Angle and depth sliders
 * redraw immediately.
 */
(function () {
  if (!window.BetaExperiments) return;

  window.BetaExperiments.registerExperiment({
    id: "fractaltree",
    name: "Fractal Tree",
    category: "FRACTALTREE",
    description: "Recursive branching tree, angle + depth sliders",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var state = { angle: 25, depth: 9 };

      function branch(x, y, len, angleRad, depth) {
        if (depth === 0 || len < 2) return;
        var x2 = x + len * Math.cos(angleRad);
        var y2 = y + len * Math.sin(angleRad);
        ctx2d.beginPath();
        ctx2d.moveTo(x, y);
        ctx2d.lineTo(x2, y2);
        ctx2d.stroke();
        var rad = (state.angle * Math.PI) / 180;
        branch(x2, y2, len * 0.72, angleRad - rad, depth - 1);
        branch(x2, y2, len * 0.72, angleRad + rad, depth - 1);
      }

      function draw() {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        ctx2d.strokeStyle = "#000";
        ctx2d.lineWidth = 1;
        branch(canvas.width / 2, canvas.height - 4, canvas.height * 0.32, -Math.PI / 2, state.depth);
      }
      draw();

      window.BetaControls.slider(container, {
        label: "Angle", min: 5, max: 45, step: 1, value: state.angle, unit: "°",
        onInput: function (v) { state.angle = v; draw(); },
      });
      window.BetaControls.slider(container, {
        label: "Depth", min: 3, max: 12, step: 1, value: state.depth,
        onInput: function (v) { state.depth = v; draw(); },
      });

      state.redraw = draw;
      container._betaState = state;

      return function cleanup() {};
    },
    randomize: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.angle = 5 + Math.random() * 40;
      s.depth = 4 + Math.floor(Math.random() * 8);
      if (s.redraw) s.redraw();
    },
    reset: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.angle = 25;
      s.depth = 9;
      if (s.redraw) s.redraw();
    },
  });
})();
