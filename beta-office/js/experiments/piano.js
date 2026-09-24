/**
 * BETA OFFICE experiment — Piano
 * Eight clickable keys, playable by mouse or the A S D F H J K L row
 * (chosen to dodge the global G/R/0 shortcuts — see keyboard.js). Same
 * lazily-created, reused AudioContext approach as Sound.
 */
(function () {
  if (!window.BetaExperiments) return;

  var NOTES = [
    { key: "a", label: "C", freq: 261.63 },
    { key: "s", label: "D", freq: 293.66 },
    { key: "d", label: "E", freq: 329.63 },
    { key: "f", label: "F", freq: 349.23 },
    { key: "h", label: "G", freq: 392.0 },
    { key: "j", label: "A", freq: 440.0 },
    { key: "k", label: "B", freq: 493.88 },
    { key: "l", label: "C5", freq: 523.25 },
  ];

  var ctx = null;
  function getCtx() {
    if (!ctx) {
      var AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;
      ctx = new AudioCtor();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function play(freq) {
    var audio = getCtx();
    if (!audio) return;
    var osc = audio.createOscillator();
    var gain = audio.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.18, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.5);
  }

  window.BetaExperiments.registerExperiment({
    id: "piano",
    name: "Piano",
    category: "PIANO",
    description: "Click or A S D F H J K L to play",
    launch: function (container) {
      var row = document.createElement("div");
      row.className = "beta-piano-row";
      container.appendChild(row);

      var byKey = {};
      NOTES.forEach(function (note) {
        var key = document.createElement("button");
        key.type = "button";
        key.className = "beta-piano-key";
        key.textContent = note.label;
        key.addEventListener("click", function () { play(note.freq); });
        row.appendChild(key);
        byKey[note.key] = key;
      });

      function onKey(e) {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        var note = NOTES.filter(function (n) { return n.key === e.key.toLowerCase(); })[0];
        if (!note) return;
        play(note.freq);
        var keyEl = byKey[note.key];
        keyEl.classList.add("beta-is-active");
        setTimeout(function () { keyEl.classList.remove("beta-is-active"); }, 120);
      }
      document.addEventListener("keydown", onKey);

      return function cleanup() {
        document.removeEventListener("keydown", onKey);
      };
    },
  });
})();
