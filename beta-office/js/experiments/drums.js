/**
 * BETA OFFICE experiment — Drums
 * An 8-step, 3-track beat sequencer. Each track's "sound" is a short
 * oscillator envelope (no sample loading), same technique as Sound/
 * Piano, tuned per track to read as kick/snare/hat.
 */
(function () {
  if (!window.BetaExperiments) return;

  var TRACKS = [
    { label: "Kick", freq: 90, type: "sine", dur: 0.15 },
    { label: "Snare", freq: 220, type: "square", dur: 0.08 },
    { label: "Hat", freq: 800, type: "triangle", dur: 0.04 },
  ];
  var STEPS = 8;

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

  function hit(track) {
    var audio = getCtx();
    if (!audio) return;
    var osc = audio.createOscillator();
    var gain = audio.createGain();
    osc.type = track.type;
    osc.frequency.value = track.freq;
    gain.gain.setValueAtTime(0.2, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + track.dur);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + track.dur);
  }

  window.BetaExperiments.registerExperiment({
    id: "drums",
    name: "Drums",
    category: "DRUMS",
    description: "8-step 3-track beat sequencer",
    launch: function (container) {
      var grid = document.createElement("div");
      grid.className = "beta-drums-grid";
      container.appendChild(grid);

      var cells = [];
      TRACKS.forEach(function () {
        var rowCells = [];
        for (var col = 0; col < STEPS; col++) {
          var cell = document.createElement("button");
          cell.type = "button";
          cell.className = "beta-drums-cell";
          cell.addEventListener("click", function () {
            this.classList.toggle("beta-is-active");
          });
          grid.appendChild(cell);
          rowCells.push(cell);
        }
        cells.push(rowCells);
      });

      var state = { step: 0, playing: false, tempo: 400, timerId: null };

      function playStep() {
        TRACKS.forEach(function (track, row) {
          if (cells[row][state.step].classList.contains("beta-is-active")) hit(track);
        });
        cells.forEach(function (rowCells) {
          rowCells.forEach(function (c) { c.classList.remove("beta-is-current"); });
        });
        cells.forEach(function (rowCells) {
          rowCells[state.step].classList.add("beta-is-current");
        });
        state.step = (state.step + 1) % STEPS;
      }

      function setPlaying(playing) {
        state.playing = playing;
        clearInterval(state.timerId);
        if (playing) {
          state.step = 0;
          state.timerId = setInterval(playStep, state.tempo);
        } else {
          cells.forEach(function (rowCells) {
            rowCells.forEach(function (c) { c.classList.remove("beta-is-current"); });
          });
        }
      }

      window.BetaControls.toggleButton(container, { label: "Play", onToggle: setPlaying });
      window.BetaControls.slider(container, {
        label: "Tempo", min: 150, max: 700, step: 10, value: state.tempo, unit: "ms",
        onInput: function (v) {
          state.tempo = v;
          if (state.playing) {
            clearInterval(state.timerId);
            state.timerId = setInterval(playStep, state.tempo);
          }
        },
      });

      container._betaState = state;

      return function cleanup() {
        clearInterval(state.timerId);
      };
    },
  });
})();
