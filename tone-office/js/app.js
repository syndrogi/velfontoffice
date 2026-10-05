/**
 * TONE OFFICE — Bootstrap
 * Builds the sequencer grid and keyboard from data (ToneSequencer.
 * tracks/steps, ToneSynth.notes) instead of hand-written markup, wires
 * every control to its module, and gates all of it behind one tap —
 * see index.html's #toneGate. Nothing below calls into ToneEngine
 * before that tap has happened.
 */
(function () {
  if (!window.ToneEngine || !window.ToneSequencer || !window.ToneSynth) return;

  var started = false;

  var gate = document.getElementById("toneGate");
  var gateBtn = document.getElementById("toneGateBtn");
  var rack = document.getElementById("toneRack");

  var playBtn = document.getElementById("tonePlayBtn");
  var bpmInput = document.getElementById("toneBpm");
  var bpmValue = document.getElementById("toneBpmValue");
  var tapBtn = document.getElementById("toneTapBtn");
  var volumeInput = document.getElementById("toneMasterVolume");

  var seqTracksEl = document.getElementById("toneSeqTracks");

  var waveSelect = document.getElementById("toneWave");
  var cutoffInput = document.getElementById("toneCutoff");
  var attackInput = document.getElementById("toneAttack");
  var releaseInput = document.getElementById("toneRelease");
  var arpBtn = document.getElementById("toneArpBtn");
  var keyboardEl = document.getElementById("toneKeyboard");

  var delayTimeInput = document.getElementById("toneDelayTime");
  var delayFeedbackInput = document.getElementById("toneDelayFeedback");
  var delayMixInput = document.getElementById("toneDelayMix");

  /* ---------- Gate ---------- */

  function enter() {
    if (started) return;
    started = true;
    window.ToneEngine.init();
    window.ToneEngine.setMasterVolume(volumeInput.value / 100);
    window.ToneEngine.setDelayTime(delayTimeInput.value / 1000);
    window.ToneEngine.setDelayFeedback(delayFeedbackInput.value / 100);
    window.ToneEngine.setDelayMix(delayMixInput.value / 100);
    gate.classList.add("tone-is-gone");
    rack.removeAttribute("aria-hidden");
    rack.removeAttribute("inert");
    window.setTimeout(function () {
      gate.hidden = true;
    }, 300);
  }

  gateBtn.addEventListener("click", enter);

  /* ---------- Transport ---------- */

  function setPlaying(playing) {
    playBtn.classList.toggle("tone-is-playing", playing);
    playBtn.setAttribute("aria-pressed", String(playing));
    playBtn.querySelector(".tone-play-label").textContent = playing ? "STOP" : "PLAY";
  }

  playBtn.addEventListener("click", function () {
    if (!started) enter();
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
    window.ToneEngine.setMasterVolume(volumeInput.value / 100);
  });

  /* ---------- Sequencer grid ---------- */

  function buildSequencer() {
    window.ToneSequencer.tracks.forEach(function (track) {
      var row = document.createElement("div");
      row.className = "tone-seq-track";

      var label = document.createElement("span");
      label.className = "tone-seq-track-label";
      label.textContent = track.name;
      row.appendChild(label);

      var steps = document.createElement("div");
      steps.className = "tone-seq-steps";
      for (var i = 0; i < window.ToneSequencer.steps; i++) {
        var step = document.createElement("button");
        step.type = "button";
        step.className = "tone-seq-step";
        if (i % 4 === 0) step.classList.add("tone-is-beat");
        if (window.ToneSequencer.pattern[track.id][i]) step.classList.add("tone-is-active");
        step.setAttribute("aria-label", track.name + " step " + (i + 1));
        step.dataset.track = track.id;
        step.dataset.step = String(i);
        step.addEventListener("click", function () {
          if (!started) enter();
          var on = window.ToneSequencer.toggleStep(this.dataset.track, Number(this.dataset.step));
          this.classList.toggle("tone-is-active", on);
        });
        steps.appendChild(step);
      }
      row.appendChild(steps);
      seqTracksEl.appendChild(row);
    });
  }

  window.ToneSequencer.onStep(function (stepIndex) {
    var allSteps = seqTracksEl.querySelectorAll(".tone-seq-step");
    allSteps.forEach(function (el) {
      el.classList.toggle("tone-is-playhead", Number(el.dataset.step) === stepIndex);
    });
    if (stepIndex !== -1) window.ToneSynth.advanceArp();
  });

  /* ---------- Synth controls ---------- */

  waveSelect.addEventListener("change", function () {
    window.ToneSynth.setWave(waveSelect.value);
  });
  cutoffInput.addEventListener("input", function () {
    window.ToneSynth.setCutoff(Number(cutoffInput.value));
  });
  attackInput.addEventListener("input", function () {
    window.ToneSynth.setAttack(Number(attackInput.value));
  });
  releaseInput.addEventListener("input", function () {
    window.ToneSynth.setRelease(Number(releaseInput.value));
  });
  arpBtn.addEventListener("click", function () {
    var enabled = !arpBtn.classList.contains("tone-is-active");
    arpBtn.classList.toggle("tone-is-active", enabled);
    arpBtn.setAttribute("aria-pressed", String(enabled));
    window.ToneSynth.setArpEnabled(enabled);
  });

  /* ---------- Keyboard ---------- */

  function buildKeyboard() {
    var notes = window.ToneSynth.notes;
    var whiteNotes = notes.filter(function (n) { return n.kind === "white"; });

    notes.forEach(function (note) {
      var key = document.createElement("button");
      key.type = "button";
      key.className = "tone-key tone-key-" + note.kind;
      key.dataset.key = note.key;
      key.setAttribute("aria-label", "Play " + note.name);

      var label = document.createElement("span");
      label.className = "tone-key-label";
      label.textContent = note.key.toUpperCase();
      key.appendChild(label);

      if (note.kind === "black") {
        var whiteBefore = notes.slice(0, notes.indexOf(note)).filter(function (n) { return n.kind === "white"; }).length;
        var leftPercent = (whiteBefore / whiteNotes.length) * 100;
        key.style.left = "calc(" + leftPercent + "% - var(--tone-black-key-width) / 2)";
      }

      bindKeyPress(key, note.key);
      keyboardEl.appendChild(key);
    });
  }

  function bindKeyPress(el, noteKey) {
    function press(e) {
      e.preventDefault();
      if (!started) enter();
      el.classList.add("tone-is-pressed");
      window.ToneSynth.noteOn(noteKey);
    }
    function release(e) {
      if (e) e.preventDefault();
      el.classList.remove("tone-is-pressed");
      window.ToneSynth.noteOff(noteKey);
    }
    el.addEventListener("pointerdown", press);
    el.addEventListener("pointerup", release);
    el.addEventListener("pointerleave", release);
    el.addEventListener("pointercancel", release);
  }

  var heldComputerKeys = {};
  function isTypingTarget(el) {
    var tag = el.tagName;
    return tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";
  }

  document.addEventListener("keydown", function (e) {
    if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key.toLowerCase();
    var noteEl = keyboardEl.querySelector('.tone-key[data-key="' + k + '"]');
    if (!noteEl || e.repeat) return;
    if (!started) enter();
    heldComputerKeys[k] = true;
    noteEl.classList.add("tone-is-pressed");
    window.ToneSynth.noteOn(k);
  });

  document.addEventListener("keyup", function (e) {
    var k = e.key.toLowerCase();
    if (!heldComputerKeys[k]) return;
    delete heldComputerKeys[k];
    var noteEl = keyboardEl.querySelector('.tone-key[data-key="' + k + '"]');
    if (noteEl) noteEl.classList.remove("tone-is-pressed");
    window.ToneSynth.noteOff(k);
  });

  /* ---------- FX ---------- */

  delayTimeInput.addEventListener("input", function () {
    window.ToneEngine.setDelayTime(delayTimeInput.value / 1000);
  });
  delayFeedbackInput.addEventListener("input", function () {
    window.ToneEngine.setDelayFeedback(delayFeedbackInput.value / 100);
  });
  delayMixInput.addEventListener("input", function () {
    window.ToneEngine.setDelayMix(delayMixInput.value / 100);
  });

  buildSequencer();
  buildKeyboard();
})();
