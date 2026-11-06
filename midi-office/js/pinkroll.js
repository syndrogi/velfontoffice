/**
 * MIDI OFFICE — Pinkroll
 * Loads an audio or video file (nothing uploads anywhere) and plays it
 * against a 9:16 board of piano roll, spectrum and beat ring, which can
 * be saved as a video or a PNG. Analysis, demo content and drawing live
 * in js/pinkroll/; this file owns the window, playback and saving.
 *
 * Playback goes through the shared master bus, so MASTER volume and the
 * RECORDER module both hear it. Saved videos tap the track directly
 * instead, so they carry this file alone at full level, whatever else
 * is playing. All state belongs to the open window — closing it stops
 * playback and discards the loaded file.
 */
(function () {
  const { analyze } = window.TonePinkrollAnalysis;
  const { makeDemo, makeDemoImage } = window.TonePinkrollDemo;
  const { createRenderer, formatTime, WIDTH, HEIGHT } = window.TonePinkrollRenderer;

  const ACCENTS = [
    { name: "Pink", hex: "#E8336F" },
    { name: "Coral", hex: "#EE5A2F" },
    { name: "Blue", hex: "#2F5BEA" },
    { name: "Violet", hex: "#7A3FF0" },
    { name: "Green", hex: "#13915F" },
  ];
  const VIDEO_TYPES = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  const VIDEO_FILE_PATTERN = /\.(mp4|mov|m4v|webm)$/i;
  const MEDIA_FILE_PATTERN = /\.(mp3|wav|m4a|aac|flac|ogg|mp4|mov|m4v|webm)$/i;
  const DEMO_TRACK_NAME = "Demo Track";
  const DEMO_START_SECONDS = 5.2; // opens on a busy moment of the demo
  const END_TOLERANCE_SECONDS = 0.05;
  const VIDEO_DRIFT_LIMIT_SECONDS = 0.25;
  const VIDEO_READY_STATE = 2; // HAVE_CURRENT_DATA
  const RECORD_FPS = 30;
  const RECORD_BITRATE = 8e6;
  const RECORD_TIMESLICE_MS = 500;
  const RECORD_TAIL_MS = 250;
  const SEEK_STEPS = 1000;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function mixColor(from, to, amount) {
    const a = hexToRgb(from);
    const b = hexToRgb(to);
    return "rgb(" + a.map((v, i) => Math.round(v + (b[i] - v) * amount)).join(",") + ")";
  }

  function createAccent(hex) {
    return {
      main: hex,
      soft: mixColor(hex, "#ffffff", 0.5),
      pale: mixColor(hex, "#ffffff", 0.78),
      deep: mixColor(hex, "#000000", 0.3),
    };
  }

  function pickVideoType() {
    return VIDEO_TYPES.find((type) => window.MediaRecorder.isTypeSupported(type)) || "";
  }

  function isVideoFile(file) {
    return (file.type || "").startsWith("video") || VIDEO_FILE_PATTERN.test(file.name);
  }

  function isMediaFile(file) {
    return /^(audio|video)\//.test(file.type) || MEDIA_FILE_PATTERN.test(file.name);
  }

  function safeFileName(name) {
    return name.replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 60) || "pinkroll";
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function createElement(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }

  function createButton(className, text) {
    const button = createElement("button", className, text);
    button.type = "button";
    return button;
  }

  function createFilePicker(id, accept, text) {
    const input = createElement("input", "tone-file-input");
    input.type = "file";
    input.id = id;
    input.accept = accept;
    const label = createElement("label", "tone-mini-btn tone-file-label", text);
    label.htmlFor = id;
    return { input, label };
  }

  function createField(labelText, inputId) {
    const field = createElement("div", "tone-field");
    const label = createElement(inputId ? "label" : "span", "tone-pinkroll-label", labelText);
    if (inputId) label.htmlFor = inputId;
    field.appendChild(label);
    return field;
  }

  function buildSourceControls(rail) {
    const row = createElement("div", "tone-sampler-load");
    const media = createFilePicker("tonePinkrollMedia", "audio/*,video/*", "LOAD AUDIO / VIDEO");
    const image = createFilePicker("tonePinkrollImage", "image/*", "LOAD IMAGE");
    row.append(media.input, media.label, image.input, image.label);

    const zoomLabel = createElement("label", "tone-pinkroll-check");
    const zoomInput = createElement("input");
    zoomInput.type = "checkbox";
    zoomInput.checked = true;
    zoomLabel.append(zoomInput, "ZOOM CUTS ON THE BEAT");

    rail.append(row, zoomLabel);
    return { mediaInput: media.input, imageInput: image.input, zoomInput };
  }

  function buildStyleControls(rail) {
    const nameField = createField("TRACK NAME", "tonePinkrollName");
    const nameInput = createElement("input", "tone-pinkroll-name");
    nameInput.type = "text";
    nameInput.id = "tonePinkrollName";
    nameInput.maxLength = 40;
    nameInput.autocomplete = "off";
    nameInput.value = DEMO_TRACK_NAME;
    nameField.appendChild(nameInput);

    const accentField = createField("ACCENT");
    const swatchRow = createElement("div", "tone-pinkroll-swatches");
    const swatches = ACCENTS.map((accent, index) => {
      const swatch = createButton("tone-pinkroll-swatch");
      swatch.style.backgroundColor = accent.hex;
      swatch.dataset.hex = accent.hex;
      swatch.setAttribute("aria-label", accent.name);
      swatch.setAttribute("aria-pressed", String(index === 0));
      swatchRow.appendChild(swatch);
      return swatch;
    });
    accentField.appendChild(swatchRow);

    rail.append(nameField, accentField);
    return { nameInput, swatches };
  }

  function buildPlaybackControls(rail) {
    const row = createElement("div", "tone-pinkroll-row");
    const playBtn = createButton("tone-toggle-btn", "PLAY");
    const timeEl = createElement("span", "tone-sampler-status", "0:00 / 0:00");
    row.append(playBtn, timeEl);

    const seekField = createField("POSITION", "tonePinkrollSeek");
    const seekInput = createElement("input");
    seekInput.type = "range";
    seekInput.id = "tonePinkrollSeek";
    seekInput.min = "0";
    seekInput.max = String(SEEK_STEPS);
    seekInput.value = "0";
    seekField.appendChild(seekInput);

    const metaEl = createElement("span", "tone-hint", "Loading…");

    rail.append(row, seekField, metaEl);
    return { playBtn, timeEl, seekInput, metaEl };
  }

  function buildSaveControls(rail) {
    const row = createElement("div", "tone-pinkroll-row");
    const recordBtn = createButton("tone-toggle-btn", "SAVE VIDEO");
    const snapshotBtn = createButton("tone-toggle-btn", "SAVE PNG");
    row.append(recordBtn, snapshotBtn);

    const hint = createElement(
      "p",
      "tone-hint",
      "SAVE VIDEO records in real time from start to end. Keep this tab open while it runs."
    );
    const statusEl = createElement("p", "tone-sampler-status tone-pinkroll-status");
    statusEl.setAttribute("aria-live", "polite");

    rail.append(row, hint, statusEl);
    return { recordBtn, snapshotBtn, statusEl };
  }

  function buildLayout(container) {
    const root = createElement("div", "tone-pinkroll");
    const rail = createElement("div", "tone-pinkroll-rail");
    const stage = createElement("div", "tone-pinkroll-stage");

    const canvas = createElement("canvas", "tone-pinkroll-board");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Music visualization board");

    const video = createElement("video", "tone-pinkroll-video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    const controls = {
      ...buildSourceControls(rail),
      ...buildStyleControls(rail),
      ...buildPlaybackControls(rail),
      ...buildSaveControls(rail),
    };

    stage.append(canvas, video);
    root.append(rail, stage);
    container.appendChild(root);
    return { root, canvas, video, ...controls };
  }

  function buildWindow(container) {
    const ui = buildLayout(container);
    const renderer = createRenderer(ui.canvas);
    const ctx = window.ToneEngine.init();
    const videoTap = ctx.createMediaStreamDestination();

    let analysis = null;
    let buffer = null;
    let trackName = DEMO_TRACK_NAME;
    let accent = createAccent(ACCENTS[0].hex);
    let zoomCuts = true;
    let demoImage = null;
    let userImage = null;
    let videoUrl = null;
    let hasVideo = false;
    let source = null;
    let playing = false;
    let startedAt = 0;
    let offset = 0;
    let recorder = null;
    let busy = false;
    let seeking = false;
    let dirty = true;
    let hidden = false;
    let closed = false;
    let frameId = 0;

    function currentTime() {
      if (!analysis) return 0;
      if (!playing) return offset;
      return Math.min(analysis.dur, ctx.currentTime - startedAt + offset);
    }

    function currentMedia() {
      if (userImage) {
        return { source: userImage, width: userImage.width, height: userImage.height };
      }
      if (hasVideo && ui.video.readyState >= VIDEO_READY_STATE && ui.video.videoWidth) {
        return { source: ui.video, width: ui.video.videoWidth, height: ui.video.videoHeight };
      }
      if (demoImage) {
        return { source: demoImage, width: demoImage.width, height: demoImage.height };
      }
      return null;
    }

    function setStatus(message, isError) {
      ui.statusEl.textContent = message;
      ui.statusEl.classList.toggle("tone-is-error", !!isError);
    }

    function updateControls() {
      const ready = !!analysis && !busy;
      ui.playBtn.disabled = !ready || !!recorder;
      ui.playBtn.textContent = playing ? "PAUSE" : "PLAY";
      ui.playBtn.classList.toggle("tone-is-active", playing);
      ui.recordBtn.disabled = !ready && !recorder;
      ui.recordBtn.textContent = recorder ? "STOP RECORDING" : "SAVE VIDEO";
      ui.recordBtn.classList.toggle("tone-is-active", !!recorder);
      ui.snapshotBtn.disabled = !ready || !!recorder;
      ui.seekInput.disabled = !ready || !!recorder;
    }

    function seekVideo(time) {
      if (hasVideo) ui.video.currentTime = time;
    }

    function handleTrackEnd(endedSource) {
      if (source !== endedSource || !playing) return;
      playing = false;
      offset = analysis.dur;
      source = null;
      if (hasVideo) ui.video.pause();
      dirty = true;
      updateControls();
      if (recorder) setTimeout(stopRecording, RECORD_TAIL_MS);
    }

    function play() {
      if (!buffer || busy || playing) return;
      ctx.resume();
      if (offset >= analysis.dur - END_TOLERANCE_SECONDS) offset = 0;
      const node = ctx.createBufferSource();
      node.buffer = buffer;
      window.ToneEngine.connectDry(node);
      node.connect(videoTap);
      node.onended = () => handleTrackEnd(node);
      source = node;
      startedAt = ctx.currentTime;
      node.start(0, offset);
      playing = true;
      if (hasVideo) {
        seekVideo(offset);
        ui.video.play().catch((error) => setStatus("Video preview paused: " + error.message));
      }
      updateControls();
    }

    function pause() {
      if (!playing) return;
      offset = currentTime();
      playing = false;
      const node = source;
      source = null;
      node.stop();
      node.disconnect();
      if (hasVideo) ui.video.pause();
      dirty = true;
      updateControls();
    }

    function seekTo(time) {
      if (!analysis) return;
      const wasPlaying = playing;
      pause();
      offset = clamp(time, 0, analysis.dur);
      seekVideo(offset);
      dirty = true;
      if (wasPlaying) play();
      updateControls();
    }

    function renderFrame() {
      const time = currentTime();
      if (hasVideo && playing && Math.abs(ui.video.currentTime - time) > VIDEO_DRIFT_LIMIT_SECONDS) {
        seekVideo(time);
      }
      renderer.draw(time, { an: analysis, accent, media: currentMedia(), zoomCuts, trackName });
      dirty = false;
      if (!analysis) return;
      ui.timeEl.textContent = formatTime(time) + " / " + formatTime(analysis.dur);
      if (!seeking) ui.seekInput.value = String(Math.round((time / analysis.dur) * SEEK_STEPS));
    }

    // A minimized window skips drawing unless it's mid-recording — the
    // saved video is captured straight off this canvas.
    function loop() {
      if ((playing || dirty) && (!hidden || recorder)) renderFrame();
      frameId = requestAnimationFrame(loop);
    }

    async function loadBuffer(decoded, known, label) {
      busy = true;
      updateControls();
      const result = await analyze(
        decoded,
        (progress) => setStatus("Analyzing… " + Math.round(progress * 100) + "%"),
        known
      );
      if (closed) return;
      buffer = decoded;
      analysis = result;
      offset = 0;
      busy = false;
      setStatus("");
      ui.metaEl.textContent =
        label + " · " + Math.round(result.bpm) + " BPM · " + result.notes.length + " NOTES";
      dirty = true;
      updateControls();
    }

    function replaceVideo(file) {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      videoUrl = null;
      hasVideo = false;
      ui.video.removeAttribute("src");
      ui.video.load();
      if (!isVideoFile(file)) return;
      videoUrl = URL.createObjectURL(file);
      ui.video.src = videoUrl;
      hasVideo = true;
    }

    async function loadMedia(file) {
      if (busy || recorder) return;
      pause();
      setStatus("Reading file…");
      let decoded;
      try {
        decoded = await window.ToneEngine.decodeFile(file);
      } catch (error) {
        setStatus(
          isVideoFile(file)
            ? "Couldn't read sound from this video. Try an MP4 with an audio track."
            : "Couldn't read this file. Try an MP3, WAV or M4A.",
          true
        );
        return;
      }
      if (closed) return;
      replaceVideo(file);
      trackName = file.name.replace(/\.[^.]+$/, "");
      ui.nameInput.value = trackName;
      await loadBuffer(decoded, null, hasVideo ? "VIDEO" : "AUDIO");
    }

    async function loadImage(file) {
      try {
        userImage = await createImageBitmap(file);
        dirty = true;
        setStatus("Image added.");
      } catch (error) {
        setStatus("Couldn't open this image. Try a JPG or PNG.", true);
      }
    }

    function createRecorder(type) {
      const stream = new MediaStream([
        ...ui.canvas.captureStream(RECORD_FPS).getVideoTracks(),
        ...videoTap.stream.getAudioTracks(),
      ]);
      const options = { videoBitsPerSecond: RECORD_BITRATE };
      if (type) options.mimeType = type;
      return new MediaRecorder(stream, options);
    }

    function finishRecording(chunks, type) {
      const blob = new Blob(chunks, { type: type || "video/webm" });
      const extension = type.includes("mp4") ? "mp4" : "webm";
      recorder = null;
      updateControls();
      downloadBlob(blob, safeFileName(trackName) + "." + extension);
      setStatus("Video saved.");
    }

    function startRecording() {
      if (!analysis || busy) return;
      if (!window.MediaRecorder || !ui.canvas.captureStream) {
        setStatus("This browser can't record video. Try Chrome.", true);
        return;
      }
      const type = pickVideoType();
      const chunks = [];
      try {
        recorder = createRecorder(type);
      } catch (error) {
        recorder = null;
        setStatus("Couldn't start recording: " + error.message, true);
        return;
      }
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => finishRecording(chunks, type);
      pause();
      offset = 0;
      seekVideo(0);
      renderFrame();
      recorder.start(RECORD_TIMESLICE_MS);
      setStatus("Recording… stops by itself at the end of the track.");
      play();
      updateControls();
    }

    function stopRecording() {
      if (recorder && recorder.state !== "inactive") recorder.stop();
      pause();
      updateControls();
    }

    function saveSnapshot() {
      renderFrame();
      ui.canvas.toBlob((blob) => {
        if (!blob) {
          setStatus("Couldn't create the PNG.", true);
          return;
        }
        downloadBlob(blob, safeFileName(trackName) + ".png");
        setStatus("PNG saved.");
      }, "image/png");
    }

    function selectAccent(swatch) {
      ui.swatches.forEach((other) => {
        other.setAttribute("aria-pressed", String(other === swatch));
      });
      accent = createAccent(swatch.dataset.hex);
      if (demoImage) demoImage = makeDemoImage(accent);
      dirty = true;
    }

    function handleDrop(event) {
      event.preventDefault();
      ui.root.classList.remove("tone-is-dropping");
      const files = [...event.dataTransfer.files];
      const media = files.find(isMediaFile);
      const image = files.find((file) => file.type.startsWith("image/"));
      if (media) loadMedia(media);
      if (image) loadImage(image);
    }

    function handleSeekPreview() {
      if (!analysis) return;
      const time = (ui.seekInput.value / SEEK_STEPS) * analysis.dur;
      ui.timeEl.textContent = formatTime(time) + " / " + formatTime(analysis.dur);
      if (playing) return;
      offset = time;
      seekVideo(time);
      dirty = true;
    }

    function handleFilePick(event, load) {
      const file = event.target.files[0];
      event.target.value = "";
      if (file) load(file);
    }

    function wireEvents() {
      ui.playBtn.addEventListener("click", () => (playing ? pause() : play()));
      ui.recordBtn.addEventListener("click", () => (recorder ? stopRecording() : startRecording()));
      ui.snapshotBtn.addEventListener("click", saveSnapshot);
      ui.mediaInput.addEventListener("change", (event) => handleFilePick(event, loadMedia));
      ui.imageInput.addEventListener("change", (event) => handleFilePick(event, loadImage));
      ui.nameInput.addEventListener("input", () => {
        trackName = ui.nameInput.value || "Untitled";
        dirty = true;
      });
      ui.zoomInput.addEventListener("change", () => {
        zoomCuts = ui.zoomInput.checked;
        dirty = true;
      });
      ui.swatches.forEach((swatch) => {
        swatch.addEventListener("click", () => selectAccent(swatch));
      });
      ui.seekInput.addEventListener("pointerdown", () => {
        seeking = true;
      });
      ui.seekInput.addEventListener("input", handleSeekPreview);
      ui.seekInput.addEventListener("change", () => {
        seeking = false;
        if (analysis) seekTo((ui.seekInput.value / SEEK_STEPS) * analysis.dur);
      });
      ["seeked", "loadeddata", "loadedmetadata"].forEach((type) => {
        ui.video.addEventListener(type, () => {
          dirty = true;
        });
      });
      ui.root.addEventListener("dragover", (event) => {
        event.preventDefault();
        ui.root.classList.add("tone-is-dropping");
      });
      ui.root.addEventListener("dragleave", () => ui.root.classList.remove("tone-is-dropping"));
      ui.root.addEventListener("drop", handleDrop);
    }

    async function loadDemo() {
      await document.fonts.ready;
      if (closed) return;
      demoImage = makeDemoImage(accent);
      const demo = makeDemo();
      await loadBuffer(demo.buffer, demo.known, "DEMO");
      if (!closed) seekTo(DEMO_START_SECONDS);
    }

    function cleanup() {
      closed = true;
      cancelAnimationFrame(frameId);
      if (recorder) {
        recorder.onstop = null;
        if (recorder.state !== "inactive") recorder.stop();
        recorder = null;
      }
      pause();
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    }

    wireEvents();
    updateControls();
    frameId = requestAnimationFrame(loop);
    loadDemo().catch((error) => setStatus("Couldn't load the demo: " + error.message, true));

    return {
      cleanup,
      onHide: () => {
        hidden = true;
      },
      onShow: () => {
        hidden = false;
        dirty = true;
      },
    };
  }

  window.TonePinkroll = { buildWindow };
})();
