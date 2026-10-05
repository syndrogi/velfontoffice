/**
 * TONE OFFICE — Recorder
 * Captures the master bus (audio-engine.js's getRecorderStream — a tap
 * on the exact signal sent to the speakers, post-volume) via
 * MediaRecorder, and offers each take back as a downloadable file.
 * Nothing leaves the browser; there's no server to send it to.
 */
(function () {
  var mediaRecorder = null;
  var chunks = [];
  var recording = false;
  var takes = [];
  var takesEl = null;
  var recordBtn = null;
  var timerEl = null;
  var timerInterval = null;
  var startTime = 0;

  function pickMimeType() {
    var candidates = ["audio/webm", "audio/ogg", "audio/mp4"];
    for (var i = 0; i < candidates.length; i++) {
      if (window.MediaRecorder.isTypeSupported(candidates[i])) return candidates[i];
    }
    return "";
  }

  function updateTimer() {
    if (!timerEl) return;
    var elapsed = (performance.now() - startTime) / 1000;
    var m = Math.floor(elapsed / 60);
    var s = Math.floor(elapsed % 60);
    timerEl.textContent = (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
  }

  function renderTakes() {
    if (!takesEl) return;
    takesEl.innerHTML = "";
    if (!takes.length) {
      var empty = document.createElement("p");
      empty.className = "tone-hint";
      empty.textContent = "No takes yet.";
      takesEl.appendChild(empty);
      return;
    }
    takes.forEach(function (take) {
      var row = document.createElement("div");
      row.className = "tone-take-row";

      var name = document.createElement("span");
      name.className = "tone-take-name";
      name.textContent = take.name;

      var audio = document.createElement("audio");
      audio.controls = true;
      audio.src = take.url;
      audio.className = "tone-take-audio";

      var download = document.createElement("a");
      download.href = take.url;
      download.download = take.name + take.extension;
      download.className = "tone-mini-btn";
      download.textContent = "SAVE";

      row.appendChild(name);
      row.appendChild(audio);
      row.appendChild(download);
      takesEl.appendChild(row);
    });
  }

  function startRecording() {
    if (recording) return;
    var stream = window.ToneEngine.getRecorderStream();
    var mimeType = pickMimeType();
    mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType: mimeType }) : new MediaRecorder(stream);
    chunks = [];
    mediaRecorder.ondataavailable = function (e) {
      if (e.data && e.data.size) chunks.push(e.data);
    };
    mediaRecorder.onstop = function () {
      var type = mediaRecorder.mimeType || "audio/webm";
      var blob = new Blob(chunks, { type: type });
      var url = URL.createObjectURL(blob);
      takes.unshift({
        url: url,
        name: "tone-office-take-" + (takes.length + 1),
        extension: "." + (type.indexOf("ogg") !== -1 ? "ogg" : type.indexOf("mp4") !== -1 ? "m4a" : "webm"),
      });
      renderTakes();
    };
    mediaRecorder.start();
    recording = true;
    startTime = performance.now();
    updateTimer();
    timerInterval = window.setInterval(updateTimer, 200);
    if (recordBtn) {
      recordBtn.textContent = "STOP";
      recordBtn.classList.add("tone-is-active");
    }
  }

  function stopRecording() {
    if (!recording || !mediaRecorder) return;
    mediaRecorder.stop();
    recording = false;
    window.clearInterval(timerInterval);
    if (recordBtn) {
      recordBtn.textContent = "RECORD";
      recordBtn.classList.remove("tone-is-active");
    }
  }

  function buildWindow(container) {
    if (!window.MediaRecorder) {
      var unsupported = document.createElement("p");
      unsupported.className = "tone-hint";
      unsupported.textContent = "Recording isn't supported in this browser.";
      container.appendChild(unsupported);
      return;
    }

    var controls = document.createElement("div");
    controls.className = "tone-recorder-controls";

    recordBtn = document.createElement("button");
    recordBtn.type = "button";
    recordBtn.className = "tone-toggle-btn tone-record-btn";
    recordBtn.textContent = recording ? "STOP" : "RECORD";
    if (recording) recordBtn.classList.add("tone-is-active");
    recordBtn.addEventListener("click", function () {
      window.ToneEngine.init();
      if (recording) stopRecording();
      else startRecording();
    });

    timerEl = document.createElement("span");
    timerEl.className = "tone-record-timer";
    timerEl.textContent = "00:00";

    controls.appendChild(recordBtn);
    controls.appendChild(timerEl);
    container.appendChild(controls);

    var hint = document.createElement("p");
    hint.className = "tone-hint";
    hint.textContent = "Captures everything playing through the master output — sequencer, synth, sampler, DJ decks — live, as you hear it.";
    container.appendChild(hint);

    takesEl = document.createElement("div");
    takesEl.className = "tone-takes";
    container.appendChild(takesEl);
    renderTakes();

    return function cleanup() {
      takesEl = null;
      recordBtn = null;
      timerEl = null;
    };
  }

  window.ToneRecorder = { buildWindow: buildWindow };
})();
