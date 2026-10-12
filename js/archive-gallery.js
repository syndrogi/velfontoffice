/**
 * VELFONT OFFICE — Archive Gallery
 * Full-bleed photos woven into the main page's own scroll, between
 * Office and About — not a separate "Archive" destination (no nav
 * link, no section title), just part of scrolling the homepage. Each
 * photo fades in via IntersectionObserver as it enters the viewport.
 *
 * Images come from the archive_photos table + "archive" storage bucket
 * in Supabase (see sql/archive_photos_table.sql) — read-only from the
 * browser, added directly through the Supabase dashboard. An empty
 * table is expected, not an error: the section just stays hidden until
 * at least one photo exists.
 */
(function () {
  var section = document.getElementById("archiveGallery");
  if (!section || !window.VFOSupabase) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resolveImageUrl(client, path) {
    if (!path) return "";
    if (/^https?:\/\//.test(path)) return path;
    return client.storage.from("archive").getPublicUrl(path).data.publicUrl;
  }

  function renderPhotos(client, photos) {
    if (!photos.length) return;

    var frag = document.createDocumentFragment();
    photos.forEach(function (photo) {
      var figure = document.createElement("figure");
      figure.className = "archive-photo";

      var img = document.createElement("img");
      img.src = resolveImageUrl(client, photo.image);
      img.alt = photo.caption || "";
      img.loading = "lazy";
      figure.appendChild(img);

      if (photo.caption) {
        var caption = document.createElement("figcaption");
        caption.textContent = photo.caption;
        figure.appendChild(caption);
      }

      frag.appendChild(figure);
    });
    section.appendChild(frag);
    section.hidden = false;

    var photoEls = section.querySelectorAll(".archive-photo");

    if (reduceMotion || !("IntersectionObserver" in window)) {
      photoEls.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );
    photoEls.forEach(function (el) {
      observer.observe(el);
    });
  }

  window.VFOSupabase.getClient().then(function (client) {
    if (!client) return;
    return client
      .from("archive_photos")
      .select("*")
      .order("sort_order", { ascending: true })
      .then(function (result) {
        if (result.error) {
          console.error("Failed to load archive photos:", result.error.message);
          return;
        }
        renderPhotos(client, result.data || []);
      });
  });
})();
