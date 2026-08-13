/**
 * VELFONT OFFICE — Labs / Gravity
 * Pulls every header button, hero letter, and hero image out of normal
 * layout — from wherever it currently sits on screen — and hands it to
 * Matter.js as a falling body. One-shot: once an element has fallen it
 * moves out of header/.hero-content, so nothing is left to grab on a
 * second run. Behavior is unchanged from the original standalone
 * Gravity button; only how it's triggered has moved.
 *
 * Targets are matched by tag/role inside `header` and `.hero-content`
 * (any a/button/img there, plus per-letter spans) rather than a fixed
 * list of classes, so new text or images dropped into those areas
 * later are picked up automatically.
 */
(function () {
  if (typeof registerLab !== "function" || !window.Matter) return;

  var TARGET_SELECTOR = [
    "header a",
    "header button",
    ".hero-content .letter",
    ".hero-content img",
    ".labs-logo-mark",
  ].join(", ");

  // Visual properties that only exist because of an ancestor (the big
  // hero-title font-size, for example) have to be baked in as inline
  // styles before an element is re-parented to <body> — once it's a
  // direct child of body it no longer inherits from .hero-title/etc.
  // `color` is deliberately excluded: baking it in as an inline style
  // would outrank the `.letter:hover`/`.nav-link:hover` CSS rules and
  // permanently kill the hover-red effect.
  var FONT_PROPS = [
    "fontSize",
    "fontWeight",
    "fontFamily",
    "letterSpacing",
    "lineHeight",
    "textTransform",
  ];

  var Engine = Matter.Engine;
  var World = Matter.World;
  var Bodies = Matter.Bodies;
  var Body = Matter.Body;
  var Runner = Matter.Runner;

  // Lets a falling/settled body be grabbed and dragged by the pointer —
  // dragging moves the actual Matter.js body (pinned static while held)
  // so it keeps colliding correctly and resumes falling on release.
  function attachBodyDrag(item) {
    var dragging = false;
    var offsetX = 0;
    var offsetY = 0;

    function onDown(e) {
      dragging = true;
      Body.setStatic(item.body, true);
      offsetX = e.clientX - item.body.position.x;
      offsetY = e.clientY - item.body.position.y;
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    }

    function onMove(e) {
      Body.setPosition(item.body, {
        x: e.clientX - offsetX,
        y: e.clientY - offsetY,
      });
    }

    function onUp() {
      dragging = false;
      Body.setStatic(item.body, false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    }

    item.el.addEventListener("pointerdown", onDown);
  }

  function startGravity() {
    window.__gravityActive = true;

    var engine = Engine.create();
    engine.gravity.y = 9.8;
    var world = engine.world;

    var w = window.innerWidth;
    var h = window.innerHeight;

    World.add(world, [
      Bodies.rectangle(w / 2, h + 25, w * 2, 50, { isStatic: true }),
      Bodies.rectangle(-25, h / 2, 50, h * 2, { isStatic: true }),
      Bodies.rectangle(w + 25, h / 2, 50, h * 2, { isStatic: true }),
    ]);

    // Measure every target BEFORE mutating any of them. Re-parenting or
    // resizing one element can reflow the rest (removing a header link
    // shifts its flex siblings; pulling one letter out of a line of
    // text collapses the rest of that line) — capturing all rects
    // first means every element's fall origin matches where it actually
    // was on screen, not a position skewed by earlier removals.
    // Skip anything Scale currently has selected — Scale's box math has
    // no idea an element it's tracking got yanked out of layout and
    // handed to Matter.js mid-selection, and Gravity's per-frame rotate
    // isn't something Scale's axis-aligned box accounts for either.
    var targets = Array.prototype.slice
      .call(document.querySelectorAll(TARGET_SELECTOR))
      .filter(function (el) {
        return !window.labsTransform.isLocked(el);
      });

    var measurements = targets
      .map(function (el) {
        var rect = el.getBoundingClientRect();
        var computed = window.getComputedStyle(el);
        var fontStyles = {};
        FONT_PROPS.forEach(function (prop) {
          fontStyles[prop] = computed[prop];
        });
        return { el: el, rect: rect, fontStyles: fontStyles };
      })
      .filter(function (m) {
        return m.rect.width > 0 && m.rect.height > 0;
      });

    var items = measurements.map(function (m) {
      var el = m.el;
      var rect = m.rect;
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;

      // Bake in the computed look before moving, so the element keeps
      // its exact size/weight once it's no longer inside .hero-title,
      // .main-nav, etc.
      FONT_PROPS.forEach(function (prop) {
        el.style[prop] = m.fontStyles[prop];
      });

      document.body.appendChild(el);
      el.style.position = "fixed";
      el.style.left = rect.left + "px";
      el.style.top = rect.top + "px";
      el.style.width = rect.width + "px";
      el.style.height = rect.height + "px";
      el.style.margin = "0";
      el.style.zIndex = "500";
      el.style.touchAction = "none";

      var body = Bodies.rectangle(cx, cy, rect.width, rect.height, {
        restitution: 0.45,
        friction: 0.4,
        frictionAir: 0.01,
      });
      Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.15);
      Body.setVelocity(body, { x: (Math.random() - 0.5) * 2, y: 0 });
      World.add(world, body);

      var item = { el: el, body: body, cx: cx, cy: cy };
      attachBodyDrag(item);
      return item;
    });

    var runner = Runner.create();
    Runner.run(runner, engine);

    (function renderLoop() {
      items.forEach(function (item) {
        var pos = item.body.position;
        var dx = pos.x - item.cx;
        var dy = pos.y - item.cy;
        window.labsTransform.update(item.el, { tx: dx, ty: dy, rotate: item.body.angle });
      });
      requestAnimationFrame(renderLoop);
    })();
  }

  registerLab({
    id: "gravity",
    title: "gravity",
    action: startGravity,
  });
})();
