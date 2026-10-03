/**
 * BETA OFFICE experiment — Kaleidoscope
 * Drag across the canvas; every stroke is mirrored and rotated into an
 * 8-way symmetric pattern around the center.
 */
(function () {
  if (!window.BetaExperiments) return;

  var SEGMENTS = 8;

  window.BetaExperiments.registerExperiment({
    id: "kaleidoscope",
    name: "Kaleidoscope",
    category: "VISUAL",
    number: 50,
    description: "Mouse-driven mirrored symmetric drawing",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var cx = canvas.width / 2;
      var cy = canvas.height / 2;
      var drawing = false;
      var last = null;

      function drawSegment(x1, y1, x2, y2) {
        var dx1 = x1 - cx;
        var dy1 = y1 - cy;
        var dx2 = x2 - cx;
        var dy2 = y2 - cy;
        var angleStep = (Math.PI * 2) / SEGMENTS;
        ctx2d.strokeStyle = "#e0261f";
        ctx2d.lineWidth = 1.5;
        for (var i = 0; i < SEGMENTS; i++) {
          var a = i * angleStep;
          var cosA = Math.cos(a);
          var sinA = Math.sin(a);
          [1, -1].forEach(function (mirror) {
            var rx1 = dx1 * cosA - dy1 * sinA * mirror;
            var ry1 = dx1 * sinA * mirror + dy1 * cosA;
            var rx2 = dx2 * cosA - dy2 * sinA * mirror;
            var ry2 = dx2 * sinA * mirror + dy2 * cosA;
            ctx2d.beginPath();
            ctx2d.moveTo(cx + rx1, cy + ry1);
            ctx2d.lineTo(cx + rx2, cy + ry2);
            ctx2d.stroke();
          });
        }
      }

      canvas.addEventListener("pointerdown", function (e) {
        drawing = true;
        var r = canvas.getBoundingClientRect();
        last = { x: e.clientX - r.left, y: e.clientY - r.top };
      });
      canvas.addEventListener("pointermove", function (e) {
        if (!drawing) return;
        var r = canvas.getBoundingClientRect();
        var x = e.clientX - r.left;
        var y = e.clientY - r.top;
        drawSegment(last.x, last.y, x, y);
        last = { x: x, y: y };
      });
      function stopDrawing() { drawing = false; }
      canvas.addEventListener("pointerup", stopDrawing);
      canvas.addEventListener("pointerleave", stopDrawing);

      window.BetaControls.miniBtn(container, "Clear", function () {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      });

      return function cleanup() {};
    },
  });
})();
