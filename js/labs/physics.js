/**
 * VELFONT OFFICE — Labs / Physics
 * An ambient (non-destructive) counterpart to Gravity: header links
 * and hero letters gently drift away from the pointer and ease back
 * when it moves off, instead of falling once and staying fallen.
 * Click Physics again to turn it off and let everything settle back.
 */
(function () {
  if (typeof registerLab !== "function") return;

  var TARGET_SELECTOR = "header a, header button, .hero-content .letter";
  var RADIUS = 140;
  var STRENGTH = 40;
  var EASE = 0.15;
  var SETTLE_EPSILON = 0.05;

  var active = false;
  var rafId = null;
  var mouseX = -9999;
  var mouseY = -9999;
  var items = [];

  function onMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }

  function collect() {
    return Array.prototype.slice
      .call(document.querySelectorAll(TARGET_SELECTOR))
      .map(function (el) {
        var rect = el.getBoundingClientRect();
        return {
          el: el,
          cx: rect.left + rect.width / 2,
          cy: rect.top + rect.height / 2,
          ox: 0,
          oy: 0,
        };
      });
  }

  function loop() {
    items.forEach(function (item) {
      // Scale locks an element for the duration of its selection — ceding
      // control here (and keeping ox/oy synced to the locked-out state,
      // not the last value Physics itself wrote) means a drag isn't
      // fighting Physics for the same tx/ty every frame, and Physics
      // resumes easing from the right place the moment it's unlocked
      // instead of snapping back to a stale position.
      if (window.labsTransform.isLocked(item.el)) {
        var locked = window.labsTransform.get(item.el);
        item.ox = locked.tx;
        item.oy = locked.ty;
        return;
      }

      var dx = item.cx - mouseX;
      var dy = item.cy - mouseY;
      var dist = Math.sqrt(dx * dx + dy * dy) || 1;
      var targetX = 0;
      var targetY = 0;

      if (dist < RADIUS) {
        var force = (1 - dist / RADIUS) * STRENGTH;
        targetX = (dx / dist) * force;
        targetY = (dy / dist) * force;
      }

      item.ox += (targetX - item.ox) * EASE;
      item.oy += (targetY - item.oy) * EASE;

      if (Math.abs(item.ox) < SETTLE_EPSILON) item.ox = 0;
      if (Math.abs(item.oy) < SETTLE_EPSILON) item.oy = 0;

      window.labsTransform.update(item.el, { tx: item.ox, ty: item.oy });
    });
    rafId = requestAnimationFrame(loop);
  }

  function enable() {
    active = true;
    items = collect();
    window.addEventListener("mousemove", onMove);
    rafId = requestAnimationFrame(loop);
    window.labsSetActive("physics", true);
  }

  function disable() {
    active = false;
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener("mousemove", onMove);
    items.forEach(function (item) {
      window.labsTransform.update(item.el, { tx: 0, ty: 0 });
    });
    items = [];
    window.labsSetActive("physics", false);
  }

  registerLab({
    id: "physics",
    title: "physics",
    action: function () {
      if (active) disable();
      else enable();
    },
  });
})();
