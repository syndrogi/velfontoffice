/**
 * VELFONT OFFICE — Labs / Developer
 * Toggles a minimal overlay (IBM Plex Mono) showing viewport size,
 * mouse position, scroll position, FPS, image/link counts, and the
 * current page. Click "Developer" again to turn it off.
 */
(function () {
  if (typeof registerLab !== "function") return;

  var overlay = null;
  var active = false;
  var rafId = null;
  var mouseX = 0;
  var mouseY = 0;
  var frameCount = 0;
  var fps = 0;
  var lastFpsTime = 0;
  var lastRenderTime = 0;
  var imageCount = 0;
  var linkCount = 0;

  function onMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.className = "labs-dev-overlay";
    overlay.setAttribute("aria-hidden", "true");
    document.body.appendChild(overlay);
    return overlay;
  }

  function update(timestamp) {
    if (!active) return;

    frameCount++;
    if (!lastFpsTime) lastFpsTime = timestamp;
    var elapsed = timestamp - lastFpsTime;
    if (elapsed >= 500) {
      fps = Math.round((frameCount / elapsed) * 1000);
      frameCount = 0;
      lastFpsTime = timestamp;
    }

    // Text only actually needs to be redrawn a handful of times a
    // second to read as "live" — writing innerHTML (plus the string
    // concat behind it) on all 60 frames/sec was pure waste the eye
    // could never tell apart from this.
    if (timestamp - lastRenderTime >= 100) {
      lastRenderTime = timestamp;
      overlay.innerHTML =
        "viewport&nbsp; " + window.innerWidth + " × " + window.innerHeight + "<br>" +
        "mouse&nbsp;&nbsp;&nbsp; " + mouseX + ", " + mouseY + "<br>" +
        "scroll&nbsp;&nbsp;&nbsp; " + Math.round(window.scrollX) + ", " + Math.round(window.scrollY) + "<br>" +
        "fps&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; " + fps + "<br>" +
        "images&nbsp;&nbsp; " + imageCount + "<br>" +
        "links&nbsp;&nbsp;&nbsp;&nbsp; " + linkCount + "<br>" +
        "page&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; " + location.pathname;
    }

    rafId = requestAnimationFrame(update);
  }

  function enable() {
    active = true;
    ensureOverlay().hidden = false;
    frameCount = 0;
    lastFpsTime = 0;
    lastRenderTime = 0;
    // Counted once on open rather than every render tick — these rarely
    // change while the overlay's up, and this debug view's whole point
    // (fps/mouse/scroll/viewport) doesn't depend on them being exact
    // to the second.
    imageCount = document.images.length;
    linkCount = document.querySelectorAll("a").length;
    window.addEventListener("mousemove", onMouseMove);
    rafId = requestAnimationFrame(update);
    window.labsSetActive("developer", true);
  }

  function disable() {
    active = false;
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener("mousemove", onMouseMove);
    if (overlay) overlay.hidden = true;
    window.labsSetActive("developer", false);
  }

  registerLab({
    id: "developer",
    title: "developer",
    action: function () {
      if (active) disable();
      else enable();
    },
  });
})();
