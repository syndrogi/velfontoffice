/**
 * MIDI OFFICE — EP-133 Workstation — Keyboard
 * The computer keyboard IS the instrument. Uses KeyboardEvent.code
 * (not .key) for every pad/modifier binding, specifically so US and
 * Korean (and any other) physical layouts that display the key left
 * of "1" differently (backtick, tilde, ₩) all still resolve to the
 * same physical key via its code: "Backquote".
 *
 * ================================================================
 * CONFLICT NOTE (required by spec — see midi-office/docs/
 * KEYBOARD_MAP.md for the full writeup):
 *
 * This module and js/synth.js (the existing Synth module's own
 * computer-keyboard performance mode) both register GLOBAL keydown/
 * keyup listeners, active at all times regardless of which window is
 * open/focused — same precedent synth.js already established. They
 * do not collide because their key-sets are disjoint by construction:
 *   - This module owns: Digit1-9, Digit0, Minus, Equal, Backquote,
 *     Space, Enter, Tab, BracketLeft, BracketRight, Backspace,
 *     Escape, and the real Shift key.
 *   - synth.js owns: a s d f g h j k (white keys), w e t y u (black
 *     keys), z x (octave), c v (velocity).
 * No key appears in both sets. Escape is the one key with a second
 * independent listener elsewhere (synth.js doesn't use it; audio-
 * engine.js's panic() does) — both run on every Escape press, which
 * is intentional: panic should fire regardless of what else is
 * listening.
 * ================================================================
 */
