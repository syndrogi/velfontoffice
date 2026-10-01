/**
 * BETA OFFICE experiment — Color Picker
 * Paints a random gradient, then samples the exact pixel color under a
 * click via getImageData and copies its hex to the clipboard.
 */
(function () {
  if (!window.BetaExperiments) return;

  window.BetaExperiments.registerExperiment({
    id: "colorpicker",
    name: "Color Picker",
    category: "COLORPICKER",
    number: 81,
    description: "Click the gradient to sample its exact color",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      function paint() {
        var hue = Math.random() * 360;
        var grad = ctx2d.createLinearGradient(0, 0, canvas.width, 0);
        grad.addColorStop(0, "hsl(" + hue + ", 80%, 70%)");
        grad.addColorStop(0.5, "hsl(" + ((hue + 120) % 360) + ", 80%, 50%)");
        grad.addColorStop(1, "hsl(" + ((hue + 240) % 360) + ", 80%, 30%)");
        ctx2d.fillStyle = grad;
        ctx2d.fillRect(0, 0, canvas.width, canvas.height);
        var vgrad = ctx2d.createLinearGradient(0, 0, 0, canvas.height);
        vgrad.addColorStop(0, "rgba(255, 255, 255, 0.4)");
        vgrad.addColorStop(1, "rgba(0, 0, 0, 0.3)");
        ctx2d.fillStyle = vgrad;
        ctx2d.fillRect(0, 0, canvas.width, canvas.height);
      }
      paint();

      var readout = window.BetaControls.readout(container);
      readout.textContent = "Click anywhere on the gradient";

      canvas.addEventListener("pointerdown", function (e) {
        var r = canvas.getBoundingClientRect();
        var x = Math.round(e.clientX - r.left);
        var y = Math.round(e.clientY - r.top);
        var data = ctx2d.getImageData(x, y, 1, 1).data;
        var hex = "#" + [data[0], data[1], data[2]].map(function (v) {
          return v.toString(16).padStart(2, "0");
        }).join("");
        readout.innerHTML = "Picked: <strong>" + hex + "</strong>";
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(hex).catch(function () {});
        }
      });

      window.BetaControls.miniBtn(container, "New gradient", paint);

      return function cleanup() {};
    },
  });
})();
