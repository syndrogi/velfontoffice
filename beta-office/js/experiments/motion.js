/**
 * BETA OFFICE experiment — Motion
 * One demo dot in a bounded stage, four interchangeable force modes:
 * spring-back-to-center, mouse-attract, mouse-repel, idle float.
 */
(function () {
  if (!window.BetaExperiments) return;

  window.BetaExperiments.registerExperiment({
    id: "motion",
    name: "Motion",
    category: "MOTION",
    description: "Spring, attract, repel, float",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, false);
      var dot = document.createElement("div");
      dot.className = "beta-stage-dot";
      stage.el.appendChild(dot);

      var state = { mode: "float", x: 0, y: 0, vx: 0, vy: 0, pointerX: null, pointerY: null, t: 0 };

      stage.el.addEventListener("pointermove", function (e) {
        var rect = stage.el.getBoundingClientRect();
        state.pointerX = e.clientX - rect.left - rect.width / 2;
        state.pointerY = e.clientY - rect.top - rect.height / 2;
      });
      stage.el.addEventListener("pointerleave", function () {
        state.pointerX = null;
        state.pointerY = null;
      });

      window.BetaControls.toggles(container, {
        value: state.mode,
        options: [
          { label: "Spring", value: "spring" },
          { label: "Attract", value: "attract" },
          { label: "Repel", value: "repel" },
          { label: "Float", value: "float" },
        ],
        onChange: function (v) { state.mode = v; },
      });

      var rafId = null;
      function frame() {
        state.t += 1;
        var bound = 60;
        if (state.mode === "spring") {
          var kx = -state.x * 0.02;
          var ky = -state.y * 0.02;
          state.vx = (state.vx + kx) * 0.94;
          state.vy = (state.vy + ky) * 0.94;
        } else if ((state.mode === "attract" || state.mode === "repel") && state.pointerX !== null) {
          var dx = state.pointerX - state.x;
          var dy = state.pointerY - state.y;
          var dir = state.mode === "attract" ? 1 : -1;
          state.vx = (state.vx + dx * 0.01 * dir) * 0.9;
          state.vy = (state.vy + dy * 0.01 * dir) * 0.9;
        } else if (state.mode === "float") {
          state.vx = Math.cos(state.t * 0.02) * 0.6;
          state.vy = Math.sin(state.t * 0.017) * 0.6;
        } else {
          state.vx *= 0.9;
          state.vy *= 0.9;
        }
        state.x = Math.max(-bound, Math.min(bound, state.x + state.vx));
        state.y = Math.max(-bound, Math.min(bound, state.y + state.vy));
        dot.style.transform = "translate(" + state.x.toFixed(1) + "px, " + state.y.toFixed(1) + "px)";
        rafId = requestAnimationFrame(frame);
      }
      rafId = requestAnimationFrame(frame);

      container._betaState = state;

      return function cleanup() {
        if (rafId) cancelAnimationFrame(rafId);
      };
    },
    randomize: function (container) {
      var s = container._betaState;
      if (!s) return;
      var modes = ["spring", "attract", "repel", "float"];
      s.mode = modes[(Math.random() * modes.length) | 0];
      s.vx = (Math.random() - 0.5) * 6;
      s.vy = (Math.random() - 0.5) * 6;
    },
    reset: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.mode = "float";
      s.x = 0;
      s.y = 0;
      s.vx = 0;
      s.vy = 0;
    },
  });
})();
