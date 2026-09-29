/**
 * VELFONT OFFICE — Labs / Measure
 * Toggles a ruler cursor: hovering any element outlines it and shows
 * its rendered width × height next to the pointer. Click Measure
 * again to turn it off.
 */
(function () {
  if (typeof registerLab !== "function") return;

  var active = false;
  var highlight = null;
  var label = null;
  var currentEl = null;
  var pendingX = 0;
  var pendingY = 0;
  var ticking = false;
  var rafId = null;

  function ensureUI() {
    if (highlight) return;
    highlight = document.createElement("div");
    highlight.className = "labs-measure-highlight";
    label = document.createElement("div");
    label.className = "labs-measure-label";
    document.body.appendChild(highlight);
    document.body.appendChild(label);
  }

  // The raw mousemove handler below only records the latest pointer
  // position — the actual hit-test + style writes happen at most once
  // per rendered frame, here, instead of once per (often much more
  // frequent) mousemove event.
  function applyMove() {
    ticking = false;
    rafId = null;
    label.style.left = pendingX + 14 + "px";
    label.style.top = pendingY + 14 + "px";

    var el = document.elementFromPoint(pendingX, pendingY);
    if (!el || el === highlight || el === label || el === currentEl) return;
    currentEl = el;

    var rect = el.getBoundingClientRect();
    highlight.style.left = rect.left + "px";
    highlight.style.top = rect.top + "px";
    highlight.style.width = rect.width + "px";
    highlight.style.height = rect.height + "px";
    label.textContent = Math.round(rect.width) + " × " + Math.round(rect.height);
  }

  function onMove(e) {
    pendingX = e.clientX;
    pendingY = e.clientY;
    if (ticking) return;
    ticking = true;
    rafId = requestAnimationFrame(applyMove);
  }

  function enable() {
    active = true;
    ensureUI();
    highlight.hidden = false;
    label.hidden = false;
    currentEl = null;
    document.body.classList.add("labs-measure-cursor");
    window.addEventListener("mousemove", onMove);
    window.labsSetActive("measure", true);
  }

  function disable() {
    active = false;
    ticking = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    window.removeEventListener("mousemove", onMove);
    document.body.classList.remove("labs-measure-cursor");
    if (highlight) highlight.hidden = true;
    if (label) label.hidden = true;
    currentEl = null;
    window.labsSetActive("measure", false);
  }

  registerLab({
    id: "measure",
    title: "measure",
    action: function () {
      if (active) disable();
      else enable();
    },
  });
})();
