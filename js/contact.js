/**
 * VELFONT OFFICE — Contact
 * Opens a panel on the right of the hero instead of scrolling to a
 * section — click "contact" (header or mobile menu) to toggle it.
 * Closes on: the toggle again, the × button, outside click, Escape.
 *
 * Submissions go straight to Supabase (contact_submissions table).
 * The anon key below is meant to be public — it can only INSERT under
 * Row Level Security, it can't read anything back. See contact_table.sql
 * for the table + policy this depends on.
 *
 * The Supabase client library is only fetched the first time someone
 * actually submits this form (dynamic import, same pattern as
 * js/logo-draw.js's anime.js import) — previously it loaded as a
 * blocking <script> on every page visit for a form most visitors never
 * fill out.
 */
(function () {
  var SUPABASE_URL = "https://miqfpvtmmvuvaezexazw.supabase.co";
  var SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pcWZwdnRtbXZ1dmFlemV4YXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMTYwNTEsImV4cCI6MjEwMDc5MjA1MX0.JeN31q4ahSoqjFVAZS3Is1nMOc_mkiLB4nv3yxP2aY0";

  var supabaseClient = null;
  var clientPromise = null;
  function loadSupabaseClient() {
    if (!clientPromise) {
      clientPromise = import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm")
        .then(function (mod) {
          var createClient = mod.createClient || (mod.default && mod.default.createClient);
          if (!createClient) return null;
          supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
          return supabaseClient;
        })
        .catch(function () {
          return null; // blocked/offline CDN — the submit handler below just shows the existing error state
        });
    }
    return clientPromise;
  }

  var panel = document.getElementById("contactPanel");
  var closeBtn = document.getElementById("contactClose");
  var form = document.getElementById("contactForm");
  var status = document.getElementById("contactStatus");
  var toggles = document.querySelectorAll(".js-contact-toggle");
  if (!panel || !toggles.length) return;

  var isOpen = false;

  function setToggleState(expanded) {
    toggles.forEach(function (t) {
      t.setAttribute("aria-expanded", String(expanded));
    });
  }

  function openPanel() {
    isOpen = true;
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    setToggleState(true);
  }

  function closePanel() {
    if (!isOpen) return;
    isOpen = false;
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    setToggleState(false);
  }

  toggles.forEach(function (toggle) {
    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      if (isOpen) closePanel();
      else openPanel();
    });
  });

  if (closeBtn) closeBtn.addEventListener("click", closePanel);

  document.addEventListener("click", function (e) {
    if (!isOpen) return;
    if (panel.contains(e.target)) return;
    if (e.target.closest(".js-contact-toggle")) return;
    closePanel();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) closePanel();
  });

  if (form) {
    var submitBtn = form.querySelector(".contact-submit");

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      if (submitBtn) submitBtn.disabled = true;
      if (status) status.textContent = "Sending…";

      var client = supabaseClient || (await loadSupabaseClient());
      if (!client) {
        if (submitBtn) submitBtn.disabled = false;
        if (status) status.textContent = "Something went wrong — try again later.";
        return;
      }

      var data = new FormData(form);
      var payload = {
        name: data.get("name") || null,
        email: data.get("email"),
        phone: data.get("phone") || null,
        reason: data.get("reason"),
        comment: data.get("comment") || null,
      };

      client
        .from("contact_submissions")
        .insert([payload])
        .then(function (result) {
          if (submitBtn) submitBtn.disabled = false;
          if (result.error) {
            console.error(result.error);
            if (status) status.textContent = "Something went wrong — try again later.";
            return;
          }
          form.reset();
          if (status) status.textContent = "Thanks — we'll be in touch.";
        });
    });
  }
})();
