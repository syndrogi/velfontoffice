/**
 * VELFONT SHOP — Temporary Access Gate
 * The shop is temporarily closed to the public. Every shop/*.html page's
 * <head> unconditionally adds html.shop-locked before first paint —
 * shop/style.css only shows #shopGate while that class is present, so
 * the real page is covered before anything renders.
 *
 * The password is checked by the "gate" Supabase Edge Function (its own
 * project — see shop/js/supabase.js), not compared in this file, so it
 * can't be read out of devtools. A stored unlock is a signed token, not
 * a plain flag, and it's re-verified against the server on every load —
 * fabricating localStorage's value directly no longer unlocks anything
 * without the real password, since forging a valid token needs the
 * signing secret, which never leaves the server.
 */
(function () {
  var GATE_URL = "https://ozwncuapnzvelkzehnun.supabase.co/functions/v1/gate";
  var ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96d25jdWFwbnp2ZWxremVobnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NjAzNTUsImV4cCI6MjEwMTEzNjM1NX0.Gi7h7WtWjkioIDs49Yl2mJE74kHGbjIbDgn5KjkDqXs";
  var STORAGE_KEY = "vfo-shop-token";

  var html = document.documentElement;
  if (!html.classList.contains("shop-locked")) return;

  var gate = document.getElementById("shopGate");
  var form = document.getElementById("shopGateForm");
  var input = document.getElementById("shopGateInput");
  var error = document.getElementById("shopGateError");
  var submitBtn = form ? form.querySelector(".shop-gate__submit") : null;
  if (!gate || !form || !input) return;

  function callGate(body) {
    return fetch(GATE_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + ANON_KEY,
        apikey: ANON_KEY,
      },
      body: JSON.stringify(body),
    })
      .then(function (res) {
        return res.json();
      })
      .catch(function () {
        return { ok: false };
      });
  }

  function unlock(token) {
    try {
      window.localStorage.setItem(STORAGE_KEY, token);
    } catch (err) {
      /* private mode / storage disabled — unlocks for this load only, asks again next visit */
    }
    html.classList.remove("shop-locked");
  }

  var storedToken;
  try {
    storedToken = window.localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    storedToken = null;
  }

  if (storedToken) {
    callGate({ action: "verify", token: storedToken }).then(function (result) {
      if (result && result.ok) {
        unlock(storedToken);
      } else {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch (err) {}
        input.focus();
      }
    });
  } else {
    input.focus();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (submitBtn) submitBtn.disabled = true;
    callGate({ action: "login", password: input.value }).then(function (result) {
      if (submitBtn) submitBtn.disabled = false;
      if (!result || !result.ok || !result.token) {
        error.hidden = false;
        input.value = "";
        input.focus();
        return;
      }
      unlock(result.token);
    });
  });
})();
