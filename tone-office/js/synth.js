/**
 * TONE OFFICE — Synth
 * A simple subtractive voice (oscillator -> lowpass filter -> AR
 * envelope) with up to one voice per held key, routed through
 * audio-engine.js's shared delay bus. Playable three ways: the on-
 * screen keyboard (click/tap, and — see the pointermove handler below —
 * sliding across keys while still holding down glides from note to
 * note instead of needing a separate press per key), or the computer
 * keyboard (A S D F G H J K L for the white keys, W E T Y U for the
 * black ones — the GarageBand/Ableton "musical typing" layout), which
 * works even while this window is closed or minimized.
 *
 * ARP mode re-purposes noteOn/noteOff to only track which keys are
 * held (see heldKeys) — advanceArp() is what actually triggers sound
 * while it's on, called once per sequencer step (wired below, once,
 * at load time).
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
  var keyboardEl = null; // the currently-rendered on-screen keyboard, if open

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

  function findKeyEl(key) {
    return keyboardEl ? keyboardEl.querySelector('.tone-key[data-key="' + key + '"]') : null;
  }

  function setPressedVisual(key, pressed) {
    var el = findKeyEl(key);
    if (el) el.classList.toggle("tone-is-pressed", pressed);
  }

  function noteOn(key) {
    if (!notesByKey[key]) return;
    if (heldKeys.indexOf(key) === -1) heldKeys.push(key);
    setPressedVisual(key, true);
    if (!arpEnabled) startVoice(key, false);
  }

  function noteOff(key) {
    var idx = heldKeys.indexOf(key);
    if (idx !== -1) heldKeys.splice(idx, 1);
    setPressedVisual(key, false);
    if (!arpEnabled) stopVoice(key);
  }

  function advanceArp() {
    if (!arpEnabled || !heldKeys.length) return;
    stopAllVoices();
    var key = heldKeys[arpIndex % heldKeys.length];
    arpIndex++;
    startVoice(key, true);
  }

  // Locks the arp to the same 16th-note grid the sequencer runs on —
  // registered once; harmless (and inexpensive) to keep listening even
  // while this window is closed, since arpEnabled just stays false
  // until someone opens it and turns ARP on.
  if (window.ToneSequencer) {
    window.ToneSequencer.onStep(function (stepIndex) {
      if (stepIndex !== -1) advanceArp();
    });
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

  /* ---------- Computer keyboard — registered once, works globally ---------- */

  var heldComputerKeys = {};
  function isTypingTarget(el) {
    var tag = el.tagName;
    return tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";
  }

  document.addEventListener("keydown", function (e) {
    if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    var k = e.key.toLowerCase();
    if (!notesByKey[k] || heldComputerKeys[k]) return;
    heldComputerKeys[k] = true;
    noteOn(k);
  });

  document.addEventListener("keyup", function (e) {
    var k = e.key.toLowerCase();
    if (!heldComputerKeys[k]) return;
    delete heldComputerKeys[k];
    noteOff(k);
  });

  /* ---------- On-screen keyboard — click/tap, and glide across keys ---------- */

  var glideActive = false;
  var glidePointerId = null;
  var glideKey = null;

  function keyAtPoint(x, y) {
    var el = document.elementFromPoint(x, y);
    return el ? el.closest(".tone-key") : null;
  }

  document.addEventListener("pointermove", function (e) {
    if (!glideActive || e.pointerId !== glidePointerId) return;
    var el = keyAtPoint(e.clientX, e.clientY);
    var newKey = el ? el.dataset.key : null;
    if (newKey === glideKey) return;
    if (glideKey) noteOff(glideKey);
    glideKey = newKey;
    if (glideKey) noteOn(glideKey);
  });

  function endGlide(e) {
    if (!glideActive || e.pointerId !== glidePointerId) return;
    glideActive = false;
    if (glideKey) noteOff(glideKey);
    glideKey = null;
  }
  document.addEventListener("pointerup", endGlide);
  document.addEventListener("pointercancel", endGlide);

  function buildWindow(container) {
    var controls = document.createElement("div");
    controls.className = "tone-synth-controls";

    var waveField = document.createElement("div");
    waveField.className = "tone-field";
    var waveLabel = document.createElement("label");
    waveLabel.textContent = "WAVE";
    var waveSelect = document.createElement("select");
    waveSelect.className = "tone-select";
    ["sawtooth", "square", "triangle", "sine"].forEach(function (type) {
      var opt = document.createElement("option");
      opt.value = type;
      opt.textContent = type === "sawtooth" ? "SAW" : type.toUpperCase();
      if (type === wave) opt.selected = true;
      waveSelect.appendChild(opt);
    });
    waveSelect.addEventListener("change", function () {
      setWave(waveSelect.value);
    });
    waveField.appendChild(waveLabel);
    waveField.appendChild(waveSelect);

    function sliderField(labelText, min, max, value, onInput) {
      var field = document.createElement("div");
      field.className = "tone-field";
      var label = document.createElement("label");
      label.textContent = labelText;
      var input = document.createElement("input");
      input.type = "range";
      input.min = String(min);
      input.max = String(max);
      input.value = String(value);
      input.addEventListener("input", function () {
        onInput(Number(input.value));
      });
      field.appendChild(label);
      field.appendChild(input);
      return field;
    }

    var cutoffField = sliderField("CUTOFF", 200, 8000, cutoff, setCutoff);
    var attackField = sliderField("ATTACK", 0, 500, attackMs, setAttack);
    var releaseField = sliderField("RELEASE", 20, 1500, releaseMs, setRelease);

    var arpBtn = document.createElement("button");
    arpBtn.type = "button";
    arpBtn.className = "tone-toggle-btn";
    arpBtn.textContent = "ARP";
    arpBtn.setAttribute("aria-pressed", String(arpEnabled));
    arpBtn.classList.toggle("tone-is-active", arpEnabled);
    arpBtn.addEventListener("click", function () {
      var enabled = !arpBtn.classList.contains("tone-is-active");
      arpBtn.classList.toggle("tone-is-active", enabled);
      arpBtn.setAttribute("aria-pressed", String(enabled));
      setArpEnabled(enabled);
    });

    controls.appendChild(waveField);
    controls.appendChild(cutoffField);
    controls.appendChild(attackField);
    controls.appendChild(releaseField);
    controls.appendChild(arpBtn);

    keyboardEl = document.createElement("div");
    keyboardEl.className = "tone-keyboard";
    var whiteNotes = NOTES.filter(function (n) { return n.kind === "white"; });

    NOTES.forEach(function (note) {
      var key = document.createElement("button");
      key.type = "button";
      key.className = "tone-key tone-key-" + note.kind;
      key.dataset.key = note.key;
      key.setAttribute("aria-label", "Play " + note.name);

      var label = document.createElement("span");
      label.className = "tone-key-label";
      label.textContent = note.key.toUpperCase();
      key.appendChild(label);

      if (note.kind === "black") {
        var whiteBefore = NOTES.slice(0, NOTES.indexOf(note)).filter(function (n) { return n.kind === "white"; }).length;
        var leftPercent = (whiteBefore / whiteNotes.length) * 100;
        key.style.left = "calc(" + leftPercent + "% - var(--tone-black-key-width) / 2)";
      }

      key.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        window.ToneEngine.init();
        glideActive = true;
        glidePointerId = e.pointerId;
        glideKey = note.key;
        noteOn(note.key);
      });

      keyboardEl.appendChild(key);
    });

    container.appendChild(controls);
    container.appendChild(keyboardEl);

    return function cleanup() {
      if (glideKey) noteOff(glideKey);
      glideActive = false;
      keyboardEl = null;
    };
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
    buildWindow: buildWindow,
  };
})();
