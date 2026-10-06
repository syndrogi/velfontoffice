/**
 * MIDI OFFICE — EP-133 Workstation — Sound Editor
 * One scrollable panel translating the EP-133's six Sound Edit
 * sub-modes (Sound Mode, Trim, Envelope, Time, MIDI, Mute Group) into
 * flat, hairline-bordered sections. This module owns none of the
 * audio itself — every read/write goes through window.WorkstationSampler
 * (data + playback) and window.WorkstationGroups (mute-group
 * membership); this file only builds and wires the DOM.
 *
 * TIME MODE / TIME VALUE — see buildTimeSection() below: these fields
 * are intentionally stored-but-not-yet-audio-affecting. Real
 * pitch-preserving time-stretch (so a sample fits a bar/tempo without
 * changing pitch) has no built-in Web Audio primitive — it requires a
 * phase-vocoder or similar DSP pipeline, which is out of scope here.
 * Nothing in this file claims otherwise: the UI labels the field
 * "stored only" and setParam() just records timeMode/timeValue on the
 * sound record like any other parameter, with no playback path reading
 * them back yet.
 */
(function () {
  var NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  var WAVEFORM_BUCKETS = 240;
  var WAVEFORM_HEIGHT = 60;
  var DEFAULT_CHOP_COUNT = 8;

  // Tracks whatever render() was last called with, so the single
  // dragover/drop listener wired onto a container (once, see
  // wireDragAndDrop) always acts on the pad currently being edited
  // instead of whichever pad was selected when the listener was added.
  var activeTarget = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function noteName(midiNumber) {
    var safe = clamp(Math.round(midiNumber), 0, 127);
    var octave = Math.floor(safe / 12) - 1;
    return NOTE_NAMES[safe % 12] + octave;
  }

  function panLabel(pan) {
    if (pan < -0.02) return "L" + Math.round(Math.abs(pan) * 100);
    if (pan > 0.02) return "R" + Math.round(pan * 100);
    return "C";
  }

  function readToneColor(name, fallback) {
    var value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  /* ---------- Small reusable field builders ---------- */

  function createSection(titleText) {
    var section = document.createElement("div");
    section.className = "ws-section";
    var title = document.createElement("h3");
    title.className = "ws-section-title";
    title.textContent = titleText;
    section.appendChild(title);
    return section;
  }

  function createRangeField(labelText, min, max, step, value, formatValue, onInput) {
    var field = document.createElement("label");
    field.className = "ws-field";

    var label = document.createElement("span");
    label.textContent = labelText;

    var input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);

    var readout = document.createElement("span");
    readout.className = "ws-field-readout";
    readout.textContent = formatValue(value);

    input.addEventListener("input", function () {
      var parsed = Number(input.value);
      readout.textContent = formatValue(parsed);
      onInput(parsed);
    });

    field.appendChild(label);
    field.appendChild(input);
    field.appendChild(readout);
    return field;
  }

  function createNumberField(labelText, min, max, value, onChange) {
    var field = document.createElement("label");
    field.className = "ws-field";

    var label = document.createElement("span");
    label.textContent = labelText;

    var input = document.createElement("input");
    input.type = "number";
    input.min = String(min);
    input.max = String(max);
    input.value = String(value);

    input.addEventListener("change", function () {
      var parsed = parseInt(input.value, 10);
      var safe = clamp(isNaN(parsed) ? min : parsed, min, max);
      input.value = String(safe);
      onChange(safe);
    });

    field.appendChild(label);
    field.appendChild(input);
    return field;
  }

  function createSelectField(labelText, options, selectedValue, onChange) {
    var field = document.createElement("label");
    field.className = "ws-field";

    var label = document.createElement("span");
    label.textContent = labelText;

    var select = document.createElement("select");
    options.forEach(function (opt) {
      var option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.value === selectedValue) option.selected = true;
      select.appendChild(option);
    });
    select.addEventListener("change", function () {
      onChange(select.value);
    });

    field.appendChild(label);
    field.appendChild(select);
    return field;
  }

  /* ---------- Waveform ---------- */

  function drawWaveform(canvas, sound) {
    var ctx = canvas.getContext("2d");
    var w = canvas.width;
    var h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;

    if (!sound.buffer) {
      ctx.strokeStyle = readToneColor("--tone-fg-faint", "rgba(0,0,0,0.35)");
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      return;
    }

    var peaks = window.WorkstationSampler.getWaveformPeaks(sound.id, w);
    var mid = h / 2;
    var startPx = sound.trimStart * w;
    var endPx = sound.trimEnd * w;
    var fg = readToneColor("--tone-fg", "#000000");
    var faint = readToneColor("--tone-fg-faint", "rgba(0,0,0,0.35)");

    for (var i = 0; i < peaks.length; i++) {
      var inside = i >= startPx && i <= endPx;
      ctx.strokeStyle = inside ? fg : faint;
      ctx.beginPath();
      ctx.moveTo(i + 0.5, mid - peaks[i][1] * mid);
      ctx.lineTo(i + 0.5, mid - peaks[i][0] * mid);
      ctx.stroke();
    }

    ctx.strokeStyle = readToneColor("--tone-accent", "#e0261f");
    [startPx, endPx].forEach(function (x) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    });

    if (sound.chop && sound.chop.slices) {
      ctx.strokeStyle = readToneColor("--tone-fg-muted", "rgba(0,0,0,0.6)");
      sound.chop.slices.forEach(function (slice) {
        var x = slice.start * w;
        ctx.beginPath();
        ctx.moveTo(x, h * 0.15);
        ctx.lineTo(x, h * 0.85);
        ctx.stroke();
      });
    }
  }

  function buildWaveformSection(sound) {
    var section = createSection("TRIM");
    var canvas = document.createElement("canvas");
    canvas.className = "ws-waveform";
    canvas.width = WAVEFORM_BUCKETS;
    canvas.height = WAVEFORM_HEIGHT;
    section.appendChild(canvas);

    function redraw() {
      drawWaveform(canvas, sound);
    }

    var row = document.createElement("div");
    row.className = "ws-row";

    row.appendChild(createRangeField("START", 0, 1000, 1, Math.round(sound.trimStart * 1000), function (v) {
      return Math.round(v / 10) + "%";
    }, function (v) {
      var fraction = v / 1000;
      var maxStart = sound.trimEnd - 0.01;
      fraction = Math.min(fraction, Math.max(0, maxStart));
      window.WorkstationSampler.setParam(sound.id, "trimStart", fraction);
      redraw();
    }));

    row.appendChild(createRangeField("END", 0, 1000, 1, Math.round(sound.trimEnd * 1000), function (v) {
      return Math.round(v / 10) + "%";
    }, function (v) {
      var fraction = v / 1000;
      var minEnd = sound.trimStart + 0.01;
      fraction = Math.max(fraction, Math.min(1, minEnd));
      window.WorkstationSampler.setParam(sound.id, "trimEnd", fraction);
      redraw();
    }));

    section.appendChild(row);
    redraw();
    return section;
  }

  /* ---------- File load ---------- */

  function buildFileSection(sound, letter, padIndex, rerender) {
    var section = createSection("SAMPLE");
    var row = document.createElement("div");
    row.className = "ws-row ws-file-row";

    var input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*";
    input.className = "tone-file-input";
    input.id = "wsSoundEditorFile";
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) return;
      window.WorkstationSampler.loadFileToPad(letter, padIndex, file).then(rerender);
    });

    var label = document.createElement("label");
    label.className = "ws-btn tone-file-label";
    label.htmlFor = input.id;
    label.textContent = "LOAD FILE";

    var name = document.createElement("span");
    name.className = "ws-sound-name";
    name.textContent = sound.name + (sound.buffer ? "" : " (EMPTY)");

    row.appendChild(input);
    row.appendChild(label);
    row.appendChild(name);
    section.appendChild(row);

    var hint = document.createElement("span");
    hint.className = "ws-hint";
    hint.textContent = "Drop an audio file anywhere on this panel to load it onto the selected pad.";
    section.appendChild(hint);

    return section;
  }

  /* ---------- Chop + reverse ---------- */

  function buildChopSection(sound, rerender) {
    var section = createSection("CHOP");
    var row = document.createElement("div");
    row.className = "ws-row";

    var countField = createNumberField("SLICES", 1, 64, DEFAULT_CHOP_COUNT, function () {});
    var countInput = countField.querySelector("input");
    row.appendChild(countField);

    var equalBtn = document.createElement("button");
    equalBtn.type = "button";
    equalBtn.className = "ws-mini";
    equalBtn.textContent = "CHOP EQUAL";
    equalBtn.disabled = !sound.buffer;
    equalBtn.addEventListener("click", function () {
      var n = clamp(parseInt(countInput.value, 10) || DEFAULT_CHOP_COUNT, 1, 64);
      window.WorkstationSampler.chopEqual(sound.id, n);
      rerender();
    });
    row.appendChild(equalBtn);

    var attackBtn = document.createElement("button");
    attackBtn.type = "button";
    attackBtn.className = "ws-mini";
    attackBtn.textContent = "CHOP ATTACK";
    attackBtn.disabled = !sound.buffer;
    attackBtn.addEventListener("click", function () {
      var n = clamp(parseInt(countInput.value, 10) || DEFAULT_CHOP_COUNT, 1, 64);
      window.WorkstationSampler.chopAttack(sound.id, n);
      rerender();
    });
    row.appendChild(attackBtn);

    var reverseBtn = document.createElement("button");
    reverseBtn.type = "button";
    reverseBtn.className = "ws-mini";
    reverseBtn.classList.toggle("ws-is-active", !!sound.reverse);
    reverseBtn.textContent = "REVERSE";
    reverseBtn.addEventListener("click", function () {
      window.WorkstationSampler.setParam(sound.id, "reverse", !sound.reverse);
      rerender();
    });
    row.appendChild(reverseBtn);

    section.appendChild(row);

    var status = document.createElement("p");
    status.className = "ws-hint-block";
    status.textContent = sound.chop
      ? sound.chop.slices.length + " SLICES (" + sound.chop.mode.toUpperCase() + ")"
      : "NOT CHOPPED";
    section.appendChild(status);

    return section;
  }

  /* ---------- Sound Mode (play mode + pan) ---------- */

  function buildSoundModeSection(sound) {
    var section = createSection("SOUND MODE");
    var row = document.createElement("div");
    row.className = "ws-editor-fields";

    row.appendChild(createSelectField("PLAY MODE", [
      { value: "oneshot", label: "ONESHOT" },
      { value: "key", label: "KEY" },
      { value: "legato", label: "LEGATO" },
    ], sound.playMode, function (value) {
      window.WorkstationSampler.setParam(sound.id, "playMode", value);
    }));

    row.appendChild(createRangeField("PAN", -100, 100, 1, Math.round(sound.pan * 100), function (v) {
      return panLabel(v / 100);
    }, function (v) {
      window.WorkstationSampler.setParam(sound.id, "pan", v / 100);
    }));

    section.appendChild(row);
    return section;
  }

  /* ---------- Envelope ---------- */

  function buildEnvelopeSection(sound) {
    var section = createSection("ENVELOPE");
    var row = document.createElement("div");
    row.className = "ws-editor-fields";

    row.appendChild(createRangeField("ATTACK", 0, 1000, 1, sound.attack, function (v) {
      return v + "ms";
    }, function (v) {
      window.WorkstationSampler.setParam(sound.id, "attack", v);
    }));

    row.appendChild(createRangeField("RELEASE", 0, 3000, 5, sound.release, function (v) {
      return v + "ms";
    }, function (v) {
      window.WorkstationSampler.setParam(sound.id, "release", v);
    }));

    section.appendChild(row);
    return section;
  }

  /* ---------- Time ---------- */

  function buildTimeSection(sound) {
    var section = createSection("TIME");
    var row = document.createElement("div");
    row.className = "ws-editor-fields";

    row.appendChild(createSelectField("TIME MODE", [
      { value: "free", label: "FREE" },
      { value: "bpm", label: "BPM" },
      { value: "bar", label: "BAR" },
    ], sound.timeMode, function (value) {
      window.WorkstationSampler.setParam(sound.id, "timeMode", value);
    }));

    row.appendChild(createNumberField("VALUE", 1, 999, sound.timeValue, function (v) {
      window.WorkstationSampler.setParam(sound.id, "timeValue", v);
    }));

    section.appendChild(row);

    // Honest-by-design: see the file-level comment at the top of this
    // module. This is a stored parameter only, not yet wired into
    // playback, and the UI says so rather than implying it works.
    var note = document.createElement("p");
    note.className = "ws-hint-block";
    note.textContent = "Stored only — does not yet time-stretch playback (no pitch-preserving stretch implemented).";
    section.appendChild(note);

    return section;
  }

  /* ---------- MIDI ---------- */

  function buildMidiSection(sound) {
    var section = createSection("MIDI");
    var row = document.createElement("div");
    row.className = "ws-editor-fields";

    row.appendChild(createNumberField("CHANNEL", 1, 16, sound.midiChannel, function (v) {
      window.WorkstationSampler.setParam(sound.id, "midiChannel", v);
    }));

    row.appendChild(createRangeField("ROOT NOTE", 0, 127, 1, sound.rootNote, function (v) {
      return noteName(v);
    }, function (v) {
      window.WorkstationSampler.setParam(sound.id, "rootNote", v);
    }));

    section.appendChild(row);
    return section;
  }

  /* ---------- Mute Group ---------- */

  function buildMuteGroupSection(letter, padIndex, rerender) {
    var section = createSection("MUTE GROUP");
    var current = window.WorkstationGroups.getMuteGroupFor(letter, padIndex);

    var status = document.createElement("p");
    status.className = "ws-hint-block";
    status.textContent = current === -1 ? "NOT IN A MUTE GROUP" : "MUTE GROUP " + (current + 1);
    section.appendChild(status);

    var row = document.createElement("div");
    row.className = "ws-row ws-mute-groups";
    for (var i = 0; i < 8; i++) {
      (function (slotIndex) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ws-mini";
        btn.classList.toggle("ws-is-active", slotIndex === current);
        btn.textContent = String(slotIndex + 1);
        btn.addEventListener("click", function () {
          window.WorkstationGroups.toggleMuteGroupMember(letter, slotIndex, padIndex);
          rerender();
        });
        row.appendChild(btn);
      })(i);
    }
    section.appendChild(row);
    return section;
  }

  /* ---------- Drag and drop ---------- */

  // Wired once per container element (flagged on the node itself) so
  // repeated render() calls — which happen on every pad/group/mode
  // change — never stack duplicate listeners on the persistent
  // #wsModeBody element ui.js reuses across renders.
  function wireDragAndDrop(container) {
    if (container.__wsSoundEditorDndWired) return;
    container.__wsSoundEditorDndWired = true;

    container.addEventListener("dragover", function (e) {
      if (!activeTarget || activeTarget.padIndex == null) return;
      e.preventDefault();
    });

    container.addEventListener("drop", function (e) {
      if (!activeTarget || activeTarget.padIndex == null) return;
      e.preventDefault();
      var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;
      var target = activeTarget;
      window.WorkstationSampler.loadFileToPad(target.letter, target.padIndex, file).then(function () {
        render(target.container, target.letter, target.padIndex);
      });
    });
  }

  /* ---------- Entry point ---------- */

  function render(container, letter, selectedPad) {
    container.innerHTML = "";
    activeTarget = { container: container, letter: letter, padIndex: selectedPad };
    wireDragAndDrop(container);

    var wrap = document.createElement("div");
    wrap.className = "ws-sound-editor";
    container.appendChild(wrap);

    if (selectedPad == null) {
      var hint = document.createElement("p");
      hint.className = "ws-hint-block";
      hint.textContent = "SELECT A PAD TO EDIT ITS SOUND.";
      wrap.appendChild(hint);
      return;
    }

    var sound = window.WorkstationSampler.ensurePadSound(letter, selectedPad);
    function rerender() {
      render(container, letter, selectedPad);
    }

    wrap.appendChild(buildFileSection(sound, letter, selectedPad, rerender));
    wrap.appendChild(buildWaveformSection(sound));
    wrap.appendChild(buildChopSection(sound, rerender));
    wrap.appendChild(buildSoundModeSection(sound));
    wrap.appendChild(buildEnvelopeSection(sound));
    wrap.appendChild(buildTimeSection(sound));
    wrap.appendChild(buildMidiSection(sound));
    wrap.appendChild(buildMuteGroupSection(letter, selectedPad, rerender));
  }

  window.WorkstationSoundEditor = {
    render: render,
  };
})();
