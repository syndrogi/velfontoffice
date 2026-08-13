/**
 * VELFONT OFFICE — Labs / VFO Logo Vol.1
 * Replays the header's stroke-drawn logo intro (see js/logo-draw.js) at
 * hero scale in the hero's empty right side. Same source SVG and same
 * anime.js technique, just fetched/drawn into its own container instead
 * of the header's .logo, and scoped to that container's own elements so
 * it can never pick up (or redraw) the header's copy.
 *
 * The drawn mark (.labs-logo-mark) is draggable the same way a hero
 * letter is (js/main.js's makeLetterDraggable, via the shared
 * window.labsTransform state — see js/transform.js), and a plain click
 * (pointer never moved past the drag threshold) replays the draw
 * animation instead of moving it. It's also a Gravity/Scale target — see
 * TARGET_SELECTOR in js/labs/gravity.js and js/labs/scale.js — so once
 * it's on screen those labs can pick it up like any header link or hero
 * letter.
 *
 * Click the lab menu item again to hide it.
 */
(function () {
  if (typeof registerLab !== "function") return;

  var DRAG_THRESHOLD = 4;

  var active = false;
  var container = null;
  var mark = null;
  var svgMarkup = null;
  var playing = false;

  async function fetchMarkup() {
    if (svgMarkup) return svgMarkup;
    try {
      var res = await fetch("images/logo-draw.svg");
      if (!res.ok) return null;
      svgMarkup = await res.text();
      return svgMarkup;
    } catch {
      return null; // Offline/blocked fetch — the mask-image mark alone is fine.
    }
  }

  async function play() {
    if (playing || !mark) return;
    var markup = await fetchMarkup();
    if (!markup) return;

    playing = true;
    container.insertAdjacentHTML("beforeend", markup);
    var drawSvg = container.querySelector(".logo-draw");
    var fillPath = container.querySelector(".logo-draw-fill");
    if (!drawSvg || !fillPath) {
      playing = false;
      return;
    }

    var anime;
    try {
      anime = await import("https://cdn.jsdelivr.net/npm/animejs@4.5.0/+esm");
    } catch {
      drawSvg.remove(); // Blocked CDN — fall back to the plain mask-image mark.
      playing = false;
      return;
    }
    var animate = anime.animate;
    var svg = anime.svg;
    var stagger = anime.stagger;

    fillPath.classList.remove("is-filled");
    mark.classList.add("is-intro-hidden");
    requestAnimationFrame(function () {
      drawSvg.classList.add("is-visible");
    });

    // Scoped to this container's own lines, never the header's — a bare
    // ".logo-draw-line" selector would match both if they were ever on
    // screen at the same time.
    animate(svg.createDrawable(container.querySelectorAll(".logo-draw-line")), {
      draw: ["0 0", "0 1"],
      ease: "inOutQuad",
      duration: 1400,
      delay: stagger(14),
      onComplete: function () {
        fillPath.classList.add("is-filled");
        mark.classList.remove("is-intro-hidden");
        drawSvg.classList.remove("is-visible");
        playing = false;
        setTimeout(function () {
          drawSvg.remove();
        }, 400);
      },
    });
  }

  // Same shape as js/main.js's makeLetterDraggable: a plain transform
  // offset via window.labsTransform, pointer-captured so it keeps
  // tracking outside the element's own bounds. A pointerup that never
  // crossed DRAG_THRESHOLD counts as a click and replays the intro
  // instead of leaving a (near-)zero-distance drag behind.
  function attachDrag(el) {
    el.style.touchAction = "none";
    var dragging = false;
    var moved = false;
    var startX = 0;
    var startY = 0;
    var baseX = 0;
    var baseY = 0;
    var offsetX = 0;
    var offsetY = 0;

    el.addEventListener("pointerdown", function (e) {
      if (window.__gravityActive) return;
      dragging = true;
      moved = false;
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
      if (!moved && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) moved = true;
      offsetX = baseX + dx;
      offsetY = baseY + dy;
      window.labsTransform.update(el, { tx: offsetX, ty: offsetY });
    });

    function release() {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("is-dragging");
      if (!moved) play();
    }

    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
  }

  function ensureContainer() {
    if (container) return container;
    container = document.createElement("div");
    container.className = "labs-logo-display";
    container.innerHTML = '<span class="labs-logo-mark" role="img" aria-label="VELFONT OFFICE"></span>';
    document.body.appendChild(container);
    mark = container.querySelector(".labs-logo-mark");
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
    play();
    window.labsSetActive("vfo-logo", true);
  }

  function hide() {
    active = false;
    if (container) container.classList.remove("is-visible");
    window.labsSetActive("vfo-logo", false);
  }

  registerLab({
    id: "vfo-logo",
    title: "vfo logo vol.1",
    action: function () {
      if (active) hide();
      else show();
    },
  });
})();
