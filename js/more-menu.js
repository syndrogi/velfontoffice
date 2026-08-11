/**
 * VELFONT OFFICE — Header "More" Menu
 * The "+" button in the header right turns into a "−" (its vertical bar
 * fades out via CSS — see .more.is-open in style.css) and reveals a
 * small dropdown (Members Only, 5th Ave. Bipolar Kids) below it — same
 * open/close/outside-click/Escape shape as Labs (js/labs.js), just
 * anchored under the header instead of floating in the hero corner.
 */
(function () {
  var root = document.getElementById("more");
  var toggle = document.getElementById("moreToggle");
  var menu = document.getElementById("moreMenu");
  if (!root || !toggle || !menu) return;

  var isOpen = false;

  function openMenu() {
    isOpen = true;
    root.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    menu.setAttribute("aria-hidden", "false");
    requestAnimationFrame(function () {
      menu.classList.add("is-visible");
    });
  }

  function closeMenu() {
    if (!isOpen) return;
    isOpen = false;
    root.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-hidden", "true");
    menu.classList.remove("is-visible");
  }

  toggle.addEventListener("click", function (e) {
    e.stopPropagation();
    if (isOpen) closeMenu();
    else openMenu();
  });

  menu.addEventListener("click", function (e) {
    if (e.target.tagName === "A") closeMenu();
  });

  document.addEventListener("click", function (e) {
    if (isOpen && !root.contains(e.target)) closeMenu();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) closeMenu();
  });
})();
