/**
 * BETA OFFICE experiment — Soundboard
 * Eight preset one-shot tones (distinct pitch/timbre/duration combos),
 * same lazily-created shared AudioContext approach as Sound/Piano.
 */
(function () {
  if (!window.BetaExperiments) return;

  var PRESETS = [
    { label: "Blip", freq: 880, type: "sine", dur: 0.08 },
    { label: "Boop", freq: 220, type: "sine", dur: 0.15 },
    { label: "Zap", freq: 1200, type: "sawtooth", dur: 0.1 },
    { label: "Honk", freq: 150, type: "square", dur: 0.2 },
    { label: "Ping", freq: 1600, type: "triangle", dur: 0.06 },
    { label: "Buzz", freq: 90, type: "sawtooth", dur: 0.3 },
    { label: "Chime", freq: 1000, type: "sine", dur: 0.4 },
    { label: "Click", freq: 400, type: "square", dur: 0.03 },
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

  function play(preset) {
    var audio = getCtx();
    if (!audio) return;
    var osc = audio.createOscillator();
    var gain = audio.createGain();
    osc.type = preset.type;
    osc.frequency.value = preset.freq;
    gain.gain.setValueAtTime(0.2, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + preset.dur);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + preset.dur);
  }

  window.BetaExperiments.registerExperiment({
    id: "soundboard",
    name: "Soundboard",
    category: "SOUNDBOARD",
    description: "8 preset one-shot tones",
    launch: function (container) {
      var grid = document.createElement("div");
      grid.className = "beta-soundboard-grid";
      container.appendChild(grid);

      PRESETS.forEach(function (preset) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "beta-soundboard-btn";
        btn.textContent = preset.label;
        btn.addEventListener("click", function () { play(preset); });
        grid.appendChild(btn);
      });

      return function cleanup() {};
    },
  });
})();
