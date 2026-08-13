/**
 * VELFONT OFFICE — Labs
 * A hidden experimental playground. This file only owns the menu shell
 * (open/close, stagger-in/out, outside-click/Escape) — it has no idea
 * what any individual experiment actually does.
 *
 * Each experiment lives in its own module under js/labs/ and registers
 * itself once, at load time:
 *
 *   registerLab({ id, title, icon, action });
 *
 * `action` runs when the item is clicked (the menu closes first).
 * Adding a new experiment is just one more registerLab() call in one
 * more small file — nothing here needs to change.
 */
(function () {
  var STAGGER_MS = 30;

  var root = document.getElementById("labs");
  var toggleBtn = document.getElementById("labsToggle");
  var menu = document.getElementById("labsMenu");
  if (!root || !toggleBtn || !menu) return;

  var labs = [];
  var isOpen = false;
  var noticeEl = null;
  var noticeTimer = null;
  var buttonsById = {};

  function renderItem(lab) {
    var index = labs.length - 1;

    var li = document.createElement("li");
    li.className = "labs-menu-item";
    li.style.transitionDelay = index * STAGGER_MS + "ms";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "labs-menu-btn";

    if (lab.icon) {
      var icon = document.createElement("span");
      icon.className = "labs-menu-icon";
      icon.textContent = lab.icon;
      btn.appendChild(icon);
    }
    btn.appendChild(document.createTextNode(lab.title));

    btn.addEventListener("click", function () {
      if (typeof lab.action === "function") lab.action();
    });

    li.appendChild(btn);
    menu.appendChild(li);
    buttonsById[lab.id] = btn;
  }

  // Lets a lab module report its own on/off state without labs.js having
  // to know what the experiment does — see js/labs/blueprint.js etc.,
  // which call this from their own enable()/disable().
  window.labsSetActive = function (id, isActive) {
    var btn = buttonsById[id];
    if (!btn) return;
    btn.classList.toggle("is-active", !!isActive);
  };

  function openMenu() {
    isOpen = true;
    root.classList.add("is-open");
    toggleBtn.setAttribute("aria-expanded", "true");
    menu.setAttribute("aria-hidden", "false");
    requestAnimationFrame(function () {
      menu.classList.add("is-visible");
    });
  }

  function closeMenu() {
    if (!isOpen) return;
    isOpen = false;
    root.classList.remove("is-open");
    toggleBtn.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-hidden", "true");
    menu.classList.remove("is-visible");
  }

  toggleBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    if (isOpen) closeMenu();
    else openMenu();
  });

  // Shared, minimal feedback for placeholder experiments — a quiet line
  // of text in the same spot as the trigger, no box, no color.
  window.labsNotice = function (text) {
    if (!noticeEl) {
      noticeEl = document.createElement("div");
      noticeEl.className = "labs-notice";
      document.body.appendChild(noticeEl);
    }
    noticeEl.textContent = text;
    noticeEl.classList.add("is-visible");
    window.clearTimeout(noticeTimer);
    noticeTimer = window.setTimeout(function () {
      noticeEl.classList.remove("is-visible");
    }, 1800);
  };

  window.registerLab = function (lab) {
    if (!lab || !lab.id || !lab.title) return;
    labs.push(lab);
    renderItem(lab);
  };
})();
