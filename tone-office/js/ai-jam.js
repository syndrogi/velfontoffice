/**
 * TONE OFFICE — AI Jam
 * Not a real AI model — there's no backend here to call one, and
 * claiming otherwise would just be a fabricated feature. It's weighted
 * randomness plus a few music-theory rules: "generate beat" reshuffles
 * the sequencer with per-track probabilities that favor a plausible
 * rhythm (see sequencer.js's randomizePattern), and "generate riff"
 * walks a pentatonic scale at random and plays it through the synth.
 * Said plainly in the window itself, not just this comment.
 */
(function () {
  // Indices into ToneSynth.notes (a continuous chromatic C4-C5, 13
  // notes) that make up a major pentatonic scale across that range:
  // C4 D4 E4 G4 A4 C5.
  var SCALE_INDICES = [0, 2, 4, 7, 9, 12];
  var STEP_CHOICES = [-2, -1, -1, 1, 1, 2];

  function buildMelody(count) {
    var sequence = [];
    var idx = Math.floor(SCALE_INDICES.length / 2);
    for (var i = 0; i < count; i++) {
      sequence.push(idx);
      var step = STEP_CHOICES[Math.floor(Math.random() * STEP_CHOICES.length)];
      idx = Math.max(0, Math.min(SCALE_INDICES.length - 1, idx + step));
    }
    return sequence;
  }

  function generateRiff() {
    window.ToneEngine.init();
    var notes = window.ToneSynth.notes;
    var stepSec = window.ToneSequencer ? window.ToneSequencer.stepSeconds() : 0.2;
    var noteGap = stepSec * 2;
    var noteDur = noteGap * 0.65;
    var sequence = buildMelody(12);
    sequence.forEach(function (scaleIdx, i) {
      var note = notes[SCALE_INDICES[scaleIdx]];
      window.setTimeout(function () {
        window.ToneSynth.noteOn(note.midi);
        window.setTimeout(function () {
          window.ToneSynth.noteOff(note.midi);
        }, noteDur * 1000);
      }, i * noteGap * 1000);
    });
  }

  var FLAVOR_LINES = [
    "ran the numbers. rhythm attached.",
    "pentatonic walk complete.",
    "no thoughts, just weighted dice.",
    "beat reshuffled. good luck.",
    "scale-constrained nonsense, incoming.",
  ];

  function buildWindow(container) {
    var face = document.createElement("div");
    face.className = "tone-ai-face";
    face.textContent = "[ o . o ]";
    container.appendChild(face);

    var disclosure = document.createElement("p");
    disclosure.className = "tone-hint";
    disclosure.textContent = "Not real AI — weighted randomness plus a few music-theory rules.";
    container.appendChild(disclosure);

    var actions = document.createElement("div");
    actions.className = "tone-ai-actions";

    var beatBtn = document.createElement("button");
    beatBtn.type = "button";
    beatBtn.className = "tone-mini-btn";
    beatBtn.textContent = "GENERATE BEAT";

    var riffBtn = document.createElement("button");
    riffBtn.type = "button";
    riffBtn.className = "tone-mini-btn";
    riffBtn.textContent = "GENERATE RIFF";

    var status = document.createElement("p");
    status.className = "tone-ai-status";
    status.textContent = "Waiting for input.";

    function say() {
      status.textContent = FLAVOR_LINES[Math.floor(Math.random() * FLAVOR_LINES.length)];
    }

    beatBtn.addEventListener("click", function () {
      if (window.ToneSequencer) window.ToneSequencer.randomizePattern();
      say();
    });
    riffBtn.addEventListener("click", function () {
      if (window.ToneSynth) generateRiff();
      say();
    });

    actions.appendChild(beatBtn);
    actions.appendChild(riffBtn);
    container.appendChild(actions);
    container.appendChild(status);
  }

  window.ToneAiJam = { buildWindow: buildWindow };
})();
