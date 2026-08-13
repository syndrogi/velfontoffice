/**
 * VELFONT OFFICE — Labs / Blueprint
 * Toggles a wireframe reveal: dashed outlines on the page's structural
 * boxes (header, sections, nav, links, images) plus a small corner
 * label. Click Blueprint again to turn it off.
 */
(function () {
  if (typeof registerLab !== "function") return;

  var active = false;

  function enable() {
    active = true;
    document.documentElement.classList.add("labs-blueprint");
    window.labsSetActive("blueprint", true);
  }

  function disable() {
    active = false;
    document.documentElement.classList.remove("labs-blueprint");
    window.labsSetActive("blueprint", false);
  }

  registerLab({
    id: "blueprint",
    title: "blueprint",
    action: function () {
      if (active) disable();
      else enable();
    },
  });
})();
