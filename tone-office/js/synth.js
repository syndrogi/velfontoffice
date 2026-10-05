/**
 * TONE OFFICE — Synth
 * A simple subtractive voice (oscillator -> lowpass filter -> AR
 * envelope) with up to one voice per held note, routed through
 * audio-engine.js's shared delay bus. Playable three ways: the on-
 * screen keyboard (click/tap, and — see the pointermove handler below —
 * sliding across keys while still holding down glides from note to
 * note instead of needing a separate press per key), or the computer
 * keyboard (A S D F G H J K L for the white keys, W E T Y U for the
 * black ones — the GarageBand/Ableton "musical typing" layout), which
 * works even while this window is closed or minimized.
 *
 * The on-screen keyboard's range isn't fixed — widen the window and
 * more octaves appear on either side of the computer-keyboard-mapped
 * range (see computeVisibleRange below), narrow it and they drop away
 * again. The computer-keyboard mapping itself always stays pinned to
 * the same C4-D5 anchor regardless of how many extra octaves are
 * currently visible; notes outside that anchor are mouse/touch-only
 * and show their note name instead of a letter.
 *
 * ARP mode re-purposes noteOn/noteOff to only track which notes are
 * held (see heldNotes) — advanceArp() is what actually triggers sound
 * while it's on, called once per sequencer step (wired below, once,
 * at load time).
 */
