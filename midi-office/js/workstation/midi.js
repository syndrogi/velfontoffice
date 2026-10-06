/**
 * MIDI OFFICE — EP-133 Workstation — MIDI
 * Bridges the Web MIDI API to the rest of the workstation: an
 * incoming Note On/Off is translated into the same group+pad shape
 * keyboard.js already drives (see its PAD_CODES / padDown), so a
 * physical EP-133 (or any class-compliant MIDI controller) plays this
 * app exactly the way the real hardware's documented note map works:
 *
 *   Notes 36-47  -> Group A, pads 0-11
 *   Notes 48-59  -> Group B, pads 0-11
 *   Notes 60-71  -> Group C, pads 0-11
 *   Notes 72-83  -> Group D, pads 0-11
 *
 * Everything outside 36-83 is outside the documented pad range and is
 * ignored — except in Keys mode, where the raw note number (the full
 * 0-127 range, not just 36-83) is handed to WorkstationKeysMode
 * instead, so Keys mode can be played chromatically rather than as
 * four 12-pad banks.
 *
 * This file must degrade gracefully under every condition: no Web
 * MIDI support, a denied permission prompt, or simply no device
 * plugged in. None of those are errors — getStatusText() just reports
 * which of those states we're in, and nothing else in the app is
 * ever affected. Every entry point from the outside world (the
 * requestMIDIAccess promise, each input's onmidimessage) is wrapped
 * so a malformed message or a downstream module throwing can never
 * bubble up and take the page down.
 */
