/**
 * VELFONT SHOP — Contact
 * Standalone page version of the main site's contact panel (js/contact.js
 * there) — same form fields, same Supabase table, just submitted from a
 * full page instead of a slide-out panel. Uses its own Supabase client
 * (a separate project from shop/js/supabase.js's product catalog) scoped
 * inside this IIFE so it can't collide with the global `supabaseClient`
 * that products.js/common.js already depend on.
 */
(function () {
  var SUPABASE_URL = "https://miqfpvtmmvuvaezexazw.supabase.co";
  var SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pcWZwdnRtbXZ1dmFlemV4YXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMTYwNTEsImV4cCI6MjEwMDc5MjA1MX0.JeN31q4ahSoqjFVAZS3Is1nMOc_mkiLB4nv3yxP2aY0";

  var contactSupabaseClient =
    window.supabase && window.supabase.createClient
      ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      : null;

  var form = document.getElementById("contactForm");
  var status = document.getElementById("contactStatus");
  if (!form) return;

  var submitBtn = form.querySelector(".checkout-submit-btn");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (!contactSupabaseClient) {
      if (status) status.textContent = "Something went wrong. Please try again shortly.";
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

    if (submitBtn) submitBtn.disabled = true;
    if (status) status.textContent = "Sending…";

    contactSupabaseClient
      .from("contact_submissions")
      .insert([payload])
      .then(function (result) {
        if (submitBtn) submitBtn.disabled = false;
        if (result.error) {
          console.error(result.error);
          if (status) status.textContent = "Something went wrong. Please try again shortly.";
          return;
        }
        form.reset();
        if (status) status.textContent = "Thanks for reaching out. We will get back to you soon.";
      });
  });
})();
