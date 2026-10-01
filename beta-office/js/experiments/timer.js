/**
 * BETA OFFICE experiment — Timer
 * A plain countdown timer; three quick oscillator beeps at zero.
 */
(function () {
  if (!window.BetaExperiments) return;

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

  function beep() {
    var audio = getCtx();
    if (!audio) return;
    for (var i = 0; i < 3; i++) {
      (function (delay) {
        setTimeout(function () {
          var osc = audio.createOscillator();
          var gain = audio.createGain();
          osc.type = "sine";
          osc.frequency.value = 700;
          gain.gain.setValueAtTime(0.2, audio.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.15);
          osc.connect(gain);
          gain.connect(audio.destination);
          osc.start();
          osc.stop(audio.currentTime + 0.15);
        }, delay);
      })(i * 220);
    }
  }

  window.BetaExperiments.registerExperiment({
    id: "timer",
    name: "Timer",
    category: "TIMER",
    number: 63,
    description: "Countdown timer, beeps at zero",
    launch: function (container) {
      var input = document.createElement("input");
      input.type = "number";
      input.min = "1";
      input.value = "60";
      input.className = "beta-text-input";
      container.appendChild(input);

      var readout = window.BetaControls.readout(container);
      var state = { remaining: 60, running: false, timerId: null };

      function format(sec) {
        var m = Math.floor(sec / 60);
        var s = sec % 60;
        return m + ":" + (s < 10 ? "0" : "") + s;
      }

      function render() {
        readout.innerHTML = "<strong>" + format(state.remaining) + "</strong>";
      }

      function tick() {
        state.remaining--;
        render();
        if (state.remaining <= 0) {
          clearInterval(state.timerId);
          state.running = false;
          beep();
        }
      }

      window.BetaControls.miniBtn(container, "Start", function () {
        if (state.running) return;
        var secs = parseInt(input.value, 10);
        if (secs > 0) state.remaining = secs;
        state.running = true;
        clearInterval(state.timerId);
        state.timerId = setInterval(tick, 1000);
        render();
      });
      window.BetaControls.miniBtn(container, "Pause", function () {
        state.running = false;
        clearInterval(state.timerId);
      });
      window.BetaControls.miniBtn(container, "Reset", function () {
        state.running = false;
        clearInterval(state.timerId);
        state.remaining = parseInt(input.value, 10) || 60;
        render();
      });

      render();

      container._betaState = state;

      return function cleanup() {
        clearInterval(state.timerId);
      };
    },
  });
})();
