/**
 * MIDI OFFICE — EP-133 Workstation — Sequencer
 * Consumes transport.js's tick clock to actually play every group's
 * active pattern simultaneously (all 4 groups play together — which
 * group is "active" only changes what the keyboard/UI is currently
 * pointed at for editing, not what's audible), and to record into
 * them: live (hits while playing land on the clock, quantized or
 * free-time) and step (move a cursor while stopped, hold Record and
 * press a pad to place it there).
 *
 * Undo is single-level, matching the EP-133's own umbrella-icon
 * model: the previous pattern snapshot is kept and swapped back in,
 * not a full history stack.
 */
(function () {
  var P = window.WorkstationPatterns;
  var T = window.WorkstationTransport;
  var G = window.WorkstationGroups;

  var TIMING_INTERVALS = {
    "1/1": P.TICKS_PER_QUARTER * 4,
    "1/2": P.TICKS_PER_QUARTER * 2,
    "1/4": P.TICKS_PER_QUARTER,
    "1/8": P.TICKS_PER_QUARTER / 2,
    "1/8T": Math.round((P.TICKS_PER_QUARTER / 2) * (2 / 3)),
    "1/16": P.TICKS_PER_QUARTER / 4,
    "1/16T": Math.round((P.TICKS_PER_QUARTER / 4) * (2 / 3)),
    "1/32": P.TICKS_PER_QUARTER / 8,
  };
  var timingInterval = "1/16";
  var quantizeEnabled = true;

  var stepCursor = 0; // for step-recording while stopped
  var stepListeners = [];
  var noteRepeatPads = {}; // padIndex -> true while held
  var noteRepeatSustain = {}; // padIndex -> true if latched (Shift+pad while Timing active)
  var undoSnapshots = {}; // patternId -> previous full-pattern snapshot
  var lastTriggered = {}; // "letter:pad" -> count, for UI flash

  function snapshotPattern(patternId) {
    var pattern = P.getPattern(patternId);
    if (!pattern) return null;
    return JSON.parse(JSON.stringify(pattern));
  }

  function pushUndo(patternId) {
    var snap = snapshotPattern(patternId);
    if (snap) undoSnapshots[patternId] = snap;
  }

  function undo(patternId) {
    var snap = undoSnapshots[patternId];
    if (!snap) return false;
    var current = snapshotPattern(patternId);
    P.registerPattern(snap);
    undoSnapshots[patternId] = current;
    return true;
  }

  function canUndo(patternId) {
    return !!undoSnapshots[patternId];
  }

  function onStep(fn) {
    stepListeners.push(fn);
  }

  function notifyStep(tick) {
    stepListeners.forEach(function (fn) {
      try {
        fn(tick);
      } catch (e) { /* ui errors shouldn't break audio */ }
    });
  }

  function triggerPad(letter, padIndex, velocity, time, durationSec) {
    if (!window.WorkstationSampler) return;
    var group = G.getGroup(letter);
    var muteGroupIndex = G.getMuteGroupFor(letter, padIndex);
    if (muteGroupIndex !== -1) {
      // "only the last pressed sound will play, cutting off any others" —
      // stop every other pad currently sounding in this mute group.
      window.WorkstationSampler.cutMuteGroup(letter, muteGroupIndex, padIndex);
    }
    var soundId = group.soundIds[padIndex];
    if (!soundId) return;
    window.WorkstationSampler.triggerPad(letter, padIndex, soundId, velocity, time, durationSec);
    lastTriggered[letter + ":" + padIndex] = (lastTriggered[letter + ":" + padIndex] || 0) + 1;
  }

  function onTransportTick(tick, time) {
    if (tick % P.TICKS_PER_QUARTER === 0 && T.shouldClickNow()) {
      var accent = tick % T.ticksPerBar() === 0;
      T.playClick(time, accent);
    }

    G.LETTERS.forEach(function (letter) {
      var group = G.getGroup(letter);
      var patternId = group.activePatternId;
      if (!patternId) return;
      var pattern = P.getPattern(patternId);
      if (!pattern) return;
      var patternTicks = pattern.lengthSteps * P.ticksPerStep();
      var localTick = ((tick % patternTicks) + patternTicks) % patternTicks;

      pattern.lanes.forEach(function (lane, padIndex) {
        lane.forEach(function (e) {
          var eventTick = e.step * P.ticksPerStep() + (e.offsetTicks || 0);
          var normalized = ((eventTick % patternTicks) + patternTicks) % patternTicks;
          if (normalized === localTick) {
            triggerPad(letter, padIndex, e.velocity, time, (e.durationTicks || P.ticksPerStep()) * T.secondsPerTick());
          }
        });
      });
    });

    Object.keys(noteRepeatPads).forEach(function (key) {
      if (!noteRepeatPads[key] && !noteRepeatSustain[key]) return;
      var interval = TIMING_INTERVALS[timingInterval];
      if (tick % interval !== 0) return;
      var parts = key.split(":");
      triggerPad(parts[0], Number(parts[1]), 1, time, interval * T.secondsPerTick());
    });

    notifyStep(tick);
  }

  T.onTick(onTransportTick);

  /* ---------- Live recording ---------- */

  function liveRecordHit(letter, padIndex, velocity) {
    if (!T.isRecording()) return;
    var group = G.getGroup(letter);
    var patternId = group.activePatternId;
    if (!patternId) return;
    var pattern = P.getPattern(patternId);
    if (!pattern) return;
    pushUndo(patternId);
    var patternTicks = pattern.lengthSteps * P.ticksPerStep();
    var tick = T.currentTick() % patternTicks;
    var stepSize = P.ticksPerStep();
    if (quantizeEnabled) {
      var step = Math.round(tick / stepSize) % pattern.lengthSteps;
      P.setEvent(patternId, padIndex, step, { velocity: velocity, offsetTicks: 0 });
    } else {
      var step2 = Math.floor(tick / stepSize);
      var offset = tick - step2 * stepSize;
      P.setEvent(patternId, padIndex, step2, { velocity: velocity, offsetTicks: offset });
    }
  }

  /* ---------- Step recording (while stopped) ---------- */

  function moveStepCursor(delta) {
    var pattern = activePattern();
    if (!pattern) return stepCursor;
    stepCursor = ((stepCursor + delta) % pattern.lengthSteps + pattern.lengthSteps) % pattern.lengthSteps;
    return stepCursor;
  }

  function getStepCursor() {
    return stepCursor;
  }

  function activePattern() {
    var group = G.getActiveGroup();
    return group.activePatternId ? P.getPattern(group.activePatternId) : null;
  }

  function stepRecordHit(padIndex, velocity) {
    var group = G.getActiveGroup();
    var pattern = activePattern();
    if (!pattern) return;
    pushUndo(pattern.id);
    P.setEvent(pattern.id, padIndex, stepCursor, { velocity: velocity, offsetTicks: 0 });
  }

  function eraseAtCursor(padIndex) {
    var pattern = activePattern();
    if (!pattern) return;
    pushUndo(pattern.id);
    P.eraseAtStep(pattern.id, padIndex, stepCursor);
  }

  /* ---------- Note repeat ---------- */

  function setNoteRepeat(letter, padIndex, active) {
    var key = letter + ":" + padIndex;
    noteRepeatPads[key] = active;
    if (active && !T.isPlaying()) T.play();
  }

  function latchNoteRepeat(letter, padIndex) {
    var key = letter + ":" + padIndex;
    noteRepeatSustain[key] = !noteRepeatSustain[key];
  }

  function setTimingInterval(name) {
    if (TIMING_INTERVALS[name] != null) timingInterval = name;
  }

  function getTimingInterval() {
    return timingInterval;
  }

  function setQuantize(enabled) {
    quantizeEnabled = enabled;
  }

  function getQuantize() {
    return quantizeEnabled;
  }

  /* ---------- Timing correct / offset ---------- */

  function quantizePad(letter, padIndex) {
    var group = G.getGroup(letter);
    if (!group.activePatternId) return;
    pushUndo(group.activePatternId);
    P.quantize(group.activePatternId, padIndex);
  }

  function offsetPad(letter, padIndex, stepDelta) {
    var group = G.getGroup(letter);
    if (!group.activePatternId) return;
    pushUndo(group.activePatternId);
    P.nudge(group.activePatternId, padIndex, stepDelta);
  }

  function offsetAll(letter, stepDelta) {
    var group = G.getGroup(letter);
    if (!group.activePatternId) return;
    pushUndo(group.activePatternId);
    P.nudge(group.activePatternId, null, stepDelta);
  }

  window.WorkstationSequencer = {
    TIMING_INTERVALS: TIMING_INTERVALS,
    onStep: onStep,
    triggerPad: triggerPad,
    liveRecordHit: liveRecordHit,
    moveStepCursor: moveStepCursor,
    getStepCursor: getStepCursor,
    stepRecordHit: stepRecordHit,
    eraseAtCursor: eraseAtCursor,
    setNoteRepeat: setNoteRepeat,
    latchNoteRepeat: latchNoteRepeat,
    setTimingInterval: setTimingInterval,
    getTimingInterval: getTimingInterval,
    setQuantize: setQuantize,
    getQuantize: getQuantize,
    quantizePad: quantizePad,
    offsetPad: offsetPad,
    offsetAll: offsetAll,
    pushUndo: pushUndo,
    undo: undo,
    canUndo: canUndo,
    activePattern: activePattern,
  };
})();
