/**
 * BETA OFFICE experiment — Word Drop
 * Words fall from the top on a timer; type one exactly (in the input
 * below) to destroy it and score before it reaches the bottom. Three
 * missed words ends the round.
 */
(function () {
  if (!window.BetaExperiments) return;

  var WORDS = ["VELFONT", "ARCHIVE", "STUDIO", "PATTERN", "FABRIC", "DESIGN", "RUNWAY", "GARMENT"];
  var SPAWN_MS = 1800;
  var LIVES_START = 3;

  window.BetaExperiments.registerExperiment({
    id: "worddrop",
    name: "Word Drop",
    category: "WORDPLAY",
    number: 93,
    description: "Type falling words before they land",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var input = document.createElement("input");
      input.type = "text";
      input.className = "beta-text-input";
      input.autocomplete = "off";
      container.appendChild(input);

      var readout = window.BetaControls.readout(container);
      var words = [];
      var state = { score: 0, lives: LIVES_START, over: false, spawnTimer: null };

      function updateReadout() {
        readout.innerHTML = state.over
          ? "<strong>Game over</strong> — score " + state.score
          : "Score: <strong>" + state.score + "</strong>  Lives: <strong>" + state.lives + "</strong>";
      }

      function spawn() {
        if (state.over) return;
        words.push({
          text: WORDS[(Math.random() * WORDS.length) | 0],
          x: 10 + Math.random() * (canvas.width - 80),
          y: 0,
          vy: 0.5 + Math.random() * 0.4,
        });
        state.spawnTimer = setTimeout(spawn, SPAWN_MS);
      }

      function start() {
        clearTimeout(state.spawnTimer);
        words = [];
        state.score = 0;
        state.lives = LIVES_START;
        state.over = false;
        input.value = "";
        input.disabled = false;
        spawn();
        updateReadout();
      }
      // Exposed so reset() (registered outside this closure) can start a
      // fresh round without reaching into loose local variables.
      state.restart = start;

      input.addEventListener("input", function () {
        var typed = input.value.trim().toUpperCase();
        var hit = words.findIndex(function (w) { return w.text === typed; });
        if (hit !== -1) {
          words.splice(hit, 1);
          state.score++;
          input.value = "";
          updateReadout();
        }
      });

      var rafId = null;
      function step() {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        ctx2d.font = "12px monospace";
        ctx2d.fillStyle = "#000";
        words.forEach(function (w) {
          w.y += w.vy;
          ctx2d.fillText(w.text, w.x, w.y);
        });
        words = words.filter(function (w) {
          if (w.y > canvas.height) {
            state.lives--;
            if (state.lives <= 0) {
              state.over = true;
              input.disabled = true;
              clearTimeout(state.spawnTimer);
            }
            updateReadout();
            return false;
          }
          return true;
        });
        rafId = requestAnimationFrame(step);
      }
      rafId = requestAnimationFrame(step);

      start();

      container._betaState = state;

      return function cleanup() {
        if (rafId) cancelAnimationFrame(rafId);
        clearTimeout(state.spawnTimer);
      };
    },
    reset: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.restart();
    },
  });
})();
