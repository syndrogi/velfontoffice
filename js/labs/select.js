/**
 * VELFONT OFFICE — Labs / Select
 * Figma/Photoshop-style multi-select for the hero's text blocks (title,
 * subtitle): drag on empty space to marquee-select everything the box
 * touches, shift-click to add/remove one at a time, then drag any
 * selected block to move the whole group together. Click empty space to
 * clear the selection.
 *
 * Unlike Scale (which selects individual letters/links and resizes one
 * at a time), this operates one level up — whole `.hero-title`/
 * `.hero-subtitle` blocks — so there's no target overlap between the two
 * labs. Movement goes through the same window.labsTransform.update()
 * every other drag in this codebase uses (see js/transform.js): each
 * selected element just gets its own tx/ty nudged by the drag's delta,
 * so a block someone already dragged around keeps its position and
 * simply continues from there.
 *
 * Individual hero letters (.letter, see makeLetterDraggable in
 * js/main.js) stay independently draggable while this lab is off. While
 * it's on, letter-level dragging steps aside (window.__multiSelectActive
 * — same pattern as Gravity's window.__gravityActive) so a pointerdown
 * on a letter selects/drags its whole block instead of just that glyph.
 */
(function () {
  if (typeof registerLab !== "function") return;

  var SELECTABLE_SELECTOR = ".hero-title, .hero-subtitle";
  // Below this many px of pointer movement, a pointerdown+up is treated
  // as a click (select/toggle) rather than a drag or a marquee.
  var DRAG_THRESHOLD = 4;

  var active = false;
  var selected = new Set();
  var boxes = new WeakMap(); // selectable el -> its .labs-select-box
  var marqueeEl = null;
  var syncRafId = null;

  function ensureMarquee() {
    if (!marqueeEl) {
      marqueeEl = document.createElement("div");
      marqueeEl.className = "labs-select-marquee";
      marqueeEl.hidden = true;
      document.body.appendChild(marqueeEl);
    }
    return marqueeEl;
  }

  function ensureBox(el) {
    var box = boxes.get(el);
    if (!box) {
      box = document.createElement("div");
      box.className = "labs-select-box";
      document.body.appendChild(box);
      boxes.set(el, box);
    }
    return box;
  }

  function positionBoxes() {
    selected.forEach(function (el) {
      var box = boxes.get(el);
      if (!box) return;
      var r = el.getBoundingClientRect();
      box.style.left = r.left + "px";
      box.style.top = r.top + "px";
      box.style.width = r.width + "px";
      box.style.height = r.height + "px";
    });
  }

  // One rAF loop keeps every selected box tracking its element — same
  // decoupled-from-input-events approach as Scale's syncLoop, so boxes
  // stay put even while their element is mid-drag (this module writes
  // labsTransform state; this loop is what turns that into box position).
  function syncLoop() {
    if (!active) {
      syncRafId = null;
      return;
    }
    positionBoxes();
    syncRafId = requestAnimationFrame(syncLoop);
  }

  function startSync() {
    if (!syncRafId) syncRafId = requestAnimationFrame(syncLoop);
  }

  function addToSelection(el) {
    if (selected.has(el)) return;
    selected.add(el);
    var box = ensureBox(el);
    box.hidden = false;
  }

  function removeFromSelection(el) {
    if (!selected.has(el)) return;
    selected.delete(el);
    var box = boxes.get(el);
    if (box) box.hidden = true;
  }

  function toggleSelection(el) {
    if (selected.has(el)) removeFromSelection(el);
    else addToSelection(el);
  }

  function selectOnly(el) {
    selected.forEach(function (existing) {
      if (existing !== el) removeFromSelection(existing);
    });
    addToSelection(el);
  }

  function clearSelection() {
    selected.forEach(function (el) {
      var box = boxes.get(el);
      if (box) box.hidden = true;
    });
    selected.clear();
  }

  function getSelectableElements() {
    return Array.prototype.slice.call(document.querySelectorAll(SELECTABLE_SELECTOR));
  }

  function rectsIntersect(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  function updateMarqueeRect(x0, y0, x1, y1) {
    var left = Math.min(x0, x1);
    var top = Math.min(y0, y1);
    var width = Math.abs(x1 - x0);
    var height = Math.abs(y1 - y0);
    var m = ensureMarquee();
    m.style.left = left + "px";
    m.style.top = top + "px";
    m.style.width = width + "px";
    m.style.height = height + "px";
    return { left: left, top: top, right: left + width, bottom: top + height };
  }

  // Chrome this lab should never intercept — header, its own labs menu,
  // the contact panel — even though they all live inside/near .hero.
  function isInteractiveChrome(target) {
    return !!target.closest(".site-header, .labs, .contact-panel");
  }

  function onElementPointerDown(e, el) {
    e.preventDefault(); // always — this is a selectable block, never native text

    if (e.shiftKey) {
      toggleSelection(el);
    } else if (!selected.has(el)) {
      selectOnly(el);
    }
    // else: already part of the selection and no shift — leave the
    // group intact so dragging this element drags all of them.

    if (!selected.has(el)) return; // a shift-click just removed it — nothing to drag

    var startX = e.clientX;
    var startY = e.clientY;
    var moved = false;

    // Snapshot every selected element's current offset so each one moves
    // by the same delta from *its own* starting point, not a shared one.
    var origins = new Map();
    selected.forEach(function (target) {
      var s = window.labsTransform.get(target);
      origins.set(target, { tx: s.tx, ty: s.ty });
    });

    el.setPointerCapture(e.pointerId);
    document.body.classList.add("labs-select-dragging");

    function onMove(ev) {
      var dx = ev.clientX - startX;
      var dy = ev.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      moved = true;
      origins.forEach(function (origin, target) {
        window.labsTransform.update(target, { tx: origin.tx + dx, ty: origin.ty + dy });
      });
    }

    function onUp() {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      document.body.classList.remove("labs-select-dragging");
    }

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
  }

  function onMarqueePointerDown(e) {
    e.preventDefault();
    var startX = e.clientX;
    var startY = e.clientY;
    var moved = false;
    var m = ensureMarquee();
    var startSelection = e.shiftKey ? new Set(selected) : null;

    function onMove(ev) {
      var dx = ev.clientX - startX;
      var dy = ev.clientY - startY;
      if (!moved) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        moved = true;
        m.hidden = false;
      }
      var rect = updateMarqueeRect(startX, startY, ev.clientX, ev.clientY);

      // Recompute from scratch each move (starting selection ∪ current
      // intersections when shift is held, or just current intersections
      // otherwise) rather than mutating in place — makes shrinking the
      // marquee back off a block correctly deselect it again.
      var next = startSelection ? new Set(startSelection) : new Set();
      getSelectableElements().forEach(function (el) {
        if (rectsIntersect(rect, el.getBoundingClientRect())) next.add(el);
      });

      selected.forEach(function (el) {
        if (!next.has(el)) removeFromSelection(el);
      });
      next.forEach(function (el) {
        if (!selected.has(el)) addToSelection(el);
      });
    }

    function onUp() {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      m.hidden = true;
      if (!moved && !e.shiftKey) clearSelection(); // plain click on empty background
    }

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  }

  function onPointerDown(e) {
    if (e.button !== 0 || isInteractiveChrome(e.target)) return;
    var el = e.target.closest(SELECTABLE_SELECTOR);
    if (el) onElementPointerDown(e, el);
    else onMarqueePointerDown(e);
  }

  function enable() {
    active = true;
    window.__multiSelectActive = true;
    document.addEventListener("pointerdown", onPointerDown);
    document.body.classList.add("labs-select-active");
    startSync();
    window.labsSetActive("select", true);
  }

  function disable() {
    active = false;
    window.__multiSelectActive = false;
    document.removeEventListener("pointerdown", onPointerDown);
    document.body.classList.remove("labs-select-active", "labs-select-dragging");
    clearSelection();
    if (marqueeEl) marqueeEl.hidden = true;
    window.labsSetActive("select", false);
  }

  registerLab({
    id: "select",
    title: "select",
    action: function () {
      if (active) disable();
      else enable();
    },
  });
})();
