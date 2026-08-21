/**
 * VELFONT OFFICE — Labs / Noise
 * ORDER → ERROR → ORDER. Wherever the pointer sits, the layout briefly
 * loses its composure — a handful of nearby header/hero/labs/footer
 * elements pick up a small, temporary transform jitter. Move away (or
 * turn Noise off) and everything eases straight back to exactly where
 * it was — never a sustained shake, never a full-screen effect.
 * Separately, hovering directly over any of those same elements scrambles
 * its text into symbol characters for as long as the pointer stays there,
 * restoring the original the moment it leaves.
 *
 * Jitter is composed through js/transform.js's dedicated noise offset
 * (updateNoise/clearNoise), which is added on top of — never replaces —
 * whatever translate/rotate/scale Gravity, Physics, Scale, or the
 * hero-letter drag already have set on the same element. See
 * transform.js's own header comment for how that composition works and
 * why lock()/captureSelectionMetrics reads it as noise-free.
 *
 * Structure (all in this one file, matching the project's existing
 * per-lab module style):
 *   NOISE_CONFIG   — every tunable number, nothing hardcoded below
 *   PointerTracker  — pointer position + smoothed velocity (pointer events,
 *                      so mouse/pen/touch share one path)
 *   NoiseTargets    — collects/caches candidate elements once per enable(),
 *                      re-synced on resize/scroll, tracked live via
 *                      transform.js state (no per-frame layout reads)
 *   ClickPulse      — expanding/decaying push from a click or tap
 *   TextScramble    — direct hover swaps a target's text for symbols,
 *                      reshuffling until the pointer leaves
 *   TearEffect      — rare, brief horizontal seam line on fast swipes
 *   NoiseField/Renderer — the single rAF loop tying the jitter + pulses
 *                      + tear together (text scramble runs off hover
 *                      events, not this loop)
 */
