/**
 * BETA OFFICE experiment — Etch A Sketch
 * Two sliders stand in for the toy's two knobs — X moves the pen
 * horizontally, Y moves it vertically, each dragging a line as it goes.
 */
(function () {
  if (!window.BetaExperiments) return;

  window.BetaExperiments.registerExperiment({
    id: "etchasketch",
    name: "Etch A Sketch",
    category: "ETCHASKETCH",
    number: 98,
    description: "Two knobs move the pen — X and Y sliders draw a line",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var pen = { x: canvas.width / 2, y: canvas.height / 2 };
      ctx2d.strokeStyle = "#000";
      ctx2d.lineWidth = 2;
      ctx2d.lineCap = "round";

      function moveTo(nx, ny) {
        ctx2d.beginPath();
        ctx2d.moveTo(pen.x, pen.y);
        ctx2d.lineTo(nx, ny);
        ctx2d.stroke();
        pen.x = nx;
        pen.y = ny;
      }

      window.BetaControls.slider(container, {
        label: "X knob", min: 0, max: canvas.width, step: 1, value: pen.x,
        onInput: function (v) { moveTo(v, pen.y); },
      });
      window.BetaControls.slider(container, {
        label: "Y knob", min: 0, max: canvas.height, step: 1, value: pen.y,
        onInput: function (v) { moveTo(pen.x, v); },
      });
      window.BetaControls.miniBtn(container, "Shake to clear", function () {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      });

      return function cleanup() {};
    },
  });
})();
