/**
 * BETA OFFICE — Status Readout
 * Real values only (section 16 of the brief) — local time, viewport,
 * FPS. FPS uses the same rAF-delta technique as the root site's
 * js/labs/developer.js, just sampled into the text node every ~500ms
 * instead of every frame so a plain readout doesn't force 60 layouts/sec.
 */
(function () {
  var timeEl = document.getElementById("betaStatusTime");
  var viewportEl = document.getElementById("betaStatusViewport");
  var fpsEl = document.getElementById("betaStatusFps");
  if (!timeEl || !viewportEl || !fpsEl) return;

  function updateTime() {
    var now = new Date();
    var hh = String(now.getHours()).padStart(2, "0");
    var mm = String(now.getMinutes()).padStart(2, "0");
    var ss = String(now.getSeconds()).padStart(2, "0");
    timeEl.textContent = hh + ":" + mm + ":" + ss;
  }

  function updateViewport() {
    viewportEl.textContent = window.innerWidth + " × " + window.innerHeight;
  }

  updateTime();
  updateViewport();
  window.setInterval(updateTime, 1000);
  window.addEventListener("resize", updateViewport);

  var frames = 0;
  var lastSample = performance.now();
  var rafId = null;

  function tick(now) {
    frames++;
    if (now - lastSample >= 500) {
      var fps = Math.round((frames * 1000) / (now - lastSample));
      fpsEl.textContent = fps + " fps";
      frames = 0;
      lastSample = now;
    }
    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!rafId) {
      frames = 0;
      lastSample = performance.now();
      rafId = requestAnimationFrame(tick);
    }
  });
})();
