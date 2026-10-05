/**
 * TONE OFFICE — Synth
 * A simple subtractive voice (oscillator -> lowpass filter -> AR
 * envelope) with up to one voice per held key, routed through
 * audio-engine.js's shared delay bus. Keyboard input comes from either
 * the on-screen keys (app.js builds them from NOTES below) or the
 * computer keyboard, using the same letter each key is already labeled
 * with (A S D F G H J K L for the white keys, W E T Y U for the black
 * ones — the layout GarageBand/Ableton's "musical typing" made
 * familiar).
 *
 * ARP mode re-purposes noteOn/noteOff to only track which keys are
 * held (see heldKeys) — advanceArp(), called once per sequencer step
 * from app.js, is what actually triggers sound while it's on.
 */
(function () {
  // Equal-tempered frequencies, A4 = 440Hz. One octave plus a second,
  // C4-D5 — enough range to actually play a line, small enough to fit
  // one on-screen row.
  var NOTES = [
    { key: "a", name: "C4", freq: 261.6256, kind: "white" },
    { key: "w", name: "C#4", freq: 277.1826, kind: "black" },
    { key: "s", name: "D4", freq: 293.6648, kind: "white" },
    { key: "e", name: "D#4", freq: 311.1270, kind: "black" },
    { key: "d", name: "E4", freq: 329.6276, kind: "white" },
    { key: "f", name: "F4", freq: 349.2282, kind: "white" },
    { key: "t", name: "F#4", freq: 369.9944, kind: "black" },
    { key: "g", name: "G4", freq: 391.9954, kind: "white" },
    { key: "y", name: "G#4", freq: 415.3047, kind: "black" },
    { key: "h", name: "A4", freq: 440.0000, kind: "white" },
    { key: "u", name: "A#4", freq: 466.1638, kind: "black" },
    { key: "j", name: "B4", freq: 493.8833, kind: "white" },
    { key: "k", name: "C5", freq: 523.2511, kind: "white" },
    { key: "l", name: "D5", freq: 587.3295, kind: "white" },
  ];
  var notesByKey = {};
  NOTES.forEach(function (n) {
    notesByKey[n.key] = n;
  });

  var wave = "sawtooth";
  var cutoff = 2400;
  var attackMs = 8;
  var releaseMs = 220;
  var peakGain = 0.32;

  var activeVoices = {}; // key -> { osc, filter, gain }
  var heldKeys = [];
  var arpEnabled = false;
  var arpIndex = 0;

  function startVoice(key, isArpGate) {
    var note = notesByKey[key];
    if (!note || activeVoices[key]) return;
    var ctx = window.ToneEngine.init();

    var osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = note.freq;

    var filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    filter.Q.value = 0.8;

    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    var attackSec = Math.max(attackMs / 1000, 0.002);
    gain.gain.linearRampToValueAtTime(peakGain, ctx.currentTime + attackSec);

    osc.connect(filter);
    filter.connect(gain);
    window.ToneEngine.connectToBus(gain);
    osc.start();

    activeVoices[key] = { osc: osc, filter: filter, gain: gain };

    if (isArpGate) {
      var stepSec = window.ToneSequencer ? window.ToneSequencer.stepSeconds() : 0.2;
      window.setTimeout(function () {
        stopVoice(key);
      }, stepSec * 800);
    }
  }

  function stopVoice(key) {
    var voice = activeVoices[key];
    if (!voice) return;
    delete activeVoices[key];
    var ctx = window.ToneEngine.context();
    var releaseSec = Math.max(releaseMs / 1000, 0.02);
    var now = ctx.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + releaseSec);
    voice.osc.stop(now + releaseSec + 0.02);
  }

  function stopAllVoices() {
    Object.keys(activeVoices).forEach(stopVoice);
  }

  function noteOn(key) {
    if (!notesByKey[key]) return;
    if (heldKeys.indexOf(key) === -1) heldKeys.push(key);
    if (!arpEnabled) startVoice(key, false);
  }

  function noteOff(key) {
    var idx = heldKeys.indexOf(key);
    if (idx !== -1) heldKeys.splice(idx, 1);
    if (!arpEnabled) stopVoice(key);
  }

  function advanceArp() {
    if (!arpEnabled || !heldKeys.length) return;
    stopAllVoices();
    var key = heldKeys[arpIndex % heldKeys.length];
    arpIndex++;
    startVoice(key, true);
  }

  function setArpEnabled(value) {
    arpEnabled = value;
    arpIndex = 0;
    stopAllVoices();
  }

  function setWave(value) {
    wave = value;
  }

  function setCutoff(hz) {
    cutoff = hz;
    var ctx = window.ToneEngine.context();
    if (!ctx) return;
    Object.keys(activeVoices).forEach(function (key) {
      activeVoices[key].filter.frequency.setTargetAtTime(hz, ctx.currentTime, 0.01);
    });
  }

  function setAttack(ms) {
    attackMs = ms;
  }

  function setRelease(ms) {
    releaseMs = ms;
  }

  window.ToneSynth = {
    notes: NOTES,
    noteOn: noteOn,
    noteOff: noteOff,
    advanceArp: advanceArp,
    setArpEnabled: setArpEnabled,
    setWave: setWave,
    setCutoff: setCutoff,
    setAttack: setAttack,
    setRelease: setRelease,
  };
})();
