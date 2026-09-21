/**
 * VELFONT OFFICE — Office Palette
 * A movable floating window (Adobe-panel/desktop-window style) that
 * replaces the old bottom-right Labs trigger. Owns only the window
 * chrome — drag, resize, minimize/maximize/close, viewport clamping,
 * and localStorage persistence. It has no idea what's inside
 * .office-palette__content; js/labs.js fills that in separately.
 *
 * `state.left`/`state.top`/`state.width` hold the window's own geometry
 * directly (never a `right`-based offset), so a drag always lands
 * exactly where the pointer left it regardless of viewport size.
 *
 * `state.height` is null until the user drags the resize handle — a
 * null height means "auto", so the panel grows to show every Labs
 * button without anyone needing to stretch it first (capped by
 * `max-height` so it still never exceeds the viewport). The first time
 * it's resized by hand, height becomes a real, persisted pixel value
 * and auto-fit is over for good — the user's explicit size wins from
 * then on.
 */
(function () {
  var palette = document.getElementById("officePalette");
  var handle = document.getElementById("officePaletteHandle");
  var content = document.getElementById("officePaletteContent");
  var resizeHandle = document.getElementById("officePaletteResize");
  var minimizeBtn = document.getElementById("officePaletteMinimize");
  var maximizeBtn = document.getElementById("officePaletteMaximize");
  var closeBtn = document.getElementById("officePaletteClose");
  var tab = document.getElementById("officePaletteTab");
  if (!palette || !handle || !content || !minimizeBtn || !maximizeBtn || !closeBtn || !tab) return;

  var STORAGE_KEY = "vfo-office-palette-v1";
  var MIN_WIDTH = 180;
  var MAX_WIDTH = 260;
  var MIN_HEIGHT = 160;
  var DESKTOP_VISIBLE_PX = 60; // how much of the panel must stay reachable on screen

  function isMobile() {
    return window.innerWidth <= 640;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function edgePx() {
    var n = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--edge"));
    return isNaN(n) ? 56 : n;
  }

  // Only used to seed a first-paint position before fitToContent() (see
  // below) has real content to measure — not the panel's actual height.
  // Width targets ~200px, same idea as clamp(180px, 13vw, 220px) — a
  // narrow single-column tool strip, not a wide panel.
  function defaultRect() {
    var mobile = isMobile();
    var width = mobile ? Math.min(window.innerWidth - 24, 200) : clamp(window.innerWidth * 0.13, 180, 220);
    var assumedHeight = mobile ? 420 : 480;
    var margin = mobile ? 16 : edgePx();
    return {
      left: window.innerWidth - width - margin,
      top: Math.max(window.innerHeight - assumedHeight - (mobile ? 24 : 40), 16),
      width: width,
    };
  }

  var rawSaved;
  try {
    rawSaved = window.localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    rawSaved = null; // storage unavailable (private mode / disabled)
  }
  var isFreshState = !rawSaved;

  function loadState() {
    var base = defaultRect();
    var state = {
      left: base.left,
      top: base.top,
      width: base.width,
      height: null,
      minimized: false,
      maximized: false,
      closed: false,
    };
    if (!rawSaved) return state;
    try {
      var saved = JSON.parse(rawSaved);
      ["left", "top", "width", "height"].forEach(function (k) {
        if (typeof saved[k] === "number" && !isNaN(saved[k])) state[k] = saved[k];
      });
      ["minimized", "maximized", "closed"].forEach(function (k) {
        if (typeof saved[k] === "boolean") state[k] = saved[k];
      });
    } catch (e) {
      /* corrupt value — fall back to defaults computed above */
    }
    return state;
  }

  var state = loadState();

  function saveState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* quota / private mode — state just won't persist across reloads */
    }
  }

  function clampSize() {
    state.width = clamp(state.width, MIN_WIDTH, Math.min(MAX_WIDTH, window.innerWidth - 24));
    if (state.height !== null) {
      state.height = clamp(state.height, MIN_HEIGHT, window.innerHeight - 24);
    }
  }

  // Mobile keeps much more of the panel on screen than desktop — a
  // panel that's mostly draggable off a phone viewport is effectively
  // lost, since there's no room to grab the sliver left behind.
  //
  // The right clamp is intentionally NOT symmetric with the left one:
  // the window controls live at the right end of the titlebar, so
  // dragging toward the right edge always keeps the panel fully
  // on-screen (maxLeft = viewport width − panel width) instead of
  // allowing a same-size overhang there — otherwise the controls
  // themselves could be dragged off-screen and become unreachable.
  // Dragging left is free to leave a sliver overhang since the
  // controls are nowhere near that edge.
  function clampPosition() {
    var visibleX = isMobile() ? Math.max(state.width * 0.6, 140) : DESKTOP_VISIBLE_PX;
    var visibleY = isMobile() ? 80 : DESKTOP_VISIBLE_PX;
    var minLeft = -(state.width - visibleX);
    var maxLeft = Math.max(minLeft, window.innerWidth - state.width);
    state.left = clamp(state.left, minLeft, maxLeft);
    state.top = clamp(state.top, 0, window.innerHeight - visibleY);
  }

  function applyGeometry() {
    if (state.maximized) {
      // CSS's .is-maximized rule owns left/top/width/height entirely —
      // any inline value here would win over it by specificity and
      // fight the full-size layout, so this state clears them instead.
      palette.style.left = "";
      palette.style.top = "";
      palette.style.width = "";
      palette.style.height = "";
      palette.style.maxHeight = "";
      return;
    }
    palette.style.left = state.left + "px";
    palette.style.top = state.top + "px";
    palette.style.width = state.width + "px";
    if (state.minimized) {
      palette.style.height = "";
      palette.style.maxHeight = "";
      return;
    }
    if (state.height === null) {
      // Auto: grow to fit .office-palette__content's natural height,
      // capped so the panel itself never runs past the viewport bottom
      // (or ~78% of it / 720px, whichever is smaller — a very tall
      // Labs list still leaves the panel readable instead of stretching
      // edge to edge) — .office-palette__content's own overflow-y:auto
      // is the fallback once content exceeds that cap.
      palette.style.height = "";
      var byViewportBottom = window.innerHeight - state.top - 24;
      var byViewportFraction = Math.min(window.innerHeight * 0.78, 720);
      palette.style.maxHeight = Math.max(MIN_HEIGHT, Math.min(byViewportBottom, byViewportFraction)) + "px";
    } else {
      palette.style.height = state.height + "px";
      palette.style.maxHeight = "";
    }
  }

  function render() {
    palette.hidden = state.closed;
    tab.hidden = !state.closed;
    palette.classList.toggle("is-minimized", state.minimized);
    palette.classList.toggle("is-maximized", state.maximized);
    minimizeBtn.setAttribute("aria-pressed", String(state.minimized));
    maximizeBtn.setAttribute("aria-pressed", String(state.maximized));
    maximizeBtn.setAttribute("aria-label", state.maximized ? "Restore" : "Maximize");
    applyGeometry();
  }

  clampSize();
  clampPosition();
  render();

  // Re-anchors the still-untouched default panel so every registered
  // Labs button is visible without the user resizing anything first.
  // Deferred to DOMContentLoaded because this script runs before
  // js/labs.js and js/labs/*.js (see index.html's script order) — the
  // Labs grid isn't populated yet at the point the lines above run, so
  // .office-palette__content's natural height isn't real until every
  // deferred script has finished, right before DOMContentLoaded fires.
  function fitToContent() {
    if (!isFreshState || state.height !== null || state.minimized) return;
    var chrome = handle.getBoundingClientRect().height + 2; // + top/bottom border
    var needed = chrome + content.scrollHeight;
    var margin = isMobile() ? 24 : 40;
    var minTop = isMobile() ? 60 : 100; // stays clear of the header
    state.top = clamp(window.innerHeight - needed - margin, minTop, window.innerHeight - DESKTOP_VISIBLE_PX);
    clampPosition();
    applyGeometry();
  }

  document.addEventListener("DOMContentLoaded", fitToContent);

  // ==========================================================================
  // Drag — titlebar only, ignores clicks that started on a window
  // control. Position is tracked purely in left/top (never `right`), so
  // it survives a browser resize/zoom without jumping.
  // ==========================================================================

  var dragging = false;
  var dragStartX = 0;
  var dragStartY = 0;
  var dragBaseLeft = 0;
  var dragBaseTop = 0;

  handle.addEventListener("pointerdown", function (e) {
    if (e.target.closest("[data-action]") || state.maximized) return;
    dragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragBaseLeft = state.left;
    dragBaseTop = state.top;
    handle.setPointerCapture(e.pointerId);
    palette.classList.add("is-dragging");
    document.body.classList.add("office-palette-no-select");
  });

  handle.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    state.left = dragBaseLeft + (e.clientX - dragStartX);
    state.top = dragBaseTop + (e.clientY - dragStartY);
    clampPosition();
    applyGeometry();
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    palette.classList.remove("is-dragging");
    document.body.classList.remove("office-palette-no-select");
    saveState();
  }

  handle.addEventListener("pointerup", endDrag);
  handle.addEventListener("pointercancel", endDrag);

  // ==========================================================================
  // Resize — bottom-right corner handle, pointer-based (not CSS
  // `resize`) so it works the same way with mouse, trackpad and touch.
  // ==========================================================================

  var resizing = false;
  var resizeStartX = 0;
  var resizeStartY = 0;
  var resizeBaseWidth = 0;
  var resizeBaseHeight = 0;

  if (resizeHandle) {
    resizeHandle.addEventListener("pointerdown", function (e) {
      if (state.minimized || state.maximized) return;
      resizing = true;
      resizeStartX = e.clientX;
      resizeStartY = e.clientY;
      resizeBaseWidth = state.width;
      // First manual resize while still in auto-height mode: start from
      // the currently-rendered height, not a nonexistent state.height.
      resizeBaseHeight = state.height !== null ? state.height : palette.getBoundingClientRect().height;
      resizeHandle.setPointerCapture(e.pointerId);
      document.body.classList.add("office-palette-no-select");
      e.stopPropagation();
    });

    resizeHandle.addEventListener("pointermove", function (e) {
      if (!resizing) return;
      state.width = resizeBaseWidth + (e.clientX - resizeStartX);
      state.height = resizeBaseHeight + (e.clientY - resizeStartY); // leaves auto mode for good
      clampSize();
      applyGeometry();
    });

    function endResize() {
      if (!resizing) return;
      resizing = false;
      document.body.classList.remove("office-palette-no-select");
      saveState();
    }

    resizeHandle.addEventListener("pointerup", endResize);
    resizeHandle.addEventListener("pointercancel", endResize);
  }

  // ==========================================================================
  // Window controls
  // ==========================================================================

  minimizeBtn.addEventListener("click", function () {
    state.maximized = false;
    state.minimized = !state.minimized;
    render();
    saveState();
  });

  // Restoring just flips the flag back off — maximized never touches
  // state.left/top/width/height in the first place (see applyGeometry's
  // early return), so the pre-maximize geometry is still sitting there
  // untouched and ready to reapply, even across a reload that happened
  // while maximized.
  maximizeBtn.addEventListener("click", function () {
    state.minimized = false;
    state.maximized = !state.maximized;
    if (!state.maximized) {
      clampSize();
      clampPosition();
    }
    render();
    saveState();
  });

  closeBtn.addEventListener("click", function () {
    state.closed = true;
    render();
    saveState();
  });

  tab.addEventListener("click", function () {
    state.closed = false;
    clampSize();
    clampPosition();
    render();
    saveState();
    handle.focus();
  });

  window.addEventListener("resize", function () {
    clampSize();
    clampPosition();
    applyGeometry();
  });
})();
