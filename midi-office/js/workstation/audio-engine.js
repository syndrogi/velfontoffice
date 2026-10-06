/**
 * MIDI OFFICE — EP-133 Workstation — Audio Engine
 * The workstation's own node graph, rooted at window.ToneEngine's
 * shared AudioContext (one context for the whole page — this never
 * calls `new AudioContext()` itself). Its final output feeds into
 * ToneEngine.connectDry(), so the workstation is "just another
 * source" on the same master bus the existing Recorder module already
 * taps — recording captures the workstation automatically, with no
 * second recorder needed.
 *
 * Signal path per group (A-D):
 *   voice -> groupInput[g] -> groupDuck[g] (sidechain) -> groupFader[g] -> workstationMaster
 *                   \-> (effects.js's sends tap groupInput[g] directly)
 *
 * workstationMaster -> punchBus (effects.js's momentary FX run here)
 *                    -> limiter (safety) -> ToneEngine.connectDry()
 *
 * Panic (Esc) force-silences every registered voice immediately —
 * see registerVoice()/panic() below. Every module that starts a
 * voice (sampler.js, keys-mode.js) must register it here so panic can
 * actually reach it; this is the one place "stop everything" lives.
 */
(function () {
  var GROUPS = ["A", "B", "C", "D"];
  var ready = false;

  var workstationMaster = null;
  var punchBus = null;
  var limiter = null;
  var groupInput = {};
  var groupDuck = {};
  var groupFader = {};

  var activeVoices = []; // { stop: fn }

  function ensureGraph() {
    if (ready) return;
    var ctx = window.ToneEngine.init();

    workstationMaster = ctx.createGain();
    workstationMaster.gain.value = 0.85;

    punchBus = ctx.createGain();
    punchBus.gain.value = 1;

    limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.06;

    workstationMaster.connect(punchBus);
    punchBus.connect(limiter);
    window.ToneEngine.connectDry(limiter);

    GROUPS.forEach(function (g) {
      var input = ctx.createGain();
      input.gain.value = 1;
      var duck = ctx.createGain();
      duck.gain.value = 1;
      var fader = ctx.createGain();
      fader.gain.value = 0.8;

      input.connect(duck);
      duck.connect(fader);
      fader.connect(workstationMaster);

      groupInput[g] = input;
      groupDuck[g] = duck;
      groupFader[g] = fader;
    });

    ready = true;
  }

  function context() {
    ensureGraph();
    return window.ToneEngine.context();
  }

  function getGroupInput(letter) {
    ensureGraph();
    return groupInput[letter];
  }

  function getPunchBus() {
    ensureGraph();
    return punchBus;
  }

  function getWorkstationMaster() {
    ensureGraph();
    return workstationMaster;
  }

  function setGroupFader(letter, value) {
    ensureGraph();
    var ctx = context();
    groupFader[letter].gain.setTargetAtTime(value, ctx.currentTime, 0.01);
  }

  // Sidechain ducking — called by effects.js when a trigger group's
  // sound fires. Ramps the target group's duck gain down then back up
  // over `lengthSec`, shaped by `shape` (0 = linear, 1 = more scooped/
  // exponential-feeling release, matching the EP-133's LENGTH/SHAPE
  // sidechain knobs).
  function duck(targetLetter, lengthSec, shape, depth) {
    ensureGraph();
    var node = groupDuck[targetLetter];
    if (!node) return;
    var ctx = context();
    var now = ctx.currentTime;
    var floor = Math.max(0, 1 - (depth != null ? depth : 0.8));
    node.gain.cancelScheduledValues(now);
    node.gain.setValueAtTime(floor, now);
    if (shape && shape > 0.5) {
      node.gain.exponentialRampToValueAtTime(Math.max(1, floor + 0.001), now + lengthSec);
    } else {
      node.gain.linearRampToValueAtTime(1, now + lengthSec);
    }
  }

  // Every voice-starting module registers a stop callback so panic()
  // can actually reach it. Returns an unregister function to call once
  // the voice naturally finishes, so the list doesn't grow forever.
  function registerVoice(stopFn) {
    var entry = { stop: stopFn };
    activeVoices.push(entry);
    return function unregister() {
      var idx = activeVoices.indexOf(entry);
      if (idx !== -1) activeVoices.splice(idx, 1);
    };
  }

  // Esc — immediately silences every registered voice across every
  // group. Also resets group faders' duck state so nothing stays
  // stuck ducked.
  function panic() {
    activeVoices.slice().forEach(function (entry) {
      try {
        entry.stop();
      } catch (e) {
        /* a misbehaving voice can't be allowed to block the rest */
      }
    });
    activeVoices.length = 0;
    if (ready) {
      var ctx = context();
      GROUPS.forEach(function (g) {
        groupDuck[g].gain.cancelScheduledValues(ctx.currentTime);
        groupDuck[g].gain.setValueAtTime(1, ctx.currentTime);
      });
    }
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") panic();
  });

  window.WorkstationAudio = {
    groups: GROUPS,
    context: context,
    getGroupInput: getGroupInput,
    getPunchBus: getPunchBus,
    getWorkstationMaster: getWorkstationMaster,
    setGroupFader: setGroupFader,
    duck: duck,
    registerVoice: registerVoice,
    panic: panic,
  };
})();
