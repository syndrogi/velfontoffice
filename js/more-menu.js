/**
 * VELFONT OFFICE — Header "More" Menu
 * Starts open on load — the "+" button shows as "−" from the first
 * paint (its vertical bar fades out via CSS — see .more.is-open in
 * style.css) with the dropdown (Members Only, 5th Ave. Bipolar Kids)
 * already visible below it. Clicking now closes it first. Only the
 * toggle button itself closes it — same shape as Labs (js/labs.js):
 * no outside-click/Escape dismiss, since a background click closing it
 * would just make it (and the dropdown links) disappear unexpectedly.
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

  // Static markup (both menu links are already in the HTML, not
  // registered piecemeal like Labs) — no need to wait for anything else
  // to load first.
  openMenu();
})();
