/**
 * VELFONT OFFICE — Archive Player
 * A small, always-on slideshow in the hero's empty left side —
 * continuously cross-fading through every photo in the "archive"
 * Supabase storage bucket, no click needed. Replaces the earlier
 * click-to-reveal version.
 *
 * Reads Storage's file list directly (not the archive_photos table
 * js/archive-gallery.js's scroll strip uses) — dropping an image into
 * the bucket alone is enough to add it to the rotation. Shuffles once,
 * cycles through that order, reshuffles on each full loop.
 *
 * Pauses the interval while the tab is hidden or the hero has scrolled
 * out of view, instead of ticking forever for a slideshow nobody can see.
 */
(function () {
  if (!window.VFOSupabase) return;

  var hero = document.getElementById("hero");
  if (!hero) return;

  var INTERVAL_MS = 4500;
  var IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var player = document.createElement("div");
  player.className = "archive-player";
  player.setAttribute("aria-hidden", "true");

  var imgA = document.createElement("img");
  var imgB = document.createElement("img");
  imgA.className = "archive-player-img";
  imgB.className = "archive-player-img";
  imgA.alt = "";
  imgB.alt = "";
  player.appendChild(imgA);
  player.appendChild(imgB);
  hero.appendChild(player);

  var front = imgA;
  var back = imgB;
  var urls = [];
  var index = 0;
  var timer = null;
  var inView = true;

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function showNext() {
    if (!urls.length) return;
    index = (index + 1) % urls.length;
    if (index === 0) shuffle(urls);
    back.src = urls[index];
    back.classList.add("is-front");
    front.classList.remove("is-front");
    var swap = front;
    front = back;
    back = swap;
  }

  function start() {
    if (timer || reduceMotion || document.hidden || !inView || urls.length < 2) return;
    timer = window.setInterval(showNext, INTERVAL_MS);
  }
  function stop() {
    window.clearInterval(timer);
    timer = null;
  }

  window.VFOSupabase.getClient().then(function (client) {
    if (!client) return;
    client.storage
      .from("archive")
      .list("", { limit: 200 })
      .then(function (result) {
        var names = (result.data || []).filter(function (f) {
          return f && f.id && IMAGE_EXT.test(f.name); // f.id excludes folder placeholders
        });
        urls = shuffle(
          names.map(function (f) {
            return client.storage.from("archive").getPublicUrl(f.name).data.publicUrl;
          })
        );
        if (!urls.length) return;
        front.src = urls[0];
        front.classList.add("is-front");
        player.classList.add("is-ready");
        start();
      });
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else start();
  });

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      if (inView) start();
      else stop();
    });
    observer.observe(hero);
  }
})();
