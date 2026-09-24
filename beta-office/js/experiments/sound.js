/**
 * BETA OFFICE experiment — Sound
 * One shared, lazily-created AudioContext (reused across re-opens of
 * this window rather than a new one each time) driving a short
 * oscillator beep on click, and optionally on hover, at a controllable
 * frequency/volume.
 */
(function () {
  if (!window.BetaExperiments) return;

  var ctx = null;
  function getCtx() {
    if (!ctx) {
      var AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;
      ctx = new AudioCtor();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function beep(freq, volume) {
    var audio = getCtx();
    if (!audio) return;
    var osc = audio.createOscillator();
    var gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.13);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.14);
  }

  window.BetaExperiments.registerExperiment({
    id: "sound",
    name: "Sound",
    category: "SOUND",
    description: "Oscillator beep, freq/volume",
    launch: function (container) {
      var state = { freq: 440, volume: 0.15, hoverOn: false };

      var freqInput = window.BetaControls.slider(container, {
        label: "Frequency", min: 80, max: 2000, step: 10, value: state.freq, unit: "Hz",
        onInput: function (v) { state.freq = v; },
      });
      var volInput = window.BetaControls.slider(container, {
        label: "Volume", min: 0, max: 1, step: 0.05, value: state.volume,
        onInput: function (v) { state.volume = v; },
      });

      var testBtn = window.BetaControls.miniBtn(container, "Test tone", function () {
        beep(state.freq, state.volume);
      });
      testBtn.addEventListener("pointerenter", function () {
        if (state.hoverOn) beep(state.freq, state.volume * 0.6);
      });

      window.BetaControls.toggleButton(container, {
        label: "Beep on hover",
        onToggle: function (v) { state.hoverOn = v; },
      });

      container._betaInputs = { freqInput: freqInput, volInput: volInput };
      container._betaState = state;

      return function cleanup() {};
    },
    randomize: function (container) {
      var refs = container._betaInputs;
      if (!refs) return;
      refs.freqInput.value = String(120 + Math.round(Math.random() * 1600));
      refs.freqInput.dispatchEvent(new Event("input"));
      refs.volInput.value = String((Math.random() * 0.4 + 0.05).toFixed(2));
      refs.volInput.dispatchEvent(new Event("input"));
    },
    reset: function (container) {
      var refs = container._betaInputs;
      if (!refs) return;
      refs.freqInput.value = "440";
      refs.freqInput.dispatchEvent(new Event("input"));
      refs.volInput.value = "0.15";
      refs.volInput.dispatchEvent(new Event("input"));
    },
  });
})();
