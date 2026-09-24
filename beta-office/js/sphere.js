/**
 * BETA OFFICE — Kinetic Typography Sphere
 * Builds the first-screen nav out of real VELFONT OFFICE destinations
 * (read from the root site's actual header markup, not invented) and
 * places repeated instances of each word on a sphere via the standard
 * Fibonacci/golden-angle point distribution — genuine 3D placement,
 * not a flat ring pretending to be one.
 *
 * The whole sphere is one rigid body: pointer position sets a target
 * yaw/pitch, a slow idle spin rides underneath it, and a single rAF
 * loop lerps the current rotation toward that target every frame —
 * same hand-rolled ease-toward-target technique as the root site's
 * js/transform.js / js/labs/noise.js, just applied to rotateX/rotateY
 * instead of translate.
 *
 * Exposes window.BetaSphere = { randomize(), reset() } for app.js's
 * global Randomize/Reset buttons.
 */
(function () {
  var stage = document.getElementById("betaSphereStage");
  var sphereEl = document.getElementById("betaSphere");
  var metaEl = document.getElementById("betaSphereMeta");
  if (!stage || !sphereEl || !metaEl) return;

  // Real destinations — labels/URLs/descriptions taken directly from
  // the root site (index.html's .main-nav/.mobile-nav/.more-menu, and
  // the real <meta name="description"> copy of each linked page).
  var PRIMARY = [
    { label: "SHOP", href: "/shop/", meta: "Collections from VELFONT OFFICE." },
    { label: "OFFICE", href: "/#office", meta: "Internal structure, process, and the working methods behind VELFONT OFFICE." },
    { label: "ARCHIVE", href: "/#archive", meta: "A growing record of collections, references, and research." },
    { label: "ABOUT", href: "/#about", meta: "An incomplete documentation by Velcrogi." },
    { label: "CONTACT", href: "/", meta: "Reach VELFONT OFFICE." },
  ];
  var SECONDARY = [
    { label: "MEMBERS ONLY", href: "/os/", meta: "Founder OS." },
    { label: "5TH AVE. BIPOLAR KIDS", href: "https://revel-trace-46441903.figma.site/", meta: "External project.", external: true },
    { label: "HYUNGROK (ROY) SON", href: "/hyungrokson/", meta: "Portfolio and projects." },
  ];

  var REPEATS_PRIMARY = 7;
  var REPEATS_SECONDARY = 3;
  var RADIUS_PRIMARY_DESKTOP = 240;
  var RADIUS_SECONDARY_DESKTOP = 130;
  var HOVER_PUSH = 26;
  var MAX_YAW = 55; // deg, left/right — follows the pointer directly
  var MAX_PITCH = 16; // deg, up/down — "아주 미세하게"
  var IDLE_SPEED = 0.13; // deg/frame baseline spin — one full turn every ~46s at 60fps
  var IDLE_SPEED_HOVER = 0.03; // slows (not stops) while a group is hovered
  var LERP = 0.07;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isCoarse = window.matchMedia("(pointer: coarse)").matches;
  var isNarrow = window.innerWidth <= 768;
  var isFlat = reduceMotion || isCoarse || isNarrow;

  var groupEls = {}; // label -> [{el, baseTransform, R}]
  var allWords = [];
  var hoveredLabel = null;
  var transitioning = false;

  function fibonacciPoints(count) {
    var points = [];
    var goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < count; i++) {
      var y = count === 1 ? 0 : 1 - (i / (count - 1)) * 2;
      var radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      var theta = goldenAngle * i;
      var x = Math.cos(theta) * radiusAtY;
      var z = Math.sin(theta) * radiusAtY;
      points.push({ x: x, y: y, z: z });
    }
    return points;
  }

  function pointToTransform(point, radius) {
    var rotY = Math.atan2(point.x, point.z) * (180 / Math.PI);
    var rotX = Math.asin(-point.y) * (180 / Math.PI);
    return "translate(-50%, -50%) rotateY(" + rotY.toFixed(2) + "deg) rotateX(" + rotX.toFixed(2) + "deg) translateZ(" + radius + "px)";
  }

  function buildWord(item, isSecondary) {
    var a = document.createElement("a");
    a.className = "beta-sphere-word" + (isSecondary ? " beta-is-secondary" : "");
    a.textContent = item.label;
    a.href = item.href;
    a.dataset.group = item.label;
    if (item.external) {
      a.target = "_blank";
      a.rel = "noopener";
    }
    return a;
  }

  function attachInteraction(a, item) {
    a.addEventListener("pointerenter", function () {
      setHover(item.label, item.meta, item.href, item.external);
    });
    a.addEventListener("pointerleave", function () {
      clearHover(item.label);
    });
    a.addEventListener("click", function (e) {
      if (item.external || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return; // let the browser handle new-tab/etc natively
      if (isFlat) return; // no flatten transition in the simplified fallback — just navigate
      if (transitioning) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      runClickTransition(item);
    });
  }

  function setHover(label, meta, href, external) {
    if (isFlat) {
      sphereEl.classList.add("beta-has-hover");
    } else {
      sphereEl.classList.add("beta-has-hover");
    }
    hoveredLabel = label;
    allWords.forEach(function (w) {
      w.el.classList.toggle("beta-is-hovered", w.el.dataset.group === label);
    });
    if (!isFlat && groupEls[label]) {
      groupEls[label].forEach(function (w) {
        w.el.style.transform = pointToTransform(w.point, w.R + HOVER_PUSH);
      });
    }
    var index = PRIMARY.concat(SECONDARY).map(function (i) { return i.label; }).indexOf(label) + 1;
    metaEl.innerHTML = "<strong>[" + String(index).padStart(2, "0") + "] " + label + "</strong>" + meta;
    metaEl.classList.add("beta-is-visible");
  }

  function clearHover(label) {
    if (hoveredLabel !== label) return;
    hoveredLabel = null;
    sphereEl.classList.remove("beta-has-hover");
    allWords.forEach(function (w) {
      w.el.classList.remove("beta-is-hovered");
    });
    if (!isFlat && groupEls[label]) {
      groupEls[label].forEach(function (w) {
        w.el.style.transform = pointToTransform(w.point, w.R);
      });
    }
    metaEl.classList.remove("beta-is-visible");
  }

  function runClickTransition(item) {
    transitioning = true;
    sphereEl.classList.add("beta-is-transitioning");
    var target = groupEls[item.label] || [];
    var others = allWords.filter(function (w) {
      return w.el.dataset.group !== item.label;
    });
    var mid = (target.length - 1) / 2;
    target.forEach(function (w, i) {
      w.el.style.transform = "translate(-50%, -50%) translateX(" + ((i - mid) * 92) + "px) translateZ(260px) scale(1.5)";
    });
    others.forEach(function (w) {
      w.el.style.opacity = "0";
      w.el.style.transform = pointToTransform(w.point, w.R * 0.35);
    });
    window.setTimeout(function () {
      window.location.href = item.href;
    }, 700);
  }

  function build() {
    if (isFlat) {
      sphereEl.classList.add("beta-is-flat");
      PRIMARY.concat(SECONDARY).forEach(function (item, i) {
        var isSecondary = i >= PRIMARY.length;
        var a = buildWord(item, isSecondary);
        attachInteraction(a, item);
        sphereEl.appendChild(a);
        allWords.push({ el: a, point: { x: 0, y: 0, z: 0 }, R: 0 });
        groupEls[item.label] = groupEls[item.label] || [];
        groupEls[item.label].push({ el: a, point: { x: 0, y: 0, z: 0 }, R: 0 });
      });
      return;
    }

    var vw = window.innerWidth;
    var scale = Math.min(1, Math.max(0.55, vw / 1400));
    var radiusPrimary = RADIUS_PRIMARY_DESKTOP * scale;
    var radiusSecondary = RADIUS_SECONDARY_DESKTOP * scale;

    // Flat-grid landing spot for the scroll morph (scroll-morph.js) —
    // one slot per unique label, two rows (primary/secondary). Every
    // repeated instance of a label shares the same slot: the first
    // instance built becomes that label's visible "representative" at
    // full morph, every other repeat fades to 0 as it converges onto
    // the same point, reading as the repeats merging into one word.
    var seenFlat = {};
    function flatSlotFor(item, listIndex, listLength, row) {
      var spacing = Math.min(150, (Math.min(window.innerWidth, 1100) - 80) / listLength);
      var x = (listIndex - (listLength - 1) / 2) * spacing;
      var y = row === 0 ? -22 : 26;
      var isRepresentative = !seenFlat[item.label];
      seenFlat[item.label] = true;
      return { x: x, y: y, isRepresentative: isRepresentative };
    }

    var primaryTotal = PRIMARY.length * REPEATS_PRIMARY;
    var primaryPoints = fibonacciPoints(primaryTotal);
    primaryPoints.forEach(function (point, i) {
      var idx = i % PRIMARY.length;
      var item = PRIMARY[idx];
      var a = buildWord(item, false);
      a.style.transform = pointToTransform(point, radiusPrimary);
      attachInteraction(a, item);
      sphereEl.appendChild(a);
      var flat = flatSlotFor(item, idx, PRIMARY.length, 0);
      var rec = { el: a, point: point, R: radiusPrimary, flat: flat };
      allWords.push(rec);
      groupEls[item.label] = groupEls[item.label] || [];
      groupEls[item.label].push(rec);
    });

    var secondaryTotal = SECONDARY.length * REPEATS_SECONDARY;
    var secondaryPoints = fibonacciPoints(secondaryTotal);
    secondaryPoints.forEach(function (point, i) {
      var idx = i % SECONDARY.length;
      var item = SECONDARY[idx];
      var a = buildWord(item, true);
      a.style.transform = pointToTransform(point, radiusSecondary);
      attachInteraction(a, item);
      sphereEl.appendChild(a);
      var flat = flatSlotFor(item, idx, SECONDARY.length, 1);
      var rec = { el: a, point: point, R: radiusSecondary, flat: flat };
      allWords.push(rec);
      groupEls[item.label] = groupEls[item.label] || [];
      groupEls[item.label].push(rec);
    });
  }

  build();

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // ==== Rotation loop (skipped entirely in the flat/reduced-motion case) ====
  var curX = 0, curY = 0, targetX = 0, targetY = 0, idleAngle = 0;
  // Pointer offset layered ON TOP of idleAngle each frame (see frame()
  // below) — kept separate so the idle spin never stops accumulating
  // just because the pointer is sitting still over the stage. Previously
  // onPointerMove baked idleAngle into targetY directly, which froze the
  // globe the moment the mouse stopped moving instead of just tilting it.
  var pointerYaw = 0, pointerPitch = 0;
  var pointerActive = false;
  var rafId = null;
  // Set by scroll-morph.js once the visitor starts scrolling past the
  // sphere — while true, this file stops driving the parent's own
  // rotation (setScrollProgress positions every word directly instead),
  // so the two don't fight over the same transforms.
  var morphActive = false;

  function onPointerMove(e) {
    var rect = stage.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var nx = (e.clientX - cx) / (rect.width / 2);
    var ny = (e.clientY - cy) / (rect.height / 2);
    nx = Math.max(-1, Math.min(1, nx));
    ny = Math.max(-1, Math.min(1, ny));
    pointerActive = true;
    pointerYaw = nx * MAX_YAW;
    pointerPitch = -ny * MAX_PITCH;
  }

  function frame() {
    idleAngle += hoveredLabel ? IDLE_SPEED_HOVER : IDLE_SPEED;
    // Idle spin is always the baseline — the pointer only adds a yaw/
    // pitch offset on top of it while active, and the sphere levels
    // back out (pitch → 0) the moment the pointer leaves, so it always
    // reads as a globe turning on its own axis, mouse or not.
    targetY = idleAngle + (pointerActive ? pointerYaw : 0);
    targetX = pointerActive ? pointerPitch : 0;
    curX += (targetX - curX) * LERP;
    curY += (targetY - curY) * LERP;
    if (!morphActive) {
      sphereEl.style.transform = "rotateX(" + curX.toFixed(2) + "deg) rotateY(" + curY.toFixed(2) + "deg)";
    }
    rafId = requestAnimationFrame(frame);
  }

  if (!isFlat) {
    stage.addEventListener("pointermove", onPointerMove, { passive: true });
    stage.addEventListener("pointerleave", function () {
      pointerActive = false;
    });
    rafId = requestAnimationFrame(frame);

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      } else if (!rafId) {
        rafId = requestAnimationFrame(frame);
      }
    });
  }

  // Called by scroll-morph.js with 0 (fully sphere) → 1 (fully flat
  // grid) as the visitor scrolls through the sphere stage. Interpolates
  // every word's own point-on-sphere transform toward its flat-grid
  // slot (see flatSlotFor above) instead of fading the whole sphere out.
  function setScrollProgress(t) {
    if (isFlat) return;
    morphActive = t > 0.001;
    if (!morphActive) {
      sphereEl.style.transform = "rotateX(" + curX.toFixed(2) + "deg) rotateY(" + curY.toFixed(2) + "deg)";
    } else {
      sphereEl.style.transform = "rotateX(0deg) rotateY(0deg)";
    }
    allWords.forEach(function (w) {
      if (!morphActive) {
        w.el.style.transform = pointToTransform(w.point, w.R);
        w.el.style.opacity = "";
        return;
      }
      var rotY = lerp(Math.atan2(w.point.x, w.point.z) * (180 / Math.PI), 0, t);
      var rotX = lerp(Math.asin(-w.point.y) * (180 / Math.PI), 0, t);
      var tz = lerp(w.R, 0, t);
      var fx = lerp(0, w.flat.x, t);
      var fy = lerp(0, w.flat.y, t);
      w.el.style.transform =
        "translate(-50%, -50%) translate(" + fx.toFixed(1) + "px, " + fy.toFixed(1) + "px) rotateY(" + rotY.toFixed(2) + "deg) rotateX(" + rotX.toFixed(2) + "deg) translateZ(" + tz.toFixed(1) + "px)";
      w.el.style.opacity = w.flat.isRepresentative ? String(Math.max(0.85, 1)) : String(1 - t);
    });
  }

  window.BetaSphere = {
    isFlat: function () {
      return isFlat;
    },
    setScrollProgress: setScrollProgress,
    getWordCount: function () {
      return allWords.length;
    },
    randomize: function () {
      if (isFlat) return;
      idleAngle += (Math.random() - 0.5) * 60;
      IDLE_SPEED = 0.05 + Math.random() * 0.35;
    },
    reset: function () {
      idleAngle = 0;
      curX = 0;
      curY = 0;
      targetX = 0;
      targetY = 0;
      pointerActive = false;
      pointerYaw = 0;
      pointerPitch = 0;
      IDLE_SPEED = 0.13;
    },
  };
})();
