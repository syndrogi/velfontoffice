/**
 * MIDI OFFICE — EP-133 Workstation — Keys Mode
 * The EP-133's "Keys" performance mode: instead of 12 pads triggering
 * 12 different sounds, all 12 pads play ONE sound (the "source pad",
 * same selectedPad concept ui.js tracks for sound-editor.js) at
 * different pitches, mapped across a chosen scale.
 *
 * This module never builds AudioNodes itself — every note goes
 * through window.WorkstationSampler.triggerNote(), the one place
 * "how does a sound actually play" lives (see sampler.js). Passing
 * the *source* pad index (not the physical key pressed) as the
 * padIndex argument to triggerNote() is deliberate: it's also the key
 * sampler.js's own legato voice-stealing groups by, so a "legato"
 * sound naturally cuts its previous note when a new key is pressed
 * here, with zero extra logic in this file. "oneshot"/"key" sounds
 * get independent voices per physical key instead, so chords are
 * fully polyphonic.
 */
(function () {
  var SCALES = {
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    major: [0, 2, 4, 5, 7, 9, 11],
    naturalMinor: [0, 2, 3, 5, 7, 8, 10],
    majorPentatonic: [0, 2, 4, 7, 9],
    minorPentatonic: [0, 3, 5, 7, 10],
    blues: [0, 3, 5, 6, 7, 10],
  };

  var SCALE_OPTIONS = [
    { id: "chromatic", label: "CHROMATIC" },
    { id: "major", label: "MAJOR" },
    { id: "naturalMinor", label: "NATURAL MINOR" },
    { id: "majorPentatonic", label: "MAJOR PENTATONIC" },
    { id: "minorPentatonic", label: "MINOR PENTATONIC" },
    { id: "blues", label: "BLUES" },
  ];

  var NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  var OCTAVE_SHIFT_MIN = -3;
  var OCTAVE_SHIFT_MAX = 3;
  var ROOT_SHIFT_MIN = -12;
  var ROOT_SHIFT_MAX = 12;

  // Performance state — shared across groups/pads, same as a real
  // EP-133's Keys-mode settings aren't per-pad. Persists across
  // render() calls because this module-level, not rebuilt per call.
  var octaveShift = 0;
  var rootNoteShift = 0;
  var scaleId = "chromatic";

  // Which of the active group's 12 pad-sounds is being played
  // melodically. Set from render()'s selectedPad argument — this is
  // the only thing noteOn/noteOff read to know what to play, since
  // keyboard.js calls them with just (padIndex, velocity).
  var sourcePadIndex = null;

  // Physical pad index -> stop fn for the note currently sounding on
  // that pad, so noteOff(padIndex) releases the right voice and
  // several physical pads held together each keep their own voice
  // (polyphony) unless sampler.js's legato cutoff says otherwise.
  var padVoiceStops = {};

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // Scale degrees are defined once per octave; once padIndex runs
  // past the last degree, wrap into the next octave up so all 12
  // pads always produce a note (e.g. 5-note pentatonics repeat across
  // the 12 pads instead of leaving pads 6-12 silent).
  function computeTargetMidi(padIndex, rootMidi) {
    var degrees = SCALES[scaleId] || SCALES.chromatic;
    var octaveStep = Math.floor(padIndex / degrees.length);
    var degreeOffset = degrees[padIndex % degrees.length];
    var base = rootMidi + octaveShift * 12 + rootNoteShift;
    return clamp(base + degreeOffset + octaveStep * 12, 0, 127);
  }

  function noteName(midi) {
    var safeMidi = clamp(Math.round(midi), 0, 127);
    var pitchClass = ((safeMidi % 12) + 12) % 12;
    var octave = Math.floor(safeMidi / 12) - 1;
    return NOTE_NAMES[pitchClass] + octave;
  }

  function getSourceSound(letter, padIndex) {
    if (padIndex == null) return null;
    var soundId = window.WorkstationGroups.getPadSound(letter, padIndex);
    return soundId ? window.WorkstationSampler.getSound(soundId) : null;
  }

  /* ---------- Playback ---------- */

  function noteOn(padIndex, velocity) {
    if (sourcePadIndex == null) return; // no source pad selected — nothing to play
    var letter = window.WorkstationGroups.getActiveLetter();
    var soundId = window.WorkstationGroups.getPadSound(letter, sourcePadIndex);
    if (!soundId) return;
    var sound = window.WorkstationSampler.getSound(soundId);
    if (!sound) return;

    var rootMidi = sound.rootNote != null ? sound.rootNote : 60;
    var targetMidi = computeTargetMidi(padIndex, rootMidi);
    var appliedVelocity = velocity != null ? velocity : 1;
    var ctx = window.WorkstationAudio.context();

    var stop = window.WorkstationSampler.triggerNote(
      letter,
      sourcePadIndex,
      soundId,
      targetMidi,
      appliedVelocity,
      ctx.currentTime,
      null
    );
    if (stop) padVoiceStops[padIndex] = stop;
  }

  function noteOff(padIndex) {
    var stop = padVoiceStops[padIndex];
    if (!stop) return;
    delete padVoiceStops[padIndex];
    stop();
  }

  /* ---------- UI ---------- */

  function buildSourceRow(letter, selectedPad) {
    var row = document.createElement("div");
    row.className = "ws-keys-source";

    if (selectedPad == null) {
      var hint = document.createElement("p");
      hint.className = "ws-hint-block";
      hint.textContent = "KEYS MODE — select a pad to play its sound melodically.";
      row.appendChild(hint);
      return row;
    }

    var sound = getSourceSound(letter, selectedPad);
    var label = document.createElement("span");
    label.className = "ws-dv-big";
    label.textContent = "SOURCE PAD " + (selectedPad + 1) + (sound ? " — " + sound.name : "");
    row.appendChild(label);
    return row;
  }

  function buildOctaveField(container, letter, selectedPad) {
    var field = document.createElement("div");
    field.className = "ws-field ws-keys-stepper";

    var label = document.createElement("span");
    label.textContent = "OCTAVE";

    var minus = document.createElement("button");
    minus.type = "button";
    minus.className = "ws-mini";
    minus.textContent = "OCT −";
    minus.addEventListener("click", function () {
      octaveShift = clamp(octaveShift - 1, OCTAVE_SHIFT_MIN, OCTAVE_SHIFT_MAX);
      render(container, letter, selectedPad);
    });

    var value = document.createElement("span");
    value.className = "ws-keys-value";
    value.textContent = (octaveShift > 0 ? "+" : "") + octaveShift;

    var plus = document.createElement("button");
    plus.type = "button";
    plus.className = "ws-mini";
    plus.textContent = "OCT +";
    plus.addEventListener("click", function () {
      octaveShift = clamp(octaveShift + 1, OCTAVE_SHIFT_MIN, OCTAVE_SHIFT_MAX);
      render(container, letter, selectedPad);
    });

    field.appendChild(label);
    field.appendChild(minus);
    field.appendChild(value);
    field.appendChild(plus);
    return field;
  }

  function buildTransposeField(container, letter, selectedPad) {
    var field = document.createElement("label");
    field.className = "ws-field";

    var label = document.createElement("span");
    label.textContent = "TRANSPOSE";

    var input = document.createElement("input");
    input.type = "number";
    input.min = String(ROOT_SHIFT_MIN);
    input.max = String(ROOT_SHIFT_MAX);
    input.step = "1";
    input.value = String(rootNoteShift);
    input.addEventListener("change", function () {
      var parsed = parseInt(input.value, 10);
      rootNoteShift = clamp(isNaN(parsed) ? 0 : parsed, ROOT_SHIFT_MIN, ROOT_SHIFT_MAX);
      render(container, letter, selectedPad);
    });

    field.appendChild(label);
    field.appendChild(input);
    return field;
  }

  function buildScaleField(container, letter, selectedPad) {
    var field = document.createElement("label");
    field.className = "ws-field";

    var label = document.createElement("span");
    label.textContent = "SCALE";

    var select = document.createElement("select");
    SCALE_OPTIONS.forEach(function (opt) {
      var option = document.createElement("option");
      option.value = opt.id;
      option.textContent = opt.label;
      if (opt.id === scaleId) option.selected = true;
      select.appendChild(option);
    });
    select.addEventListener("change", function () {
      scaleId = select.value;
      render(container, letter, selectedPad);
    });

    field.appendChild(label);
    field.appendChild(select);
    return field;
  }

  // Reference-only strip: shows which note each of the 12 physical
  // pads currently maps to. Not interactive and not the real playable
  // pads — those live in ui.js's own #wsPads grid.
  function buildReferenceStrip(letter, selectedPad) {
    var strip = document.createElement("div");
    strip.className = "ws-keys-strip";

    var sound = getSourceSound(letter, selectedPad);
    var previewRoot = sound && sound.rootNote != null ? sound.rootNote : 60;

    for (var padIndex = 0; padIndex < 12; padIndex++) {
      var cell = document.createElement("div");
      cell.className = "ws-keys-cell";

      var padLabel = document.createElement("span");
      padLabel.className = "ws-keys-cell-pad";
      padLabel.textContent = String(padIndex + 1);

      var noteLabel = document.createElement("span");
      noteLabel.className = "ws-keys-cell-note";
      noteLabel.textContent = noteName(computeTargetMidi(padIndex, previewRoot));

      cell.appendChild(padLabel);
      cell.appendChild(noteLabel);
      strip.appendChild(cell);
    }
    return strip;
  }

  function render(container, letter, selectedPad) {
    container.innerHTML = "";
    sourcePadIndex = selectedPad;

    var wrap = document.createElement("div");
    wrap.className = "ws-keys";

    wrap.appendChild(buildSourceRow(letter, selectedPad));

    var controls = document.createElement("div");
    controls.className = "ws-row ws-keys-controls";
    controls.appendChild(buildOctaveField(container, letter, selectedPad));
    controls.appendChild(buildTransposeField(container, letter, selectedPad));
    controls.appendChild(buildScaleField(container, letter, selectedPad));
    wrap.appendChild(controls);

    wrap.appendChild(buildReferenceStrip(letter, selectedPad));

    var hint = document.createElement("span");
    hint.className = "ws-hint";
    hint.textContent = "Computer-keyboard pads play at fixed velocity (no pressure sensing).";
    wrap.appendChild(hint);

    container.appendChild(wrap);
  }

  window.WorkstationKeysMode = {
    render: render,
    noteOn: noteOn,
    noteOff: noteOff,
  };
})();
