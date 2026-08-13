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

  function ensureUI() {
    if (highlight) return;
    highlight = document.createElement("div");
    highlight.className = "labs-measure-highlight";
    label = document.createElement("div");
    label.className = "labs-measure-label";
    document.body.appendChild(highlight);
    document.body.appendChild(label);
  }

  function onMove(e) {
    label.style.left = e.clientX + 14 + "px";
    label.style.top = e.clientY + 14 + "px";

    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === highlight || el === label || el === currentEl) return;
    currentEl = el;

    var rect = el.getBoundingClientRect();
    highlight.style.left = rect.left + "px";
    highlight.style.top = rect.top + "px";
    highlight.style.width = rect.width + "px";
    highlight.style.height = rect.height + "px";
    label.textContent = Math.round(rect.width) + " × " + Math.round(rect.height);
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
