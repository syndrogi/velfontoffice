/**
 * BETA OFFICE experiment — Wordle
 * Guess a 5-letter word in 6 tries. Type with the physical keyboard
 * (any letter key, Backspace, Enter) — no on-screen keyboard needed.
 * Scoring handles duplicate letters the standard way: an exact first
 * pass marks every correct-position letter, then a second pass checks
 * remaining letters against the answer's unused counts for "present".
 */
(function () {
  if (!window.BetaExperiments) return;

  var WORDS = ["STUDY", "BRAVE", "QUIET", "LIGHT", "STONE", "CRAFT", "DRESS", "MONEY", "HOUSE", "PAPER", "MUSIC", "OCEAN", "EARTH", "SOUND", "SHARP", "SMILE", "TRAIN", "PLANT", "CHAIR", "BREAD"];
  var MAX_GUESSES = 6;
  var WORD_LEN = 5;

  function scoreGuess(guess, answer) {
    var result = new Array(WORD_LEN).fill("absent");
    var answerChars = answer.split("");
    var used = new Array(WORD_LEN).fill(false);
    for (var i = 0; i < WORD_LEN; i++) {
      if (guess[i] === answerChars[i]) {
        result[i] = "correct";
        used[i] = true;
      }
    }
    for (var i = 0; i < WORD_LEN; i++) {
      if (result[i] === "correct") continue;
      for (var j = 0; j < WORD_LEN; j++) {
        if (!used[j] && guess[i] === answerChars[j]) {
          result[i] = "present";
          used[j] = true;
          break;
        }
      }
    }
    return result;
  }

  window.BetaExperiments.registerExperiment({
    id: "wordle",
    name: "Wordle",
    category: "WORDLE",
    number: 83,
    description: "Guess the 5-letter word in 6 tries",
    launch: function (container) {
      var board = document.createElement("div");
      board.className = "beta-wordle-board";
      container.appendChild(board);

      var readout = window.BetaControls.readout(container);
      var rows = [];
      var state = { answer: "", current: "", guesses: [], over: false };

      function render() {
        board.innerHTML = "";
        rows = [];
        for (var r = 0; r < MAX_GUESSES; r++) {
          var row = document.createElement("div");
          row.className = "beta-wordle-row";
          var tiles = [];
          for (var c = 0; c < WORD_LEN; c++) {
            var tile = document.createElement("div");
            tile.className = "beta-wordle-tile";
            row.appendChild(tile);
            tiles.push(tile);
          }
          board.appendChild(row);
          rows.push(tiles);
        }
        state.guesses.forEach(function (g, r) {
          g.result.forEach(function (status, c) {
            rows[r][c].textContent = g.word[c];
            rows[r][c].classList.add("beta-is-" + status);
          });
        });
        if (!state.over && state.guesses.length < MAX_GUESSES) {
          state.current.split("").forEach(function (ch, c) {
            rows[state.guesses.length][c].textContent = ch;
          });
        }
      }

      function updateReadout(text) {
        readout.innerHTML = text != null ? text : "Guess " + (state.guesses.length + 1) + " / " + MAX_GUESSES;
      }

      function build() {
        state.answer = WORDS[(Math.random() * WORDS.length) | 0];
        state.current = "";
        state.guesses = [];
        state.over = false;
        render();
        updateReadout();
      }
      // Exposed so reset() (registered outside this closure) can deal a
      // fresh word without reaching into loose local variables.
      state.restart = build;

      function submit() {
        if (state.current.length !== WORD_LEN) return;
        var result = scoreGuess(state.current, state.answer);
        state.guesses.push({ word: state.current, result: result });
        var won = result.every(function (r) { return r === "correct"; });
        state.current = "";
        if (won) {
          state.over = true;
          render();
          updateReadout("<strong>Solved!</strong>");
          return;
        }
        if (state.guesses.length >= MAX_GUESSES) {
          state.over = true;
          render();
          updateReadout("Out of guesses — it was <strong>" + state.answer + "</strong>");
          return;
        }
        render();
        updateReadout();
      }

      function onKey(e) {
        if (state.over) return;
        if (e.key === "Enter") {
          submit();
          return;
        }
        if (e.key === "Backspace") {
          state.current = state.current.slice(0, -1);
          render();
          return;
        }
        if (/^[a-zA-Z]$/.test(e.key) && state.current.length < WORD_LEN) {
          state.current += e.key.toUpperCase();
          render();
        }
      }
      document.addEventListener("keydown", onKey);

      window.BetaControls.miniBtn(container, "New word", build);
      build();

      container._betaState = state;

      return function cleanup() {
        document.removeEventListener("keydown", onKey);
      };
    },
    reset: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.restart();
    },
  });
})();
