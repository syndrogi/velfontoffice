/**
 * BETA OFFICE experiment — Metronome
 * BPM slider driving a visual pulse and a short oscillator tick, same
 * lazily-created shared AudioContext approach as Sound/Piano.
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

  function tick() {
    var audio = getCtx();
    if (!audio) return;
    var osc = audio.createOscillator();
    var gain = audio.createGain();
    osc.type = "square";
    osc.frequency.value = 1000;
    gain.gain.setValueAtTime(0.2, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.05);
  }

  window.BetaExperiments.registerExperiment({
    id: "metronome",
    name: "Metronome",
    category: "SOUND",
    number: 61,
    description: "BPM slider, visual + audio tick",
    launch: function (container) {
      var dot = document.createElement("div");
      dot.className = "beta-metronome-dot";
      container.appendChild(dot);

      var state = { bpm: 100, playing: false, timerId: null };

      function pulse() {
        tick();
        dot.classList.remove("beta-is-pulsing");
        void dot.offsetWidth;
        dot.classList.add("beta-is-pulsing");
      }

      function setPlaying(playing) {
        state.playing = playing;
        clearInterval(state.timerId);
        if (playing) state.timerId = setInterval(pulse, 60000 / state.bpm);
      }

      window.BetaControls.slider(container, {
        label: "BPM", min: 40, max: 220, step: 1, value: state.bpm,
        onInput: function (v) {
          state.bpm = v;
          if (state.playing) {
            clearInterval(state.timerId);
            state.timerId = setInterval(pulse, 60000 / state.bpm);
          }
        },
      });
      window.BetaControls.toggleButton(container, { label: "Play", onToggle: setPlaying });

      container._betaState = state;

      return function cleanup() {
        clearInterval(state.timerId);
      };
    },
  });
})();
