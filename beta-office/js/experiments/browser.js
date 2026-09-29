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
      var renderTimer = null;

      // Everything here only ever feeds this window's own readout —
      // pointermove tracking, the FPS rAF loop, and the render interval
      // all pause together while minimized instead of measuring for a
      // display nobody can see.
      function start() {
        document.addEventListener("pointermove", onMove);
        lastSample = performance.now();
        frames = 0;
        if (!rafId) rafId = requestAnimationFrame(fpsFrame);
        if (!renderTimer) renderTimer = window.setInterval(render, 250);
        render();
      }
      function stop() {
        document.removeEventListener("pointermove", onMove);
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        window.clearInterval(renderTimer);
        renderTimer = null;
      }
      start();

      return { cleanup: stop, onHide: stop, onShow: start };
    },
  });
})();