(function () {
  var PAD_CODES = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal"];
  var padIndexByCode = {};
  PAD_CODES.forEach(function (code, i) {
    padIndexByCode[code] = i;
  });

  var MODES = ["sound", "keys", "sequencer", "sample", "fx", "mixer"];
  var MODE_CODE_INDEX = { Digit5: 0, Digit6: 1, Digit7: 2, Digit8: 3, Digit9: 4, Digit0: 5 };
  var GROUP_CODE_INDEX = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 };

  var currentMode = "sound";
  var modeListeners = [];
  var padVisualListeners = [];

  var functionHeld = false;
  var shiftHeld = false;
  var eraseHeld = false; // Backspace
  var noteRepeatHeld = false; // Tab — stands in for EP-133's physical TIMING button
  var heldPads = {}; // code -> true, for repeat-guard + simultaneous tracking

  function isTypingTarget(el) {
    var tag = el.tagName;
    return tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || el.isContentEditable;
  }

  function setMode(mode, silent) {
    if (MODES.indexOf(mode) === -1) return;
    currentMode = mode;
    if (!silent) {
      modeListeners.forEach(function (fn) {
        fn(currentMode);
      });
    }
  }

  function cycleMode(delta) {
    var idx = MODES.indexOf(currentMode);
    idx = ((idx + delta) % MODES.length + MODES.length) % MODES.length;
    setMode(MODES[idx]);
  }

  function onModeChange(fn) {
    modeListeners.push(fn);
    return function off() {
      var idx = modeListeners.indexOf(fn);
      if (idx !== -1) modeListeners.splice(idx, 1);
    };
  }

  function getMode() {
    return currentMode;
  }

  function onPadVisual(fn) {
    padVisualListeners.push(fn);
    return function off() {
      var idx = padVisualListeners.indexOf(fn);
      if (idx !== -1) padVisualListeners.splice(idx, 1);
    };
  }

  function flashPad(padIndex, active) {
    padVisualListeners.forEach(function (fn) {
      fn(padIndex, active);
    });
  }

  // The actual "what does pressing pad N do" dispatch — mode-
  // dependent, same whether the press came from the keyboard or a
  // mouse/touch pad click (see ui.js, which calls padDown/padUp
  // directly for pointer input instead of duplicating this logic).
  function padDown(padIndex, velocity) {
    var letter = window.WorkstationGroups.getActiveLetter();
    flashPad(padIndex, true);

    if (noteRepeatHeld) {
      window.WorkstationSequencer.setNoteRepeat(letter, padIndex, true);
      if (shiftHeld) window.WorkstationSequencer.latchNoteRepeat(letter, padIndex);
      return;
    }

    if (eraseHeld) {
      if (window.WorkstationTransport.isPlaying()) {
        var group = window.WorkstationGroups.getGroup(letter);
        if (group.activePatternId) {
          window.WorkstationSequencer.pushUndo(group.activePatternId);
          window.WorkstationPatterns.eraseLane(group.activePatternId, padIndex);
        }
      } else {
        window.WorkstationSequencer.eraseAtCursor(padIndex);
      }
      return;
    }

    if (currentMode === "fx") {
      if (window.WorkstationEffects) window.WorkstationEffects.punchIn(padIndex, true);
      return;
    }

    if (currentMode === "sample") {
      if (window.WorkstationSampler) window.WorkstationSampler.startRecordingToPad(letter, padIndex);
      return;
    }

    if (currentMode === "keys") {
      if (window.WorkstationKeysMode) window.WorkstationKeysMode.noteOn(padIndex, velocity);
      return;
    }

    if (shiftHeld && currentMode === "sequencer") {
      // Nudge-select: hold Shift+pad, then [ / ] nudges that pad's
      // recorded notes — see keydown's BracketLeft/Right handling.
      nudgeTargetPad = padIndex;
      return;
    }

    // Default: trigger the pad's sound directly, and if we're
    // recording, also write it into the pattern at the current clock
    // position (live) — or, while stopped, at the step cursor (step
    // record) when Enter/Record is held.
    window.WorkstationSequencer.triggerPad(letter, padIndex, velocity, window.WorkstationAudio.context().currentTime, 0.5);
    if (window.WorkstationTransport.isRecording() && window.WorkstationTransport.isPlaying()) {
      window.WorkstationSequencer.liveRecordHit(letter, padIndex, velocity);
    } else if (recordArmed && !window.WorkstationTransport.isPlaying()) {
      window.WorkstationSequencer.stepRecordHit(padIndex, velocity);
    }
  }

  function padUp(padIndex) {
    flashPad(padIndex, false);
    var letter = window.WorkstationGroups.getActiveLetter();
    if (noteRepeatHeld) {
      window.WorkstationSequencer.setNoteRepeat(letter, padIndex, false);
      return;
    }
    if (currentMode === "fx" && window.WorkstationEffects) {
      window.WorkstationEffects.punchIn(padIndex, false);
      return;
    }
    if (currentMode === "sample" && window.WorkstationSampler) {
      window.WorkstationSampler.stopRecordingToPad(letter, padIndex);
      return;
    }
    if (currentMode === "keys" && window.WorkstationKeysMode) {
      window.WorkstationKeysMode.noteOff(padIndex);
      return;
    }
  }

  var recordArmed = false;
  var nudgeTargetPad = null;

  function toggleRecordArm() {
    recordArmed = !recordArmed;
    window.WorkstationTransport.setRecording(recordArmed);
    return recordArmed;
  }

  function velocityFromKeydown() {
    // The computer keyboard has no actual pressure sensing — every
    // hit reports a fixed full-velocity value. (EP-133 hardware pads
    // are pressure-sensitive; a browser keyboard fundamentally can't
    // reproduce that — see docs/EP133_REFERENCE.md.)
    return 1;
  }

  document.addEventListener("keydown", function (e) {
    if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
      shiftHeld = true;
      return;
    }
    if (e.code === "Backspace") {
      e.preventDefault();
      eraseHeld = true;
      return;
    }
    if (e.code === "Tab") {
      e.preventDefault();
      noteRepeatHeld = true;
      return;
    }
    if (e.code === "Backquote") {
      e.preventDefault();
      functionHeld = true;
      return;
    }

    if (functionHeld) {
      if (e.repeat) return;
      if (GROUP_CODE_INDEX[e.code] != null) {
        window.WorkstationGroups.setActiveLetter(window.WorkstationGroups.LETTERS[GROUP_CODE_INDEX[e.code]]);
        return;
      }
      if (MODE_CODE_INDEX[e.code] != null) {
        setMode(MODES[MODE_CODE_INDEX[e.code]]);
        return;
      }
      if (e.code === "Minus") {
        cycleMode(-1);
        return;
      }
      if (e.code === "Equal") {
        cycleMode(1);
        return;
      }
      return;
    }

    if (e.code === "Space") {
      e.preventDefault();
      if (!e.repeat) window.WorkstationTransport.togglePlay();
      return;
    }
    if (e.code === "Enter") {
      e.preventDefault();
      if (!e.repeat) toggleRecordArm();
      return;
    }
    if (e.code === "BracketLeft") {
      e.preventDefault();
      handleMinus();
      return;
    }
    if (e.code === "BracketRight") {
      e.preventDefault();
      handlePlus();
      return;
    }

    if (padIndexByCode[e.code] == null) return;
    if (heldPads[e.code]) return; // OS key-repeat guard
    heldPads[e.code] = true;
    padDown(padIndexByCode[e.code], velocityFromKeydown());
  });

  document.addEventListener("keyup", function (e) {
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
      shiftHeld = false;
      nudgeTargetPad = null;
      return;
    }
    if (e.code === "Backspace") {
      eraseHeld = false;
      return;
    }
    if (e.code === "Tab") {
      noteRepeatHeld = false;
      return;
    }
    if (e.code === "Backquote") {
      functionHeld = false;
      return;
    }
    if (padIndexByCode[e.code] == null) return;
    if (!heldPads[e.code]) return;
    delete heldPads[e.code];
    padUp(padIndexByCode[e.code]);
  });

  // MINUS/PLUS — EP-133's own ubiquitous scroll/increment concept.
  // Deliberately separate physical keys ([ ]) from FUNCTION+Minus/
  // Equal (mode prev/next) — see the module comment; same-sounding
  // names, different keys, documented in KEYBOARD_MAP.md so this
  // doesn't read as a bug.
  function handleMinus() {
    if (shiftHeld && nudgeTargetPad != null) {
      window.WorkstationSequencer.offsetPad(window.WorkstationGroups.getActiveLetter(), nudgeTargetPad, -1);
      return;
    }
    if (currentMode === "sequencer" && !window.WorkstationTransport.isPlaying()) {
      window.WorkstationSequencer.moveStepCursor(-1);
      return;
    }
    if (window.WorkstationUI) window.WorkstationUI.handleMinus();
  }

  function handlePlus() {
    if (shiftHeld && nudgeTargetPad != null) {
      window.WorkstationSequencer.offsetPad(window.WorkstationGroups.getActiveLetter(), nudgeTargetPad, 1);
      return;
    }
    if (currentMode === "sequencer" && !window.WorkstationTransport.isPlaying()) {
      window.WorkstationSequencer.moveStepCursor(1);
      return;
    }
    if (window.WorkstationUI) window.WorkstationUI.handlePlus();
  }

  window.WorkstationKeyboard = {
    PAD_CODES: PAD_CODES,
    MODES: MODES,
    getMode: getMode,
    setMode: setMode,
    onModeChange: onModeChange,
    onPadVisual: onPadVisual,
    padDown: padDown,
    padUp: padUp,
    toggleRecordArm: toggleRecordArm,
    isRecordArmed: function () { return recordArmed; },
    isFunctionHeld: function () { return functionHeld; },
    isShiftHeld: function () { return shiftHeld; },
    isEraseHeld: function () { return eraseHeld; },
  };
})();
