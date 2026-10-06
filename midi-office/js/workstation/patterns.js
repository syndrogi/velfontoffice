/**
 * MIDI OFFICE — EP-133 Workstation — Patterns
 * Per-group sequence data: 12 lanes (one per pad), each a sparse list
 * of events keyed by step. Timing uses 96 ticks-per-quarter-note
 * (matching the EP-133's own sequencer resolution) so swing, note
 * repeat, and per-note offset can all be expressed as tick math
 * instead of fighting step-grid rounding.
 *
 * A pattern belongs to exactly one group (EP-133's own model — group
 * pads double as pattern-bank select, see groups.js) and is otherwise
 * just data; sequencer.js is what actually schedules it against
 * AudioContext time.
 */
(function () {
  var TICKS_PER_QUARTER = 96;
  var LANES = 12;
  var STEPS_PER_BAR = 16;
  var STEP_TICKS = (TICKS_PER_QUARTER * 4) / STEPS_PER_BAR; // 24 — fixed 16th-note grid
  var DEFAULT_STEPS = 16;
  var MAX_STEPS = 16 * 32; // 32 bars at 16 steps/bar — a practical cap

  var patternsById = {};
  var nextId = 1;

  // Step resolution is always 16th notes — a pattern's `lengthSteps`
  // is how many of them it spans (16 = 1 bar, 32 = 2 bars, etc.), not
  // a variable subdivision. "Timing" (sequencer.js's quantize/note-
  // repeat grid) is a separate, independently-settable resolution.
  function ticksPerStep() {
    return STEP_TICKS;
  }

  function createPattern(groupLetter, name) {
    var id = "pat_" + (nextId++);
    var pattern = {
      id: id,
      groupLetter: groupLetter,
      name: name || "PATTERN " + id.replace("pat_", ""),
      lengthSteps: DEFAULT_STEPS,
      lanes: [],
    };
    for (var i = 0; i < LANES; i++) pattern.lanes.push([]);
    patternsById[id] = pattern;
    return pattern;
  }

  function getPattern(id) {
    return patternsById[id] || null;
  }

  function registerPattern(pattern) {
    patternsById[pattern.id] = pattern;
    var n = Number(String(pattern.id).replace("pat_", ""));
    if (!isNaN(n) && n >= nextId) nextId = n + 1;
    return pattern;
  }

  function deletePattern(id) {
    delete patternsById[id];
  }

  // event: { step, velocity (0-1), durationTicks, offsetTicks (nudge
  // within the step, signed) }. Passing null for event erases that
  // pad's event at that step.
  function setEvent(patternId, padIndex, step, event) {
    var pattern = patternsById[patternId];
    if (!pattern || padIndex < 0 || padIndex >= LANES) return;
    var lane = pattern.lanes[padIndex];
    var existingIdx = lane.findIndex(function (e) { return e.step === step; });
    if (event === null) {
      if (existingIdx !== -1) lane.splice(existingIdx, 1);
      return;
    }
    var record = {
      step: step,
      velocity: event.velocity != null ? event.velocity : 1,
      durationTicks: event.durationTicks != null ? event.durationTicks : ticksPerStep(),
      offsetTicks: event.offsetTicks || 0,
    };
    if (existingIdx !== -1) lane[existingIdx] = record;
    else lane.push(record);
  }

  function getEventsAtStep(patternId, step) {
    var pattern = patternsById[patternId];
    if (!pattern) return [];
    var out = [];
    pattern.lanes.forEach(function (lane, padIndex) {
      lane.forEach(function (e) {
        if (e.step === step) out.push({ padIndex: padIndex, event: e });
      });
    });
    return out;
  }

  function eraseLane(patternId, padIndex) {
    var pattern = patternsById[patternId];
    if (!pattern) return;
    pattern.lanes[padIndex] = [];
  }

  function erasePattern(patternId) {
    var pattern = patternsById[patternId];
    if (!pattern) return;
    pattern.lanes = pattern.lanes.map(function () { return []; });
  }

  function eraseAtStep(patternId, padIndex, step) {
    setEvent(patternId, padIndex, step, null);
  }

  function setLength(patternId, steps) {
    var pattern = patternsById[patternId];
    if (!pattern) return;
    pattern.lengthSteps = Math.max(1, Math.min(MAX_STEPS, steps));
  }

  // Nudges every event on one pad (or, if padIndex is null, every
  // event in the whole pattern) by `stepDelta` steps — EP-133's
  // "offset notes" (one pad) vs "offset all notes" (timing-correct
  // mode, whole pattern).
  function nudge(patternId, padIndex, stepDelta) {
    var pattern = patternsById[patternId];
    if (!pattern) return;
    var lanes = padIndex == null ? pattern.lanes : [pattern.lanes[padIndex]];
    lanes.forEach(function (lane) {
      lane.forEach(function (e) {
        e.step = ((e.step + stepDelta) % pattern.lengthSteps + pattern.lengthSteps) % pattern.lengthSteps;
      });
    });
  }

  // Quantizes (snaps offsetTicks to 0) every event on one pad, or the
  // whole pattern if padIndex is null.
  function quantize(patternId, padIndex) {
    var pattern = patternsById[patternId];
    if (!pattern) return;
    var lanes = padIndex == null ? pattern.lanes : [pattern.lanes[padIndex]];
    lanes.forEach(function (lane) {
      lane.forEach(function (e) {
        e.offsetTicks = 0;
      });
    });
  }

  function clonePattern(sourceId, groupLetter) {
    var source = patternsById[sourceId];
    if (!source) return null;
    var id = "pat_" + (nextId++);
    var copy = {
      id: id,
      groupLetter: groupLetter || source.groupLetter,
      name: source.name + " COPY",
      lengthSteps: source.lengthSteps,
      lanes: source.lanes.map(function (lane) {
        return lane.map(function (e) { return { step: e.step, velocity: e.velocity, durationTicks: e.durationTicks, offsetTicks: e.offsetTicks }; });
      }),
    };
    patternsById[id] = copy;
    return copy;
  }

  // Copies just one bar's worth of events (EP-133's "copy bar" vs
  // "copy pattern" distinction — see Shift+GroupC once/twice in the
  // reference). `barSteps` is how many steps make up one bar (usually
  // 16); returns a lightweight clipboard object, not a new pattern.
  function copyBar(patternId, barIndex, barSteps) {
    var pattern = patternsById[patternId];
    if (!pattern) return null;
    var start = barIndex * barSteps;
    var end = start + barSteps;
    var lanes = pattern.lanes.map(function (lane) {
      return lane.filter(function (e) { return e.step >= start && e.step < end; })
        .map(function (e) { return { step: e.step - start, velocity: e.velocity, durationTicks: e.durationTicks, offsetTicks: e.offsetTicks }; });
    });
    return { lanes: lanes, barSteps: barSteps };
  }

  function pasteBar(patternId, barIndex, clipboard) {
    var pattern = patternsById[patternId];
    if (!pattern || !clipboard) return;
    var start = barIndex * clipboard.barSteps;
    clipboard.lanes.forEach(function (events, padIndex) {
      pattern.lanes[padIndex] = pattern.lanes[padIndex].filter(function (e) {
        return e.step < start || e.step >= start + clipboard.barSteps;
      });
      events.forEach(function (e) {
        pattern.lanes[padIndex].push({ step: e.step + start, velocity: e.velocity, durationTicks: e.durationTicks, offsetTicks: e.offsetTicks });
      });
    });
  }

  window.WorkstationPatterns = {
    LANES: LANES,
    DEFAULT_STEPS: DEFAULT_STEPS,
    MAX_STEPS: MAX_STEPS,
    TICKS_PER_QUARTER: TICKS_PER_QUARTER,
    ticksPerStep: ticksPerStep,
    createPattern: createPattern,
    getPattern: getPattern,
    registerPattern: registerPattern,
    deletePattern: deletePattern,
    setEvent: setEvent,
    getEventsAtStep: getEventsAtStep,
    eraseLane: eraseLane,
    erasePattern: erasePattern,
    eraseAtStep: eraseAtStep,
    setLength: setLength,
    nudge: nudge,
    quantize: quantize,
    clonePattern: clonePattern,
    copyBar: copyBar,
    pasteBar: pasteBar,
  };
})();
