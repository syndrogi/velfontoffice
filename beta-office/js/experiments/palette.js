/**
 * BETA OFFICE experiment — Palette
 * Generates a 5-color swatch (loosely related hues, stepped lightness)
 * and copies a swatch's color to the clipboard on click.
 */
(function () {
  if (!window.BetaExperiments) return;

  function randomPalette() {
    var baseHue = Math.floor(Math.random() * 360);
    var colors = [];
    for (var i = 0; i < 5; i++) {
      var hue = (baseHue + i * 36 + (Math.random() * 20 - 10) + 360) % 360;
      var sat = 40 + Math.random() * 40;
      var light = 35 + i * 10;
      colors.push("hsl(" + Math.round(hue) + ", " + Math.round(sat) + "%, " + Math.round(light) + "%)");
    }
    return colors;
  }

  window.BetaExperiments.registerExperiment({
    id: "palette",
    name: "Palette",
    category: "PALETTE",
    number: 57,
    description: "Generate a 5-color swatch, click to copy",
    launch: function (container) {
      var row = document.createElement("div");
      row.className = "beta-palette-row";
      container.appendChild(row);

      var readout = window.BetaControls.readout(container);
      var swatches = [];
      for (var i = 0; i < 5; i++) {
        var sw = document.createElement("button");
        sw.type = "button";
        sw.className = "beta-palette-swatch";
        sw.addEventListener("click", function () {
          var color = this.style.backgroundColor;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(color).catch(function () {});
          }
          readout.textContent = "Copied: " + color;
        });
        row.appendChild(sw);
        swatches.push(sw);
      }

      function build() {
        var colors = randomPalette();
        swatches.forEach(function (sw, i) { sw.style.backgroundColor = colors[i]; });
        readout.textContent = "Click a swatch to copy its color";
      }

      window.BetaControls.miniBtn(container, "Generate", build);
      build();

      return function cleanup() {};
    },
  });
})();
