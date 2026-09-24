/**
 * BETA OFFICE — Scroll Morph
 * Thin scroll listener: turns scroll position over the sphere stage's
 * own height into a 0→1 progress value and hands it to
 * BetaSphere.setScrollProgress() (sphere.js owns the actual per-word
 * interpolation — this file only measures scroll and throttles via
 * rAF, same pattern as the root site's mousemove→rAF handlers).
 */
(function () {
  var stage = document.getElementById("betaSphereStage");
  if (!stage || !window.BetaSphere || window.BetaSphere.isFlat()) return;

  var ticking = false;

  function update() {
    ticking = false;
    var distance = Math.max(1, stage.offsetHeight);
    var progress = Math.min(1, Math.max(0, window.scrollY / distance));
    window.BetaSphere.setScrollProgress(progress);
    stage.classList.toggle("beta-scrolled-past", progress > 0.05);
  }

  window.addEventListener(
    "scroll",
    function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    },
    { passive: true }
  );

  update();
})();
