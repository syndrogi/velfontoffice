/**
 * VELFONT OFFICE — Labs / Scale
 * Click a header link or hero letter to select it — a Photoshop-style
 * free-transform box appears with a handle on each corner and each
 * edge. Dragging a handle grows/shrinks the element from the OPPOSITE
 * side (drag the right edge out and only the right side moves, the
 * left edge stays put) — corner handles compute width and height
 * independently (non-uniform, matching Photoshop's default Ctrl+T
 * corner drag), edges stretch a single axis. Click empty space, or
 * the same element again, to deselect.
 *
 * Size persists after deselecting, and after the element is moved by
 * any other lab (letter-drag, Physics, Gravity) — translate/rotate/
 * scale are tracked as separate state (see js/transform.js) and always
 * composed together, so moving something never resets how big it is.
 *
 * ---- Algorithm notes ----
 *
 * Scale is computed directly from actual width/height, not a distance
 * ratio: dragging the east handle sets
 *   newWidth = mouseX - anchorX
 *   scaleX   = newWidth / originalWidth
 * (west mirrors it: newWidth = anchorX - mouseX). A diagonal mouse
 * wobble no longer feeds into the number the way a hypot()-distance
 * ratio did — only the axis actually being dragged matters. Dragging
 * past the anchor makes newWidth (and so scaleX) negative on its own,
 * which is what makes the letter flip — no separate sign-tracking
 * needed.
 *
 * getBoundingClientRect() is called exactly once per selection (in
 * select(), to derive `originalBox` — the element's scale-1/translate-0
 * layout box). Every drag after that, including a second and third
 * resize of the same selection, works off that one snapshot plus the
 * live labsTransform state — never re-measuring the DOM. That both
 * avoids compounding rounding error across repeated resizes and means
 * a drag's anchor position is pure arithmetic, not a value that can
 * lag a frame behind what's on screen.
 *
 * transform-origin is set once (0,0) and never changed again — see
 * FIXED_ORIGIN below for why that matters. "Which side stays still" is
 * instead solved by computing whatever translate keeps the anchor's
 * screen position constant for the new scale.
 */
