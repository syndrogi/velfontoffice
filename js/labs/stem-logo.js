/**
 * VELFONT OFFICE — Labs / VFO Stem Logo
 * Same idea as js/labs/logo.js's Vfo Logo Vol.1 — a second wordmark
 * mark (images/velfontoffice stem logo.png) shown at hero scale, in
 * the hero's bottom-right corner so it doesn't sit on top of the
 * other one if both are active. Draggable the same way a hero letter
 * is (js/main.js's makeLetterDraggable, via the shared
 * window.labsTransform state — see js/transform.js), and it's also a
 * Gravity/Scale target (see TARGET_SELECTOR in js/labs/gravity.js and
 * js/labs/scale.js) once it's on screen.
 *
 * No stroke-draw intro here, unlike the other mark — that replays
 * images/logo-draw.svg, a hand-traced construction grid that only
 * exists for the original logo, not this one.
 *
 * Click the lab menu item again to hide it.
 */
(function () {
  if (typeof registerLab !== "function") return;

  var DRAG_THRESHOLD = 4;

  var active = false;
  var container = null;
  var mark = null;

  // Same shape as js/labs/logo.js's attachDrag(): a plain transform
  // offset via window.labsTransform, pointer-captured so it keeps
  // tracking outside the element's own bounds.
  function attachDrag(el) {
    el.style.touchAction = "none";
    var dragging = false;
    var startX = 0;
    var startY = 0;
    var baseX = 0;
    var baseY = 0;
    var offsetX = 0;
    var offsetY = 0;

    el.addEventListener("pointerdown", function (e) {
      if (window.__gravityActive) return;
      dragging = true;
      baseX = offsetX;
      baseY = offsetY;
      startX = e.clientX;
      startY = e.clientY;
      el.setPointerCapture(e.pointerId);
      el.classList.add("is-dragging");
    });

    el.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      offsetX = baseX + dx;
      offsetY = baseY + dy;
      window.labsTransform.update(el, { tx: offsetX, ty: offsetY });
    });

    function release() {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("is-dragging");
    }

    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
  }

  function ensureContainer() {
    if (container) return container;
    container = document.createElement("div");
    container.className = "labs-stem-logo-display";
    container.innerHTML = '<span class="labs-stem-logo-mark" role="img" aria-label="VELFONT OFFICE"></span>';
    document.body.appendChild(container);
    mark = container.querySelector(".labs-stem-logo-mark");
    attachDrag(mark);
    return container;
  }

  function show() {
    active = true;
    ensureContainer();
    container.hidden = false;
    requestAnimationFrame(function () {
      container.classList.add("is-visible");
    });
    window.labsSetActive("vfo-stem-logo", true);
  }

  function hide() {
    active = false;
    if (container) container.classList.remove("is-visible");
    window.labsSetActive("vfo-stem-logo", false);
  }

  registerLab({
    id: "vfo-stem-logo",
    title: "vfo stem logo",
    action: function () {
      if (active) hide();
      else show();
    },
  });
})();
