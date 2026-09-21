/**
 * VELFONT OFFICE — Labs
 * A hidden experimental playground. This file only owns the LABS grid
 * inside the Office Palette (see js/office-palette.js for the window
 * chrome around it) — it has no idea what any individual experiment
 * actually does.
 *
 * Each experiment lives in its own module under js/labs/ and registers
 * itself once, at load time:
 *
 *   registerLab({ id, title, icon, action });
 *
 * `action` runs when the item is clicked. Adding a new experiment is
 * just one more registerLab() call in one more small file — nothing
 * here needs to change.
 */
(function () {
  var grid = document.getElementById("labsMenu");
  if (!grid) return;

  var labs = [];
  var buttonsById = {};
  var noticeEl = null;
  var noticeTimer = null;

  // Sentence case regardless of how each lab module happens to write its
  // own `title` — a single place to keep every button's label consistent
  // instead of relying on every js/labs/*.js file agreeing on casing.
  function sentenceCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  function renderItem(lab) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "labs-menu-btn";

    if (lab.icon) {
      var icon = document.createElement("span");
      icon.className = "labs-menu-icon";
      icon.textContent = lab.icon;
      btn.appendChild(icon);
    }
    btn.appendChild(document.createTextNode(sentenceCase(lab.title)));

    btn.addEventListener("click", function () {
      if (typeof lab.action === "function") lab.action();
    });

    grid.appendChild(btn);
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

  // Shared, minimal feedback for placeholder experiments — a quiet line
  // of text bottom-right, no box, no color.
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