(function () {
  if (typeof registerLab !== "function") return;

  var TARGET_SELECTOR = "header a, header button, .hero-content .letter, .labs-logo-mark";
  var MIN_SCALE = 0.05;

  // fx/fy: this handle's position as a fraction of the box (0 = left/top,
  // 1 = right/bottom, 0.5 = center/doesn't move that axis). The drag
  // anchors at the OPPOSITE fraction, so the dragged side moves and the
  // opposite side holds still.
  var HANDLE_INFO = {
    nw: { fx: 0, fy: 0 },
    ne: { fx: 1, fy: 0 },
    sw: { fx: 0, fy: 1 },
    se: { fx: 1, fy: 1 },
    n: { fx: 0.5, fy: 0 },
    s: { fx: 0.5, fy: 1 },
    e: { fx: 1, fy: 0.5 },
    w: { fx: 0, fy: 0.5 },
  };

  var active = false;
  var selected = null;
  var box = null;
  var syncRafId = null;

  // The selected element's scale-1/translate-0 layout box — measured
  // once in select(), reused for every drag until something else is
  // selected. See the algorithm notes above.
  var originalBox = { left: 0, top: 0, width: 0, height: 0 };
  // Ink size (from Canvas, see getGlyphInk) for the current selection,
  // captured once alongside originalBox rather than re-measured every
  // frame — positionBox() just scales this by the live transform.
  var inkSize = { width: 0, height: 0 };

  var dragging = false;
  var suppressNextClick = false;
  var dragHandle = null; // the HANDLE_INFO entry for the handle being dragged
  var dragAnchorLocal = { x: 0, y: 0 };
  var dragAnchorScreen = { x: 0, y: 0 };

  // transform-origin is set ONCE per element and never changed again.
  // Switching it mid-sequence (e.g. "right edge" after a previous "left
  // edge" resize) makes the browser re-pivot the *existing* scale around
  // the new origin, which snaps the element to a different position the
  // instant the origin changes — that was the cause of an earlier "jump
  // when resizing from the opposite side" bug. Keeping origin fixed and
  // doing the "which side stays put" math ourselves (via translate)
  // sidesteps that entirely.
  var FIXED_ORIGIN = "0px 0px";

  function ensureFixedOrigin(el) {
    if (el.style.transformOrigin !== FIXED_ORIGIN) {
      el.style.transformOrigin = FIXED_ORIGIN;
    }
  }

  function ensureBox() {
    if (box) return;
    box = document.createElement("div");
    box.className = "labs-scale-box";
    Object.keys(HANDLE_INFO).forEach(function (id) {
      var el = document.createElement("div");
      el.className = "labs-scale-handle labs-scale-handle-" + id;
      el.addEventListener("pointerdown", function (e) {
        onHandleDown(e, id);
      });
      box.appendChild(el);
    });
    document.body.appendChild(box);
  }

  // getBoundingClientRect() on a letter reflects its line-height box, not
  // the glyph's visual ink — for most letters that's noticeably taller
  // (and a bit wider) than what's actually drawn. Canvas's
  // actualBoundingBox* metrics give the true ink size for the same text
  // run at the same font. Measured once per selection (see select()) and
  // cached by font+text besides, so this never runs on every frame.
  var glyphMetricsCache = {};
  var measureCanvasCtx = null;

  function getGlyphInk(text, font) {
    var key = font + " " + text;
    var cached = glyphMetricsCache[key];
    if (cached) return cached;

    if (!measureCanvasCtx) {
      measureCanvasCtx = document.createElement("canvas").getContext("2d");
    }
    measureCanvasCtx.font = font;
    var m = measureCanvasCtx.measureText(text);
    var ink = {
      width: m.actualBoundingBoxLeft + m.actualBoundingBoxRight,
      height: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent,
    };
    glyphMetricsCache[key] = ink;
    return ink;
  }

  // The only getBoundingClientRect() call in the whole module. Derives
  // the element's un-transformed (scale 1, translate 0) box from its
  // current rendered rect + current transform state, and caches the
  // glyph ink size (if any) for this selection.
  function captureSelectionMetrics(el) {
    var rect = el.getBoundingClientRect();
    var s = window.labsTransform.get(el);
    var sx = s.scaleX || 1;
    var sy = s.scaleY || 1;

    originalBox.left = rect.left - s.tx;
    originalBox.top = rect.top - s.ty;
    originalBox.width = rect.width / Math.abs(sx);
    originalBox.height = rect.height / Math.abs(sy);

    var text = el.textContent;
    if (text && text.trim()) {
      // Canvas measures ink size from the element's computed font-size,
      // which CSS transform never touches — ink.width/height is already
      // a scale-1 baseline, the same as originalBox above, and needs no
      // un-scaling. Dividing by the current sx/sy here was a bug: on a
      // first-ever selection sx/sy is always 1 so it was a no-op and
      // looked fine, but re-selecting an element that's already scaled
      // (sx/sy != 1 at capture time) baked a spurious inverse-scale
      // factor into inkSize — one that only cancels out in getTightRect()
      // if the scale never changes again, and otherwise renders a tiny
      // box sized for the *original* glyph, floating in the middle of
      // the actually-resized one.
      var cs = getComputedStyle(el);
      var font = cs.fontStyle + " " + cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
      var ink = getGlyphInk(text, font);
      inkSize.width = ink.width;
      inkSize.height = ink.height;
    } else {
      inkSize.width = 0;
      inkSize.height = 0;
    }
  }

  // Current rendered rect, purely from originalBox + live state — no DOM
  // measurement. Handles negative scale (flipped) correctly: local point
  // (0,0) and (width,height) map to two screen points that may be in
  // either order, so the box is the min/max of the two, same as
  // getBoundingClientRect() would report.
  function computeStateRect() {
    var s = window.labsTransform.get(selected);
    var x0 = originalBox.left + s.tx;
    var y0 = originalBox.top + s.ty;
    var x1 = x0 + originalBox.width * s.scaleX;
    var y1 = y0 + originalBox.height * s.scaleY;
    return {
      left: Math.min(x0, x1),
      top: Math.min(y0, y1),
      width: Math.abs(x1 - x0),
      height: Math.abs(y1 - y0),
    };
  }

  function getTightRect() {
    var full = computeStateRect();
    if (!(inkSize.width > 0) || !(inkSize.height > 0)) return full;

    var s = window.labsTransform.get(selected);
    var width = inkSize.width * Math.abs(s.scaleX);
    var height = inkSize.height * Math.abs(s.scaleY);

    return {
      left: full.left + (full.width - width) / 2,
      top: full.top + (full.height - height) / 2,
      width: width,
      height: height,
    };
  }

  // Only touches the DOM when the box would actually move/resize —
  // skips the write (and the layout/paint it'd trigger) on frames where
  // nothing changed, which is most of them while idle-selected.
  var lastBoxRect = null;

  function positionBox() {
    if (!selected || !box) return;
    var rect = getTightRect();

    if (
      lastBoxRect &&
      lastBoxRect.left === rect.left &&
      lastBoxRect.top === rect.top &&
      lastBoxRect.width === rect.width &&
      lastBoxRect.height === rect.height
    ) {
      return;
    }
    lastBoxRect = rect;

    box.style.left = rect.left + "px";
    box.style.top = rect.top + "px";
    box.style.width = rect.width + "px";
    box.style.height = rect.height + "px";
  }

  // Single rAF loop drives all box updates — during a drag it's what
  // picks up the state onHandleMove just wrote (no second, redundant
  // positionBox() call from the move handler itself), and between drags
  // it's what keeps the box tracking if another lab (Physics, Gravity)
  // moves the same element.
  function syncLoop() {
    if (!selected) return;
    positionBox();
    syncRafId = requestAnimationFrame(syncLoop);
  }

  function select(el) {
    if (selected === el) return;
    if (selected) window.labsTransform.unlock(selected);
    selected = el;
    lastBoxRect = null;

    if (syncRafId) cancelAnimationFrame(syncRafId);

    if (selected) {
      window.labsTransform.lock(selected);
      ensureFixedOrigin(selected);
      captureSelectionMetrics(selected);
      ensureBox();
      box.hidden = false;
      positionBox();
      syncRafId = requestAnimationFrame(syncLoop);
    } else if (box) {
      box.hidden = true;
    }
  }

  function onClick(e) {
    // A drag still ends with mousedown+mouseup on (roughly) the same
    // spot, which fires a synthetic "click" — without this guard, that
    // click reaches here right after a handle drag and, if the pointer
    // no longer resolves to something inside the box, deselects
    // whatever was just resized.
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }
    if (box && box.contains(e.target)) return;
    var el = e.target.closest(TARGET_SELECTOR);
    if (!el) {
      select(null);
      return;
    }
    e.preventDefault();
    select(selected === el ? null : el);
  }

  function onHandleDown(e, handleId) {
    if (!selected) return;
    e.preventDefault();
    e.stopPropagation();
    dragging = true;

    var info = HANDLE_INFO[handleId];
    dragHandle = info;

    var s = window.labsTransform.get(selected);

    // Anchor = opposite side from the handle, as a fixed point in the
    // ORIGINAL local box, and where that point currently renders on
    // screen — both derived from originalBox + state, no DOM query.
    dragAnchorLocal.x = (1 - info.fx) * originalBox.width;
    dragAnchorLocal.y = (1 - info.fy) * originalBox.height;
    dragAnchorScreen.x = originalBox.left + dragAnchorLocal.x * s.scaleX + s.tx;
    dragAnchorScreen.y = originalBox.top + dragAnchorLocal.y * s.scaleY + s.ty;

    // Growing something almost always means dragging a handle outward,
    // toward — and often past — the edge of the browser window. Without
    // capture, a pointerup that happens outside the window never reaches
    // us: `dragging` stays stuck true, and every mouse move afterwards
    // (even with no button held) keeps getting read as a continuation of
    // this drag against the now-stale anchor, which is what put the
    // selection box wherever the pointer happened to wander next. Capture
    // guarantees this handle keeps getting move/up regardless of where
    // the cursor physically is, same as the letter-drag handler already
    // does in main.js.
    e.target.setPointerCapture(e.pointerId);

    window.addEventListener("pointermove", onHandleMove);
    window.addEventListener("pointerup", onHandleUp);
    window.addEventListener("pointercancel", onHandleUp);
  }

  // Keeps the sign of `value` but never lets its magnitude collapse to
  // (or through) zero — MIN_SCALE stays the floor on both the growing
  // and the flipped side.
  function clampScale(value) {
    var magnitude = Math.max(MIN_SCALE, Math.abs(value));
    return value < 0 ? -magnitude : magnitude;
  }

  function onHandleMove(e) {
    if (!dragging || !selected || !dragHandle) return;
    var partial = {};

    // Real width/height from the fixed anchor to the pointer, not a
    // distance ratio — the axis the handle doesn't touch (0.5) is
    // skipped entirely, so a diagonal wobble while dragging a straight
    // edge handle can't leak into the number.
    if (dragHandle.fx !== 0.5) {
      var newWidth =
        dragHandle.fx === 1
          ? e.clientX - dragAnchorScreen.x
          : dragAnchorScreen.x - e.clientX;
      partial.scaleX = clampScale(newWidth / originalBox.width);
    }

    if (dragHandle.fy !== 0.5) {
      var newHeight =
        dragHandle.fy === 1
          ? e.clientY - dragAnchorScreen.y
          : dragAnchorScreen.y - e.clientY;
      partial.scaleY = clampScale(newHeight / originalBox.height);
    }

    // Solve for the translate that keeps the anchor point pinned at
    // dragAnchorScreen given the new scale — transform-origin never
    // moves, so this is the only thing that has to change to make it
    // look like scaling is happening from the anchor.
    if (partial.scaleX !== undefined) {
      partial.tx = dragAnchorScreen.x - originalBox.left - dragAnchorLocal.x * partial.scaleX;
    }
    if (partial.scaleY !== undefined) {
      partial.ty = dragAnchorScreen.y - originalBox.top - dragAnchorLocal.y * partial.scaleY;
    }

    window.labsTransform.update(selected, partial);
    // No positionBox() call here — syncLoop's rAF picks up this state
    // change on the next frame, so the box only ever gets positioned
    // once per frame instead of once per pointermove *and* once per rAF.
  }

  function onHandleUp() {
    dragging = false;
    dragHandle = null;
    suppressNextClick = true;
    window.removeEventListener("pointermove", onHandleMove);
    window.removeEventListener("pointerup", onHandleUp);
    window.removeEventListener("pointercancel", onHandleUp);
  }

  function enable() {
    active = true;
    document.body.classList.add("labs-scale-active");
    document.addEventListener("click", onClick);
  }

  function disable() {
    active = false;
    document.body.classList.remove("labs-scale-active");
    document.removeEventListener("click", onClick);
    select(null);
  }

  registerLab({
    id: "scale",
    title: "scale",
    action: function () {
      if (active) disable();
      else enable();
    },
  });
})();