(function () {
  var NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  var WHITE_PITCH_CLASSES = [0, 2, 4, 5, 7, 9, 11];

  // The anchor range the computer keyboard always maps to — MIDI 60
  // (C4) through 74 (D5), the same one-octave-plus-a-second this
  // module always played before the keyboard could grow. Continuous
  // (no gaps) — every semitone in between, including C#5, gets its
  // own key now; only C#5 has no computer-key letter, same as any
  // other note outside the mapped set below.
  var BASE_LOW_MIDI = 60;
  var BASE_HIGH_MIDI = 74;
  var COMPUTER_KEY_BY_MIDI = {
    60: "a", 61: "w", 62: "s", 63: "e", 64: "d", 65: "f", 66: "t",
    67: "g", 68: "y", 69: "h", 70: "u", 71: "j", 72: "k", 74: "l",
  };
  var MIDI_BY_COMPUTER_KEY = {};
  Object.keys(COMPUTER_KEY_BY_MIDI).forEach(function (midi) {
    MIDI_BY_COMPUTER_KEY[COMPUTER_KEY_BY_MIDI[midi]] = Number(midi);
  });

  // How far the keyboard can grow in either direction — 3 octaves
  // below middle C to 3 above, plenty for a very wide window without
  // generating an unplayably long row.
  var MIN_MIDI = BASE_LOW_MIDI - 36;
  var MAX_MIDI = BASE_HIGH_MIDI + 36;
  // Matches the width the base 9-key range already rendered at before
  // the keyboard could grow (flex:1 over ~450px of default window
  // content) — so the default window size still shows exactly the
  // base range, and only actually widening it adds more.
  var MIN_WHITE_KEY_WIDTH = 48;

  function isWhiteMidi(midi) {
    return WHITE_PITCH_CLASSES.indexOf(((midi % 12) + 12) % 12) !== -1;
  }

  function noteNameFor(midi) {
    return NOTE_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
  }

  function freqFor(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function noteFor(midi) {
    return {
      id: String(midi),
      midi: midi,
      key: COMPUTER_KEY_BY_MIDI[midi] || null,
      name: noteNameFor(midi),
      freq: freqFor(midi),
      kind: isWhiteMidi(midi) ? "white" : "black",
    };
  }

  // Stable base range, independent of whatever the on-screen keyboard
  // currently shows — what ai-jam.js's riff generator plays from.
  var BASE_NOTES = [];
  for (var m = BASE_LOW_MIDI; m <= BASE_HIGH_MIDI; m++) BASE_NOTES.push(noteFor(m));

  var wave = "sawtooth";
  var cutoff = 2400;
  var attackMs = 8;
  var releaseMs = 220;
  var peakGain = 0.32;

  var activeVoices = {}; // note id -> { osc, filter, gain }
  var heldNotes = [];
  var arpEnabled = false;
  var arpIndex = 0;
  var keyboardEl = null; // the currently-rendered on-screen keyboard, if open
  var notesById = {}; // only the currently-visible range — rebuilt on resize

  function startVoice(id, isArpGate) {
    var note = notesById[id];
    if (!note || activeVoices[id]) return;
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

    activeVoices[id] = { osc: osc, filter: filter, gain: gain };

    if (isArpGate) {
      var stepSec = window.ToneSequencer ? window.ToneSequencer.stepSeconds() : 0.2;
      window.setTimeout(function () {
        stopVoice(id);
      }, stepSec * 800);
    }
  }

  function stopVoice(id) {
    var voice = activeVoices[id];
    if (!voice) return;
    delete activeVoices[id];
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

  function findKeyEl(id) {
    return keyboardEl ? keyboardEl.querySelector('.tone-key[data-key="' + id + '"]') : null;
  }

  function setPressedVisual(id, pressed) {
    var el = findKeyEl(id);
    if (el) el.classList.toggle("tone-is-pressed", pressed);
  }

  function noteOn(id) {
    if (!notesById[id]) return;
    if (heldNotes.indexOf(id) === -1) heldNotes.push(id);
    setPressedVisual(id, true);
    if (!arpEnabled) startVoice(id, false);
  }

  function noteOff(id) {
    var idx = heldNotes.indexOf(id);
    if (idx !== -1) heldNotes.splice(idx, 1);
    setPressedVisual(id, false);
    if (!arpEnabled) stopVoice(id);
  }

  function releaseAllHeld() {
    heldNotes.slice().forEach(noteOff);
  }

  function advanceArp() {
    if (!arpEnabled || !heldNotes.length) return;
    stopAllVoices();
    var id = heldNotes[arpIndex % heldNotes.length];
    arpIndex++;
    startVoice(id, true);
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
    Object.keys(activeVoices).forEach(function (id) {
      activeVoices[id].filter.frequency.setTargetAtTime(hz, ctx.currentTime, 0.01);
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
    var midi = MIDI_BY_COMPUTER_KEY[k];
    if (midi == null || heldComputerKeys[k]) return;
    heldComputerKeys[k] = true;
    noteOn(String(midi));
  });

  document.addEventListener("keyup", function (e) {
    var k = e.key.toLowerCase();
    if (!heldComputerKeys[k]) return;
    delete heldComputerKeys[k];
    noteOff(String(MIDI_BY_COMPUTER_KEY[k]));
  });

  /* ---------- On-screen keyboard — click/tap, and glide across keys ---------- */

  var glideActive = false;
  var glidePointerId = null;
  var glideId = null;

  function keyAtPoint(x, y) {
    var el = document.elementFromPoint(x, y);
    return el ? el.closest(".tone-key") : null;
  }

  document.addEventListener("pointermove", function (e) {
    if (!glideActive || e.pointerId !== glidePointerId) return;
    var el = keyAtPoint(e.clientX, e.clientY);
    var newId = el ? el.dataset.key : null;
    if (newId === glideId) return;
    if (glideId) noteOff(glideId);
    glideId = newId;
    if (glideId) noteOn(glideId);
  });

  function endGlide(e) {
    if (!glideActive || e.pointerId !== glidePointerId) return;
    glideActive = false;
    if (glideId) noteOff(glideId);
    glideId = null;
  }
  document.addEventListener("pointerup", endGlide);
  document.addEventListener("pointercancel", endGlide);

  /* ---------- Width-dependent range ---------- */

  function fullWhiteMidiList() {
    var list = [];
    for (var midi = MIN_MIDI; midi <= MAX_MIDI; midi++) {
      if (isWhiteMidi(midi)) list.push(midi);
    }
    return list;
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  // Centers the widened range on the computer-key-mapped anchor
  // (BASE_LOW_MIDI-BASE_HIGH_MIDI) so that range is always present —
  // extra width adds whole octaves on both sides, up to MIN_MIDI/
  // MAX_MIDI.
  function computeVisibleRange(containerWidth) {
    var whiteList = fullWhiteMidiList();
    var baseStartIdx = whiteList.indexOf(BASE_LOW_MIDI);
    var baseEndIdx = whiteList.indexOf(BASE_HIGH_MIDI);
    var baseCount = baseEndIdx - baseStartIdx + 1;

    var visibleCount = clamp(Math.floor(containerWidth / MIN_WHITE_KEY_WIDTH), baseCount, whiteList.length);
    var extra = visibleCount - baseCount;
    var before = Math.floor(extra / 2);
    var startIdx = clamp(baseStartIdx - before, 0, whiteList.length - visibleCount);
    var endIdx = startIdx + visibleCount - 1;

    return { lowMidi: whiteList[startIdx], highMidi: whiteList[endIdx] };
  }

  var lastRange = null;

  function renderKeyboard(containerWidth) {
    if (!keyboardEl) return;
    var range = computeVisibleRange(containerWidth);
    if (lastRange && lastRange.lowMidi === range.lowMidi && lastRange.highMidi === range.highMidi) return;
    lastRange = range;

    releaseAllHeld();
    stopAllVoices();

    var notes = [];
    for (var midi = range.lowMidi; midi <= range.highMidi; midi++) notes.push(noteFor(midi));
    notesById = {};
    notes.forEach(function (n) {
      notesById[n.id] = n;
    });

    var whiteNotes = notes.filter(function (n) { return n.kind === "white"; });

    keyboardEl.innerHTML = "";
    notes.forEach(function (note) {
      var key = document.createElement("button");
      key.type = "button";
      key.className = "tone-key tone-key-" + note.kind;
      key.dataset.key = note.id;
      key.setAttribute("aria-label", "Play " + note.name);

      var label = document.createElement("span");
      label.className = "tone-key-label";
      label.textContent = note.key ? note.key.toUpperCase() : note.name;
      key.appendChild(label);

      if (note.kind === "black") {
        var whiteBefore = notes.slice(0, notes.indexOf(note)).filter(function (n) { return n.kind === "white"; }).length;
        var leftPercent = (whiteBefore / whiteNotes.length) * 100;
        key.style.left = "calc(" + leftPercent + "% - var(--tone-black-key-width) / 2)";
      }

      key.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        window.ToneEngine.init();
        glideActive = true;
        glidePointerId = e.pointerId;
        glideId = note.id;
        noteOn(note.id);
      });

      keyboardEl.appendChild(key);
    });
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

    controls.appendChild(waveField);
    controls.appendChild(cutoffField);
    controls.appendChild(attackField);
    controls.appendChild(releaseField);
    controls.appendChild(arpBtn);

    keyboardEl = document.createElement("div");
    keyboardEl.className = "tone-keyboard";

    container.appendChild(controls);
    container.appendChild(keyboardEl);

    lastRange = null;
    renderKeyboard(container.clientWidth);

    var resizeObserver = null;
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(function (entries) {
        renderKeyboard(entries[0].contentRect.width);
      });
      resizeObserver.observe(container);
    }

    return function cleanup() {
      if (resizeObserver) resizeObserver.disconnect();
      if (glideId) noteOff(glideId);
      glideActive = false;
      keyboardEl = null;
      notesById = {};
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
