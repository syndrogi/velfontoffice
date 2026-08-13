/**
 * VELFONT OFFICE — Hero Slider
 * Fades between .hero-slide elements every 4s.
 * The first slide already carries `.is-active` in the HTML, so the hero
 * renders correctly even if this script never runs.
 */
(function () {
  var AUTOPLAY_MS = 4000;

  var hero = document.getElementById("hero");
  if (!hero) return;

  var slides = hero.querySelectorAll(".hero-slide");

  if (!slides.length) return;

  var total = slides.length;
  var current = 0;

  Array.prototype.forEach.call(slides, function (slide, i) {
    slide.classList.toggle("is-active", i === 0);
  });

  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (total > 1 && !reduceMotion) {
    setInterval(advance, AUTOPLAY_MS);
  }

  function advance() {
    slides[current].classList.remove("is-active");
    current = (current + 1) % total;
    slides[current].classList.add("is-active");
  }
})();

/**
 * VELFONT OFFICE — Header Navigation
 * Mobile off-canvas drawer + scroll-driven active-link state.
 */
(function () {
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".menu-toggle");
  var drawer = document.getElementById("mobile-nav");
  var backdrop = document.querySelector(".nav-backdrop");
  if (!header || !toggle || !drawer || !backdrop) return;

  var mobileMedia = window.matchMedia("(max-width: 768px)");

  function openMenu() {
    drawer.classList.add("is-open");
    drawer.removeAttribute("inert");
    backdrop.classList.add("is-visible");
    backdrop.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    toggle.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeMenu() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("inert", "");
    backdrop.classList.remove("is-visible");
    toggle.setAttribute("aria-expanded", "false");
    toggle.classList.remove("is-open");
    document.body.style.overflow = "";
    window.setTimeout(function () {
      if (!drawer.classList.contains("is-open")) backdrop.hidden = true;
    }, 350);
  }

  toggle.addEventListener("click", function () {
    if (drawer.classList.contains("is-open")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  backdrop.addEventListener("click", closeMenu);

  drawer.addEventListener("click", function (e) {
    if (e.target.tagName === "A") closeMenu();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && drawer.classList.contains("is-open")) closeMenu();
  });

  mobileMedia.addEventListener("change", function (e) {
    if (!e.matches) closeMenu();
  });

  // Active-section highlighting for in-page anchor links (Office/Archive/About).
  var anchorLinks = document.querySelectorAll(
    '.main-nav a[href^="#"], .mobile-nav a[href^="#"]'
  );
  if (!anchorLinks.length || !("IntersectionObserver" in window)) return;

  var linksByTarget = {};
  anchorLinks.forEach(function (link) {
    var id = link.getAttribute("href").slice(1);
    if (!linksByTarget[id]) linksByTarget[id] = [];
    linksByTarget[id].push(link);
  });

  function setActive(id) {
    anchorLinks.forEach(function (link) {
      link.classList.toggle("is-active", link.getAttribute("href") === "#" + id);
    });
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
  );

  Object.keys(linksByTarget).forEach(function (id) {
    var section = document.getElementById(id);
    if (section) observer.observe(section);
  });
})();

/**
 * VELFONT OFFICE — First-paint Typewriter
 * Reveals the nav, hero title/subtitle, and the scroll hint character by
 * character. Only runs when `.js-typing` is present on <html> (set by an
 * inline script in <head>, and skipped for prefers-reduced-motion), so
 * with JS disabled — or motion reduced — the text is simply already there.
 */
(function () {
  if (!document.documentElement.classList.contains("js-typing")) return;

  // Break an element's children into an ordered list of text runs and
  // <br> markers so multi-line copy (the hero subtitle) types correctly.
  function captureSegments(el) {
    var segments = [];
    Array.prototype.forEach.call(el.childNodes, function (node) {
      if (node.nodeType === 3 && node.textContent) {
        // Collapse HTML source whitespace (line breaks + indentation)
        // the way a browser normally would — otherwise it gets typed
        // out as real, non-collapsing letter spans and pushes each
        // line in from the left.
        segments.push({ type: "text", value: node.textContent.replace(/\s+/g, " ") });
      } else if (node.nodeName === "BR") {
        segments.push({ type: "br" });
      }
    });

    segments.forEach(function (seg, i) {
      if (seg.type !== "text") return;
      var prev = segments[i - 1];
      var next = segments[i + 1];
      if (i === 0 || (prev && prev.type === "br")) {
        seg.value = seg.value.replace(/^ /, "");
      }
      if (i === segments.length - 1 || (next && next.type === "br")) {
        seg.value = seg.value.replace(/ $/, "");
      }
    });

    return segments;
  }

  // Lets a single letter span be picked up and dragged around with the
  // pointer. Movement is a plain transform offset — it doesn't affect
  // layout or its neighboring letters.
  function makeLetterDraggable(el) {
    el.style.touchAction = "none";
    var dragging = false;
    var startX = 0;
    var startY = 0;
    var offsetX = 0;
    var offsetY = 0;
    var baseX = 0;
    var baseY = 0;

    el.addEventListener("pointerdown", function (e) {
      // While gravity is active, physics owns dragging for every body
      // (see gravity.js) — this handler would otherwise fight it for
      // control of the same transform every frame.
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
      offsetX = baseX + (e.clientX - startX);
      offsetY = baseY + (e.clientY - startY);
      window.labsTransform.update(el, { tx: offsetX, ty: offsetY });
    });

    function releaseDrag(e) {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("is-dragging");
    }

    el.addEventListener("pointerup", releaseDrag);
    el.addEventListener("pointercancel", releaseDrag);
  }

  function typeElement(el, options) {
    if (!el) {
      if (options && options.onDone) options.onDone();
      return;
    }
    var speed = (options && options.speed) || 30;
    var onDone = options && options.onDone;
    var letterSpans = options && options.letterSpans;
    var draggable = options && options.draggable;
    var segments = captureSegments(el);

    // Tags this specific run so a stale step() can tell it's been
    // superseded by a second typeElement() call on the same element.
    // Without this, a still-pending step() scheduled against the segments
    // captured here would keep appending onto whatever text is there by
    // the time it fires, corrupting it.
    var runToken = {};
    el.__typeRun = runToken;

    el.textContent = "";
    el.classList.add("is-typing");

    var segIndex = 0;
    var charIndex = 0;

    function step() {
      if (el.__typeRun !== runToken) {
        // Superseded by a second typeElement() call — the element's
        // content is already final, so mark it typed rather than leaving
        // it with neither class: under
        // html.js-typing that combination stays visibility:hidden forever
        // (see .main-nav a in style.css), since only .is-typing/.is-typed
        // force it visible.
        el.classList.remove("is-typing");
        el.classList.add("is-typed");
        return;
      }

      if (segIndex >= segments.length) {
        el.classList.remove("is-typing");
        el.classList.add("is-typed");
        if (onDone) onDone();
        return;
      }

      var segment = segments[segIndex];

      if (segment.type === "br") {
        el.appendChild(document.createElement("br"));
        segIndex++;
        charIndex = 0;
        step();
        return;
      }

      // Each letter gets its own span so it can be hovered independently
      // (see the hero title/subtitle red-on-hover effect).
      if (letterSpans) {
        var letter = document.createElement("span");
        letter.className = "letter";
        var ch = segment.value.charAt(charIndex);
        // A lone space inside an inline-block box gets trimmed as
        // leading/trailing whitespace, so use a non-breaking space to
        // keep word gaps visible between letter spans.
        letter.textContent = ch === " " ? " " : ch;
        if (draggable) makeLetterDraggable(letter);
        el.appendChild(letter);
      } else {
        if (charIndex === 0) el.appendChild(document.createTextNode(""));
        var textNode = el.lastChild;
        textNode.textContent += segment.value.charAt(charIndex);
      }
      charIndex++;

      if (charIndex >= segment.value.length) {
        segIndex++;
        charIndex = 0;
      }

      setTimeout(step, speed);
    }

    step();
  }

  // Same timing/easing as the header logo's stroke-drawn intro
  // (js/logo-draw.js: `duration: 900, delay: stagger(9), ease: "inOutQuad"`)
  // so the hero title's reveal reads as "the same animation" even though
  // it draws real text (each letter stroke-outlined, then filled), not a
  // traced SVG mark.
  var HERO_DRAW_DURATION_MS = 900;
  var HERO_DRAW_STAGGER_MS = 9;

  var navLinks = document.querySelectorAll(".main-nav a");
  var heroTitle = document.querySelector(".hero-title");
  var heroSubtitle = document.querySelector(".hero-subtitle");

  navLinks.forEach(function (link, i) {
    setTimeout(function () {
      typeElement(link, { speed: 28 });
    }, i * 60);
  });

  function revealSubtitle() {
    typeElement(heroSubtitle, {
      speed: 14,
      letterSpans: true,
      draggable: true,
    });
  }

  // Keeps "VELFONT OFFICE" as real text — every letter is inserted up
  // front (nothing to read out of order for assistive tech) and reveals
  // via a stroke-to-fill CSS animation, staggered per letter.
  function drawHeroTitle(el, onDone) {
    if (!el) {
      if (onDone) onDone();
      return;
    }
    var text = el.textContent;
    el.textContent = "";
    el.classList.add("is-typing");

    var letters = text.split("");
    letters.forEach(function (ch, i) {
      var span = document.createElement("span");
      span.className = "letter";
      span.textContent = ch === " " ? " " : ch;
      span.style.animationDelay = i * HERO_DRAW_STAGGER_MS + "ms";
      makeLetterDraggable(span);
      el.appendChild(span);
    });

    var totalMs = (letters.length - 1) * HERO_DRAW_STAGGER_MS + HERO_DRAW_DURATION_MS;
    setTimeout(function () {
      el.classList.remove("is-typing");
      el.classList.add("is-typed");
      if (onDone) onDone();
    }, totalMs);
  }

  setTimeout(function () {
    drawHeroTitle(heroTitle, revealSubtitle);
  }, 350);
})();

/**
 * VELFONT OFFICE — Cross-section Page Transition
 * Fades a veil in before handing off to /shop/ (white — another section
 * of the same site) or the 5th Ave. Bipolar Kids Figma site (black — a
 * sharper break, since that link leaves VELFONT entirely), then
 * navigates, so the jump feels like one continuous motion rather than a
 * hard cut — still a full page load (separate static HTML/site, not a
 * shared SPA route) either way.
 */
(function () {
  var veil = document.querySelector(".page-veil");
  if (!veil) return;

  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  var VEIL_MS = reduceMotion ? 0 : 420;

  var DARK_IDS = ["fifthAveLink", "fifthAveLinkMobile"];

  var links = document.querySelectorAll(
    'a[href^="/shop/"], #fifthAveLink, #fifthAveLinkMobile'
  );

  Array.prototype.forEach.call(links, function (link) {
    link.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
      }

      e.preventDefault();
      veil.classList.toggle("is-dark", DARK_IDS.indexOf(link.id) !== -1);
      veil.classList.add("is-active");
      setTimeout(function () {
        window.location.href = link.href;
      }, VEIL_MS);
    });
  });
})();
