/**
 * BETA OFFICE experiment — Color
 * Background/foreground pickers rewrite the shared --beta-bg/--beta-fg
 * custom properties that every component on this page already reads
 * from, so the effect is genuinely page-wide, not a fake preview box.
 * Invert/monochrome are simple CSS filter toggles on .beta-office,
 * exposed as window.BetaColor.invert() for the command palette / `Cmd+K`.
 */
(function () {
  if (!window.BetaExperiments) return;

  var root = document.documentElement;
  var DEFAULT_BG = "#ffffff";
  var DEFAULT_FG = "#000000";

  function invert() {
    root.classList.toggle("beta-invert");
  }

  window.BetaColor = { invert: invert };

  window.BetaExperiments.registerExperiment({
    id: "color",
    name: "Color",
    category: "COLOR",
    description: "Background, foreground, invert, mono",
    launch: function (container) {
      var bgField = document.createElement("div");
      bgField.className = "beta-field";
      var bgLabel = document.createElement("div");
      bgLabel.className = "beta-field-label";
      bgLabel.textContent = "Background";
      var bgInput = document.createElement("input");
      bgInput.type = "color";
      bgInput.value = DEFAULT_BG;
      bgField.appendChild(bgLabel);
      bgField.appendChild(bgInput);
      container.appendChild(bgField);

      var fgField = document.createElement("div");
      fgField.className = "beta-field";
      var fgLabel = document.createElement("div");
      fgLabel.className = "beta-field-label";
      fgLabel.textContent = "Foreground";
      var fgInput = document.createElement("input");
      fgInput.type = "color";
      fgInput.value = DEFAULT_FG;
      fgField.appendChild(fgLabel);
      fgField.appendChild(fgInput);
      container.appendChild(fgField);

      bgInput.addEventListener("input", function () {
        root.style.setProperty("--beta-bg", bgInput.value);
      });
      fgInput.addEventListener("input", function () {
        root.style.setProperty("--beta-fg", fgInput.value);
      });

      window.BetaControls.toggleButton(container, { label: "Invert page", onToggle: invert });
      window.BetaControls.toggleButton(container, {
        label: "Monochrome",
        onToggle: function () { root.classList.toggle("beta-mono"); },
      });

      container._betaInputs = { bgInput: bgInput, fgInput: fgInput };

      return function cleanup() {};
    },
    randomize: function (container) {
      var refs = container._betaInputs;
      if (!refs) return;
      function rand() {
        return "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
      }
      refs.bgInput.value = rand();
      refs.bgInput.dispatchEvent(new Event("input"));
      refs.fgInput.value = rand();
      refs.fgInput.dispatchEvent(new Event("input"));
    },
    reset: function (container) {
      root.style.removeProperty("--beta-bg");
      root.style.removeProperty("--beta-fg");
      root.classList.remove("beta-invert", "beta-mono");
      var refs = container._betaInputs;
      if (refs) {
        refs.bgInput.value = DEFAULT_BG;
        refs.fgInput.value = DEFAULT_FG;
      }
    },
  });
})();
