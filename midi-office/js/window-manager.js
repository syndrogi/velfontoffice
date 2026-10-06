/**
 * MIDI OFFICE — Window Manager
 * Same small-floating-windows feel as beta-office: drag, resize,
 * minimize to a taskbar chip, maximize, close. Unlike beta-office,
 * every module here is small (7, not 99) and already loaded eagerly —
 * see js/modules.js — so openModule() builds straight away with no
 * on-demand script fetch.
 *
 * TonWM.openModule(id) is the only entry point callers need (the dock
 * buttons in app.js, the Help panel, anything else that wants to open
 * or focus a module's window).
 */
(function () {
  var layer = document.getElementById("toneWindowsLayer");
  var taskbar = document.getElementById("toneTaskbar");
  if (!layer || !taskbar) return;

  var windows = {};
  var order = [];
  var zCounter = 10;
  var CASCADE_STEP = 40;
  var cascadeIndex = 0;
  var MIN_WIDTH = 240;
  var MIN_HEIGHT = 160;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function findModule(id) {
    return (window.ToneModules || []).filter(function (m) {
      return m.id === id;
    })[0];
  }

  function nextCascadePosition(width, height) {
    // Starts below the transport + dock header instead of right at the
    // top of the page — the transport is sticky/above the windows
    // layer regardless (see .tone-transport's z-index), but starting
    // the cascade down here means a freshly opened window doesn't
    // immediately bury the dock's title/button grid on first paint.
    var left = 48 + (cascadeIndex % 9) * CASCADE_STEP;
    var top = 320 + (cascadeIndex % 9) * CASCADE_STEP;
    cascadeIndex++;
    left = clamp(left, 0, Math.max(0, window.innerWidth - width - 16));
    top = clamp(top, 0, Math.max(0, window.innerHeight - height - 16));
    return { left: left, top: top };
  }

  function applyGeometry(win) {
    win.el.style.left = win.left + "px";
    win.el.style.top = win.top + "px";
    win.el.style.width = win.width + "px";
    win.el.style.height = win.height + "px";
  }

  function bringToFront(id) {
    var win = windows[id];
    if (!win) return;
    zCounter++;
    win.el.style.zIndex = zCounter;
    order = order.filter(function (x) { return x !== id; });
    order.push(id);
  }

  function buildChrome(id, title) {
    var el = document.createElement("div");
    el.className = "tone-window";
    el.dataset.id = id;

    var titlebar = document.createElement("div");
    titlebar.className = "tone-window-titlebar";

    var titleEl = document.createElement("span");
    titleEl.className = "tone-window-title";
    titleEl.textContent = title;

    var controls = document.createElement("div");
    controls.className = "tone-window-controls";

    var minBtn = document.createElement("button");
    minBtn.type = "button";
    minBtn.className = "tone-window-btn tone-window-min";
    minBtn.setAttribute("aria-label", "Minimize " + title);

    var maxBtn = document.createElement("button");
    maxBtn.type = "button";
    maxBtn.className = "tone-window-btn tone-window-max";
    maxBtn.setAttribute("aria-label", "Maximize " + title);

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "tone-window-btn tone-window-close";
    closeBtn.setAttribute("aria-label", "Close " + title);

    controls.appendChild(minBtn);
    controls.appendChild(maxBtn);
    controls.appendChild(closeBtn);
    titlebar.appendChild(titleEl);
    titlebar.appendChild(controls);

    var content = document.createElement("div");
    content.className = "tone-window-content";

    var resize = document.createElement("div");
    resize.className = "tone-window-resize";

    el.appendChild(titlebar);
    el.appendChild(content);
    el.appendChild(resize);

    return { el: el, titlebar: titlebar, content: content, minBtn: minBtn, maxBtn: maxBtn, closeBtn: closeBtn, resize: resize };
  }

  function wireDrag(id, chrome) {
    var win = windows[id];
    var dragging = false;
    var startX, startY, baseLeft, baseTop;

    chrome.titlebar.addEventListener("pointerdown", function (e) {
      if (e.target.closest(".tone-window-btn")) return;
      if (win.maximized) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      baseLeft = win.left;
      baseTop = win.top;
      chrome.titlebar.setPointerCapture(e.pointerId);
      el_addDraggingClass(true);
    });

    function el_addDraggingClass(v) {
      chrome.el.classList.toggle("tone-is-dragging", v);
    }

    chrome.titlebar.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      win.left = clamp(baseLeft + (e.clientX - startX), -(win.width - 80), window.innerWidth - 80);
      win.top = clamp(baseTop + (e.clientY - startY), 0, window.innerHeight - 40);
      applyGeometry(win);
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      el_addDraggingClass(false);
    }
    chrome.titlebar.addEventListener("pointerup", endDrag);
    chrome.titlebar.addEventListener("pointercancel", endDrag);
  }

  function wireResize(id, chrome) {
    var win = windows[id];
    var resizing = false;
    var startX, startY, baseWidth, baseHeight;

    chrome.resize.addEventListener("pointerdown", function (e) {
      if (win.maximized) return;
      resizing = true;
      startX = e.clientX;
      startY = e.clientY;
      baseWidth = win.width;
      baseHeight = win.height;
      chrome.resize.setPointerCapture(e.pointerId);
    });

    chrome.resize.addEventListener("pointermove", function (e) {
      if (!resizing) return;
      win.width = clamp(baseWidth + (e.clientX - startX), MIN_WIDTH, window.innerWidth - 24);
      win.height = clamp(baseHeight + (e.clientY - startY), MIN_HEIGHT, window.innerHeight - 24);
      applyGeometry(win);
    });

    function endResize() {
      resizing = false;
    }
    chrome.resize.addEventListener("pointerup", endResize);
    chrome.resize.addEventListener("pointercancel", endResize);
  }

  function addTaskbarChip(id, title) {
    var chip = document.createElement("button");
    chip.type = "button";
    chip.className = "tone-taskbar-chip";
    chip.textContent = title;
    chip.addEventListener("click", function () {
      restoreFromTaskbar(id);
    });
    taskbar.appendChild(chip);
    windows[id].chip = chip;
  }

  function removeTaskbarChip(id) {
    var win = windows[id];
    if (win && win.chip && win.chip.parentNode) win.chip.parentNode.removeChild(win.chip);
    if (win) win.chip = null;
  }

  function restoreFromTaskbar(id) {
    var win = windows[id];
    if (!win) return;
    win.minimized = false;
    win.el.classList.remove("tone-is-hidden");
    win.el.classList.remove("tone-is-minimized");
    removeTaskbarChip(id);
    applyGeometry(win);
    bringToFront(id);
    safeCall(win.onShow);
  }

  function setMinimized(id, minimized) {
    var win = windows[id];
    if (!win) return;
    win.minimized = minimized;
    win.el.classList.toggle("tone-is-minimized", minimized);
    if (minimized) {
      win.el.classList.add("tone-is-hidden");
      addTaskbarChip(id, win.title);
      safeCall(win.onHide);
    } else {
      win.el.classList.remove("tone-is-hidden");
      removeTaskbarChip(id);
      applyGeometry(win);
      safeCall(win.onShow);
    }
  }

  function safeCall(fn) {
    if (typeof fn !== "function") return;
    try {
      fn();
    } catch (e) {
      /* a module's hook can't be allowed to break the shell */
    }
  }

  function setMaximized(id, maximized) {
    var win = windows[id];
    if (!win) return;
    win.maximized = maximized;
    win.el.classList.toggle("tone-is-maximized", maximized);
    if (!maximized) applyGeometry(win);
  }

  function closeWindow(id) {
    var win = windows[id];
    if (!win) return;
    if (typeof win.cleanup === "function") {
      try {
        win.cleanup();
      } catch (e) {
        /* a module's cleanup shouldn't be able to break the shell */
      }
    }
    removeTaskbarChip(id);
    if (win.el.parentNode) win.el.parentNode.removeChild(win.el);
    delete windows[id];
    order = order.filter(function (x) { return x !== id; });
  }

  function closeAll() {
    Object.keys(windows).forEach(closeWindow);
  }

  function openModule(id) {
    if (windows[id]) {
      if (windows[id].minimized) restoreFromTaskbar(id);
      else bringToFront(id);
      return windows[id];
    }
    var mod = findModule(id);
    if (!mod) return null;

    var width = mod.defaultWidth || 340;
    var height = mod.defaultHeight || 280;
    var pos = nextCascadePosition(width, height);
    var chrome = buildChrome(id, mod.name);

    var win = {
      el: chrome.el,
      contentEl: chrome.content,
      title: mod.name,
      cleanup: null,
      onHide: null,
      onShow: null,
      left: pos.left,
      top: pos.top,
      width: width,
      height: height,
      minimized: false,
      maximized: false,
      chip: null,
    };
    windows[id] = win;
    order.push(id);

    layer.appendChild(chrome.el);
    applyGeometry(win);
    bringToFront(id);

    chrome.el.addEventListener("pointerdown", function () {
      bringToFront(id);
    });

    wireDrag(id, chrome);
    wireResize(id, chrome);

    chrome.minBtn.addEventListener("click", function () {
      setMinimized(id, !win.minimized);
    });
    chrome.maxBtn.addEventListener("click", function () {
      setMaximized(id, !win.maximized);
    });
    chrome.closeBtn.addEventListener("click", function () {
      closeWindow(id);
    });

    var result;
    try {
      result = mod.build(chrome.content);
    } catch (e) {
      result = null;
    }
    var cleanupFn = typeof result === "function" ? result : (result && typeof result.cleanup === "function" ? result.cleanup : function () {});
    win.cleanup = cleanupFn;
    if (result && typeof result === "object") {
      if (typeof result.onHide === "function") win.onHide = result.onHide;
      if (typeof result.onShow === "function") win.onShow = result.onShow;
    }

    return win;
  }

  var resizeScheduled = false;
  window.addEventListener("resize", function () {
    if (resizeScheduled) return;
    resizeScheduled = true;
    requestAnimationFrame(function () {
      resizeScheduled = false;
      Object.keys(windows).forEach(function (id) {
        var win = windows[id];
        win.width = clamp(win.width, MIN_WIDTH, window.innerWidth - 24);
        win.height = clamp(win.height, MIN_HEIGHT, window.innerHeight - 24);
        win.left = clamp(win.left, -(win.width - 80), window.innerWidth - 80);
        win.top = clamp(win.top, 0, window.innerHeight - 40);
        applyGeometry(win);
      });
    });
  });

  window.ToneWM = {
    openModule: openModule,
    close: closeWindow,
    closeAll: closeAll,
    focus: bringToFront,
    isOpen: function (id) { return !!windows[id]; },
    openCount: function () { return order.length; },
  };
})();
