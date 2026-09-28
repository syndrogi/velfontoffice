/**
 * BETA OFFICE experiment — Constellation
 * Click to place a star; each new one auto-links to whichever existing
 * star is nearest, building up a random constellation.
 */
(function () {
  if (!window.BetaExperiments) return;

  window.BetaExperiments.registerExperiment({
    id: "constellation",
    name: "Constellation",
    category: "CONSTELLATION",
    description: "Click to place stars, auto-linked to the nearest",
    launch: function (container) {
      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      var points = [];

      function draw() {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        ctx2d.strokeStyle = "rgba(0, 0, 0, 0.4)";
        points.forEach(function (p) {
          if (p.link) {
            ctx2d.beginPath();
            ctx2d.moveTo(p.x, p.y);
            ctx2d.lineTo(p.link.x, p.link.y);
            ctx2d.stroke();
          }
        });
        ctx2d.fillStyle = "#000";
        points.forEach(function (p) {
          ctx2d.beginPath();
          ctx2d.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
          ctx2d.fill();
        });
      }

      canvas.addEventListener("pointerdown", function (e) {
        var r = canvas.getBoundingClientRect();
        var x = e.clientX - r.left;
        var y = e.clientY - r.top;
        var nearest = null;
        var best = Infinity;
        points.forEach(function (p) {
          var d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
          if (d < best) {
            best = d;
            nearest = p;
          }
        });
        points.push({ x: x, y: y, link: nearest });
        draw();
      });

      window.BetaControls.miniBtn(container, "Clear", function () {
        points = [];
        draw();
      });

      draw();

      return function cleanup() {};
    },
  });
})();
