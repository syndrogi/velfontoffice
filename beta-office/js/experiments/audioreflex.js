/**
 * BETA OFFICE experiment — Audio Reflex
 * Click Arm, then press Space the instant the beep plays — an auditory
 * variant of Reflex's visual timing test. Pressing too early during the
 * silent wait counts as a false start and cancels the pending beep.
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

  function beep() {
    var audio = getCtx();
    if (!audio) return;
    var osc = audio.createOscillator();
    var gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.25, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.2);
  }

  window.BetaExperiments.registerExperiment({
    id: "audioreflex",
    name: "Audio Reflex",
    category: "SOUND",
    number: 85,
    description: "Click Arm, then press Space the instant you hear the beep",
    launch: function (container) {
      var readout = window.BetaControls.readout(container);
      var state = { phase: "idle", armedAt: 0, timerId: null, best: null, last: null };

      function updateReadout(text) {
        readout.innerHTML = text != null
          ? text
          : "Best: <strong>" + (state.best != null ? state.best + "ms" : "—") + "</strong>  Last: <strong>" + (state.last != null ? state.last + "ms" : "—") + "</strong>";
      }

      function arm() {
        if (state.phase === "armed" || state.phase === "waiting") return;
        state.phase = "waiting";
        updateReadout("Listening...");
        state.timerId = setTimeout(function () {
          beep();
          state.armedAt = performance.now();
          state.phase = "armed";
          updateReadout("Beep! Press Space");
        }, 800 + Math.random() * 1800);
      }

      function onKey(e) {
        if (e.key !== " ") return;
        e.preventDefault();
        if (state.phase === "waiting") {
          clearTimeout(state.timerId);
          state.phase = "idle";
          updateReadout("Too soon — click Arm to retry");
        } else if (state.phase === "armed") {
          state.last = Math.round(performance.now() - state.armedAt);
          if (state.best == null || state.last < state.best) state.best = state.last;
          state.phase = "idle";
          updateReadout();
        }
      }
      document.addEventListener("keydown", onKey);

      window.BetaControls.miniBtn(container, "Arm", arm);
      updateReadout();

      container._betaState = state;

      return function cleanup() {
        clearTimeout(state.timerId);
        document.removeEventListener("keydown", onKey);
      };
    },
  });
})();
