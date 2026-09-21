/**
 * Mobile "desktop recommended" advisory — a one-time, dismissible
 * notice (never a hard gate; the site stays fully usable underneath
 * it) shown when the first load looks like a phone/tablet. Judged
 * once, right here, at parse time — there's no resize listener, so
 * shrinking an already-open desktop window down to a narrow width
 * never pops this up mid-session.
 *
 * Two separate persistence tiers, both required by the brief:
 *   - localStorage(DONT_SHOW_KEY): permanent opt-out from "Don't Show
 *     Again" — never shows again on this browser.
 *   - sessionStorage(SHOWN_KEY): plain "Continue" only suppresses it
 *     for the rest of THIS session — a new tab or a later visit is
 *     allowed to see it again.
 */
(function () {
  var DONT_SHOW_KEY = "vfo-mobile-advisory-dismissed";
  var SHOWN_KEY = "vfo-mobile-advisory-shown";

  function isMobileContext() {
    var narrow = window.innerWidth <= 768;
    var mobileUA = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(navigator.userAgent);
    var coarsePointer = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    return narrow || mobileUA || coarsePointer;
  }

  function readFlag(storage, key) {
    try {
      return storage.getItem(key) === "1";
    } catch (e) {
      return false;
    }
  }

  function writeFlag(storage, key) {
    try {
      storage.setItem(key, "1");
    } catch (e) {
      // Private mode / storage disabled — the advisory just won't
      // remember the choice next time, nothing else breaks.
    }
  }

  if (!isMobileContext()) return;
  if (readFlag(localStorage, DONT_SHOW_KEY)) return;
  if (readFlag(sessionStorage, SHOWN_KEY)) return;

  var backdrop = document.getElementById("mobileAdvisoryBackdrop");
  var dialog = document.getElementById("mobileAdvisory");
  var continueBtn = document.getElementById("mobileAdvisoryContinue");
  var dontShowBtn = document.getElementById("mobileAdvisoryDontShow");
  if (!backdrop || !dialog || !continueBtn || !dontShowBtn) return;

  var focusables = [continueBtn, dontShowBtn];
  var previousFocus = null;

  function trapFocus(e) {
    if (e.key !== "Tab") return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function onKeydown(e) {
    if (e.key === "Escape") close();
    else trapFocus(e);
  }

  function close() {
    backdrop.hidden = true;
    dialog.hidden = true;
    document.removeEventListener("keydown", onKeydown);
    if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
  }

  function open() {
    previousFocus = document.activeElement;
    backdrop.hidden = false;
    dialog.hidden = false;
    writeFlag(sessionStorage, SHOWN_KEY);
    document.addEventListener("keydown", onKeydown);
    continueBtn.focus();
  }

  continueBtn.addEventListener("click", close);
  dontShowBtn.addEventListener("click", function () {
    writeFlag(localStorage, DONT_SHOW_KEY);
    close();
  });

  open();
})();