(function () {
  if (typeof registerLab !== "function") return;

  var NOISE_CONFIG = {
    // field
    radius: 160, // px — cursor-to-element influence radius

    // element jitter
    maxJitter: 6, // px translate ceiling at full strength
    minJitterFloor: 0.2, // px floor so slow movement is barely-there, not zero
    rotateScale: 0.05, // radians of rotate per px of jitter magnitude
    wobbleSpeed: 0.02, // organic sine-wobble angular speed (per ms)
    ease: 0.16, // per-frame easing toward the target offset (recovery speed)
    settleEpsilon: 0.02, // below this, snap to exactly 0 and stop writing

    // velocity
    velocitySmoothing: 0.25, // EMA blend-in factor for fresh speed samples
    velocityDecay: 0.82, // per-frame decay applied while idle
    velocityMultiplier: 1.6, // px of jitter per (px/ms) of smoothed speed
    maxVelocityPxPerMs: 3, // clamp on smoothed speed before scaling

    // text scramble (hover-triggered, see TextScramble below)
    scrambleIntervalMs: 60,
    scrambleChars: ["%", "/", "?", "$", "#", "&", "*", "+", "=", "@", "~", "^"],

    // horizontal tear
    tearVelocityThreshold: 1.4,
    tearCooldownMs: 450,
    tearChance: 0.45,
    tearDurationMin: 50,
    tearDurationMax: 120,
    tearShiftMax: 9,
    tearStripCount: 2,

    // click / tap disturbance pulse
    pulseInitialRadius: 20,
    pulseMaxRadius: 260,
    pulseDurationMs: 600,
    pulseMaxDisplacement: 10,

    // targets / perf
    maxTargetsDesktop: 140,
    maxTargetsMobile: 50,
  };

  var isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
  var FIELD_RADIUS = isCoarsePointer ? NOISE_CONFIG.radius * 0.85 : NOISE_CONFIG.radius;
  var JITTER_SCALE = isCoarsePointer ? 0.75 : 1;

  var active = false;
  var rafId = null;

  // ==== PointerTracker =====================================================
  var pointer = { x: -9999, y: -9999, speed: 0 };
  var lastPX = null;
  var lastPY = null;
  var lastPT = 0;

  function onPointerMove(e) {
    var now = performance.now();
    var x = e.clientX;
    var y = e.clientY;
    if (lastPX !== null) {
      var dt = Math.max(now - lastPT, 1);
      var dist = Math.hypot(x - lastPX, y - lastPY);
      var instSpeed = Math.min(dist / dt, NOISE_CONFIG.maxVelocityPxPerMs * 3);
      pointer.speed += (instSpeed - pointer.speed) * NOISE_CONFIG.velocitySmoothing;
    }
    pointer.x = x;
    pointer.y = y;
    lastPX = x;
    lastPY = y;
    lastPT = now;
  }

  function onPointerDown(e) {
    pulses.push({ x: e.clientX, y: e.clientY, startAt: performance.now() });
    if (pulses.length > 6) pulses.shift();
  }

  // ==== NoiseTargets ========================================================
  // header covers the logo, nav links, lang/instagram/more/menu toggles and
  // the more-menu links; .hero-content .letter is the hero title + subtitle
  // (already split one span per character by main.js's typewriter); the labs
  // trigger/menu and the footer line round out the spec's target list.
  var TARGET_SELECTOR = [
    "header a",
    "header button",
    ".hero-content .letter",
    ".labs-toggle",
    ".labs-menu-btn",
    ".footer-copy",
  ].join(", ");

  var targets = [];

  function findTextNode(el) {
    for (var i = el.childNodes.length - 1; i >= 0; i--) {
      var node = el.childNodes[i];
      if (node.nodeType === 3 && node.data && node.data.trim()) return node;
    }
    return null;
  }

  function collectTargets() {
    targets = [];
    var max = isCoarsePointer ? NOISE_CONFIG.maxTargetsMobile : NOISE_CONFIG.maxTargetsDesktop;
    var els = document.querySelectorAll(TARGET_SELECTOR);
    for (var i = 0; i < els.length && targets.length < max; i++) {
      var el = els[i];
      var rect = el.getBoundingClientRect();
      if (!(rect.width > 0 && rect.height > 0)) continue;
      var s = window.labsTransform.get(el);
      var item = {
        el: el,
        // Un-transformed layout position — any tx/ty another lab already
        // has on this element (Gravity mid-fall, Physics drifting it) is
        // backed out here, then re-added live every frame from the
        // transform state (see applyFieldToItem) instead of re-measuring
        // the DOM, so Noise tracks wherever the element currently is
        // without ever calling getBoundingClientRect() in the hot path.
        originCx: rect.left + rect.width / 2 - s.tx,
        originCy: rect.top + rect.height / 2 - s.ty,
        cx: 0,
        cy: 0,
        nx: 0,
        ny: 0,
        nr: 0,
        applied: false,
        seed: Math.random() * Math.PI * 2,
        textNode: findTextNode(el),
        scrambleTimer: null,
        textOriginal: undefined,
      };
      if (item.textNode) attachScrambleHover(item);
      targets.push(item);
    }
  }

  function refreshRects() {
    targets.forEach(function (item) {
      var rect = item.el.getBoundingClientRect();
      var s = window.labsTransform.get(item.el);
      item.originCx = rect.left + rect.width / 2 - s.tx;
      item.originCy = rect.top + rect.height / 2 - s.ty;
    });
  }

  var refreshScheduled = false;
  function scheduleRefresh() {
    if (refreshScheduled || !active) return;
    refreshScheduled = true;
    requestAnimationFrame(function () {
      refreshScheduled = false;
      if (active) refreshRects();
    });
  }

  // ==== ClickPulse ==========================================================
  var pulses = [];

  function pulseRadiusAt(age) {
    var growWindow = NOISE_CONFIG.pulseDurationMs * 0.35;
    var t = Math.min(age / growWindow, 1);
    var eased = 1 - Math.pow(1 - t, 3);
    return (
      NOISE_CONFIG.pulseInitialRadius +
      (NOISE_CONFIG.pulseMaxRadius - NOISE_CONFIG.pulseInitialRadius) * eased
    );
  }

  function prunePulses(now) {
    while (pulses.length && now - pulses[0].startAt > NOISE_CONFIG.pulseDurationMs) {
      pulses.shift();
    }
  }

  // ==== TextScramble (hover-triggered) =====================================
  // Direct hover, not proximity/velocity like the jitter above — every
  // non-space character in the target's text node gets swapped for a
  // random symbol, reshuffling on an interval for as long as the pointer
  // stays over it, and restored verbatim the instant it leaves.
  function scrambleText(text) {
    var out = "";
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      out += /\s/.test(ch)
        ? ch
        : NOISE_CONFIG.scrambleChars[(Math.random() * NOISE_CONFIG.scrambleChars.length) | 0];
    }
    return out;
  }

  function startScramble(item) {
    var node = item.textNode;
    if (!node || item.scrambleTimer) return;
    item.textOriginal = node.data;
    node.data = scrambleText(item.textOriginal);
    item.scrambleTimer = window.setInterval(function () {
      node.data = scrambleText(item.textOriginal);
    }, NOISE_CONFIG.scrambleIntervalMs);
  }

  function stopScramble(item) {
    if (item.scrambleTimer) {
      window.clearInterval(item.scrambleTimer);
      item.scrambleTimer = null;
    }
    if (item.textNode && item.textOriginal !== undefined) {
      item.textNode.data = item.textOriginal;
    }
    item.textOriginal = undefined;
  }

  function attachScrambleHover(item) {
    item.onPointerEnter = function () {
      startScramble(item);
    };
    item.onPointerLeave = function () {
      stopScramble(item);
    };
    item.el.addEventListener("pointerenter", item.onPointerEnter);
    item.el.addEventListener("pointerleave", item.onPointerLeave);
  }

  function detachScrambleHover(item) {
    if (item.onPointerEnter) item.el.removeEventListener("pointerenter", item.onPointerEnter);
    if (item.onPointerLeave) item.el.removeEventListener("pointerleave", item.onPointerLeave);
  }

  // ==== TearEffect ==========================================================
  var tearStrips = [];
  var lastTearAt = 0;

  function ensureTearStrips() {
    if (tearStrips.length || isCoarsePointer) return;
    for (var i = 0; i < NOISE_CONFIG.tearStripCount; i++) {
      var strip = document.createElement("div");
      strip.className = "labs-noise-tear";
      document.body.appendChild(strip);
      tearStrips.push(strip);
    }
  }

  function maybeTriggerTear(now) {
    if (!tearStrips.length) return;
    if (pointer.speed < NOISE_CONFIG.tearVelocityThreshold) return;
    if (now - lastTearAt < NOISE_CONFIG.tearCooldownMs) return;
    lastTearAt = now;
    if (Math.random() > NOISE_CONFIG.tearChance) return;

    var strip = tearStrips[Math.floor(Math.random() * tearStrips.length)];
    var y = pointer.y + (Math.random() - 0.5) * FIELD_RADIUS;
    var height = 2 + Math.random() * 2;
    var shift = (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * (NOISE_CONFIG.tearShiftMax - 4));
    var duration =
      NOISE_CONFIG.tearDurationMin +
      Math.random() * (NOISE_CONFIG.tearDurationMax - NOISE_CONFIG.tearDurationMin);

    // Snap to the shifted position instantly (no transition), then
    // re-enable the transition before easing back — the tear itself
    // should read as an abrupt seam, only its recovery is smooth.
    strip.style.top = Math.max(0, y) + "px";
    strip.style.height = height + "px";
    strip.style.transition = "none";
    strip.style.transform = "translateX(" + shift + "px)";
    strip.classList.add("is-active");
    void strip.offsetWidth;
    strip.style.transition = "";

    window.setTimeout(function () {
      strip.style.transform = "translateX(0)";
      strip.classList.remove("is-active");
    }, duration);
  }

  // ==== NoiseField / Renderer ===============================================
  function applyFieldToItem(item, now) {
    var s = window.labsTransform.get(item.el);
    item.cx = item.originCx + s.tx;
    item.cy = item.originCy + s.ty;

    // Scale owns this element for the duration of its selection — same
    // courtesy Physics/Gravity already give it (see transform.js's
    // isLocked). Snap our own offset to zero rather than easing it, so
    // there's nothing left over for Scale's box math to trip on.
    if (window.labsTransform.isLocked(item.el)) {
      if (item.applied) {
        window.labsTransform.clearNoise(item.el);
        item.applied = false;
      }
      item.nx = 0;
      item.ny = 0;
      item.nr = 0;
      return;
    }

    var dx = item.cx - pointer.x;
    var dy = item.cy - pointer.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    var targetX = 0;
    var targetY = 0;
    var targetR = 0;

    if (dist < FIELD_RADIUS) {
      var t = 1 - dist / FIELD_RADIUS;
      var falloff = t * t; // smoother than linear falloff
      var speed = Math.min(pointer.speed, NOISE_CONFIG.maxVelocityPxPerMs);
      var mag = NOISE_CONFIG.minJitterFloor + speed * NOISE_CONFIG.velocityMultiplier;
      mag = Math.min(mag, NOISE_CONFIG.maxJitter) * falloff * JITTER_SCALE;

      if (dist > 0.5) {
        targetX += (dx / dist) * mag * 0.7;
        targetY += (dy / dist) * mag * 0.7;
      }
      // Small organic wobble on top of the directional push, per-element
      // phase (item.seed) so a cluster of nearby elements doesn't move
      // in obvious lockstep.
      targetX += Math.sin(now * NOISE_CONFIG.wobbleSpeed + item.seed) * mag * 0.5;
      targetY += Math.cos(now * NOISE_CONFIG.wobbleSpeed * 0.8 + item.seed * 1.7) * mag * 0.5;
      targetR += Math.sin(now * NOISE_CONFIG.wobbleSpeed + item.seed) * mag * NOISE_CONFIG.rotateScale;
    }

    for (var i = 0; i < pulses.length; i++) {
      var p = pulses[i];
      var age = now - p.startAt;
      if (age < 0 || age > NOISE_CONFIG.pulseDurationMs) continue;
      var pr = pulseRadiusAt(age);
      var pdx = item.cx - p.x;
      var pdy = item.cy - p.y;
      var pdist = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pdist < pr && pdist > 0.5) {
        var decay = 1 - age / NOISE_CONFIG.pulseDurationMs;
        var push = NOISE_CONFIG.pulseMaxDisplacement * decay * decay * (1 - pdist / pr);
        targetX += (pdx / pdist) * push;
        targetY += (pdy / pdist) * push;
      }
    }

    item.nx += (targetX - item.nx) * NOISE_CONFIG.ease;
    item.ny += (targetY - item.ny) * NOISE_CONFIG.ease;
    item.nr += (targetR - item.nr) * NOISE_CONFIG.ease;

    var settled =
      Math.abs(item.nx) < NOISE_CONFIG.settleEpsilon &&
      Math.abs(item.ny) < NOISE_CONFIG.settleEpsilon &&
      Math.abs(item.nr) < NOISE_CONFIG.settleEpsilon * 0.03;

    if (settled) {
      item.nx = 0;
      item.ny = 0;
      item.nr = 0;
      if (item.applied) {
        window.labsTransform.clearNoise(item.el);
        item.applied = false;
      }
      return;
    }

    window.labsTransform.updateNoise(item.el, { x: item.nx, y: item.ny, rotate: item.nr });
    item.applied = true;
  }

  function frame(timestamp) {
    if (!active) return;

    pointer.speed *= NOISE_CONFIG.velocityDecay;

    for (var i = 0; i < targets.length; i++) {
      applyFieldToItem(targets[i], timestamp);
    }

    maybeTriggerTear(timestamp);
    prunePulses(timestamp);

    rafId = requestAnimationFrame(frame);
  }

  function enable() {
    active = true;
    pointer.speed = 0;
    lastPX = null;
    pulses = [];

    collectTargets();
    ensureTearStrips();

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("scroll", scheduleRefresh, { passive: true });
    window.addEventListener("resize", scheduleRefresh);

    rafId = requestAnimationFrame(frame);
    window.labsSetActive("noise", true);
  }

  function disable() {
    active = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("scroll", scheduleRefresh);
    window.removeEventListener("resize", scheduleRefresh);

    targets.forEach(function (item) {
      stopScramble(item);
      detachScrambleHover(item);
      if (item.applied) {
        window.labsTransform.clearNoise(item.el);
        item.applied = false;
      }
      item.nx = 0;
      item.ny = 0;
      item.nr = 0;
    });
    targets = [];
    pulses = [];

    tearStrips.forEach(function (strip) {
      strip.style.transition = "none";
      strip.style.transform = "translateX(0)";
      strip.classList.remove("is-active");
    });

    window.labsSetActive("noise", false);
  }

  registerLab({
    id: "noise",
    title: "noise",
    action: function () {
      if (active) disable();
      else enable();
    },
  });
})();
