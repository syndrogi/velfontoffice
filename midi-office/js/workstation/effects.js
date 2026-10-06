/**
 * MIDI OFFICE — EP-133 Workstation — Effects
 * The EP-133 has exactly one FX engine: a type selector plus two
 * knobs. This module models that faithfully — only one effect type
 * is ever actively processing audio, built lazily the first time it's
 * selected and torn down (fully disconnected, any oscillators
 * stopped) the moment you switch away from it.
 *
 * Three independent audio paths live here:
 *
 * 1. SEND/RETURN — each group (A-D) gets its own tiny send gain node
 *    tapping window.WorkstationAudio.getGroupInput(letter) (the SAME
 *    node every voice already plays into). The dry group signal is
 *    never touched — send sits in parallel, so SEND=0 is silent-FX,
 *    not silent-group. All four sends feed one shared fxInputBus ->
 *    the active effect -> fxOutputBus -> workstationMaster.
 *
 * 2. LIVE INPUT — a toggle-able mic path: getUserMedia ->
 *    MediaStreamAudioSourceNode -> input-gain -> mic-send-gain ->
 *    the SAME shared fxInputBus. There is no dry mic path: while
 *    enabled, the mic is only audible through whatever FX type is
 *    currently selected (OFF = silent mic), matching the EP-133's own
 *    "live input runs through the FX engine" model.
 *
 * 3. PUNCH-IN — momentary, held performance FX inserted directly into
 *    the fixed workstationMaster -> punchBus edge (see audio-
 *    engine.js's comment: that edge is punch bus's "one front door").
 *    Holding pad(s) in "fx" mode (keyboard.js calls punchIn()) swaps
 *    that single connection for a short series chain of the held
 *    pads' effects; releasing a pad ramps it to neutral then rebuilds
 *    the chain without it. Zero pads held = the original direct
 *    master->punchBus wire, fully transparent.
 *
 * SIDECHAIN detection mirrors sequencer.js's own tick-matching math
 * (patternTicks/localTick/normalized-event-tick) against the chosen
 * trigger group's active pattern, calling the already-implemented
 * window.WorkstationAudio.duck() — this file only detects hits, it
 * never duplicates playback.
 */
