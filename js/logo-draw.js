/**
 * VELFONT OFFICE — Logo Intro Draw
 * Traces the logo's own construction-grid artwork (images/logo-draw.svg —
 * vectorized from images/logo.png) into a given container with anime.js's
 * createDrawable, then cross-fades into that container's own mask-image
 * mark element. Exposed as window.VFOLogoDraw.drawInto so both the header
 * logo (below) and the hero title mark (js/main.js's typewriter sequence)
 * can replay the same intro instead of duplicating the fetch/draw logic.
 * Gated on `.js-typing` (set in <head>, skipped for prefers-reduced-motion)
 * so reduced-motion / no-JS visitors never fetch the SVG and just see the
 * mask-image mark that's already in the HTML.
 */
(function () {
  if (!document.documentElement.classList.contains("js-typing")) return;

  var svgMarkup = null;

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

  // container: the positioned element the traced SVG is inserted into.
  // mark: the mask-image element inside it that's hidden while the SVG
  // draws, then revealed (with its fill cross-fade) once drawing completes.
  async function drawInto(container, mark, onDone) {
    var markup = await fetchMarkup();
    if (!markup) {
      if (onDone) onDone();
      return;
    }

    container.insertAdjacentHTML("beforeend", markup);
    var drawSvg = container.querySelector(".logo-draw");
    var fillPath = container.querySelector(".logo-draw-fill");
    if (!drawSvg || !fillPath) {
      if (onDone) onDone();
      return;
    }

    var anime;
    try {
      anime = await import("https://cdn.jsdelivr.net/npm/animejs@4.5.0/+esm");
    } catch {
      drawSvg.remove(); // Blocked CDN — fall back to the plain mask-image mark.
      if (onDone) onDone();
      return;
    }
    var animate = anime.animate;
    var svg = anime.svg;
    var stagger = anime.stagger;

    mark.classList.add("is-intro-hidden");
    requestAnimationFrame(function () {
      drawSvg.classList.add("is-visible");
    });

    animate(svg.createDrawable(container.querySelectorAll(".logo-draw-line")), {
      draw: ["0 0", "0 1"],
      ease: "inOutQuad",
      duration: 900,
      delay: stagger(9),
      onComplete: function () {
        fillPath.classList.add("is-filled");
        mark.classList.remove("is-intro-hidden");
        drawSvg.classList.remove("is-visible");
        if (onDone) onDone();
        setTimeout(function () {
          drawSvg.remove();
        }, 400);
      },
    });
  }

  window.VFOLogoDraw = { drawInto: drawInto };

  var logo = document.querySelector(".logo");
  var logoMark = document.querySelector(".logo-mark");
  if (logo && logoMark) drawInto(logo, logoMark);
})();
