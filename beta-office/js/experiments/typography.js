/**
 * BETA OFFICE experiment — Typography
 * Live font-size / letter-spacing / line-height / scramble controls
 * bound directly to one shared sample line.
 */
(function () {
  if (!window.BetaExperiments) return;

  var SAMPLE = "Velfont Office — an incomplete documentation.";
  var SCRAMBLE_CHARS = ["%", "/", "?", "$", "#", "&", "*", "+", "=", "@", "~", "^"];

  function scrambleText(text) {
    var out = "";
    for (var i = 0; i < text.length; i++) {
      out += /\s/.test(text[i]) ? text[i] : SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
    }
    return out;
  }

  window.BetaExperiments.registerExperiment({
    id: "typography",
    name: "Typography",
    category: "TYPOGRAPHY",
    description: "Size, spacing, line-height, scramble",
    launch: function (container) {
      var sample = window.BetaControls.sampleText(container, SAMPLE);
      var state = { size: 26, spacing: 0, lineHeight: 1.3, timer: null };

      function apply() {
        sample.style.fontSize = state.size + "px";
        sample.style.letterSpacing = state.spacing + "px";
        sample.style.lineHeight = String(state.lineHeight);
      }
      apply();

      var sizeInput = window.BetaControls.slider(container, {
        label: "Font size", min: 12, max: 96, step: 1, value: state.size, unit: "px",
        onInput: function (v) { state.size = v; apply(); },
      });
      var spacingInput = window.BetaControls.slider(container, {
        label: "Letter spacing", min: -2, max: 16, step: 0.5, value: state.spacing, unit: "px",
        onInput: function (v) { state.spacing = v; apply(); },
      });
      var lineHeightInput = window.BetaControls.slider(container, {
        label: "Line height", min: 0.8, max: 2.4, step: 0.1, value: state.lineHeight,
        onInput: function (v) { state.lineHeight = v; apply(); },
      });
      window.BetaControls.toggleButton(container, {
        label: "Scramble",
        onToggle: function (active) {
          if (active) {
            state.timer = window.setInterval(function () {
              sample.textContent = scrambleText(SAMPLE);
            }, 70);
          } else {
            window.clearInterval(state.timer);
            state.timer = null;
            sample.textContent = SAMPLE;
          }
        },
      });

      container._betaInputs = { sizeInput: sizeInput, spacingInput: spacingInput, lineHeightInput: lineHeightInput };
      container._betaState = state;

      return function cleanup() {
        window.clearInterval(state.timer);
      };
    },
    randomize: function (container) {
      var refs = container._betaInputs;
      if (!refs) return;
      refs.sizeInput.value = String(18 + Math.round(Math.random() * 60));
      refs.sizeInput.dispatchEvent(new Event("input"));
      refs.spacingInput.value = String((Math.random() * 10 - 2).toFixed(1));
      refs.spacingInput.dispatchEvent(new Event("input"));
      refs.lineHeightInput.value = String((1 + Math.random() * 1.2).toFixed(1));
      refs.lineHeightInput.dispatchEvent(new Event("input"));
    },
    reset: function (container) {
      var refs = container._betaInputs;
      if (!refs) return;
      refs.sizeInput.value = "26";
      refs.sizeInput.dispatchEvent(new Event("input"));
      refs.spacingInput.value = "0";
      refs.spacingInput.dispatchEvent(new Event("input"));
      refs.lineHeightInput.value = "1.3";
      refs.lineHeightInput.dispatchEvent(new Event("input"));
    },
  });
})();
