/**
 * VELFONT OFFICE — Archive Reveal
 * Click anywhere on an otherwise-empty part of the main page and a
 * random photo from the "archive" Supabase storage bucket appears,
 * centered, until dismissed (click it again, or Escape).
 *
 * Reads the bucket's file list directly (Storage's list(), not the
 * archive_photos table js/archive-gallery.js's scroll strip uses) —
 * dropping a file into Storage alone is enough to make it eligible
 * here, no matching table row required.
 */
(function () {
  if (!window.VFOSupabase) return;

  var IGNORE_SELECTOR = [
    "a", "button", "input", "textarea", "select", "label", ".letter",
    ".site-header", ".mobile-nav", ".office-palette", ".office-palette-tab",
    ".contact-panel", ".archive-gallery", ".archive-reveal",
    ".mobile-advisory", ".mobile-advisory-backdrop", ".page-veil",
    ".labs-notice", ".labs-dev-overlay", ".labs-measure-highlight", ".labs-measure-label",
  ].join(", ");

  var IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

  var overlay = null;
  var imgEl = null;
  var fileNames = null;
  var listPromise = null;

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.className = "archive-reveal";
    overlay.setAttribute("aria-hidden", "true");
    imgEl = document.createElement("img");
    imgEl.alt = "";
    overlay.appendChild(imgEl);
    overlay.addEventListener("click", function (e) {
      e.stopPropagation();
      hide();
    });
    document.body.appendChild(overlay);
    return overlay;
  }

  function hide() {
    if (overlay) overlay.classList.remove("is-visible");
  }

  function loadFileList(client) {
    if (fileNames) return Promise.resolve(fileNames);
    if (!listPromise) {
      listPromise = client.storage
        .from("archive")
        .list("", { limit: 200 })
        .then(function (result) {
          fileNames = (result.data || [])
            .filter(function (f) {
              return f && f.id && IMAGE_EXT.test(f.name); // f.id excludes folder placeholders
            })
            .map(function (f) {
              return f.name;
            });
          return fileNames;
        })
        .catch(function () {
          fileNames = [];
          return fileNames;
        });
    }
    return listPromise;
  }

  function showRandomPhoto(client) {
    loadFileList(client).then(function (names) {
      if (!names.length) return;
      var pick = names[(Math.random() * names.length) | 0];
      var url = client.storage.from("archive").getPublicUrl(pick).data.publicUrl;
      var el = ensureOverlay();
      imgEl.src = url;
      el.classList.add("is-visible");
    });
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest(IGNORE_SELECTOR)) return;
    if (window.getSelection && String(window.getSelection())) return; // don't hijack a text-selection click
    window.VFOSupabase.getClient().then(function (client) {
      if (client) showRandomPhoto(client);
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") hide();
  });
})();
