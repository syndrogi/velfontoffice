/**
 * TONE OFFICE — Sequencer
 * A 4-track, 16-step drum machine. Every sound is synthesized live with
 * Web Audio primitives (oscillators + filtered noise) — no sample files
 * to fetch or license.
 *
 * Timing uses the standard "lookahead scheduler" pattern (look a little
 * ahead of real time, schedule exact AudioContext times, poll on a
 * short setTimeout) rather than firing sound directly off setInterval —
 * setInterval alone drifts audibly within seconds under any UI jank.
 * See: https://web.dev/articles/audio-scheduling
 */
(function () {
  var TRACKS = [
    { id: "kick", name: "KICK" },
    { id: "snare", name: "SNARE" },
    { id: "hat", name: "HAT" },
    { id: "clap", name: "CLAP" },
  ];
  var STEPS = 16;

  // A small starter pattern so the room isn't silent on first load —
  // four-on-the-floor kick, backbeat snare, straight 8th hats.
  var DEFAULT_PATTERN = {
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    clap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };

  var pattern = {};
  TRACKS.forEach(function (t) {
    pattern[t.id] = DEFAULT_PATTERN[t.id].map(Boolean);
  });

  var bpm = 120;
  var isPlaying = false;
  var currentStep = 0;
  var nextStepTime = 0;
  var timerId = null;
  var notesInQueue = [];
  var stepListeners = [];

  var LOOKAHEAD_MS = 25;
  var SCHEDULE_AHEAD_SEC = 0.1;

  function stepDuration() {
    return 60 / bpm / 4; // one 16th note
  }

  function playKick(time) {
    var ctx = window.ToneEngine.context();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.11);
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
    osc.connect(gain);
    window.ToneEngine.connectDry(gain);
    osc.start(time);
    osc.stop(time + 0.18);
  }

  function playSnare(time) {
    var ctx = window.ToneEngine.context();
    var noise = ctx.createBufferSource();
    noise.buffer = window.ToneEngine.getNoiseBuffer();
    var band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1800;
    band.Q.value = 0.9;
    var noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.9, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
    noise.connect(band);
    band.connect(noiseGain);
    window.ToneEngine.connectDry(noiseGain);

    var osc = ctx.createOscillator();
    var oscGain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 190;
    oscGain.gain.setValueAtTime(0.5, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    osc.connect(oscGain);
    window.ToneEngine.connectDry(oscGain);

    noise.start(time);
    noise.stop(time + 0.16);
    osc.start(time);
    osc.stop(time + 0.09);
  }

  function playHat(time) {
    var ctx = window.ToneEngine.context();
    var noise = ctx.createBufferSource();
    noise.buffer = window.ToneEngine.getNoiseBuffer();
    var high = ctx.createBiquadFilter();
    high.type = "highpass";
    high.frequency.value = 7000;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
    noise.connect(high);
    high.connect(gain);
    window.ToneEngine.connectDry(gain);
    noise.start(time);
    noise.stop(time + 0.05);
  }

  function playClap(time) {
    var ctx = window.ToneEngine.context();
    [0, 0.01, 0.02].forEach(function (offset) {
      var noise = ctx.createBufferSource();
      noise.buffer = window.ToneEngine.getNoiseBuffer();
      var band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 1200;
      band.Q.value = 1.1;
      var gain = ctx.createGain();
      var t = time + offset;
      gain.gain.setValueAtTime(0.55, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      noise.connect(band);
      band.connect(gain);
      window.ToneEngine.connectDry(gain);
      noise.start(t);
      noise.stop(t + 0.09);
    });
  }

  var VOICES = { kick: playKick, snare: playSnare, hat: playHat, clap: playClap };

  function scheduleStep(step, time) {
    TRACKS.forEach(function (t) {
      if (pattern[t.id][step]) VOICES[t.id](time);
    });
    notesInQueue.push({ step: step, time: time });
  }

  function scheduler() {
    var ctx = window.ToneEngine.context();
    while (nextStepTime < ctx.currentTime + SCHEDULE_AHEAD_SEC) {
      scheduleStep(currentStep, nextStepTime);
      nextStepTime += stepDuration();
      currentStep = (currentStep + 1) % STEPS;
    }
    timerId = window.setTimeout(scheduler, LOOKAHEAD_MS);
  }

  var lastDrawnStep = -1;
  function draw() {
    if (!isPlaying) return;
    var ctx = window.ToneEngine.context();
    while (notesInQueue.length && notesInQueue[0].time < ctx.currentTime) {
      lastDrawnStep = notesInQueue[0].step;
      notesInQueue.shift();
    }
    if (lastDrawnStep !== -1) {
      stepListeners.forEach(function (fn) {
        fn(lastDrawnStep);
      });
    }
    window.requestAnimationFrame(draw);
  }

  function start() {
    if (isPlaying) return;
    window.ToneEngine.init();
    isPlaying = true;
    currentStep = 0;
    nextStepTime = window.ToneEngine.context().currentTime + 0.05;
    notesInQueue = [];
    lastDrawnStep = -1;
    scheduler();
    window.requestAnimationFrame(draw);
  }

  function stop() {
    isPlaying = false;
    window.clearTimeout(timerId);
    stepListeners.forEach(function (fn) {
      fn(-1);
    });
  }

  function toggle() {
    if (isPlaying) stop();
    else start();
    return isPlaying;
  }

  function toggleStep(trackId, index) {
    if (!pattern[trackId]) return false;
    pattern[trackId][index] = !pattern[trackId][index];
    return pattern[trackId][index];
  }

  function setBpm(value) {
    bpm = Math.max(40, Math.min(220, value));
  }

  function getBpm() {
    return bpm;
  }

  function onStep(fn) {
    stepListeners.push(fn);
  }

  // So the synth's optional arpeggiator can lock to the exact same
  // 16th-note grid as the drums, instead of running its own timer.
  function stepSeconds() {
    return stepDuration();
  }

  window.ToneSequencer = {
    tracks: TRACKS,
    steps: STEPS,
    pattern: pattern,
    isPlaying: function () { return isPlaying; },
    start: start,
    stop: stop,
    toggle: toggle,
    toggleStep: toggleStep,
    setBpm: setBpm,
    getBpm: getBpm,
    onStep: onStep,
    stepSeconds: stepSeconds,
  };
})();
