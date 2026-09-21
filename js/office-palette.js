/**
 * VELFONT OFFICE — Office Palette
 * A movable floating window (Adobe-panel/desktop-window style) that
 * replaces the old bottom-right Labs trigger. Owns only the window
 * chrome — drag, resize, minimize/close, viewport clamping, and
 * localStorage persistence. It has no idea what's inside
 * .office-palette__content; js/labs.js fills that in separately.
 *
 * `state.left`/`state.top`/`state.width`/`state.height` hold the
 * window's own geometry directly (never a `right`-based offset), so a
 * drag always lands exactly where the pointer left it regardless of
 * viewport size.
 */
(function () {
  var palette = document.getElementById("officePalette");
  var handle = document.getElementById("officePaletteHandle");
  var resizeHandle = document.getElementById("officePaletteResize");
  var minimizeBtn = document.getElementById("officePaletteMinimize");
  var closeBtn = document.getElementById("officePaletteClose");
  var tab = document.getElementById("officePaletteTab");
  if (!palette || !handle || !minimizeBtn || !closeBtn || !tab) return;

  var STORAGE_KEY = "vfo-office-palette-v1";
  var MIN_WIDTH = 240;
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

  function defaultRect() {
    var mobile = isMobile();
    var width = mobile ? Math.min(window.innerWidth - 32, 340) : 280;
    var height = mobile ? 380 : 420;
    var margin = mobile ? 16 : edgePx();
    return {
      left: window.innerWidth - width - margin,
      top: window.innerHeight - height - (mobile ? 24 : 40),
      width: width,
      height: height,
    };
  }

  function loadState() {
    var base = defaultRect();
    var state = {
      left: base.left,
      top: base.top,
      width: base.width,
      height: base.height,
      minimized: false,
      closed: false,
    };
    var raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return state; // storage unavailable (private mode / disabled) — defaults only
    }
    if (!raw) return state;
    try {
      var saved = JSON.parse(raw);
      ["left", "top", "width", "height"].forEach(function (k) {
        if (typeof saved[k] === "number" && !isNaN(saved[k])) state[k] = saved[k];
      });
      ["minimized", "closed"].forEach(function (k) {
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
    state.width = clamp(state.width, MIN_WIDTH, window.innerWidth - 24);
    state.height = clamp(state.height, MIN_HEIGHT, window.innerHeight - 24);
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
    palette.style.left = state.left + "px";
    palette.style.top = state.top + "px";
    palette.style.width = state.width + "px";
    palette.style.height = state.minimized ? "" : state.height + "px";
  }

  function render() {
    palette.hidden = state.closed;
    tab.hidden = !state.closed;
    palette.classList.toggle("is-minimized", state.minimized);
    minimizeBtn.setAttribute("aria-pressed", String(state.minimized));
    applyGeometry();
  }

  clampSize();
  clampPosition();
  render();

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
    if (e.target.closest("[data-action]")) return;
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
      if (state.minimized) return;
      resizing = true;
      resizeStartX = e.clientX;
      resizeStartY = e.clientY;
      resizeBaseWidth = state.width;
      resizeBaseHeight = state.height;
      resizeHandle.setPointerCapture(e.pointerId);
      document.body.classList.add("office-palette-no-select");
      e.stopPropagation();
    });

    resizeHandle.addEventListener("pointermove", function (e) {
      if (!resizing) return;
      state.width = resizeBaseWidth + (e.clientX - resizeStartX);
      state.height = resizeBaseHeight + (e.clientY - resizeStartY);
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
    state.minimized = !state.minimized;
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
