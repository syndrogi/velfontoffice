/**
 * TONE OFFICE — Bootstrap
 * Builds the dock from js/modules.js and wires the shared transport.
 * No "tap to enter" gate — every module already calls
 * window.ToneEngine.init() defensively the moment it's actually used
 * (a key press, a pad tap, hitting play), which is itself the user
 * gesture browsers require before audio can start, so there's nothing
 * left for a dedicated gate screen to do.
 */
(function () {
  if (!window.ToneEngine || !window.ToneWM || !window.ToneModules) return;

  var playBtn = document.getElementById("tonePlayBtn");
  var bpmInput = document.getElementById("toneBpm");
  var bpmValue = document.getElementById("toneBpmValue");
  var tapBtn = document.getElementById("toneTapBtn");
  var volumeInput = document.getElementById("toneMasterVolume");
  var dockButtonsEl = document.getElementById("toneDockButtons");

  /* ---------- Transport ---------- */

  function setPlaying(playing) {
    playBtn.classList.toggle("tone-is-playing", playing);
    playBtn.setAttribute("aria-pressed", String(playing));
    playBtn.querySelector(".tone-play-label").textContent = playing ? "STOP" : "PLAY";
  }

  playBtn.addEventListener("click", function () {
    window.ToneEngine.init();
    setPlaying(window.ToneSequencer.toggle());
  });

  bpmInput.addEventListener("input", function () {
    window.ToneSequencer.setBpm(Number(bpmInput.value));
    bpmValue.textContent = bpmInput.value;
  });

  var tapTimes = [];
  tapBtn.addEventListener("click", function () {
    var now = performance.now();
    tapTimes.push(now);
    if (tapTimes.length > 5) tapTimes.shift();
    if (tapTimes.length < 2) return;
    var intervals = [];
    for (var i = 1; i < tapTimes.length; i++) intervals.push(tapTimes[i] - tapTimes[i - 1]);
    var avgMs = intervals.reduce(function (a, b) { return a + b; }, 0) / intervals.length;
    var tappedBpm = Math.round(60000 / avgMs);
    tappedBpm = Math.max(Number(bpmInput.min), Math.min(Number(bpmInput.max), tappedBpm));
    bpmInput.value = tappedBpm;
    window.ToneSequencer.setBpm(tappedBpm);
    bpmValue.textContent = tappedBpm;
  });
  // A pause this long means a fresh tap tempo, not a continuation.
  window.setInterval(function () {
    if (tapTimes.length && performance.now() - tapTimes[tapTimes.length - 1] > 2000) tapTimes = [];
  }, 1000);

  volumeInput.addEventListener("input", function () {
    window.ToneEngine.init();
    window.ToneEngine.setMasterVolume(volumeInput.value / 100);
  });

  /* ---------- Dock ---------- */

  window.ToneModules.forEach(function (mod) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tone-dock-btn";
    btn.dataset.id = mod.id;

    var name = document.createElement("span");
    name.className = "tone-dock-btn-name";
    name.textContent = mod.name;

    var desc = document.createElement("span");
    desc.className = "tone-dock-btn-desc";
    desc.textContent = mod.description.split(".")[0] + ".";

    btn.appendChild(name);
    btn.appendChild(desc);
    btn.addEventListener("click", function () {
      window.ToneEngine.init();
      window.ToneWM.openModule(mod.id);
    });
    dockButtonsEl.appendChild(btn);
  });

  // Default-open the two modules worth seeing right away — same
  // "nothing feels empty on first load" idea as the sequencer's own
  // starter pattern.
  window.ToneWM.openModule("sequencer");
  window.ToneWM.openModule("synth");
})();
