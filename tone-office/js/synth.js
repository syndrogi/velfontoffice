/**
 * TONE OFFICE — Synth
 * A simple subtractive voice (oscillator -> lowpass filter -> AR
 * envelope) with one voice per held note, routed through audio-
 * engine.js's shared delay bus.
 *
 * Computer-keyboard performance mode (Ableton's "Computer MIDI
 * Keyboard" is the reference point): keyboardMap below is the single
 * source of truth for which physical key plays which scale degree —
 * semitone offsets from the current octave's C, not absolute notes —
 * so Z/X (octave down/up) just changes what pressNote() resolves an
 * offset to, with nothing else to update. keyByOffset is the reverse
 * of that same map, used only to render KEY-mode labels. Mouse/touch
 * (click, or glide — hold and slide across keys without lifting) and
 * the computer keyboard both funnel through the same pressNote()/
 * releaseNote(), which is what actually calls noteOn()/noteOff() —
 * there's one note-playing path, not two.
 *
 * ARP mode repurposes pressNote()/releaseNote() to only track which
 * notes are held, instead of sounding them immediately — advanceArp()
 * is what actually triggers sound while it's on, called once per
 * sequencer step (wired below, once, at load time).
 */
(function () {
  var NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  // Centralized keyboard map (semitone offset from the current
  // octave's C) — the only place this mapping is defined. keyByOffset
  // is its exact reverse, built once below.
  var keyboardMap = {
    a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6,
    g: 7, y: 8, h: 9, u: 10, j: 11, k: 12,
  };
  var keyByOffset = {};
  Object.keys(keyboardMap).forEach(function (k) {
    keyByOffset[keyboardMap[k]] = k;
  });
  var OFFSET_KIND = { 0: "white", 1: "black", 2: "white", 3: "black", 4: "white", 5: "white", 6: "black", 7: "white", 8: "black", 9: "white", 10: "black", 11: "white", 12: "white" };

  var DEFAULT_OCTAVE = 4;
  var MIN_OCTAVE = 0;
  var MAX_OCTAVE = 8;
  var octave = DEFAULT_OCTAVE;

  function baseMidi() {
    return (octave + 1) * 12;
  }

  function noteNameFor(midi) {
    return NOTE_NAMES[((midi % 12) + 12) % 12];
  }

  function freqFor(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Stable, octave-independent list ai-jam.js's riff generator picks
  // scale degrees from — always the default octave, regardless of
  // whatever octave the live performance keyboard is currently
  // shifted to.
  var BASE_NOTES = [];
  for (var off = 0; off <= 12; off++) {
    var m = (DEFAULT_OCTAVE + 1) * 12 + off;
    BASE_NOTES.push({ midi: m, name: noteNameFor(m), offset: off });
  }

  var VELOCITY_LEVELS = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  var velocityIndex = VELOCITY_LEVELS.length - 1;

  var wave = "sawtooth";
  var cutoff = 2400;
  var attackMs = 8;
  var releaseMs = 220;
  var peakGain = 0.32;

  var activeVoices = {}; // midi -> { osc, filter, gain }
  var midiHoldCount = {}; // midi -> number of identifiers currently holding it
  var pressedByIdentifier = {}; // identifier (computer key, or "mouse-*") -> { midi, offset }
  var arpEnabled = false;
  var arpIndex = 0;
  var keyboardEl = null; // the currently-rendered on-screen keyboard, if open
  var keyLabelMode = "note"; // "note" | "keyboard" — display only, see render()
  var octaveReadoutEl = null;
  var velocityReadoutEl = null;

  function startVoice(midi, isArpGate) {
    if (activeVoices[midi]) return;
    var ctx = window.ToneEngine.init();

    var osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = freqFor(midi);

    var filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    filter.Q.value = 0.8;

    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    var attackSec = Math.max(attackMs / 1000, 0.002);
    gain.gain.linearRampToValueAtTime(peakGain * VELOCITY_LEVELS[velocityIndex], ctx.currentTime + attackSec);

    osc.connect(filter);
    filter.connect(gain);
    window.ToneEngine.connectToBus(gain);
    osc.start();

    activeVoices[midi] = { osc: osc, filter: filter, gain: gain };

    if (isArpGate) {
      var stepSec = window.ToneSequencer ? window.ToneSequencer.stepSeconds() : 0.2;
      window.setTimeout(function () {
        stopVoice(midi);
      }, stepSec * 800);
    }
  }

  function stopVoice(midi) {
    var voice = activeVoices[midi];
    if (!voice) return;
    delete activeVoices[midi];
    var ctx = window.ToneEngine.context();
    var releaseSec = Math.max(releaseMs / 1000, 0.02);
    var now = ctx.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + releaseSec);
    voice.osc.stop(now + releaseSec + 0.02);
  }

  function stopAllVoices() {
    Object.keys(activeVoices).forEach(function (midi) {
      stopVoice(Number(midi));
    });
  }

  // Direct, absolute-pitch API — used by ai-jam.js, and by advanceArp
  // below. Unlike pressNote()/releaseNote(), this never touches
  // on-screen highlighting (the note it plays may not even be in the
  // currently-displayed octave) and ignores ARP mode (arp calls
  // startVoice directly instead).
  function noteOn(midi) {
    midiHoldCount[midi] = (midiHoldCount[midi] || 0) + 1;
    if (midiHoldCount[midi] === 1) startVoice(midi, false);
  }

  function noteOff(midi) {
    midiHoldCount[midi] = (midiHoldCount[midi] || 1) - 1;
    if (midiHoldCount[midi] <= 0) {
      delete midiHoldCount[midi];
      stopVoice(midi);
    }
  }

  function findKeyEl(offset) {
    return keyboardEl ? keyboardEl.querySelector('.tone-key[data-offset="' + offset + '"]') : null;
  }

  function setPressedVisual(offset, pressed) {
    var el = findKeyEl(offset);
    if (el) el.classList.toggle("tone-is-pressed", pressed);
  }

  function offsetStillHeld(offset) {
    return Object.keys(pressedByIdentifier).some(function (id) {
      return pressedByIdentifier[id].offset === offset;
    });
  }

  // The one path both mouse/touch and the computer keyboard call —
  // see the module comment. `identifier` is whatever uniquely names
  // this physical press (a computer-key letter, or a "mouse-*" token)
  // so chords and simultaneous mouse+keyboard on the same key resolve
  // correctly on release.
  function pressNote(identifier, offset) {
    if (pressedByIdentifier[identifier]) return;
    var midi = baseMidi() + offset;
    pressedByIdentifier[identifier] = { midi: midi, offset: offset };
    setPressedVisual(offset, true);
    if (!arpEnabled) noteOn(midi);
  }

  function releaseNote(identifier) {
    var press = pressedByIdentifier[identifier];
    if (!press) return;
    delete pressedByIdentifier[identifier];
    if (!offsetStillHeld(press.offset)) setPressedVisual(press.offset, false);
    if (!arpEnabled) noteOff(press.midi);
  }

  function heldMidiList() {
    var seen = [];
    Object.keys(pressedByIdentifier).forEach(function (id) {
      var midi = pressedByIdentifier[id].midi;
      if (seen.indexOf(midi) === -1) seen.push(midi);
    });
    return seen;
  }

  function advanceArp() {
    if (!arpEnabled) return;
    var held = heldMidiList();
    if (!held.length) return;
    stopAllVoices();
    var midi = held[arpIndex % held.length];
    arpIndex++;
    startVoice(midi, true);
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
    midiHoldCount = {};
    if (!arpEnabled) {
      // Resume normal sustain for whatever's still physically held,
      // so switching ARP off mid-chord doesn't leave it silent.
      Object.keys(pressedByIdentifier).forEach(function (id) {
        noteOn(pressedByIdentifier[id].midi);
      });
    }
  }

  function setWave(value) {
    wave = value;
  }

  function setCutoff(hz) {
    cutoff = hz;
    var ctx = window.ToneEngine.context();
    if (!ctx) return;
    Object.keys(activeVoices).forEach(function (midi) {
      activeVoices[midi].filter.frequency.setTargetAtTime(hz, ctx.currentTime, 0.01);
    });
  }

  function setAttack(ms) {
    attackMs = ms;
  }

  function setRelease(ms) {
    releaseMs = ms;
  }

  function setOctave(value) {
    octave = Math.max(MIN_OCTAVE, Math.min(MAX_OCTAVE, value));
    if (octaveReadoutEl) octaveReadoutEl.textContent = "OCT " + octave;
  }

  function setVelocity(index) {
    velocityIndex = Math.max(0, Math.min(VELOCITY_LEVELS.length - 1, index));
    if (velocityReadoutEl) velocityReadoutEl.textContent = "VEL " + (velocityIndex + 1) + "/" + VELOCITY_LEVELS.length;
  }

  /* ---------- Computer keyboard — registered once, works globally ---------- */

  function isTypingTarget(el) {
    var tag = el.tagName;
    return tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || el.isContentEditable;
  }

  document.addEventListener("keydown", function (e) {
    if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    var k = e.key.toLowerCase();
    if (k === "z") {
      setOctave(octave - 1);
      return;
    }
    if (k === "x") {
      setOctave(octave + 1);
      return;
    }
    if (k === "c") {
      setVelocity(velocityIndex - 1);
      return;
    }
    if (k === "v") {
      setVelocity(velocityIndex + 1);
      return;
    }
    var offset = keyboardMap[k];
    if (offset === undefined) return;
    window.ToneEngine.init();
    pressNote(k, offset);
  });

  document.addEventListener("keyup", function (e) {
    var k = e.key.toLowerCase();
    if (keyboardMap[k] === undefined) return;
    releaseNote(k);
  });

  /* ---------- On-screen keyboard — click/tap, and glide across keys ---------- */

  var glideActive = false;
  var glidePointerId = null;
  var glideOffset = null;
  var GLIDE_ID = "mouse-glide";

  function keyAtPoint(x, y) {
    var el = document.elementFromPoint(x, y);
    return el ? el.closest(".tone-key") : null;
  }

  document.addEventListener("pointermove", function (e) {
    if (!glideActive || e.pointerId !== glidePointerId) return;
    var el = keyAtPoint(e.clientX, e.clientY);
    var newOffset = el ? Number(el.dataset.offset) : null;
    if (newOffset === glideOffset) return;
    if (glideOffset !== null) releaseNote(GLIDE_ID);
    glideOffset = newOffset;
    if (glideOffset !== null) pressNote(GLIDE_ID, glideOffset);
  });

  function endGlide(e) {
    if (!glideActive || e.pointerId !== glidePointerId) return;
    glideActive = false;
    if (glideOffset !== null) releaseNote(GLIDE_ID);
    glideOffset = null;
  }
  document.addEventListener("pointerup", endGlide);
  document.addEventListener("pointercancel", endGlide);

  /* ---------- Rendering ---------- */

  function keyLabelFor(offset) {
    if (keyLabelMode === "keyboard") return keyByOffset[offset].toUpperCase();
    return BASE_NOTES[offset].name;
  }

  function renderLabels() {
    if (!keyboardEl) return;
    keyboardEl.querySelectorAll(".tone-key").forEach(function (el) {
      el.querySelector(".tone-key-label").textContent = keyLabelFor(Number(el.dataset.offset));
    });
  }

  function setKeyLabelMode(mode) {
    keyLabelMode = mode === "keyboard" ? "keyboard" : "note";
    renderLabels();
  }

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

    // Display toggle — labels only, never touches sound/pitch/mapping.
    var displayField = document.createElement("div");
    displayField.className = "tone-field";
    var displayLabel = document.createElement("label");
    displayLabel.textContent = "DISPLAY";
    var segmented = document.createElement("div");
    segmented.className = "tone-segmented";
    var noteBtn = document.createElement("button");
    noteBtn.type = "button";
    noteBtn.className = "tone-segmented-btn";
    noteBtn.textContent = "NOTE";
    var keyBtn = document.createElement("button");
    keyBtn.type = "button";
    keyBtn.className = "tone-segmented-btn";
    keyBtn.textContent = "KEY";
    function syncDisplayButtons() {
      noteBtn.classList.toggle("tone-is-active", keyLabelMode === "note");
      keyBtn.classList.toggle("tone-is-active", keyLabelMode === "keyboard");
    }
    syncDisplayButtons();
    noteBtn.addEventListener("click", function () {
      setKeyLabelMode("note");
      syncDisplayButtons();
    });
    keyBtn.addEventListener("click", function () {
      setKeyLabelMode("keyboard");
      syncDisplayButtons();
    });
    segmented.appendChild(noteBtn);
    segmented.appendChild(keyBtn);
    displayField.appendChild(displayLabel);
    displayField.appendChild(segmented);

    controls.appendChild(waveField);
    controls.appendChild(cutoffField);
    controls.appendChild(attackField);
    controls.appendChild(releaseField);
    controls.appendChild(arpBtn);
    controls.appendChild(displayField);
    container.appendChild(controls);

    keyboardEl = document.createElement("div");
    keyboardEl.className = "tone-keyboard";
    var whiteCount = Object.keys(OFFSET_KIND).filter(function (o) { return OFFSET_KIND[o] === "white"; }).length;

    for (var offset = 0; offset <= 12; offset++) {
      (function (offset) {
        var kind = OFFSET_KIND[offset];
        var key = document.createElement("button");
        key.type = "button";
        key.className = "tone-key tone-key-" + kind;
        key.dataset.offset = String(offset);
        key.setAttribute("aria-label", "Play " + BASE_NOTES[offset].name);

        var label = document.createElement("span");
        label.className = "tone-key-label";
        label.textContent = keyLabelFor(offset);
        key.appendChild(label);

        if (kind === "black") {
          var whiteBefore = 0;
          for (var o2 = 0; o2 < offset; o2++) if (OFFSET_KIND[o2] === "white") whiteBefore++;
          var leftPercent = (whiteBefore / whiteCount) * 100;
          key.style.left = "calc(" + leftPercent + "% - var(--tone-black-key-width) / 2)";
        }

        key.addEventListener("pointerdown", function (e) {
          e.preventDefault();
          window.ToneEngine.init();
          glideActive = true;
          glidePointerId = e.pointerId;
          glideOffset = offset;
          pressNote(GLIDE_ID, offset);
        });

        keyboardEl.appendChild(key);
      })(offset);
    }

    container.appendChild(keyboardEl);

    var status = document.createElement("div");
    status.className = "tone-synth-status";
    octaveReadoutEl = document.createElement("span");
    octaveReadoutEl.textContent = "OCT " + octave;
    velocityReadoutEl = document.createElement("span");
    velocityReadoutEl.textContent = "VEL " + (velocityIndex + 1) + "/" + VELOCITY_LEVELS.length;
    status.appendChild(octaveReadoutEl);
    status.appendChild(velocityReadoutEl);
    container.appendChild(status);

    var hint = document.createElement("p");
    hint.className = "tone-hint";
    hint.textContent = "A–K = PLAY · W/E/T/Y/U = SHARPS · Z/X = OCTAVE · C/V = VELOCITY";
    container.appendChild(hint);

    return function cleanup() {
      if (glideOffset !== null) releaseNote(GLIDE_ID);
      glideActive = false;
      keyboardEl = null;
      octaveReadoutEl = null;
      velocityReadoutEl = null;
    };
  }

  window.ToneSynth = {
    notes: BASE_NOTES,
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
