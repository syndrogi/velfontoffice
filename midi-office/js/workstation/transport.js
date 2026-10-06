/**
 * MIDI OFFICE — EP-133 Workstation — Transport
 * Owns the clock: BPM, time signature, metronome, tap tempo, and the
 * actual lookahead scheduler (standard Web Audio pattern — schedule a
 * little ahead of real time using AudioContext.currentTime, poll on a
 * short setTimeout, never trigger sound directly off setInterval,
 * which drifts audibly within seconds under any UI jank).
 *
 * Ticks run at 96 per quarter note (matches patterns.js). Anything
 * that needs to react to the clock (sequencer.js's playback/recording,
 * note repeat) registers via onTick() rather than running its own
 * timer — one clock, not several drifting against each other.
 */
(function () {
  var TICKS_PER_QUARTER = window.WorkstationPatterns ? window.WorkstationPatterns.TICKS_PER_QUARTER : 96;
  var LOOKAHEAD_MS = 25;
  var SCHEDULE_AHEAD_SEC = 0.1;
  var MIN_BPM = 40;
  var MAX_BPM = 399;

  var bpm = 120;
  var timeSigNum = 4;
  var timeSigDen = 4;
  var swing = 0; // 0-1
  var metronomeMode = "off"; // off | on | rec | cnt
  var metronomeVolume = 0.5;

  var isPlaying = false;
  var isRecording = false;
  var isOverdub = false;

  var currentTick = 0;
  var nextTickTime = 0;
  var timerId = null;
  var tickListeners = [];
  var stateListeners = [];
  var tapTimes = [];

  function ticksPerBar() {
    return TICKS_PER_QUARTER * timeSigNum;
  }

  function secondsPerTick() {
    return (60 / bpm) / TICKS_PER_QUARTER;
  }

  // Swing delays every odd ("off-beat") tick-group within a quarter
  // note by a fraction of a step — a deliberately simple model (not
  // the EP-133's exact internal curve, which isn't published), applied
  // uniformly regardless of the active pattern's own step resolution.
  function swingDelaySeconds(tick) {
    if (!swing) return 0;
    var eighthTicks = TICKS_PER_QUARTER / 2;
    var withinQuarter = tick % TICKS_PER_QUARTER;
    var isOffbeat = Math.floor(withinQuarter / eighthTicks) % 2 === 1;
    return isOffbeat ? swing * eighthTicks * 0.5 * secondsPerTick() : 0;
  }

  function onTick(fn) {
    tickListeners.push(fn);
    return function off() {
      var idx = tickListeners.indexOf(fn);
      if (idx !== -1) tickListeners.splice(idx, 1);
    };
  }

  function onStateChange(fn) {
    stateListeners.push(fn);
  }

  function notifyState() {
    var snapshot = getState();
    stateListeners.forEach(function (fn) {
      try {
        fn(snapshot);
      } catch (e) {
        /* one bad listener can't break playback */
      }
    });
  }

  function scheduler() {
    var ctx = window.WorkstationAudio.context();
    while (nextTickTime < ctx.currentTime + SCHEDULE_AHEAD_SEC) {
      var delay = swingDelaySeconds(currentTick);
      var tick = currentTick;
      var time = nextTickTime + delay;
      tickListeners.forEach(function (fn) {
        fn(tick, time);
      });
      nextTickTime += secondsPerTick();
      currentTick++;
    }
    timerId = window.setTimeout(scheduler, LOOKAHEAD_MS);
  }

  function play() {
    if (isPlaying) return;
    window.WorkstationAudio.context();
    isPlaying = true;
    currentTick = 0;
    nextTickTime = window.WorkstationAudio.context().currentTime + 0.05;
    scheduler();
    notifyState();
  }

  function stop() {
    isPlaying = false;
    isRecording = false;
    isOverdub = false;
    window.clearTimeout(timerId);
    notifyState();
  }

  function togglePlay() {
    if (isPlaying) stop();
    else play();
    return isPlaying;
  }

  function setRecording(value, overdub) {
    isRecording = value;
    isOverdub = !!overdub;
    if (value && !isPlaying) play();
    notifyState();
  }

  function setBpm(value) {
    bpm = Math.max(MIN_BPM, Math.min(MAX_BPM, value));
    notifyState();
  }

  function getBpm() {
    return bpm;
  }

  function tapTempo() {
    var now = performance.now();
    tapTimes.push(now);
    if (tapTimes.length > 5) tapTimes.shift();
    if (tapTimes.length < 2) return bpm;
    var intervals = [];
    for (var i = 1; i < tapTimes.length; i++) intervals.push(tapTimes[i] - tapTimes[i - 1]);
    var avgMs = intervals.reduce(function (a, b) { return a + b; }, 0) / intervals.length;
    setBpm(Math.round(60000 / avgMs));
    return bpm;
  }
  window.setInterval(function () {
    if (tapTimes.length && performance.now() - tapTimes[tapTimes.length - 1] > 2000) tapTimes = [];
  }, 1000);

  function setTimeSignature(num, den) {
    timeSigNum = Math.max(1, Math.min(32, num));
    timeSigDen = [1, 2, 4, 8, 16, 32].indexOf(den) !== -1 ? den : 4;
    notifyState();
  }

  function setSwing(value) {
    swing = Math.max(0, Math.min(1, value));
    notifyState();
  }

  function setMetronome(mode) {
    metronomeMode = ["off", "on", "rec", "cnt"].indexOf(mode) !== -1 ? mode : "off";
    notifyState();
  }

  function setMetronomeVolume(v) {
    metronomeVolume = Math.max(0, Math.min(1, v));
  }

  function shouldClickNow() {
    if (metronomeMode === "off") return false;
    if (metronomeMode === "on") return true;
    if (metronomeMode === "rec") return isRecording;
    return false; // "cnt" (count-in only) handled by sequencer.js's count-in routine directly
  }

  // A plain, dependency-free metronome click — sequencer.js's own
  // tick listener calls this on quarter-note boundaries rather than
  // transport.js reaching into the audio graph for group buses it
  // doesn't own.
  function playClick(time, accent) {
    var ctx = window.WorkstationAudio.context();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = accent ? 1500 : 1000;
    gain.gain.setValueAtTime(metronomeVolume * 0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
    osc.connect(gain);
    gain.connect(window.WorkstationAudio.getWorkstationMaster());
    osc.start(time);
    osc.stop(time + 0.04);
  }

  function getState() {
    return {
      bpm: bpm,
      timeSigNum: timeSigNum,
      timeSigDen: timeSigDen,
      swing: swing,
      metronomeMode: metronomeMode,
      isPlaying: isPlaying,
      isRecording: isRecording,
      isOverdub: isOverdub,
    };
  }

  window.WorkstationTransport = {
    TICKS_PER_QUARTER: TICKS_PER_QUARTER,
    ticksPerBar: ticksPerBar,
    secondsPerTick: secondsPerTick,
    onTick: onTick,
    onStateChange: onStateChange,
    play: play,
    stop: stop,
    togglePlay: togglePlay,
    setRecording: setRecording,
    setBpm: setBpm,
    getBpm: getBpm,
    tapTempo: tapTempo,
    setTimeSignature: setTimeSignature,
    setSwing: setSwing,
    setMetronome: setMetronome,
    setMetronomeVolume: setMetronomeVolume,
    shouldClickNow: shouldClickNow,
    playClick: playClick,
    getState: getState,
    isPlaying: function () { return isPlaying; },
    isRecording: function () { return isRecording; },
    currentTick: function () { return currentTick; },
  };
})();