(function () {
  var P = window.WorkstationPatterns;
  var G = window.WorkstationGroups;
  var A = window.WorkstationAudio;
  var S = window.WorkstationSequencer;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function expLerp(a, b, t) {
    return a * Math.pow(b / a, t);
  }

  /* ================================================================
   * Shared node builders — reused by both the sustained FX chain and
   * the momentary punch-in effects below, so the two sections never
   * duplicate the same DSP logic.
   * ================================================================ */

  // Standard tanh-style soft-clip curve, scaled by drive (0-1).
  function buildDistortionCurve(drive) {
    var samples = 1024;
    var curve = new Float32Array(samples);
    var k = drive * 100;
    for (var i = 0; i < samples; i++) {
      var x = (i / (samples - 1)) * 2 - 1;
      curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
    }
    return curve;
  }

  // Procedurally generated reverb impulse: white noise shaped by an
  // exponential decay envelope — no bundled/fetched IR audio file.
  function generateImpulseResponse(ctx, lengthSec) {
    var rate = ctx.sampleRate;
    var length = Math.max(1, Math.floor(rate * lengthSec));
    var impulse = ctx.createBuffer(2, length, rate);
    for (var ch = 0; ch < 2; ch++) {
      var data = impulse.getChannelData(ch);
      for (var i = 0; i < length; i++) {
        var decay = Math.pow(1 - i / length, 2.5);
        data[i] = (Math.random() * 2 - 1) * decay;
      }
    }
    return impulse;
  }

  // A DelayNode modulated by an LFO through a depth-scaling gain into
  // delayTime — the chorus engine, and (with faster/shallower params)
  // punch pad 5's flanger.
  function buildModulatedDelay(ctx, rateHz, depthSec, feedbackAmt, baseDelaySec) {
    var delay = ctx.createDelay(1);
    delay.delayTime.value = baseDelaySec;
    var lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = rateHz;
    var depthGain = ctx.createGain();
    depthGain.gain.value = depthSec;
    lfo.connect(depthGain);
    depthGain.connect(delay.delayTime);
    lfo.start();
    var feedback = ctx.createGain();
    feedback.gain.value = feedbackAmt;
    delay.connect(feedback);
    feedback.connect(delay);
    return {
      delay: delay,
      setRate: function (hz) { lfo.frequency.setTargetAtTime(hz, ctx.currentTime, 0.02); },
      setDepth: function (sec) { depthGain.gain.setTargetAtTime(sec, ctx.currentTime, 0.02); },
      setFeedback: function (amt) { feedback.gain.setTargetAtTime(amt, ctx.currentTime, 0.02); },
      dispose: function () {
        try { lfo.stop(); } catch (e) { /* already stopped */ }
        lfo.disconnect();
        depthGain.disconnect();
        delay.disconnect();
        feedback.disconnect();
      },
    };
  }

  /* ================================================================
   * Sustained FX chain — SEND/RETURN
   * ================================================================ */

  var EFFECT_TYPES = ["DELAY", "REVERB", "DISTORTION", "CHORUS", "FILTER", "COMPRESSOR", "OFF"];
  var PARAM_LABELS = {
    DELAY: ["LENGTH", "FEEDBACK"],
    REVERB: ["LENGTH", "COLOR"],
    DISTORTION: ["DRIVE", "COLOR"],
    CHORUS: ["RATE", "DEPTH"],
    FILTER: ["CUTOFF", "RESONANCE"],
    COMPRESSOR: ["DRIVE", "SPEED"],
    OFF: ["—", "—"],
  };
  var paramsByType = {
    DELAY: [0.35, 0.4],
    REVERB: [0.5, 0.5],
    DISTORTION: [0.4, 0.5],
    CHORUS: [0.3, 0.4],
    FILTER: [0.6, 0.3],
    COMPRESSOR: [0.5, 0.5],
  };

  function buildDelayProcessor(ctx, p1, p2) {
    var delay = ctx.createDelay(1.5);
    var feedback = ctx.createGain();
    delay.delayTime.value = lerp(0.02, 1.2, p1);
    feedback.gain.value = lerp(0, 0.85, p2); // capped below 1.0 — no runaway
    delay.connect(feedback);
    feedback.connect(delay);
    return {
      input: delay,
      output: delay,
      setParams: function (a, b) {
        delay.delayTime.setTargetAtTime(lerp(0.02, 1.2, a), ctx.currentTime, 0.02);
        feedback.gain.setTargetAtTime(lerp(0, 0.85, b), ctx.currentTime, 0.02);
      },
      dispose: function () { delay.disconnect(); feedback.disconnect(); },
    };
  }

  function buildReverbProcessor(ctx, p1, p2) {
    var convolver = ctx.createConvolver();
    convolver.normalize = true;
    convolver.buffer = generateImpulseResponse(ctx, lerp(0.3, 4.0, p1));
    var colorFilter = ctx.createBiquadFilter();
    colorFilter.type = "lowpass";
    colorFilter.frequency.value = lerp(400, 14000, p2);
    convolver.connect(colorFilter);
    var regenTimer = null;
    return {
      input: convolver,
      output: colorFilter,
      // Length changes rebuild the IR buffer (not cheap) — debounced
      // so dragging the knob doesn't regenerate on every tick. Color
      // only touches the post-convolver filter, so it stays instant.
      setParams: function (a, b) {
        colorFilter.frequency.setTargetAtTime(lerp(400, 14000, b), ctx.currentTime, 0.02);
        clearTimeout(regenTimer);
        regenTimer = setTimeout(function () {
          convolver.buffer = generateImpulseResponse(ctx, lerp(0.3, 4.0, a));
        }, 150);
      },
      dispose: function () {
        clearTimeout(regenTimer);
        convolver.disconnect();
        colorFilter.disconnect();
      },
    };
  }

  function buildDistortionProcessor(ctx, p1, p2) {
    var shaper = ctx.createWaveShaper();
    shaper.curve = buildDistortionCurve(p1);
    shaper.oversample = "2x";
    var colorFilter = ctx.createBiquadFilter();
    colorFilter.type = "lowpass";
    colorFilter.frequency.value = lerp(400, 12000, p2);
    shaper.connect(colorFilter);
    return {
      input: shaper,
      output: colorFilter,
      setParams: function (a, b) {
        shaper.curve = buildDistortionCurve(a);
        colorFilter.frequency.setTargetAtTime(lerp(400, 12000, b), ctx.currentTime, 0.02);
      },
      dispose: function () { shaper.disconnect(); colorFilter.disconnect(); },
    };
  }

  function buildChorusProcessor(ctx, p1, p2) {
    var mod = buildModulatedDelay(ctx, lerp(0.1, 6, p1), lerp(0.0005, 0.006, p2), lerp(0, 0.3, p2), 0.012);
    return {
      input: mod.delay,
      output: mod.delay,
      setParams: function (a, b) {
        mod.setRate(lerp(0.1, 6, a));
        mod.setDepth(lerp(0.0005, 0.006, b));
        mod.setFeedback(lerp(0, 0.3, b));
      },
      dispose: mod.dispose,
    };
  }

  function buildFilterProcessor(ctx, p1, p2) {
    var filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = expLerp(80, 12000, p1);
    filter.Q.value = lerp(0.1, 20, p2);
    return {
      input: filter,
      output: filter,
      setParams: function (a, b) {
        filter.frequency.setTargetAtTime(expLerp(80, 12000, a), ctx.currentTime, 0.02);
        filter.Q.setTargetAtTime(lerp(0.1, 20, b), ctx.currentTime, 0.02);
      },
      dispose: function () { filter.disconnect(); },
    };
  }

  function applyCompressorParams(comp, ctx, drive, speed) {
    var now = ctx.currentTime;
    comp.threshold.setTargetAtTime(lerp(0, -40, drive), now, 0.02);
    comp.ratio.setTargetAtTime(lerp(1, 20, drive), now, 0.02);
    comp.attack.setTargetAtTime(lerp(0.3, 0.001, speed), now, 0.02);
    comp.release.setTargetAtTime(lerp(1.0, 0.05, speed), now, 0.02);
  }

  function buildCompressorProcessor(ctx, p1, p2) {
    var comp = ctx.createDynamicsCompressor();
    applyCompressorParams(comp, ctx, p1, p2);
    return {
      input: comp,
      output: comp,
      setParams: function (a, b) { applyCompressorParams(comp, ctx, a, b); },
      dispose: function () { comp.disconnect(); },
    };
  }

  var PROCESSOR_BUILDERS = {
    DELAY: buildDelayProcessor,
    REVERB: buildReverbProcessor,
    DISTORTION: buildDistortionProcessor,
    CHORUS: buildChorusProcessor,
    FILTER: buildFilterProcessor,
    COMPRESSOR: buildCompressorProcessor,
  };

  var fxReady = false;
  var fxInputBus = null;
  var fxOutputBus = null;
  var sendNodeByLetter = {};
  var sendLevelByLetter = { A: 0, B: 0, C: 0, D: 0 };
  var currentType = "OFF";
  var activeProcessor = null;

  function ensureFxGraph() {
    if (fxReady) return;
    var ctx = A.context();
    fxInputBus = ctx.createGain();
    fxOutputBus = ctx.createGain();
    fxOutputBus.connect(A.getWorkstationMaster());
    G.LETTERS.forEach(function (letter) {
      var send = ctx.createGain();
      send.gain.value = sendLevelByLetter[letter];
      A.getGroupInput(letter).connect(send);
      send.connect(fxInputBus);
      sendNodeByLetter[letter] = send;
    });
    fxReady = true;
  }

  // Switching type disconnects the outgoing processor's two bus edges
  // and disposes its nodes (stops any oscillators) before building
  // the next one — never more than one effect live at a time.
  function setEffectType(type) {
    if (EFFECT_TYPES.indexOf(type) === -1 || type === currentType) return;
    ensureFxGraph();
    if (activeProcessor) {
      fxInputBus.disconnect(activeProcessor.input);
      activeProcessor.output.disconnect(fxOutputBus);
      activeProcessor.dispose();
      activeProcessor = null;
    }
    currentType = type;
    if (type === "OFF") return;
    var ctx = A.context();
    var params = paramsByType[type];
    var built = PROCESSOR_BUILDERS[type](ctx, params[0], params[1]);
    fxInputBus.connect(built.input);
    built.output.connect(fxOutputBus);
    activeProcessor = built;
  }

  function setParam(index, value01) {
    if (currentType === "OFF" || !activeProcessor) return;
    paramsByType[currentType][index] = value01;
    activeProcessor.setParams(paramsByType[currentType][0], paramsByType[currentType][1]);
  }

  function setSendLevel(letter, value01) {
    sendLevelByLetter[letter] = value01;
    ensureFxGraph();
    sendNodeByLetter[letter].gain.setTargetAtTime(value01, A.context().currentTime, 0.02);
  }

  /* ================================================================
   * Live input — microphone through the same shared FX chain
   * ================================================================ */

  var micGainValue = 0.8;
  var micSendValue = 0.5;
  var micState = { enabled: false, stream: null, sourceNode: null, inputGain: null, sendGain: null, status: "MIC OFF" };

  function enableMic() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      micState.status = "MIC UNAVAILABLE";
      return Promise.resolve(false);
    }
    return navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(function (stream) {
        ensureFxGraph();
        var ctx = A.context();
        micState.stream = stream;
        micState.sourceNode = ctx.createMediaStreamSource(stream);
        micState.inputGain = ctx.createGain();
        micState.inputGain.gain.value = micGainValue;
        micState.sendGain = ctx.createGain();
        micState.sendGain.gain.value = micSendValue;
        micState.sourceNode.connect(micState.inputGain);
        micState.inputGain.connect(micState.sendGain);
        micState.sendGain.connect(fxInputBus);
        micState.enabled = true;
        micState.status = "LIVE ON";
        return true;
      })
      .catch(function () {
        micState.status = "MIC UNAVAILABLE";
        micState.enabled = false;
        return false;
      });
  }

  function disableMic() {
    if (micState.stream) micState.stream.getTracks().forEach(function (track) { track.stop(); });
    if (micState.sourceNode) micState.sourceNode.disconnect();
    if (micState.inputGain) micState.inputGain.disconnect();
    if (micState.sendGain) micState.sendGain.disconnect();
    micState.stream = null;
    micState.sourceNode = null;
    micState.inputGain = null;
    micState.sendGain = null;
    micState.enabled = false;
    micState.status = "MIC OFF";
  }

  function setMicGain(value01) {
    micGainValue = value01;
    if (micState.inputGain) micState.inputGain.gain.setTargetAtTime(value01, A.context().currentTime, 0.02);
  }

  function setMicSend(value01) {
    micSendValue = value01;
    if (micState.sendGain) micState.sendGain.gain.setTargetAtTime(value01, A.context().currentTime, 0.02);
  }

  /* ================================================================
   * Punch-in FX — momentary, held, inserted into the punch bus's one
   * front-door connection (workstationMaster -> punchBus)
   * ================================================================ */

  function buildPunchFilterSweep(type, startFreq, endFreq, q, sweepMs) {
    return function (ctx) {
      var filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = startFreq;
      filter.Q.value = q;
      filter.frequency.linearRampToValueAtTime(endFreq, ctx.currentTime + sweepMs / 1000);
      return {
        input: filter,
        output: filter,
        release: function (rctx, rnow) {
          filter.frequency.cancelScheduledValues(rnow);
          filter.frequency.setTargetAtTime(startFreq, rnow, 0.04);
        },
        dispose: function () { filter.disconnect(); },
      };
    };
  }

  function buildPunchBandpass(freq, q) {
    return function (ctx) {
      var filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = freq;
      filter.Q.value = q;
      return { input: filter, output: filter, release: null, dispose: function () { filter.disconnect(); } };
    };
  }

  function buildPunchShelf(type, freq, gainDb) {
    return function (ctx) {
      var filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      filter.gain.value = gainDb;
      return { input: filter, output: filter, release: null, dispose: function () { filter.disconnect(); } };
    };
  }

  function buildPunchDistortion(drive) {
    return function (ctx) {
      var shaper = ctx.createWaveShaper();
      shaper.curve = buildDistortionCurve(drive);
      shaper.oversample = "4x";
      return { input: shaper, output: shaper, release: null, dispose: function () { shaper.disconnect(); } };
    };
  }

  function buildPunchDelayStutter(delayTimeSec, feedbackAmt) {
    return function (ctx) {
      var delay = ctx.createDelay(1);
      delay.delayTime.value = delayTimeSec;
      var feedback = ctx.createGain();
      feedback.gain.value = feedbackAmt;
      delay.connect(feedback);
      feedback.connect(delay);
      return {
        input: delay,
        output: delay,
        release: function (rctx, rnow) { feedback.gain.setTargetAtTime(0, rnow, 0.05); },
        dispose: function () { delay.disconnect(); feedback.disconnect(); },
      };
    };
  }

  // Amplitude modulation via a GainNode whose .gain AudioParam has an
  // LFO summed into it — center value is the param's own intrinsic
  // value, no extra ConstantSourceNode needed.
  function buildPunchTremolo(rateHz, floorGain, waveType) {
    return function (ctx) {
      var vca = ctx.createGain();
      vca.gain.value = (1 + floorGain) / 2;
      var lfo = ctx.createOscillator();
      lfo.type = waveType;
      lfo.frequency.value = rateHz;
      var lfoScale = ctx.createGain();
      lfoScale.gain.value = (1 - floorGain) / 2;
      lfo.connect(lfoScale);
      lfoScale.connect(vca.gain);
      lfo.start();
      return {
        input: vca,
        output: vca,
        release: null,
        dispose: function () {
          try { lfo.stop(); } catch (e) { /* already stopped */ }
          lfo.disconnect();
          lfoScale.disconnect();
          vca.disconnect();
        },
      };
    };
  }

  function buildPunchModulatedDelay(rateHz, depthSec, feedbackAmt, baseDelaySec) {
    return function (ctx) {
      var mod = buildModulatedDelay(ctx, rateHz, depthSec, feedbackAmt, baseDelaySec);
      return {
        input: mod.delay,
        output: mod.delay,
        release: function () { mod.setFeedback(0); },
        dispose: mod.dispose,
      };
    };
  }

  function buildPunchReverbSplash(lengthSec, colorHz) {
    return function (ctx) {
      var convolver = ctx.createConvolver();
      convolver.normalize = true;
      convolver.buffer = generateImpulseResponse(ctx, lengthSec);
      var colorFilter = ctx.createBiquadFilter();
      colorFilter.type = "lowpass";
      colorFilter.frequency.value = colorHz;
      convolver.connect(colorFilter);
      return {
        input: convolver,
        output: colorFilter,
        release: null,
        dispose: function () { convolver.disconnect(); colorFilter.disconnect(); },
      };
    };
  }

  // One sensible momentary effect per pad (0-11). EP-133 says these
  // combine, so each is a self-contained node chain that can sit
  // anywhere in the series stack alongside any of the others.
  var PUNCH_DEFS = [
    buildPunchFilterSweep("lowpass", 18000, 250, 0.9, 500), // 0 lowpass sweep down
    buildPunchFilterSweep("highpass", 20, 3500, 0.9, 500),  // 1 highpass sweep up
    buildPunchDistortion(0.85),                             // 2 distortion spike
    buildPunchDelayStutter(0.09, 0.55),                      // 3 short feedback-delay stutter
    buildPunchTremolo(9, 0.1, "square"),                     // 4 tremolo chop
    buildPunchModulatedDelay(0.6, 0.003, 0.4, 0.004),        // 5 flanger sweep
    buildPunchReverbSplash(1.2, 3500),                       // 6 reverb splash
    buildPunchBandpass(1200, 5),                             // 7 telephone bandpass
    buildPunchTremolo(16, 0.05, "square"),                   // 8 trance gate
    buildPunchDelayStutter(0.38, 0.5),                       // 9 long delay wash
    buildPunchShelf("lowshelf", 150, 9),                     // 10 low boost
    buildPunchShelf("highshelf", 6000, 9),                   // 11 high sparkle / air
  ];

  var activePunchPads = {}; // padIndex -> { input, output(wet), wet, release, dispose, releaseTimer }

  function buildPunchNode(padIndex) {
    var def = PUNCH_DEFS[padIndex];
    if (!def) return null;
    var ctx = A.context();
    var built = def(ctx);
    var wet = ctx.createGain();
    built.output.connect(wet);
    return { input: built.input, output: wet, wet: wet, release: built.release, dispose: built.dispose };
  }

  // Rebuilds the tiny series chain between workstationMaster and
  // punchBus from whatever pads are currently held — the "one front-
  // door connection" swap. No pads held = the original transparent
  // direct wire.
  function rebuildPunchChain() {
    var master = A.getWorkstationMaster();
    var bus = A.getPunchBus();
    master.disconnect();
    var order = Object.keys(activePunchPads).map(Number).sort(function (a, b) { return a - b; });
    if (order.length === 0) {
      master.connect(bus);
      return;
    }
    var prev = master;
    order.forEach(function (padIndex) {
      var node = activePunchPads[padIndex];
      prev.connect(node.input);
      prev = node.output;
    });
    prev.connect(bus);
  }

  function releasePunchPad(padIndex) {
    var node = activePunchPads[padIndex];
    if (!node) return;
    var ctx = A.context();
    var now = ctx.currentTime;
    if (node.release) node.release(ctx, now);
    node.wet.gain.setTargetAtTime(0, now, 0.03);
    node.releaseTimer = setTimeout(function () {
      if (activePunchPads[padIndex] !== node) return; // superseded (panic or re-press)
      delete activePunchPads[padIndex];
      node.dispose();
      rebuildPunchChain();
    }, 150);
  }

  function punchIn(padIndex, active) {
    if (padIndex == null || padIndex < 0 || padIndex > 11) return;
    if (active) {
      if (activePunchPads[padIndex]) return;
      var node = buildPunchNode(padIndex);
      if (!node) return;
      activePunchPads[padIndex] = node;
      rebuildPunchChain();
    } else {
      releasePunchPad(padIndex);
    }
  }

  // Safety net mirroring the precedent already set by audio-engine.js
  // (panic) and keyboard.js (documented multi-listener Escape) — if a
  // pad is held through a panic (e.g. mouse left the window), this
  // guarantees the punch bus still returns to transparent instead of
  // leaving a stuck filter/oscillator engaged forever.
  function releaseAllPunchImmediate() {
    Object.keys(activePunchPads).forEach(function (padIndex) {
      var node = activePunchPads[padIndex];
      if (node.releaseTimer) clearTimeout(node.releaseTimer);
      node.dispose();
    });
    activePunchPads = {};
    rebuildPunchChain();
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") releaseAllPunchImmediate();
  });

  /* ================================================================
   * Sidechain — detection only; playback already lives in sequencer.js
   * ================================================================ */

  var sidechain = {
    triggerLetter: "A",
    targetLetters: {},
    lengthSec: 0.2,
    shape: 0.5,
    depth: 0.8,
  };

  // Mirrors sequencer.js's onTransportTick matching exactly
  // (patternTicks/localTick/normalized event tick) so a "hit" here is
  // the same hit that actually plays, just without re-triggering it.
  function onSidechainTick(tick) {
    var group = G.getGroup(sidechain.triggerLetter);
    var patternId = group.activePatternId;
    if (!patternId) return;
    var pattern = P.getPattern(patternId);
    if (!pattern) return;
    var patternTicks = pattern.lengthSteps * P.ticksPerStep();
    var localTick = ((tick % patternTicks) + patternTicks) % patternTicks;
    var hit = pattern.lanes.some(function (lane) {
      return lane.some(function (e) {
        var eventTick = e.step * P.ticksPerStep() + (e.offsetTicks || 0);
        var normalized = ((eventTick % patternTicks) + patternTicks) % patternTicks;
        return normalized === localTick;
      });
    });
    if (!hit) return;
    Object.keys(sidechain.targetLetters).forEach(function (targetLetter) {
      if (!sidechain.targetLetters[targetLetter]) return;
      A.duck(targetLetter, sidechain.lengthSec, sidechain.shape, sidechain.depth);
    });
  }

  S.onStep(onSidechainTick);

  /* ================================================================
   * UI
   * ================================================================ */

  function buildFxMarkup(letter) {
    var labels = PARAM_LABELS[currentType];
    var params = paramsByType[currentType] || [0, 0];
    var disabledAttr = currentType === "OFF" ? "disabled" : "";
    var sendValue = Math.round((sendLevelByLetter[letter] || 0) * 100);

    var typeOptions = EFFECT_TYPES.map(function (type) {
      return '<option value="' + type + '"' + (type === currentType ? " selected" : "") + ">" + type + "</option>";
    }).join("");

    var triggerOptions = G.LETTERS.map(function (l) {
      return '<option value="' + l + '"' + (l === sidechain.triggerLetter ? " selected" : "") + ">" + l + "</option>";
    }).join("");

    var targetChecks = G.LETTERS.map(function (l) {
      var checked = sidechain.targetLetters[l] ? " checked" : "";
      return (
        '<label class="ws-field"><input type="checkbox" data-target-letter="' + l + '"' + checked + '><span>' + l + "</span></label>"
      );
    }).join("");

    return (
      '<div class="ws-row">' +
        '<label class="ws-field"><span>TYPE</span><select id="wsFxType">' + typeOptions + "</select></label>" +
        '<label class="ws-field"><span>' + labels[0] + '</span><input type="range" id="wsFxP1" min="0" max="100" value="' +
          Math.round(params[0] * 100) + '" ' + disabledAttr + "></label>" +
        '<label class="ws-field"><span>' + labels[1] + '</span><input type="range" id="wsFxP2" min="0" max="100" value="' +
          Math.round(params[1] * 100) + '" ' + disabledAttr + "></label>" +
        '<label class="ws-field"><span>SEND ' + letter + '</span><input type="range" id="wsFxSend" min="0" max="100" value="' +
          sendValue + '"></label>' +
      "</div>" +
      '<div class="ws-row ws-fx-live">' +
        '<button type="button" class="ws-mini' + (micState.enabled ? " ws-is-active" : "") + '" id="wsFxMicToggle">LIVE INPUT</button>' +
        '<span class="ws-hint-block" id="wsFxMicStatus">' + micState.status + "</span>" +
        '<label class="ws-field"><span>GAIN</span><input type="range" id="wsFxMicGain" min="0" max="100" value="' +
          Math.round(micGainValue * 100) + '"></label>' +
        '<label class="ws-field"><span>MIC SEND</span><input type="range" id="wsFxMicSend" min="0" max="100" value="' +
          Math.round(micSendValue * 100) + '"></label>' +
      "</div>" +
      '<div class="ws-fx-sidechain">' +
        '<div class="ws-row">' +
          '<label class="ws-field"><span>SC TRIGGER</span><select id="wsFxScTrigger">' + triggerOptions + "</select></label>" +
          '<div class="ws-fx-sc-targets">' + targetChecks + "</div>" +
        "</div>" +
        '<div class="ws-row">' +
          '<label class="ws-field"><span>LENGTH</span><input type="range" id="wsFxScLength" min="2" max="100" value="' +
            Math.round(sidechain.lengthSec * 100) + '"></label>' +
          '<label class="ws-field"><span>SHAPE</span><input type="range" id="wsFxScShape" min="0" max="100" value="' +
            Math.round(sidechain.shape * 100) + '"></label>' +
          '<label class="ws-field"><span>DEPTH</span><input type="range" id="wsFxScDepth" min="0" max="100" value="' +
            Math.round(sidechain.depth * 100) + '"></label>' +
        "</div>" +
      "</div>"
    );
  }

  function wireFxControls(wrap, container, letter) {
    wrap.querySelector("#wsFxType").addEventListener("change", function (e) {
      setEffectType(e.target.value);
      render(container, letter);
    });
    wrap.querySelector("#wsFxP1").addEventListener("input", function (e) {
      setParam(0, Number(e.target.value) / 100);
    });
    wrap.querySelector("#wsFxP2").addEventListener("input", function (e) {
      setParam(1, Number(e.target.value) / 100);
    });
    wrap.querySelector("#wsFxSend").addEventListener("input", function (e) {
      setSendLevel(letter, Number(e.target.value) / 100);
    });

    wrap.querySelector("#wsFxMicToggle").addEventListener("click", function () {
      if (micState.enabled) {
        disableMic();
        render(container, letter);
        return;
      }
      enableMic().then(function () { render(container, letter); });
    });
    wrap.querySelector("#wsFxMicGain").addEventListener("input", function (e) {
      setMicGain(Number(e.target.value) / 100);
    });
    wrap.querySelector("#wsFxMicSend").addEventListener("input", function (e) {
      setMicSend(Number(e.target.value) / 100);
    });

    wrap.querySelector("#wsFxScTrigger").addEventListener("change", function (e) {
      sidechain.triggerLetter = e.target.value;
    });
    wrap.querySelectorAll("[data-target-letter]").forEach(function (box) {
      box.addEventListener("change", function (e) {
        sidechain.targetLetters[e.target.dataset.targetLetter] = e.target.checked;
      });
    });
    wrap.querySelector("#wsFxScLength").addEventListener("input", function (e) {
      sidechain.lengthSec = Number(e.target.value) / 100;
    });
    wrap.querySelector("#wsFxScShape").addEventListener("input", function (e) {
      sidechain.shape = Number(e.target.value) / 100;
    });
    wrap.querySelector("#wsFxScDepth").addEventListener("input", function (e) {
      sidechain.depth = Number(e.target.value) / 100;
    });
  }

  function render(container, letter) {
    container.innerHTML = "";
    ensureFxGraph();
    var wrap = document.createElement("div");
    wrap.className = "ws-fx";
    wrap.innerHTML = buildFxMarkup(letter);
    container.appendChild(wrap);
    wireFxControls(wrap, container, letter);
  }

  function getStatusText() {
    var parts = [currentType === "OFF" ? "FX OFF" : currentType];
    if (Object.keys(activePunchPads).length > 0) parts.push("PUNCH");
    if (micState.enabled) parts.push("MIC");
    return parts.join(" ");
  }

  window.WorkstationEffects = {
    render: render,
    punchIn: punchIn,
    getStatusText: getStatusText,
  };
})();
