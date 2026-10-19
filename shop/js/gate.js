/**
 * VELFONT SHOP — Temporary Access Gate
 * The shop is temporarily closed to the public. A tiny inline script
 * in each shop page's <head> (runs before first paint, same spot as
 * the existing js-enter check) adds html.shop-locked whenever
 * localStorage doesn't have the unlock flag yet — shop/style.css only
 * shows #shopGate while that class is present, so the real page is
 * covered before anything renders instead of flashing through first.
 *
 * This is a soft, client-side gate (the password lives in this file,
 * same honest tradeoff as Founder OS's own passphrase in os/js/login.js)
 * — not real access control, just a "closed for now" wall for casual
 * visitors. Remove the inline <head> snippet (or just change the
 * password) on each shop/*.html page to reopen the shop later.
 */
(function () {
  var PASSWORD = "syndrogi";
  var STORAGE_KEY = "vfo-shop-unlocked";

  var html = document.documentElement;
  if (!html.classList.contains("shop-locked")) return; // already unlocked on a prior visit

  var gate = document.getElementById("shopGate");
  var form = document.getElementById("shopGateForm");
  var input = document.getElementById("shopGateInput");
  var error = document.getElementById("shopGateError");
  if (!gate || !form || !input) return;

  input.focus();

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (input.value !== PASSWORD) {
      error.hidden = false;
      input.value = "";
      input.focus();
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch (err) {
      /* private mode / storage disabled — unlocks for this load only, asks again next visit */
    }
    html.classList.remove("shop-locked");
  });
})();
