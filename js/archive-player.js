/**
 * VELFONT OFFICE — Archive Player
 * A small, always-on slideshow in the hero's empty left side —
 * continuously cross-fading through every photo in the "archive"
 * Supabase storage bucket. Click the photo itself to reveal four
 * controls: Next (manual advance), Size (cycle small/medium/large),
 * Pin (lifts the current photo out of the slideshow into its own
 * free-standing copy beside the player — see pinCurrent() below), and
 * Background (puts the current photo behind the whole page, flipping
 * the header to white for legibility, until toggled off).
 *
 * Pinned photos are draggable exactly like every other draggable
 * element on this site (hero letters, header links, the logo) — same
 * pointerdown/pointermove technique through the shared
 * window.labsTransform compositor from js/transform.js, see
 * makeDraggable() below.
 *
 * Reads Storage's file list directly (not the archive_photos table
 * js/archive-gallery.js's scroll strip uses) — dropping an image into
 * the bucket alone is enough to add it to the rotation. Shuffles once,
 * cycles through that order, reshuffles on each full loop.
 *
 * Pauses the auto-advance interval while the tab is hidden or the hero
 * has scrolled out of view, instead of ticking forever for a slideshow
 * nobody can see. Manual actions (the four buttons) always work
 * regardless of that pause state.
 */
(function () {
  if (!window.VFOSupabase) return;

  var hero = document.getElementById("hero");
  if (!hero) return;

  var INTERVAL_MS = 4500;
  var SIZES = ["s", "m", "l"];
  var IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var player = document.createElement("div");
  player.className = "archive-player size-m";
  player.setAttribute("role", "group");
  player.setAttribute("aria-label", "Archive photo player");

  var imgA = document.createElement("img");
  var imgB = document.createElement("img");
  imgA.className = "archive-player-img";
  imgB.className = "archive-player-img";
  imgA.alt = "";
  imgB.alt = "";
  player.appendChild(imgA);
  player.appendChild(imgB);

  var controls = document.createElement("div");
  controls.className = "archive-player-controls";
  player.appendChild(controls);

  hero.appendChild(player);

  var bg = document.createElement("div");
  bg.className = "archive-bg";
  bg.setAttribute("aria-hidden", "true");
  document.body.appendChild(bg);

  var front = imgA;
  var back = imgB;
  var urls = [];
  var index = 0;
  var sizeIndex = 1; // "m"
  var timer = null;
  var inView = true;
  var bgActive = false;

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function crossfadeTo(url) {
    back.src = url;
    back.classList.add("is-front");
    front.classList.remove("is-front");
    var swap = front;
    front = back;
    back = swap;
    if (bgActive) bg.style.backgroundImage = 'url("' + url + '")';
  }

  function showNext() {
    if (urls.length < 2) return;
    index = (index + 1) % urls.length;
    if (index === 0) shuffle(urls);
    crossfadeTo(urls[index]);
  }

  function start() {
    if (timer || reduceMotion || document.hidden || !inView || urls.length < 2) return;
    timer = window.setInterval(showNext, INTERVAL_MS);
  }
  function stop() {
    window.clearInterval(timer);
    timer = null;
  }

  // ==== Controls ====

  function manualNext() {
    if (!urls.length) return;
    stop();
    showNext();
    start();
  }

  function cycleSize() {
    player.classList.remove("size-" + SIZES[sizeIndex]);
    sizeIndex = (sizeIndex + 1) % SIZES.length;
    player.classList.add("size-" + SIZES[sizeIndex]);
  }

  // Same pointer-drag technique as main.js's hero-letter/header-link
  // dragging — offsets are tracked locally and composed through the
  // shared window.labsTransform so a pin never fights Noise/Gravity/
  // Physics/Scale for the same element's transform.
  function makeDraggable(el) {
    el.style.touchAction = "none";
    var dragging = false;
    var startX = 0, startY = 0, offsetX = 0, offsetY = 0, baseX = 0, baseY = 0;

    el.addEventListener("pointerdown", function (e) {
      if (window.__gravityActive || window.__multiSelectActive) return;
      dragging = true;
      baseX = offsetX;
      baseY = offsetY;
      startX = e.clientX;
      startY = e.clientY;
      el.setPointerCapture(e.pointerId);
      el.classList.add("is-dragging");
    });

    el.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      offsetX = baseX + (e.clientX - startX);
      offsetY = baseY + (e.clientY - startY);
      window.labsTransform.update(el, { tx: offsetX, ty: offsetY });
    });

    function releaseDrag() {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("is-dragging");
    }
    el.addEventListener("pointerup", releaseDrag);
    el.addEventListener("pointercancel", releaseDrag);
  }

  var pinCount = 0;

  // Lifts the current photo out of the slideshow into its own
  // free-standing, draggable copy next to the player — the slideshow
  // itself keeps cycling untouched. Appended to <body> (position:
  // fixed, viewport coordinates), not .hero — .hero has overflow:
  // hidden, which would clip a pin the moment it's dragged past the
  // hero's own box instead of roaming free like every other draggable
  // element on the page.
  function pinCurrent() {
    if (!front.src || !window.labsTransform) return;
    var playerRect = player.getBoundingClientRect();
    var pin = document.createElement("img");
    pin.className = "archive-pin";
    pin.src = front.src;
    pin.alt = "";
    pin.style.left = playerRect.right + 20 + pinCount * 24 + "px";
    pin.style.top = playerRect.top + pinCount * 24 + "px";
    document.body.appendChild(pin);
    makeDraggable(pin);
    pinCount++;
  }

  function setBackground(url) {
    bg.style.backgroundImage = 'url("' + url + '")';
    bg.classList.add("is-active");
    document.documentElement.classList.add("archive-bg-active");
    bgActive = true;
  }
  function clearBackground() {
    bg.classList.remove("is-active");
    document.documentElement.classList.remove("archive-bg-active");
    bgActive = false;
  }
  function toggleBackground() {
    if (bgActive) {
      clearBackground();
    } else if (front.src) {
      setBackground(front.src);
    }
  }
  bg.addEventListener("click", clearBackground);

  function makeButton(label, action) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "archive-player-btn";
    btn.textContent = label;
    btn.setAttribute("aria-label", label);
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      action();
    });
    controls.appendChild(btn);
    return btn;
  }

  makeButton("Next", manualNext);
  makeButton("Size", cycleSize);
  makeButton("Pin", pinCurrent);
  makeButton("Background", toggleBackground);

  player.addEventListener("click", function () {
    player.classList.toggle("is-controls-open");
  });

  // ==== Load + auto-advance ====

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
