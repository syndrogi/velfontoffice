/**
 * BETA OFFICE experiment — Distortion
 * Skew + 3D perspective tilt applied to <main> (the sphere + control
 * area — never the window layer, so the controls themselves stay
 * usable), plus a repeating page-shake toggle with an intensity
 * control (--beta-shake-amount, read by the .beta-shake keyframe).
 */
(function () {
  if (!window.BetaExperiments) return;

  var main = document.querySelector("main");
  var body = document.body;

  window.BetaExperiments.registerExperiment({
    id: "distortion",
    name: "Distortion",
    category: "DISTORTION",
    description: "Skew, perspective tilt, shake",
    launch: function (container) {
      var state = { skew: 0, tilt: 0, shakeAmount: 1, shakeTimer: null };

      function applyTransform() {
        if (!main) return;
        main.style.transform = "perspective(900px) rotateX(" + state.tilt + "deg) skewX(" + state.skew + "deg)";
      }

      var skewInput = window.BetaControls.slider(container, {
        label: "Skew", min: -30, max: 30, step: 1, value: state.skew, unit: "°",
        onInput: function (v) { state.skew = v; applyTransform(); },
      });
      var tiltInput = window.BetaControls.slider(container, {
        label: "Perspective tilt", min: -40, max: 40, step: 1, value: state.tilt, unit: "°",
        onInput: function (v) { state.tilt = v; applyTransform(); },
      });
      var intensityInput = window.BetaControls.slider(container, {
        label: "Shake intensity", min: 0.5, max: 3, step: 0.25, value: state.shakeAmount,
        onInput: function (v) {
          state.shakeAmount = v;
          document.documentElement.style.setProperty("--beta-shake-amount", String(v));
        },
      });

      function triggerShake() {
        body.classList.remove("beta-shake");
        void body.offsetWidth;
        body.classList.add("beta-shake");
      }

      window.BetaControls.toggleButton(container, {
        label: "Shake",
        onToggle: function (active) {
          if (active) {
            triggerShake();
            state.shakeTimer = window.setInterval(triggerShake, 900);
          } else {
            window.clearInterval(state.shakeTimer);
            state.shakeTimer = null;
          }
        },
      });

      container._betaInputs = { skewInput: skewInput, tiltInput: tiltInput, intensityInput: intensityInput };
      container._betaState = state;

      return function cleanup() {
        window.clearInterval(state.shakeTimer);
        body.classList.remove("beta-shake");
        if (main) main.style.transform = "";
        document.documentElement.style.removeProperty("--beta-shake-amount");
      };
    },
    randomize: function (container) {
      var refs = container._betaInputs;
      if (!refs) return;
      refs.skewInput.value = String(Math.round((Math.random() - 0.5) * 40));
      refs.skewInput.dispatchEvent(new Event("input"));
      refs.tiltInput.value = String(Math.round((Math.random() - 0.5) * 50));
      refs.tiltInput.dispatchEvent(new Event("input"));
    },
    reset: function (container) {
      var refs = container._betaInputs;
      if (!refs) return;
      refs.skewInput.value = "0";
      refs.skewInput.dispatchEvent(new Event("input"));
      refs.tiltInput.value = "0";
      refs.tiltInput.dispatchEvent(new Event("input"));
      refs.intensityInput.value = "1";
      refs.intensityInput.dispatchEvent(new Event("input"));
    },
  });
})();
