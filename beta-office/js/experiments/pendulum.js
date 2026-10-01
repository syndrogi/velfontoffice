/**
 * BETA OFFICE experiment — Pendulum
 * A single gravity pendulum. Drag the bob to set its starting angle;
 * release and small-angle-ish physics (unclamped, so big swings look
 * appropriately wild) takes over, damping slowly toward rest.
 */
(function () {
  if (!window.BetaExperiments) return;

  window.BetaExperiments.registerExperiment({
    id: "pendulum",
    name: "Pendulum",
    category: "PENDULUM",
    number: 86,
    description: "Drag the bob to set an angle, release to swing",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var pivot = { x: canvas.width / 2, y: 10 };
      var length = canvas.height - 30;
      var state = { angle: Math.PI / 4, angVel: 0, dragging: false };
      var damping = 0.998;

      function bobPos() {
        return { x: pivot.x + Math.sin(state.angle) * length, y: pivot.y + Math.cos(state.angle) * length };
      }

      canvas.addEventListener("pointerdown", function (e) {
        var r = canvas.getBoundingClientRect();
        var x = e.clientX - r.left;
        var y = e.clientY - r.top;
        var bob = bobPos();
        if (Math.hypot(bob.x - x, bob.y - y) < 20) {
          state.dragging = true;
          state.angVel = 0;
        }
      });
      canvas.addEventListener("pointermove", function (e) {
        if (!state.dragging) return;
        var r = canvas.getBoundingClientRect();
        var x = e.clientX - r.left;
        var y = e.clientY - r.top;
        state.angle = Math.atan2(x - pivot.x, y - pivot.y);
      });
      function release() { state.dragging = false; }
      canvas.addEventListener("pointerup", release);
      canvas.addEventListener("pointerleave", release);

      var rafId = null;
      function step() {
        if (!state.dragging) {
          var g = 0.004;
          var angAcc = (-g / (length / 100)) * Math.sin(state.angle);
          state.angVel += angAcc;
          state.angVel *= damping;
          state.angle += state.angVel;
        }

        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        var bob = bobPos();
        ctx2d.strokeStyle = "#000";
        ctx2d.beginPath();
        ctx2d.moveTo(pivot.x, pivot.y);
        ctx2d.lineTo(bob.x, bob.y);
        ctx2d.stroke();
        ctx2d.beginPath();
        ctx2d.arc(bob.x, bob.y, 10, 0, Math.PI * 2);
        ctx2d.fillStyle = "#000";
        ctx2d.fill();

        rafId = requestAnimationFrame(step);
      }
      rafId = requestAnimationFrame(step);

      return function cleanup() {
        if (rafId) cancelAnimationFrame(rafId);
      };
    },
  });
})();
