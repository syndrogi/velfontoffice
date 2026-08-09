/**
 * VELFONT OFFICE — Shared Transform State
 * Several features move, rotate, or resize the same elements
 * independently: letter-drag (main.js), Gravity, Physics, and Scale.
 * Each one writing its own `el.style.transform` string would clobber
 * whatever the others had set — most visibly, resizing something with
 * Scale and then dragging it would silently reset its size. This
 * tracks translate/rotate/scaleX/scaleY as separate per-element state
 * and always composes all of them into one transform, so any one of
 * them can be updated without disturbing the others.
 *
 * Composed via DOMMatrix rather than a hand-built string — same
 * translate/rotate/scale order as before (rotate takes degrees, so the
 * stored radians get converted), but going through a real matrix gives
 * more accurate/consistent results than string-templating and leaves
 * room to compose additional operations later without re-deriving the
 * math by hand.
 *
 * Noise (js/labs/noise.js) adds a fourth kind of state — noiseX/noiseY/
 * noiseRotate — composed in *addition* to tx/ty/rotate rather than
 * replacing them, so its temporary jitter can never clobber wherever
 * Gravity, Physics, or a letter-drag currently has an element. It's
 * updated through the dedicated updateNoise()/clearNoise() calls below,
 * never through update(), which only ever touches the base fields.
 */
(function () {
  var state = new WeakMap();
  var RAD_TO_DEG = 180 / Math.PI;

  // Scale locks its selected element for the duration of the selection —
  // Physics's proximity push and Gravity's fall both write tx/ty/rotate
  // on their own per-frame loop, with no idea Scale is mid-drag on the
  // same element; without this, the two loops fight over the same state
  // every frame and a Scale drag can silently lose to whichever wrote
  // last. Physics/Gravity check this before touching a locked element.
  var locked = new WeakSet();

  function getState(el) {
    var s = state.get(el);
    if (!s) {
      s = { tx: 0, ty: 0, rotate: 0, scaleX: 1, scaleY: 1, noiseX: 0, noiseY: 0, noiseRotate: 0 };
      state.set(el, s);
    }
    return s;
  }

  function compose(el) {
    var s = getState(el);
    var matrix = new DOMMatrix()
      .translate(s.tx + s.noiseX, s.ty + s.noiseY)
      .rotate((s.rotate + s.noiseRotate) * RAD_TO_DEG)
      .scale(s.scaleX, s.scaleY);
    el.style.transform = matrix.toString();
  }

  window.labsTransform = {
    // partial: any of { tx, ty, rotate, scaleX, scaleY } — only given
    // keys change. Noise's offset never goes through here — see
    // updateNoise() below.
    update: function (el, partial) {
      var s = getState(el);
      if (partial.tx !== undefined) s.tx = partial.tx;
      if (partial.ty !== undefined) s.ty = partial.ty;
      if (partial.rotate !== undefined) s.rotate = partial.rotate;
      if (partial.scaleX !== undefined) s.scaleX = partial.scaleX;
      if (partial.scaleY !== undefined) s.scaleY = partial.scaleY;
      compose(el);
    },
    // Noise-only offset, composed on top of the base state above.
    // partial: any of { x, y, rotate }.
    updateNoise: function (el, partial) {
      var s = getState(el);
      if (partial.x !== undefined) s.noiseX = partial.x;
      if (partial.y !== undefined) s.noiseY = partial.y;
      if (partial.rotate !== undefined) s.noiseRotate = partial.rotate;
      compose(el);
    },
    // Zeroes just the noise offset — leaves tx/ty/rotate/scale untouched.
    clearNoise: function (el) {
      var s = state.get(el);
      if (!s || (!s.noiseX && !s.noiseY && !s.noiseRotate)) return;
      s.noiseX = 0;
      s.noiseY = 0;
      s.noiseRotate = 0;
      compose(el);
    },
    get: function (el) {
      return getState(el);
    },
    lock: function (el) {
      locked.add(el);
      // Scale is about to measure this element's un-transformed box
      // (captureSelectionMetrics, synchronously right after this call)
      // — any lingering noise offset would throw that measurement off
      // by however many px Noise happened to be jittering it at that
      // exact instant. Clearing it here, ahead of the measurement,
      // removes the race entirely rather than relying on Noise's own
      // per-frame loop to notice the lock and catch up a frame late.
      var s = state.get(el);
      if (s && (s.noiseX || s.noiseY || s.noiseRotate)) {
        s.noiseX = 0;
        s.noiseY = 0;
        s.noiseRotate = 0;
        compose(el);
      }
    },
    unlock: function (el) {
      locked.delete(el);
    },
    isLocked: function (el) {
      return locked.has(el);
    },
  };
})();
