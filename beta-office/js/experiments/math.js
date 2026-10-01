/**
 * BETA OFFICE experiment — Math
 * 30 seconds of quick arithmetic (+, -, ×), tracking how many you solve.
 */
(function () {
  if (!window.BetaExperiments) return;

  var ROUND_MS = 30000;

  window.BetaExperiments.registerExperiment({
    id: "math",
    name: "Math",
    category: "MATH",
    number: 41,
    description: "30s of quick arithmetic, score",
    launch: function (container) {
      var qBox = window.BetaControls.sampleText(container, "Click Start");
      qBox.classList.add("beta-math-q");

      var input = document.createElement("input");
      input.type = "number";
      input.className = "beta-text-input";
      container.appendChild(input);

      var readout = window.BetaControls.readout(container);
      var state = { answer: 0, score: 0, running: false, endAt: 0, endTimer: null, tickTimer: null };

      function newProblem() {
        var a = 1 + ((Math.random() * 12) | 0);
        var b = 1 + ((Math.random() * 12) | 0);
        var ops = ["+", "-", "×"];
        var op = ops[(Math.random() * ops.length) | 0];
        if (op === "-" && b > a) {
          var t = a;
          a = b;
          b = t;
        }
        state.answer = op === "+" ? a + b : op === "-" ? a - b : a * b;
        qBox.textContent = a + " " + op + " " + b;
        input.value = "";
      }

      function updateReadout() {
        var secsLeft = state.running ? Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000)) : 0;
        readout.innerHTML = state.running
          ? "Score: <strong>" + state.score + "</strong>  Time: <strong>" + secsLeft + "s</strong>"
          : "Score: <strong>" + state.score + "</strong> — click Start";
      }

      function stop() {
        state.running = false;
        clearTimeout(state.endTimer);
        clearInterval(state.tickTimer);
        qBox.textContent = "Time's up";
        input.disabled = true;
        updateReadout();
      }

      function start() {
        clearTimeout(state.endTimer);
        clearInterval(state.tickTimer);
        state.running = true;
        state.score = 0;
        state.endAt = Date.now() + ROUND_MS;
        input.disabled = false;
        newProblem();
        updateReadout();
        state.endTimer = setTimeout(stop, ROUND_MS);
        state.tickTimer = setInterval(updateReadout, 250);
      }
      // Exposed so reset() (registered outside this closure) can start a
      // fresh round without reaching into loose local variables.
      state.restart = start;

      function submit() {
        if (!state.running) return;
        if (parseInt(input.value, 10) === state.answer) {
          state.score++;
          newProblem();
          updateReadout();
        }
      }

      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") submit();
      });
      window.BetaControls.miniBtn(container, "Start", start);

      updateReadout();

      container._betaState = state;

      return function cleanup() {
        clearTimeout(state.endTimer);
        clearInterval(state.tickTimer);
      };
    },
    reset: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.restart();
    },
  });
})();
