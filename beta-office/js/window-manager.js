/**
 * BETA OFFICE — Window Manager
 * Generalizes the root site's js/office-palette.js (one movable/
 * resizable/minimize-maximize-close panel) into N simultaneous
 * windows, one per open experiment, with click-to-front z-index
 * stacking and a taskbar for minimized ones. Independent file, same
 * pointer-based drag/resize technique, no shared code.
 *
 * BetaWM.openExperiment(id) is the only entry point callers need
 * (category tiles, the command palette, taskbar re-opens) — it looks
 * the experiment up in BetaExperiments (registry.js), builds the
 * window chrome, calls the experiment's launch(container), and wires
 * its returned cleanup into the close button.
 */
(function () {
  var layer = document.getElementById("betaWindowsLayer");
  var taskbar = document.getElementById("betaTaskbar");
  if (!layer || !taskbar || !window.BetaExperiments) return;

  var MIN_WIDTH = 220;
  var MIN_HEIGHT = 140;
  var CASCADE_STEP = 28;

  var windows = {}; // id -> { el, contentEl, cleanup, left, top, width, height, minimized, maximized, preMax }
  var order = []; // ids, back-to-front
  var cascadeIndex = 0;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function nextCascadePosition(width, height) {
    var margin = 48;
    var stepCount = cascadeIndex++;
    var maxCols = Math.max(1, Math.floor((window.innerWidth - margin * 2) / (width + CASCADE_STEP * 4)));
    var col = stepCount % (maxCols || 1);
    var row = Math.floor(stepCount / (maxCols || 1));
    var left = margin + col * (width + CASCADE_STEP * 4) + (row % 4) * CASCADE_STEP;
    var top = margin + 40 + (row % 4) * (CASCADE_STEP * 1.4);
    return {
      left: clamp(left, 0, Math.max(0, window.innerWidth - width)),
      top: clamp(top, 0, Math.max(0, window.innerHeight - height)),
    };
  }

  function applyGeometry(win) {
    if (win.maximized) return; // CSS .beta-is-maximized owns geometry entirely
    win.el.style.left = win.left + "px";
    win.el.style.top = win.top + "px";
    win.el.style.width = win.width + "px";
    win.el.style.height = win.minimized ? "" : win.height + "px";
  }

  function bringToFront(id) {
    var idx = order.indexOf(id);
    if (idx === -1) return;
    order.splice(idx, 1);
    order.push(id);
    order.forEach(function (wid, i) {
      windows[wid].el.style.zIndex = String(i + 1);
    });
  }

  function addTaskbarChip(id, title) {
    var chip = document.createElement("button");
    chip.type = "button";
    chip.className = "beta-taskbar-chip";
    chip.textContent = title;
    chip.addEventListener("click", function () {
      restoreFromTaskbar(id);
    });
    windows[id].chip = chip;
    taskbar.appendChild(chip);
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
    win.el.classList.remove("beta-is-hidden");
    win.el.classList.remove("beta-is-minimized");
    removeTaskbarChip(id);
    applyGeometry(win);
    bringToFront(id);
  }

  function setMinimized(id, minimized) {
    var win = windows[id];
    if (!win) return;
    win.minimized = minimized;
    win.el.classList.toggle("beta-is-minimized", minimized);
    if (minimized) {
      win.el.classList.add("beta-is-hidden");
      addTaskbarChip(id, win.title);
    } else {
      win.el.classList.remove("beta-is-hidden");
      removeTaskbarChip(id);
      applyGeometry(win);
    }
  }

  function setMaximized(id, maximized) {
    var win = windows[id];
    if (!win) return;
    win.maximized = maximized;
    win.el.classList.toggle("beta-is-maximized", maximized);
    if (!maximized) applyGeometry(win);
  }

  function closeWindow(id) {
    var win = windows[id];
    if (!win) return;
    if (typeof win.cleanup === "function") {
      try {
        win.cleanup();
      } catch (e) {
        /* an experiment's cleanup shouldn't be able to break the shell */
      }
    }
    window.BetaExperiments.noteClosed(id);
    removeTaskbarChip(id);
    if (win.el.parentNode) win.el.parentNode.removeChild(win.el);
    delete windows[id];
    var idx = order.indexOf(id);
    if (idx !== -1) order.splice(idx, 1);
  }

  function closeAll() {
    Object.keys(windows).forEach(closeWindow);
  }

  function buildChrome(id, title) {
    var el = document.createElement("div");
    el.className = "beta-window";
    el.dataset.experimentId = id;

    var titlebar = document.createElement("div");
    titlebar.className = "beta-window-titlebar";

    var titleEl = document.createElement("span");
    titleEl.className = "beta-window-title";
    titleEl.textContent = title;

    var controls = document.createElement("div");
    controls.className = "beta-window-controls";

    var minBtn = makeCtrlBtn("−", "Minimize");
    var maxBtn = makeCtrlBtn("□", "Maximize");
    var closeBtn = makeCtrlBtn("×", "Close");
    controls.appendChild(minBtn);
    controls.appendChild(maxBtn);
    controls.appendChild(closeBtn);

    titlebar.appendChild(titleEl);
    titlebar.appendChild(controls);

    var content = document.createElement("div");
    content.className = "beta-window-content";

    var resize = document.createElement("div");
    resize.className = "beta-window-resize";
    resize.setAttribute("aria-hidden", "true");

    el.appendChild(titlebar);
    el.appendChild(content);
    el.appendChild(resize);

    return { el: el, titlebar: titlebar, content: content, resize: resize, minBtn: minBtn, maxBtn: maxBtn, closeBtn: closeBtn };
  }

  function makeCtrlBtn(glyph, label) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "beta-window-btn";
    btn.setAttribute("aria-label", label);
    btn.textContent = glyph;
    return btn;
  }

  function wireDrag(id, chrome) {
    var dragging = false;
    var startX = 0, startY = 0, baseLeft = 0, baseTop = 0;

    chrome.titlebar.addEventListener("pointerdown", function (e) {
      if (e.target.closest(".beta-window-btn")) return;
      var win = windows[id];
      if (!win || win.maximized) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      baseLeft = win.left;
      baseTop = win.top;
      chrome.titlebar.setPointerCapture(e.pointerId);
      win.el.classList.add("beta-is-dragging");
      bringToFront(id);
    });

    chrome.titlebar.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var win = windows[id];
      win.left = clamp(baseLeft + (e.clientX - startX), -(win.width - 80), window.innerWidth - 80);
      win.top = clamp(baseTop + (e.clientY - startY), 0, window.innerHeight - 40);
      applyGeometry(win);
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      windows[id] && windows[id].el.classList.remove("beta-is-dragging");
    }
    chrome.titlebar.addEventListener("pointerup", endDrag);
    chrome.titlebar.addEventListener("pointercancel", endDrag);
  }

  function wireResize(id, chrome) {
    var resizing = false;
    var startX = 0, startY = 0, baseWidth = 0, baseHeight = 0;

    chrome.resize.addEventListener("pointerdown", function (e) {
      var win = windows[id];
      if (!win || win.minimized || win.maximized) return;
      resizing = true;
      startX = e.clientX;
      startY = e.clientY;
      baseWidth = win.width;
      baseHeight = win.height;
      chrome.resize.setPointerCapture(e.pointerId);
      e.stopPropagation();
    });

    chrome.resize.addEventListener("pointermove", function (e) {
      if (!resizing) return;
      var win = windows[id];
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

  function openExperiment(id) {
    if (windows[id]) {
      if (windows[id].minimized) restoreFromTaskbar(id);
      else bringToFront(id);
      return windows[id];
    }
    var spec = window.BetaExperiments.get(id);
    if (!spec) return null;

    var width = 300;
    var height = 260;
    var pos = nextCascadePosition(width, height);
    var chrome = buildChrome(id, spec.name);

    var win = {
      el: chrome.el,
      contentEl: chrome.content,
      title: spec.name,
      cleanup: null,
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
      result = spec.launch(chrome.content);
    } catch (e) {
      result = null;
    }
    var cleanupFn = typeof result === "function" ? result : (result && typeof result.cleanup === "function" ? result.cleanup : function () {});
    win.cleanup = cleanupFn;
    window.BetaExperiments.noteOpened(id, chrome.content, cleanupFn);

    return win;
  }

  window.addEventListener("resize", function () {
    Object.keys(windows).forEach(function (id) {
      var win = windows[id];
      win.width = clamp(win.width, MIN_WIDTH, window.innerWidth - 24);
      win.height = clamp(win.height, MIN_HEIGHT, window.innerHeight - 24);
      win.left = clamp(win.left, -(win.width - 80), window.innerWidth - 80);
      win.top = clamp(win.top, 0, window.innerHeight - 40);
      applyGeometry(win);
    });
  });

  window.BetaWM = {
    openExperiment: openExperiment,
    close: closeWindow,
    closeAll: closeAll,
    focus: bringToFront,
    isOpen: function (id) {
      return !!windows[id];
    },
    openCount: function () {
      return order.length;
    },
  };
})();
