/**
 * VELFONT OS — Gate Client
 * Thin wrapper around the "gate" Supabase Edge Function deployed to this
 * project (same project os/app already uses for the journal). The
 * passphrase and its signing secret live only in that function's
 * environment — this file never holds either, so neither can be read
 * from devtools. Shared by os/js/login.js (login) and
 * os/app/js/boot.js (verify-before-render).
 */
(function () {
  var GATE_URL = "https://miqfpvtmmvuvaezexazw.supabase.co/functions/v1/gate";
  var ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pcWZwdnRtbXZ1dmFlemV4YXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMTYwNTEsImV4cCI6MjEwMDc5MjA1MX0.JeN31q4ahSoqjFVAZS3Is1nMOc_mkiLB4nv3yxP2aY0";

  function call(body) {
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

  window.OSGate = {
    login: function (password) {
      return call({ action: "login", password: password });
    },
    verify: function (token) {
      return call({ action: "verify", token: token });
    },
  };
})();
