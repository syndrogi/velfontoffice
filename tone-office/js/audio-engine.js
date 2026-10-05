/**
 * TONE OFFICE — Audio Engine
 * One shared AudioContext and effect bus every module (sequencer.js,
 * synth.js) routes through, instead of each building its own graph.
 * Nothing in here makes sound by itself — it's wiring other modules
 * connect to.
 *
 * Signal path: voice -> delay send (wet) -> masterGain -> destination
 *                   \-> dry -------------/
 *
 * The context is created lazily, on init(), which app.js calls once
 * from the gate button's click handler — browsers refuse to start
 * (or silently start suspended) an AudioContext before a user gesture,
 * so nothing here can run on page load.
 */
(function () {
  var ctx = null;
  var masterGain = null;
  var dryGain = null;
  var delayNode = null;
  var delayFeedback = null;
  var delayWetGain = null;

  function init() {
    if (ctx) return ctx;
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    masterGain = ctx.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(ctx.destination);

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

  // Sequencer drum hits skip the delay send on purpose — a delayed kick/
  // hat reads as mud, not space. Only the synth (synth.js) uses
  // connectToBus above.
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
  };
})();