(function () {
  var G = window.WorkstationGroups;

  // EP-133 note map: four contiguous one-octave (12 semitone) banks
  // starting at MIDI note 36 (C1), one per group, in group order.
  var GROUP_BASE_NOTE = 36;
  var PADS_PER_GROUP = 12;

  // Matches keyboard.js's padDown default hit length (its own trigger
  // call also hardcodes 0.5s) so a pad sounds the same whether it was
  // hit from a MIDI controller or the computer keyboard.
  var ONE_SHOT_DURATION_SEC = 0.5;

  // How many incoming clock pulses to average for the advisory BPM
  // estimate, and how long without a pulse before we call the clock
  // stopped rather than just slow.
  var CLOCK_HISTORY_SIZE = 24; // one quarter note, per the MIDI spec
  var CLOCK_STALE_MS = 2000;

  var supported = typeof navigator !== "undefined" && typeof navigator.requestMIDIAccess === "function";
  var midiAccess = null;
  var connectedDeviceName = null; // null until an input reports state "connected"

  var sustainDown = false;
  var learnCallback = null; // one-shot; armed by startLearn(), consumed by the next CC
  var clockTimestamps = []; // DOMHighResTimeStamp of the last CLOCK_HISTORY_SIZE 0xF8 pulses

  /* ---------- Status text ---------- */

  function getStatusText() {
    if (!supported) return "MIDI UNAVAILABLE";
    if (!connectedDeviceName) return "MIDI: NO DEVICE";
    return "MIDI: " + connectedDeviceName;
  }

  function refreshConnectedDeviceName() {
    connectedDeviceName = null;
    if (!midiAccess) return;
    midiAccess.inputs.forEach(function (input) {
      if (!connectedDeviceName && input.state === "connected") {
        connectedDeviceName = input.name || "Unknown Device";
      }
    });
  }

  /* ---------- Note On/Off -> group/pad or Keys mode ---------- */

  // Returns { letter, padIndex } for a note inside the EP-133's
  // documented 36-83 range, or null when the note falls outside every
  // group's bank (including below 36, and above the last group).
  function mapNoteToGroupPad(note) {
    var letters = G.LETTERS;
    var offset = note - GROUP_BASE_NOTE;
    if (offset < 0) return null;
    var groupIndex = Math.floor(offset / PADS_PER_GROUP);
    if (groupIndex >= letters.length) return null;
    return { letter: letters[groupIndex], padIndex: offset % PADS_PER_GROUP };
  }

  function handleNoteOn(note, velocityByte) {
    var velocity = velocityByte / 127;

    if (window.WorkstationKeyboard.getMode() === "keys") {
      // Keys mode plays chromatically across the full note range, not
      // just the four 12-pad banks, so it gets the raw note number
      // instead of a group/pad mapping.
      if (window.WorkstationKeysMode) window.WorkstationKeysMode.noteOn(note, velocity);
      return;
    }

    var mapped = mapNoteToGroupPad(note);
    if (!mapped) return; // outside the documented 36-83 pad range
    window.WorkstationSequencer.triggerPad(
      mapped.letter,
      mapped.padIndex,
      velocity,
      window.WorkstationAudio.context().currentTime,
      ONE_SHOT_DURATION_SEC
    );
  }

  function handleNoteOff(note) {
    if (window.WorkstationKeyboard.getMode() === "keys") {
      if (window.WorkstationKeysMode) window.WorkstationKeysMode.noteOff(note);
      return;
    }
    // Group/pad path: sequencer.js's triggerPad is a fire-and-forget
    // one-shot — it already played its own fixed envelope/duration on
    // Note On and has no sustained voice to release here. Sustain-by-
    // held-note only exists in Keys mode; outside it, Note Off is a
    // deliberate no-op.
  }

  /* ---------- Control Change: MIDI learn + sustain pedal ---------- */

  function handleControlChange(ccNumber, value) {
    if (learnCallback) {
      // Disarm before invoking so a callback that calls startLearn()
      // again to chain a second learn behaves predictably.
      var callback = learnCallback;
      learnCallback = null;
      callback(ccNumber, value);
    }
    if (ccNumber === 64) sustainDown = value >= 64;
  }

  function startLearn(callback) {
    learnCallback = callback;
  }

  function isSustainDown() {
    return sustainDown;
  }

  /* ---------- Real-time: Clock / Start / Stop ---------- */

  function recordClockPulse(timeStamp) {
    clockTimestamps.push(timeStamp);
    if (clockTimestamps.length > CLOCK_HISTORY_SIZE) clockTimestamps.shift();
  }

  // Advisory only — read-only estimate of the sender's tempo from the
  // spacing of incoming clock pulses. This never slaves the internal
  // transport's own clock; fully syncing playback to incoming MIDI
  // clock is a much larger resync effort and is out of scope here.
  function getIncomingClockBpm() {
    if (clockTimestamps.length < 2) return null;
    var last = clockTimestamps[clockTimestamps.length - 1];
    if (performance.now() - last > CLOCK_STALE_MS) return null;

    var totalMs = last - clockTimestamps[0];
    var pulseCount = clockTimestamps.length - 1;
    var avgMsPerPulse = totalMs / pulseCount;
    var msPerQuarterNote = avgMsPerPulse * CLOCK_HISTORY_SIZE;
    return 60000 / msPerQuarterNote;
  }

  function handleStart() {
    if (window.WorkstationTransport) window.WorkstationTransport.play();
  }

  function handleStop() {
    if (window.WorkstationTransport) window.WorkstationTransport.stop();
  }

  /* ---------- Raw message parsing ---------- */

  function handleRawMessage(data, timeStamp) {
    if (!data || data.length < 1) return;
    var status = data[0];

    if (status === 0xF8) { recordClockPulse(timeStamp); return; }
    if (status === 0xFA) { handleStart(); return; }
    if (status === 0xFC) { handleStop(); return; }
    if (status >= 0xF0) return; // other system/sysex messages — out of scope, not an error

    if (data.length < 3) return; // every channel message we act on carries 2 data bytes

    var type = status & 0xF0;
    var data1 = data[1];
    var data2 = data[2];

    if (type === 0x90) {
      // Note On with velocity 0 is, by MIDI convention, a Note Off.
      if (data2 === 0) handleNoteOff(data1);
      else handleNoteOn(data1, data2);
      return;
    }
    if (type === 0x80) { handleNoteOff(data1); return; }
    if (type === 0xB0) { handleControlChange(data1, data2); return; }
    // Program change, pitch bend, (poly/channel) pressure, etc. are
    // outside this file's scope and are intentionally ignored.
  }

  function onMidiMessage(event) {
    try {
      handleRawMessage(event.data, event.timeStamp);
    } catch (e) {
      // A malformed message or a downstream module throwing must
      // never take down the rest of the page.
      console.error("WorkstationMidi: failed to handle MIDI message", e);
    }
  }

  /* ---------- MIDIAccess wiring ---------- */

  function attachInputListeners(access) {
    access.inputs.forEach(function (input) {
      input.onmidimessage = onMidiMessage;
    });
  }

  function handleAccessGranted(access) {
    midiAccess = access;
    attachInputListeners(access);
    refreshConnectedDeviceName();
    access.onstatechange = function () {
      // A device was plugged in or unplugged: a newly-connected input
      // needs its own message handler, and the status readout needs
      // to reflect whatever is connected now.
      attachInputListeners(access);
      refreshConnectedDeviceName();
    };
  }

  function handleAccessDenied() {
    // Permission prompt was denied (or access otherwise failed) —
    // same user-visible state as no device being connected.
    midiAccess = null;
    connectedDeviceName = null;
  }

  if (supported) {
    try {
      navigator.requestMIDIAccess().then(handleAccessGranted, handleAccessDenied);
    } catch (e) {
      // Some environments can throw synchronously rather than
      // rejecting the promise — fall back to the "unavailable" state.
      supported = false;
    }
  }

  window.WorkstationMidi = {
    getStatusText: getStatusText,
    startLearn: startLearn,
    isSustainDown: isSustainDown,
    getIncomingClockBpm: getIncomingClockBpm,
  };
})();
