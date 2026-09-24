/**
 * BETA OFFICE experiment — Browser
 * A live raw-metrics readout: viewport, devicePixelRatio, scroll
 * position, mouse coordinates, FPS, user agent, online/offline. Every
 * value is read from the real browser APIs at render time.
 */
(function () {
  if (!window.BetaExperiments) return;

  window.BetaExperiments.registerExperiment({
    id: "browser",
    name: "Browser",
    category: "BROWSER",
    description: "Viewport, DPR, scroll, mouse, FPS, UA",
    launch: function (container) {
      var readout = window.BetaControls.readout(container);
      var mouseX = 0, mouseY = 0;
      var frames = 0, lastSample = performance.now(), fps = 0;

      function onMove(e) { mouseX = e.clientX; mouseY = e.clientY; }
      document.addEventListener("pointermove", onMove);

      var rafId = null;
      function fpsFrame(now) {
        frames++;
        if (now - lastSample >= 500) {
          fps = Math.round((frames * 1000) / (now - lastSample));
          frames = 0;
          lastSample = now;
        }
        rafId = requestAnimationFrame(fpsFrame);
      }
      rafId = requestAnimationFrame(fpsFrame);

      function render() {
        readout.innerHTML =
          "<strong>viewport</strong> " + window.innerWidth + " × " + window.innerHeight + "\n" +
          "<strong>dpr</strong> " + window.devicePixelRatio + "\n" +
          "<strong>scroll</strong> " + Math.round(window.scrollX) + ", " + Math.round(window.scrollY) + "\n" +
          "<strong>mouse</strong> " + mouseX + ", " + mouseY + "\n" +
          "<strong>fps</strong> " + fps + "\n" +
          "<strong>online</strong> " + (navigator.onLine ? "yes" : "no") + "\n" +
          "<strong>ua</strong> " + navigator.userAgent;
      }
      var renderTimer = window.setInterval(render, 250);
      render();

      return function cleanup() {
        document.removeEventListener("pointermove", onMove);
        window.clearInterval(renderTimer);
        if (rafId) cancelAnimationFrame(rafId);
      };
    },
  });
})();
