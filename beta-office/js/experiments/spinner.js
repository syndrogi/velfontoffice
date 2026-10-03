/**
 * BETA OFFICE experiment — Spinner
 * A fidget spinner. Drag in a circular motion to impart angular
 * velocity; release and it keeps spinning, slowly losing speed to
 * friction.
 */
(function () {
  if (!window.BetaExperiments) return;

  var FRICTION = 0.985;

  window.BetaExperiments.registerExperiment({
    id: "spinner",
    name: "Spinner",
    category: "VISUAL",
    number: 97,
    description: "Drag in a circle to flick the spinner, watch it slow down",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var cx = canvas.width / 2;
      var cy = canvas.height / 2;
      var state = { angle: 0, angVel: 0 };
      var dragging = false;
      var lastAngle = 0;

      function pointerAngle(e) {
        var r = canvas.getBoundingClientRect();
        return Math.atan2(e.clientY - r.top - cy, e.clientX - r.left - cx);
      }

      canvas.addEventListener("pointerdown", function (e) {
        dragging = true;
        lastAngle = pointerAngle(e);
      });
      canvas.addEventListener("pointermove", function (e) {
        if (!dragging) return;
        var a = pointerAngle(e);
        var delta = a - lastAngle;
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;
        state.angVel = delta;
        state.angle += delta;
        lastAngle = a;
      });
      function release() { dragging = false; }
      canvas.addEventListener("pointerup", release);
      canvas.addEventListener("pointerleave", release);

      var rafId = null;
      function step() {
        if (!dragging) {
          state.angle += state.angVel;
          state.angVel *= FRICTION;
        }
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        ctx2d.save();
        ctx2d.translate(cx, cy);
        ctx2d.rotate(state.angle);
        ctx2d.fillStyle = "#000";
        for (var i = 0; i < 3; i++) {
          ctx2d.save();
          ctx2d.rotate((i * Math.PI * 2) / 3);
          ctx2d.beginPath();
          ctx2d.arc(28, 0, 14, 0, Math.PI * 2);
          ctx2d.fill();
          ctx2d.restore();
        }
        ctx2d.beginPath();
        ctx2d.arc(0, 0, 10, 0, Math.PI * 2);
        ctx2d.fill();
        ctx2d.restore();
        rafId = requestAnimationFrame(step);
      }
      rafId = requestAnimationFrame(step);

      return function cleanup() {
        if (rafId) cancelAnimationFrame(rafId);
      };
    },
  });
})();
