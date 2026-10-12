/**
 * VELFONT OFFICE — Contact
 * Opens a panel on the right of the hero instead of scrolling to a
 * section — click "contact" (header or mobile menu) to toggle it.
 * Closes on: the toggle again, the × button, outside click, Escape.
 *
 * Submissions go straight to Supabase (contact_submissions table).
 * The anon key (see js/supabase-client.js) is meant to be public — it
 * can only INSERT under Row Level Security, it can't read anything
 * back. See contact_table.sql for the table + policy this depends on.
 */
(function () {
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

      var client = window.VFOSupabase ? await window.VFOSupabase.getClient() : null;
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
