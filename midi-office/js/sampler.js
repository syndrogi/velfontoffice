/**
 * MIDI OFFICE — Sampler
 * Load an audio file from your own computer (nothing uploads anywhere
 * — see audio-engine.js's decodeFile), chop it into equal slices, and
 * either tap pads to play a slice directly or lay slices out on a
 * step grid to reassemble the file into a new pattern.
 *
 * The reassembly grid is locked to the master sequencer's own 16-step
 * clock (see the onStep hook below) instead of running a second
 * scheduler — simple, stays in time with everything else playing, but
 * inherits that clock's UI-timed (not lookahead-precise) triggering,
 * so it's close-enough-for-a-sampler-toy rather than sample-tight like
 * sequencer.js's own drum hits.
 */
(function () {
  var buffer = null;
  var fileName = "";
  var sliceCount = 8;
  var pattern = [];
  var padsEl = null;
  var gridEl = null;
  var statusEl = null;

  function resetPattern() {
    pattern = [];
    for (var i = 0; i < sliceCount; i++) pattern.push(new Array(16).fill(false));
  }
  resetPattern();

  function sliceDuration() {
    return buffer ? buffer.duration / sliceCount : 0;
  }

  function playSlice(index, time) {
    if (!buffer) return;
    var ctx = window.ToneEngine.init();
    var src = ctx.createBufferSource();
    src.buffer = buffer;
    var gain = ctx.createGain();
    gain.gain.value = 0.9;
    src.connect(gain);
    window.ToneEngine.connectDry(gain);
    var dur = sliceDuration();
    src.start(time, index * dur, dur);
  }

  if (window.ToneSequencer) {
    window.ToneSequencer.onStep(function (stepIndex) {
      if (stepIndex === -1 || !buffer) return;
      var ctx = window.ToneEngine.context();
      for (var i = 0; i < sliceCount; i++) {
        if (pattern[i][stepIndex]) playSlice(i, ctx.currentTime);
      }
    });
  }

  function loadFile(file) {
    return window.ToneEngine.decodeFile(file).then(function (decoded) {
      buffer = decoded;
      fileName = file.name;
      resetPattern();
      renderBody();
    });
  }

  function setSliceCount(n) {
    sliceCount = n;
    resetPattern();
    renderBody();
  }

  var bodyEl = null;

  function renderBody() {
    if (!bodyEl) return;
    bodyEl.innerHTML = "";

    if (statusEl) {
      statusEl.textContent = buffer ? fileName + " — " + sliceCount + " slices" : "No file loaded";
    }

    if (!buffer) {
      padsEl = null;
      gridEl = null;
      var hint = document.createElement("p");
      hint.className = "tone-hint";
      hint.textContent = "Load an MP3 or WAV above to start chopping it.";
      bodyEl.appendChild(hint);
      return;
    }

    padsEl = document.createElement("div");
    padsEl.className = "tone-sampler-pads";
    for (var p = 0; p < sliceCount; p++) {
      (function (index) {
        var pad = document.createElement("button");
        pad.type = "button";
        pad.className = "tone-sampler-pad";
        pad.textContent = String(index + 1);
        pad.addEventListener("click", function () {
          playSlice(index, window.ToneEngine.init().currentTime);
        });
        padsEl.appendChild(pad);
      })(p);
    }
    bodyEl.appendChild(padsEl);

    gridEl = document.createElement("div");
    gridEl.className = "tone-seq-tracks";
    for (var s = 0; s < sliceCount; s++) {
      (function (sliceIndex) {
        var row = document.createElement("div");
        row.className = "tone-seq-track";
        var label = document.createElement("span");
        label.className = "tone-seq-track-label";
        label.textContent = String(sliceIndex + 1);
        row.appendChild(label);

        var steps = document.createElement("div");
        steps.className = "tone-seq-steps";
        for (var i = 0; i < 16; i++) {
          (function (stepIndex) {
            var step = document.createElement("button");
            step.type = "button";
            step.className = "tone-seq-step";
            if (stepIndex % 4 === 0) step.classList.add("tone-is-beat");
            if (pattern[sliceIndex][stepIndex]) step.classList.add("tone-is-active");
            step.setAttribute("aria-label", "Slice " + (sliceIndex + 1) + " step " + (stepIndex + 1));
            step.addEventListener("click", function () {
              pattern[sliceIndex][stepIndex] = !pattern[sliceIndex][stepIndex];
              step.classList.toggle("tone-is-active", pattern[sliceIndex][stepIndex]);
            });
            steps.appendChild(step);
          })(i);
        }
        row.appendChild(steps);
        gridEl.appendChild(row);
      })(s);
    }
    bodyEl.appendChild(gridEl);
  }

  function buildWindow(container) {
    var loadRow = document.createElement("div");
    loadRow.className = "tone-sampler-load";

    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "audio/*";
    fileInput.className = "tone-file-input";
    fileInput.id = "toneSamplerFile";
    fileInput.addEventListener("change", function () {
      if (fileInput.files && fileInput.files[0]) loadFile(fileInput.files[0]);
    });

    var loadBtn = document.createElement("label");
    loadBtn.className = "tone-mini-btn tone-file-label";
    loadBtn.htmlFor = "toneSamplerFile";
    loadBtn.textContent = "LOAD FILE";

    var sliceField = document.createElement("div");
    sliceField.className = "tone-field tone-field-inline";
    var sliceLabel = document.createElement("label");
    sliceLabel.textContent = "SLICES";
    var sliceSelect = document.createElement("select");
    sliceSelect.className = "tone-select";
    [4, 8, 16].forEach(function (n) {
      var opt = document.createElement("option");
      opt.value = String(n);
      opt.textContent = String(n);
      if (n === sliceCount) opt.selected = true;
      sliceSelect.appendChild(opt);
    });
    sliceSelect.addEventListener("change", function () {
      setSliceCount(Number(sliceSelect.value));
    });
    sliceField.appendChild(sliceLabel);
    sliceField.appendChild(sliceSelect);

    statusEl = document.createElement("span");
    statusEl.className = "tone-sampler-status";
    statusEl.textContent = buffer ? fileName + " — " + sliceCount + " slices" : "No file loaded";

    loadRow.appendChild(fileInput);
    loadRow.appendChild(loadBtn);
    loadRow.appendChild(sliceField);
    loadRow.appendChild(statusEl);

    bodyEl = document.createElement("div");
    bodyEl.className = "tone-sampler-body";

    container.appendChild(loadRow);
    container.appendChild(bodyEl);
    renderBody();

    return function cleanup() {
      bodyEl = null;
      padsEl = null;
      gridEl = null;
      statusEl = null;
    };
  }

  window.ToneSampler = {
    loadFile: loadFile,
    setSliceCount: setSliceCount,
    buildWindow: buildWindow,
  };
})();
