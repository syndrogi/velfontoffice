/**
 * MIDI OFFICE — EP-133 Workstation — UI
 * Renders the panel: display readout, 12-pad grid, group/mode
 * buttons, transport, fader, and X/Y knobs. Mouse/touch handlers call
 * the exact same dispatch functions keyboard.js uses (padDown/padUp,
 * setMode, setActiveLetter, togglePlay, toggleRecordArm) — see each
 * handler below — so there is one input-handling path, not two.
 *
 * Mode-specific detail (sound editing, FX, mixer, keys mode) mounts
 * into #wsModeBody via renderModeBody(), implemented by whichever of
 * sound-editor.js/effects.js/mixer.js/keys-mode.js owns the current
 * mode — this file only owns the chrome around it.
 */
(function () {
  var root = null;
  var padEls = [];
  var displayEls = {};
  var modeBodyEl = null;
  var rafPending = false;

  function qs(sel) {
    return root.querySelector(sel);
  }

  function buildPanel() {
    var el = document.createElement("div");
    el.className = "ws-panel";
    el.innerHTML =
      '<div class="ws-display" id="wsDisplay">' +
        '<div class="ws-display-row ws-display-row-top">' +
          '<span class="ws-dv" data-k="project">PROJECT —</span>' +
          '<span class="ws-dv" data-k="bpm">120.0 BPM</span>' +
          '<span class="ws-dv" data-k="sig">4/4</span>' +
          '<span class="ws-dv" data-k="midi">MIDI —</span>' +
        '</div>' +
        '<div class="ws-display-row ws-display-row-main">' +
          '<span class="ws-dv ws-dv-big" data-k="mode">SOUND</span>' +
          '<span class="ws-dv ws-dv-big" data-k="group">A</span>' +
          '<span class="ws-dv ws-dv-big" data-k="barstep">1.1</span>' +
          '<span class="ws-dv ws-dv-big" data-k="pad">PAD —</span>' +
        '</div>' +
        '<div class="ws-display-row">' +
          '<span class="ws-dv" data-k="param">—</span>' +
          '<span class="ws-dv" data-k="value">—</span>' +
          '<span class="ws-dv" data-k="play">STOP</span>' +
          '<span class="ws-dv" data-k="rec">REC OFF</span>' +
          '<span class="ws-dv" data-k="fx">FX —</span>' +
        '</div>' +
      '</div>' +

      '<div class="ws-row">' +
        '<div class="ws-groups" id="wsGroups"></div>' +
        '<div class="ws-modes" id="wsModes"></div>' +
      '</div>' +

      '<div class="ws-row">' +
        '<div class="ws-transport">' +
          '<button type="button" class="ws-btn ws-play" id="wsPlay">PLAY</button>' +
          '<button type="button" class="ws-btn ws-rec" id="wsRec">REC</button>' +
          '<button type="button" class="ws-btn" id="wsTap">TAP</button>' +
          '<label class="ws-field"><span>BPM</span><input type="range" id="wsBpm" min="40" max="240" value="120"></label>' +
          '<label class="ws-field"><span>MET</span>' +
            '<select id="wsMet"><option value="off">OFF</option><option value="on">ON</option><option value="rec">REC</option></select>' +
          '</label>' +
        '</div>' +
      '</div>' +

      '<div class="ws-row">' +
        '<div class="ws-pads" id="wsPads"></div>' +
        '<div class="ws-knobs">' +
          '<label class="ws-field"><span>FADER</span><input type="range" id="wsFader" min="0" max="100" value="80"></label>' +
          '<label class="ws-field"><span>X</span><input type="range" id="wsKnobX" min="0" max="100" value="50"></label>' +
          '<label class="ws-field"><span>Y</span><input type="range" id="wsKnobY" min="0" max="100" value="50"></label>' +
        '</div>' +
      '</div>' +

      '<div class="ws-mode-body" id="wsModeBody"></div>' +

      '<div class="ws-row ws-project-row">' +
        '<input type="text" class="ws-project-name" id="wsProjectName" placeholder="PROJECT NAME" maxlength="24">' +
        '<button type="button" class="ws-mini" id="wsNewProject">NEW</button>' +
        '<button type="button" class="ws-mini" id="wsSaveProject">SAVE</button>' +
        '<select class="ws-select" id="wsProjectList"><option value="">LOAD PROJECT&hellip;</option></select>' +
        '<button type="button" class="ws-mini" id="wsLoadProject">LOAD</button>' +
        '<button type="button" class="ws-mini" id="wsDeleteProject">DELETE</button>' +
        '<span class="ws-project-status" id="wsProjectStatus"></span>' +
      '</div>' +

      '<div class="ws-row ws-footer-row">' +
        '<button type="button" class="ws-mini" id="wsMinus">MINUS</button>' +
        '<button type="button" class="ws-mini" id="wsPlus">PLUS</button>' +
        '<button type="button" class="ws-mini" id="wsLoadDemo">LOAD DEMO KIT</button>' +
        '<button type="button" class="ws-mini" id="wsCommit">COMMIT</button>' +
        '<span class="ws-hint">[Backquote]=FUNCTION &middot; 1-9 0 - = PADS &middot; Space=PLAY &middot; Enter=REC &middot; Shift/Backspace/Tab=modifiers &middot; Esc=PANIC</span>' +
      '</div>';
    return el;
  }

  function buildGroupButtons() {
    var container = qs("#wsGroups");
    window.WorkstationGroups.LETTERS.forEach(function (letter) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ws-btn ws-group-btn";
      btn.textContent = "GROUP " + letter;
      btn.addEventListener("click", function () {
        window.WorkstationGroups.setActiveLetter(letter);
      });
      container.appendChild(btn);
    });
  }

  function buildModeButtons() {
    var container = qs("#wsModes");
    window.WorkstationKeyboard.MODES.forEach(function (mode) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ws-btn ws-mode-btn";
      btn.textContent = mode.toUpperCase();
      btn.addEventListener("click", function () {
        window.WorkstationKeyboard.setMode(mode);
      });
      container.appendChild(btn);
    });
  }

  function buildPads() {
    var container = qs("#wsPads");
    for (var i = 0; i < 12; i++) {
      (function (padIndex) {
        var pad = document.createElement("button");
        pad.type = "button";
        pad.className = "ws-pad";
        pad.dataset.pad = String(padIndex);
        pad.textContent = String(padIndex + 1);

        function press(e) {
          e.preventDefault();
          window.WorkstationKeyboard.padDown(padIndex, 1);
        }
        function release() {
          window.WorkstationKeyboard.padUp(padIndex);
        }
        pad.addEventListener("pointerdown", press);
        pad.addEventListener("pointerup", release);
        pad.addEventListener("pointerleave", release);
        pad.addEventListener("pointercancel", release);
        pad.addEventListener("click", function () {
          selectedPad = padIndex;
          refreshDisplay();
          renderModeBody();
        });

        container.appendChild(pad);
        padEls[padIndex] = pad;
      })(i);
    }
  }

  var selectedPad = null;

  function flashPad(padIndex, active) {
    var el = padEls[padIndex];
    if (el) el.classList.toggle("ws-is-active", active);
  }

  function refreshDisplay() {
    if (!root) return; // window closed since this refresh was scheduled
    var transportState = window.WorkstationTransport.getState();
    var project = window.WorkstationProjects.getCurrent();
    var letter = window.WorkstationGroups.getActiveLetter();
    var group = window.WorkstationGroups.getGroup(letter);
    var mode = window.WorkstationKeyboard.getMode();

    setDv("project", project ? project.name : "NO PROJECT");
    setDv("bpm", transportState.bpm.toFixed(1) + " BPM");
    setDv("sig", transportState.timeSigNum + "/" + transportState.timeSigDen);
    setDv("midi", window.WorkstationMidi ? window.WorkstationMidi.getStatusText() : "MIDI UNAVAILABLE");
    setDv("mode", mode.toUpperCase());
    setDv("group", letter);
    setDv("pad", selectedPad != null ? "PAD " + (selectedPad + 1) : "PAD —");
    setDv("play", transportState.isPlaying ? "PLAYING" : "STOPPED");
    setDv("rec", transportState.isRecording ? "REC ON" : "REC OFF");
    setDv("fx", window.WorkstationEffects ? window.WorkstationEffects.getStatusText() : "FX —");

    var step = window.WorkstationSequencer.getStepCursor();
    var bar = Math.floor(step / 16) + 1;
    var within = (step % 16) + 1;
    setDv("barstep", bar + "." + within);

    qs("#wsRec").classList.toggle("ws-is-active", transportState.isRecording);
    qs("#wsPlay").classList.toggle("ws-is-active", transportState.isPlaying);
    qs("#wsPlay").textContent = transportState.isPlaying ? "STOP" : "PLAY";

    root.querySelectorAll(".ws-group-btn").forEach(function (btn, i) {
      btn.classList.toggle("ws-is-active", window.WorkstationGroups.LETTERS[i] === letter);
    });
    root.querySelectorAll(".ws-mode-btn").forEach(function (btn) {
      btn.classList.toggle("ws-is-active", btn.textContent.toLowerCase() === mode);
    });
  }

  function setDv(key, text) {
    if (!displayEls[key]) displayEls[key] = root.querySelector('.ws-dv[data-k="' + key + '"]');
    if (displayEls[key]) displayEls[key].textContent = text;
  }

  function scheduleRefresh() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () {
      rafPending = false;
      refreshDisplay();
    });
  }

  function renderModeBody() {
    if (!modeBodyEl) return;
    modeBodyEl.innerHTML = "";
    var mode = window.WorkstationKeyboard.getMode();
    var letter = window.WorkstationGroups.getActiveLetter();
    if (mode === "sound" && window.WorkstationSoundEditor) {
      window.WorkstationSoundEditor.render(modeBodyEl, letter, selectedPad);
    } else if (mode === "fx" && window.WorkstationEffects) {
      window.WorkstationEffects.render(modeBodyEl, letter);
    } else if (mode === "mixer" && window.WorkstationMixer) {
      window.WorkstationMixer.render(modeBodyEl);
    } else if (mode === "keys" && window.WorkstationKeysMode) {
      window.WorkstationKeysMode.render(modeBodyEl, letter, selectedPad);
    } else if (mode === "sequencer") {
      renderSequencerBody(modeBodyEl, letter);
    } else {
      var hint = document.createElement("p");
      hint.className = "ws-hint-block";
      hint.textContent = mode.toUpperCase() + " mode — select a pad to edit.";
      modeBodyEl.appendChild(hint);
    }
  }

  function renderSequencerBody(container, letter) {
    var group = window.WorkstationGroups.getGroup(letter);
    var patternId = group.activePatternId;
    if (!patternId) {
      var p = window.WorkstationPatterns.createPattern(letter);
      window.WorkstationGroups.addPattern(letter, p.id);
      patternId = p.id;
    }
    var pattern = window.WorkstationPatterns.getPattern(patternId);
    var grid = document.createElement("div");
    grid.className = "ws-seq-grid";
    for (var pad = 0; pad < 12; pad++) {
      var row = document.createElement("div");
      row.className = "ws-seq-row";
      var label = document.createElement("span");
      label.className = "ws-seq-row-label";
      label.textContent = String(pad + 1);
      row.appendChild(label);
      var stepsEl = document.createElement("div");
      stepsEl.className = "ws-seq-steps";
      var stepCount = Math.min(pattern.lengthSteps, 16);
      for (var s = 0; s < stepCount; s++) {
        (function (padIndex, step) {
          var cell = document.createElement("button");
          cell.type = "button";
          cell.className = "ws-seq-step";
          if (step % 4 === 0) cell.classList.add("ws-is-beat");
          var hasEvent = pattern.lanes[padIndex].some(function (e) { return e.step === step; });
          if (hasEvent) cell.classList.add("ws-is-on");
          cell.addEventListener("click", function () {
            var exists = pattern.lanes[padIndex].some(function (e) { return e.step === step; });
            window.WorkstationSequencer.pushUndo(patternId);
            window.WorkstationPatterns.setEvent(patternId, padIndex, step, exists ? null : { velocity: 1 });
            renderModeBody();
          });
          stepsEl.appendChild(cell);
        })(pad, s);
      }
      row.appendChild(stepsEl);
      grid.appendChild(row);
    }
    container.appendChild(grid);

    var actions = document.createElement("div");
    actions.className = "ws-seq-actions";
    var lengthField = document.createElement("label");
    lengthField.className = "ws-field";
    lengthField.innerHTML = "<span>BARS</span>";
    var lengthSelect = document.createElement("select");
    [1, 2, 4, 8].forEach(function (bars) {
      var opt = document.createElement("option");
      opt.value = String(bars * 16);
      opt.textContent = String(bars);
      if (pattern.lengthSteps === bars * 16) opt.selected = true;
      lengthSelect.appendChild(opt);
    });
    lengthSelect.addEventListener("change", function () {
      window.WorkstationPatterns.setLength(patternId, Number(lengthSelect.value));
      renderModeBody();
    });
    lengthField.appendChild(lengthSelect);
    actions.appendChild(lengthField);

    var undoBtn = document.createElement("button");
    undoBtn.type = "button";
    undoBtn.className = "ws-mini";
    undoBtn.textContent = "UNDO";
    undoBtn.disabled = !window.WorkstationSequencer.canUndo(patternId);
    undoBtn.addEventListener("click", function () {
      window.WorkstationSequencer.undo(patternId);
      renderModeBody();
    });
    actions.appendChild(undoBtn);

    var quantizeToggle = document.createElement("button");
    quantizeToggle.type = "button";
    quantizeToggle.className = "ws-mini";
    quantizeToggle.classList.toggle("ws-is-active", window.WorkstationSequencer.getQuantize());
    quantizeToggle.textContent = "QUANTIZE";
    quantizeToggle.addEventListener("click", function () {
      window.WorkstationSequencer.setQuantize(!window.WorkstationSequencer.getQuantize());
      renderModeBody();
    });
    actions.appendChild(quantizeToggle);

    container.appendChild(actions);
  }

  function wireTransport() {
    qs("#wsPlay").addEventListener("click", function () {
      window.WorkstationTransport.togglePlay();
    });
    qs("#wsRec").addEventListener("click", function () {
      window.WorkstationKeyboard.toggleRecordArm();
    });
    qs("#wsTap").addEventListener("click", function () {
      var bpm = window.WorkstationTransport.tapTempo();
      qs("#wsBpm").value = bpm;
    });
    qs("#wsBpm").addEventListener("input", function (e) {
      window.WorkstationTransport.setBpm(Number(e.target.value));
    });
    qs("#wsMet").addEventListener("change", function (e) {
      window.WorkstationTransport.setMetronome(e.target.value);
    });
    qs("#wsFader").addEventListener("input", function (e) {
      window.WorkstationGroups.setFader(window.WorkstationGroups.getActiveLetter(), e.target.value / 100);
    });
    qs("#wsMinus").addEventListener("click", handleMinus);
    qs("#wsPlus").addEventListener("click", handlePlus);
    qs("#wsLoadDemo").addEventListener("click", function () {
      window.WorkstationSampler.loadDemoKit(window.WorkstationGroups.getActiveLetter()).then(renderModeBody);
    });
    qs("#wsCommit").addEventListener("click", function () {
      window.WorkstationProjects.commitScene();
      refreshDisplay();
    });
  }

  function setProjectStatus(text, isError) {
    var el = qs("#wsProjectStatus");
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("ws-is-error", !!isError);
    window.clearTimeout(setProjectStatus._t);
    setProjectStatus._t = window.setTimeout(function () {
      if (el) el.textContent = "";
    }, 3000);
  }

  function refreshProjectList(selectId) {
    var select = qs("#wsProjectList");
    if (!select) return Promise.resolve();
    if (!window.WorkstationStorage.isAvailable()) {
      select.innerHTML = '<option value="">STORAGE UNAVAILABLE</option>';
      select.disabled = true;
      return Promise.resolve();
    }
    return window.WorkstationProjects.listProjects().then(function (projects) {
      select.innerHTML = '<option value="">LOAD PROJECT&hellip;</option>';
      projects.sort(function (a, b) { return (b.updatedAt || "").localeCompare(a.updatedAt || ""); });
      projects.forEach(function (p) {
        var opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.name + " (" + new Date(p.updatedAt).toLocaleString() + ")";
        if (p.id === selectId) opt.selected = true;
        select.appendChild(opt);
      });
    });
  }

  function wireProjectControls() {
    var nameInput = qs("#wsProjectName");
    var current = window.WorkstationProjects.getCurrent();
    if (current) nameInput.value = current.name;

    nameInput.addEventListener("change", function () {
      window.WorkstationProjects.rename(nameInput.value.trim() || "UNTITLED");
      refreshDisplay();
    });

    qs("#wsNewProject").addEventListener("click", function () {
      window.WorkstationProjects.newProject("UNTITLED");
      nameInput.value = "UNTITLED";
      refreshDisplay();
      renderModeBody();
      setProjectStatus("NEW PROJECT");
    });

    qs("#wsSaveProject").addEventListener("click", function () {
      window.WorkstationProjects.saveProject().then(function (record) {
        setProjectStatus("SAVED");
        return refreshProjectList(record.id);
      }).catch(function () {
        setProjectStatus("SAVE FAILED — STORAGE UNAVAILABLE", true);
      });
    });

    qs("#wsLoadProject").addEventListener("click", function () {
      var select = qs("#wsProjectList");
      var id = select.value;
      if (!id) {
        setProjectStatus("PICK A PROJECT FIRST", true);
        return;
      }
      window.WorkstationProjects.loadProject(id).then(function (project) {
        nameInput.value = project.name;
        qs("#wsBpm").value = window.WorkstationTransport.getBpm();
        refreshDisplay();
        renderModeBody();
        setProjectStatus("LOADED");
      }).catch(function () {
        setProjectStatus("LOAD FAILED", true);
      });
    });

    qs("#wsDeleteProject").addEventListener("click", function () {
      var select = qs("#wsProjectList");
      var id = select.value;
      if (!id) {
        setProjectStatus("PICK A PROJECT FIRST", true);
        return;
      }
      window.WorkstationProjects.deleteProject(id).then(function () {
        setProjectStatus("DELETED");
        return refreshProjectList();
      }).catch(function () {
        setProjectStatus("DELETE FAILED", true);
      });
    });

    refreshProjectList();
  }

  function handleMinus() {
    var mode = window.WorkstationKeyboard.getMode();
    if (mode === "sound" && selectedPad != null) {
      // cycle to previous pad as a simple "scroll sounds" stand-in
      selectedPad = (selectedPad + 11) % 12;
      renderModeBody();
    }
  }
  function handlePlus() {
    var mode = window.WorkstationKeyboard.getMode();
    if (mode === "sound" && selectedPad != null) {
      selectedPad = (selectedPad + 1) % 12;
      renderModeBody();
    }
  }
  window.WorkstationUIMinusPlus = { handleMinus: handleMinus, handlePlus: handlePlus };

  function buildWindow(container) {
    root = buildPanel();
    container.appendChild(root);
    modeBodyEl = qs("#wsModeBody");

    buildGroupButtons();
    buildModeButtons();
    buildPads();
    wireTransport();
    wireProjectControls();

    // Every one of these returns an unregister function — this window
    // can be closed and reopened arbitrarily many times (window-
    // manager.js calls buildWindow() fresh on each open), so each
    // registration from a PREVIOUS open must be torn down in cleanup()
    // below or they stack: N opens means N copies of refreshDisplay()
    // firing on every single state change, each one trying to touch
    // whichever `root`/`modeBodyEl` was current *at registration time*
    // — including ones already nulled out by an earlier cleanup(),
    // which throws trying to query a null root.
    var unsubs = [
      window.WorkstationKeyboard.onPadVisual(flashPad),
      window.WorkstationKeyboard.onModeChange(function () {
        refreshDisplay();
        renderModeBody();
      }),
      window.WorkstationGroups.onChange(function () {
        refreshDisplay();
        renderModeBody();
      }),
      window.WorkstationTransport.onStateChange(scheduleRefresh),
      window.WorkstationSequencer.onStep(scheduleRefresh),
      window.WorkstationProjects.onChange(refreshDisplay),
    ];

    if (!window.WorkstationProjects.getCurrent()) {
      window.WorkstationProjects.newProject("UNTITLED");
    }
    refreshDisplay();
    renderModeBody();

    return function cleanup() {
      unsubs.forEach(function (off) {
        if (typeof off === "function") off();
      });
      root = null;
      modeBodyEl = null;
      padEls = [];
      displayEls = {};
    };
  }

  window.WorkstationUI = {
    buildWindow: buildWindow,
    handleMinus: handleMinus,
    handlePlus: handlePlus,
    refreshDisplay: function () { scheduleRefresh(); },
    renderModeBody: function () { renderModeBody(); },
  };
})();
