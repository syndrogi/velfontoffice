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
  var gridEl = null; // the currently-rendered step grid, if the window is open

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

  function setStep(trackId, index, value) {
    if (!pattern[trackId]) return;
    pattern[trackId][index] = !!value;
  }

  // AI Jam's "Generate beat" — not a real model, just a few weighted-
  // probability rules per track (kick favors the downbeats, hats are
  // dense, snare/clap favor backbeats) so the result reads as a beat
  // rather than pure noise. See js/ai-jam.js.
  function randomizePattern() {
    TRACKS.forEach(function (t) {
      for (var i = 0; i < STEPS; i++) {
        var onDownbeat = i % 4 === 0;
        var onBackbeat = i % 8 === 4;
        var chance = 0.12;
        if (t.id === "kick") chance = onDownbeat ? 0.85 : 0.08;
        if (t.id === "snare") chance = onBackbeat ? 0.9 : 0.05;
        if (t.id === "hat") chance = i % 2 === 0 ? 0.75 : 0.35;
        if (t.id === "clap") chance = onBackbeat ? 0.3 : 0.03;
        pattern[t.id][i] = Math.random() < chance;
      }
    });
    refreshGridUI();
  }

  function refreshGridUI() {
    if (!gridEl) return;
    var steps = gridEl.querySelectorAll(".tone-seq-step");
    steps.forEach(function (el) {
      var on = pattern[el.dataset.track][Number(el.dataset.step)];
      el.classList.toggle("tone-is-active", on);
    });
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

  // Playhead highlight — registered once, no-ops whenever the window
  // isn't open (gridEl null), rather than being re-added every time
  // buildWindow() runs (which would stack duplicate listeners across
  // repeated open/close cycles).
  onStep(function (stepIndex) {
    if (!gridEl) return;
    var steps = gridEl.querySelectorAll(".tone-seq-step");
    steps.forEach(function (el) {
      el.classList.toggle("tone-is-playhead", Number(el.dataset.step) === stepIndex);
    });
  });

  // So the synth's optional arpeggiator can lock to the exact same
  // 16th-note grid as the drums, instead of running its own timer.
  function stepSeconds() {
    return stepDuration();
  }

  function buildWindow(container) {
    gridEl = document.createElement("div");
    gridEl.className = "tone-seq-tracks";

    TRACKS.forEach(function (track) {
      var row = document.createElement("div");
      row.className = "tone-seq-track";

      var label = document.createElement("span");
      label.className = "tone-seq-track-label";
      label.textContent = track.name;
      row.appendChild(label);

      var steps = document.createElement("div");
      steps.className = "tone-seq-steps";
      for (var i = 0; i < STEPS; i++) {
        var step = document.createElement("button");
        step.type = "button";
        step.className = "tone-seq-step";
        if (i % 4 === 0) step.classList.add("tone-is-beat");
        if (pattern[track.id][i]) step.classList.add("tone-is-active");
        step.setAttribute("aria-label", track.name + " step " + (i + 1));
        step.dataset.track = track.id;
        step.dataset.step = String(i);
        step.addEventListener("click", function () {
          window.ToneEngine.init();
          var on = toggleStep(this.dataset.track, Number(this.dataset.step));
          this.classList.toggle("tone-is-active", on);
        });
        steps.appendChild(step);
      }
      row.appendChild(steps);
      gridEl.appendChild(row);
    });

    var actions = document.createElement("div");
    actions.className = "tone-seq-actions";
    var clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "tone-mini-btn";
    clearBtn.textContent = "CLEAR";
    clearBtn.addEventListener("click", function () {
      TRACKS.forEach(function (t) {
        for (var i = 0; i < STEPS; i++) pattern[t.id][i] = false;
      });
      refreshGridUI();
    });
    actions.appendChild(clearBtn);

    container.appendChild(gridEl);
    container.appendChild(actions);

    return function cleanup() {
      gridEl = null;
    };
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
    setStep: setStep,
    randomizePattern: randomizePattern,
    setBpm: setBpm,
    getBpm: getBpm,
    onStep: onStep,
    stepSeconds: stepSeconds,
    buildWindow: buildWindow,
  };
})();
