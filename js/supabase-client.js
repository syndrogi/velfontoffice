/**
 * VELFONT OFFICE — Shared Supabase Client
 * This project only (root site + Founder OS share one Supabase
 * project) — shop/ and the beta-office/midi-office sandboxes each have
 * their own separate credentials and don't use this file.
 *
 * supabase-js is only fetched the first time any script on the page
 * actually needs it (dynamic import, same pattern as js/logo-draw.js's
 * anime.js import), instead of loading as a blocking <script> on every
 * visit for a client most page loads never touch. The resolved client
 * is cached, so js/contact.js and js/archive-gallery.js share one
 * instance instead of each importing the library separately.
 */
(function () {
  var SUPABASE_URL = "https://miqfpvtmmvuvaezexazw.supabase.co";
  var SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pcWZwdnRtbXZ1dmFlemV4YXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMTYwNTEsImV4cCI6MjEwMDc5MjA1MX0.JeN31q4ahSoqjFVAZS3Is1nMOc_mkiLB4nv3yxP2aY0";

  var client = null;
  var clientPromise = null;

  function getClient() {
    if (client) return Promise.resolve(client);
    if (!clientPromise) {
      clientPromise = import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm")
        .then(function (mod) {
          var createClient = mod.createClient || (mod.default && mod.default.createClient);
          if (!createClient) return null;
          client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
          return client;
        })
        .catch(function () {
          return null; // blocked/offline CDN — callers just treat a null client as "feature unavailable"
        });
    }
    return clientPromise;
  }

  window.VFOSupabase = { getClient: getClient };
})();
