/**
 * BETA OFFICE experiment — Spirograph
 * A hypotrochoid curve (the classic Spirograph shape) redrawn from
 * scratch whenever R, r, or d changes.
 */
(function () {
  if (!window.BetaExperiments) return;

  window.BetaExperiments.registerExperiment({
    id: "spirograph",
    name: "Spirograph",
    category: "VISUAL",
    number: 52,
    description: "Parametric curve, R/r/d sliders",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var cx = canvas.width / 2;
      var cy = canvas.height / 2;
      var state = { R: 60, r: 25, d: 40 };

      function draw() {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        ctx2d.strokeStyle = "#e0261f";
        ctx2d.lineWidth = 1;
        ctx2d.beginPath();
        var R = state.R;
        var r = state.r;
        var d = state.d;
        var steps = 800;
        for (var i = 0; i <= steps; i++) {
          var t = (i / steps) * Math.PI * 2 * 12;
          var x = (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
          var y = (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
          var px = cx + x;
          var py = cy + y;
          if (i === 0) ctx2d.moveTo(px, py);
          else ctx2d.lineTo(px, py);
        }
        ctx2d.stroke();
      }
      draw();

      window.BetaControls.slider(container, {
        label: "R", min: 20, max: 90, step: 1, value: state.R,
        onInput: function (v) { state.R = v; draw(); },
      });
      window.BetaControls.slider(container, {
        label: "r", min: 5, max: 50, step: 1, value: state.r,
        onInput: function (v) { state.r = v; draw(); },
      });
      window.BetaControls.slider(container, {
        label: "d", min: 5, max: 60, step: 1, value: state.d,
        onInput: function (v) { state.d = v; draw(); },
      });

      state.redraw = draw;
      container._betaState = state;

      return function cleanup() {};
    },
    randomize: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.R = 20 + Math.random() * 70;
      s.r = 5 + Math.random() * 45;
      s.d = 5 + Math.random() * 55;
      if (s.redraw) s.redraw();
    },
    reset: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.R = 60;
      s.r = 25;
      s.d = 40;
      if (s.redraw) s.redraw();
    },
  });
})();
