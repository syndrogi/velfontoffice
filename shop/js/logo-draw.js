/**
 * VELFONT SHOP — Logo Intro Draw
 * Same treatment as the main site's header (js/logo-draw.js there):
 * traces the header logo (images/logo-draw.svg) with anime.js's
 * createDrawable on first paint, then cross-fades into the real
 * .logo-mark. The main site gates this on a `.js-typing` class set in
 * <head>; the shop has no equivalent class, so this checks
 * prefers-reduced-motion directly instead.
 */
(async function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const logo = document.querySelector(".logo");
  const logoMark = document.querySelector(".logo-mark");
  if (!logo || !logoMark) return;

  let svgMarkup;
  try {
    const res = await fetch("images/logo-draw.svg");
    if (!res.ok) return;
    svgMarkup = await res.text();
  } catch {
    return; // Offline/blocked fetch — logoMark is already visible, nothing to undo.
  }

  logo.insertAdjacentHTML("beforeend", svgMarkup);
  const drawSvg = logo.querySelector(".logo-draw");
  const fillPath = logo.querySelector(".logo-draw-fill");
  if (!drawSvg || !fillPath) return;

  let anime;
  try {
    anime = await import("https://cdn.jsdelivr.net/npm/animejs@4.5.0/+esm");
  } catch {
    drawSvg.remove(); // Blocked CDN — fall back to the plain mask-image logo.
    return;
  }
  const { animate, svg, stagger } = anime;

  logoMark.classList.add("is-intro-hidden");
  requestAnimationFrame(() => drawSvg.classList.add("is-visible"));

  animate(svg.createDrawable(".logo-draw-line"), {
    draw: ["0 0", "0 1"],
    ease: "inOutQuad",
    duration: 900,
    delay: stagger(9),
    onComplete: function () {
      fillPath.classList.add("is-filled");
      logoMark.classList.remove("is-intro-hidden");
      drawSvg.classList.remove("is-visible");
      setTimeout(function () {
        drawSvg.remove();
      }, 400);
    },
  });
})();
