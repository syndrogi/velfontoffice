/**
 * MIDI OFFICE — Audio Engine
 * One shared AudioContext and effect bus every module routes through,
 * instead of each building its own graph. Nothing in here makes sound
 * by itself — it's wiring other modules connect to.
 *
 * Signal path: voice -> delay send (wet) -> masterGain -> destination
 *                   \-> dry -------------/              \-> recorder tap
 *
 * The context is created lazily, on init() — every module calls this
 * defensively before touching audio, so the very first real gesture
 * (pressing a key, hitting a pad, tapping play) is what actually starts
 * it. Browsers refuse to start (or silently start suspended) an
 * AudioContext before a user gesture, which is also why there's no
 * dedicated "tap to enter" screen — init() just no-ops until that first
 * real interaction happens anyway.
 */
(function () {
  var ctx = null;
  var masterGain = null;
  var dryGain = null;
  var delayNode = null;
  var delayFeedback = null;
  var delayWetGain = null;
  var recorderDestination = null;

  function init() {
    if (ctx) return ctx;
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    masterGain = ctx.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(ctx.destination);

    recorderDestination = ctx.createMediaStreamDestination();
    masterGain.connect(recorderDestination);

    dryGain = ctx.createGain();
    dryGain.gain.value = 1;
    dryGain.connect(masterGain);

    delayNode = ctx.createDelay(2);
    delayNode.delayTime.value = 0.26;
    delayFeedback = ctx.createGain();
    delayFeedback.gain.value = 0.35;
    delayWetGain = ctx.createGain();
    delayWetGain.gain.value = 0.25;

    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayNode.connect(delayWetGain);
    delayWetGain.connect(masterGain);

    return ctx;
  }

  // Voices call this instead of connecting straight to masterGain, so
  // every note automatically gets a (possibly zero) dose of delay.
  function connectToBus(node) {
    node.connect(dryGain);
    node.connect(delayNode);
  }

  // Drum hits, sampler pads, and DJ decks skip the delay send on
  // purpose — a delayed kick/pad reads as mud, not space. Only the
  // synth (synth.js) uses connectToBus above.
  function connectDry(node) {
    node.connect(masterGain);
  }

  function setMasterVolume(v) {
    if (masterGain) masterGain.gain.setTargetAtTime(v, ctx.currentTime, 0.01);
  }

  function setDelayTime(seconds) {
    if (delayNode) delayNode.delayTime.setTargetAtTime(seconds, ctx.currentTime, 0.01);
  }

  function setDelayFeedback(amount) {
    if (delayFeedback) delayFeedback.gain.setTargetAtTime(amount, ctx.currentTime, 0.01);
  }

  function setDelayMix(amount) {
    if (delayWetGain) delayWetGain.gain.setTargetAtTime(amount, ctx.currentTime, 0.01);
  }

  // recorder.js's MediaRecorder attaches to this — it's a tap on the
  // exact same signal masterGain sends to the speakers, post-volume,
  // so a take sounds like what you actually heard while recording it.
  function getRecorderStream() {
    init();
    return recorderDestination.stream;
  }

  // Small reusable white-noise buffer — the drum synthesis in
  // sequencer.js needs it for hat/snare/clap and there's no reason for
  // each hit to regenerate one.
  var noiseBuffer = null;
  function getNoiseBuffer() {
    if (noiseBuffer) return noiseBuffer;
    var c = init();
    var length = c.sampleRate * 1; // 1 second, looped/sliced as needed
    noiseBuffer = c.createBuffer(1, length, c.sampleRate);
    var data = noiseBuffer.getChannelData(0);
    for (var i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuffer;
  }

  // Shared by sampler.js and dj.js — decodes a user-picked file into an
  // AudioBuffer. Reads it straight off disk via FileReader; nothing is
  // ever uploaded anywhere.
  function decodeFile(file) {
    var c = init();
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        c.decodeAudioData(reader.result, resolve, reject);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  window.ToneEngine = {
    init: init,
    context: function () { return ctx; },
    connectToBus: connectToBus,
    connectDry: connectDry,
    setMasterVolume: setMasterVolume,
    setDelayTime: setDelayTime,
    setDelayFeedback: setDelayFeedback,
    setDelayMix: setDelayMix,
    getNoiseBuffer: getNoiseBuffer,
    getRecorderStream: getRecorderStream,
    decodeFile: decodeFile,
  };
})();
