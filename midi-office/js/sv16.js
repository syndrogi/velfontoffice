/**
 * MIDI OFFICE — SV-16 (score visualizer, 16 steps)
 * Loads an audio or video file (nothing uploads anywhere) and plays it
 * against a 9:16 board of sequencer pixels, piano roll, scopes, polar
 * spectrum and beat frame, which can be saved as a video or a PNG.
 * Analysis, demo content, drawing and the colour palette live in
 * js/sv16/; this file owns the window, playback and saving.
 *
 * Playback goes through the shared master bus, so MASTER volume and the
 * RECORDER module both hear it. Saved videos tap the track directly
 * instead, so they carry this file alone at full level, whatever else
 * is playing. All state belongs to the open window — closing it stops
 * playback and discards the loaded file.
 */
(function () {
  const { analyze } = window.ToneSv16Analysis;
  const { makeDemo, makeDemoImage } = window.ToneSv16Demo;
  const { createRenderer, formatTime, WIDTH, HEIGHT } = window.ToneSv16Renderer;
  const { buildPaletteControls } = window.ToneSv16Palette;

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
  const DEMO_START_SECONDS = 14.6; // opens on a busy moment of the demo
  const END_TOLERANCE_SECONDS = 0.05;
  const VIDEO_DRIFT_LIMIT_SECONDS = 0.25;
  const VIDEO_READY_STATE = 2; // HAVE_CURRENT_DATA
  const RECORD_FPS = 30;
  const RECORD_BITRATE = 10e6;
  const RECORD_TIMESLICE_MS = 500;
  const RECORD_TAIL_MS = 250;
  const SEEK_STEPS = 1000;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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
    return (
      name
        .replace(/[\\/:*?"<>|]+/g, "")
        .trim()
        .slice(0, 60) || "sv-16"
    );
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
    const label = createElement("label", "tone-sv16-key tone-file-label", text);
    label.htmlFor = id;
    return { input, label };
  }

  // One lettered module of the control plate: A INPUT, B COLOR, ...
  function createSection(rail, letter, title) {
    const section = createElement("section", "tone-sv16-mod");
    const head = createElement("div", "tone-sv16-mod-head");
    head.append(createElement("span", "tone-sv16-mod-key", letter), title);
    section.appendChild(head);
    rail.appendChild(section);
    return section;
  }

  function buildInputControls(rail) {
    const section = createSection(rail, "A", "INPUT");
    const row = createElement("div", "tone-sv16-row");
    const media = createFilePicker("toneSv16Media", "audio/*,video/*", "+ AUDIO / VIDEO");
    const image = createFilePicker("toneSv16Image", "image/*", "+ IMAGE");
    row.append(media.input, media.label, image.input, image.label);

    const nameLabel = createElement("label", "tone-sv16-field");
    nameLabel.appendChild(createElement("span", "", "TITLE"));
    const nameInput = createElement("input");
    nameInput.type = "text";
    nameInput.maxLength = 40;
    nameInput.autocomplete = "off";
    nameInput.value = DEMO_TRACK_NAME;
    nameLabel.appendChild(nameInput);

    const zoomLabel = createElement("label", "tone-sv16-check");
    const zoomInput = createElement("input");
    zoomInput.type = "checkbox";
    zoomInput.checked = true;
    zoomLabel.append(zoomInput, "ZOOM CUTS ON THE BEAT");

    section.append(row, nameLabel, zoomLabel);
    return { mediaInput: media.input, imageInput: image.input, nameInput, zoomInput };
  }

  function buildTransportControls(rail) {
    const section = createSection(rail, "C", "TRANSPORT");
    const row = createElement("div", "tone-sv16-transport");
    const playBtn = createButton("tone-sv16-key tone-sv16-key-dark", "▶");
    playBtn.setAttribute("aria-label", "Play");
    const stopBtn = createButton("tone-sv16-key", "■");
    stopBtn.setAttribute("aria-label", "Back to start");
    const seekInput = createElement("input", "tone-sv16-seek");
    seekInput.type = "range";
    seekInput.min = "0";
    seekInput.max = String(SEEK_STEPS);
    seekInput.value = "0";
    seekInput.setAttribute("aria-label", "Position");
    row.append(playBtn, stopBtn, seekInput);

    const readout = createElement("div", "tone-sv16-readout");
    const timeEl = createElement("span", "", "0:00 / 0:00");
    const metaEl = createElement("span", "", "LOADING");
    readout.append(timeEl, metaEl);

    section.append(row, readout);
    return { playBtn, stopBtn, seekInput, timeEl, metaEl };
  }

  function buildExportControls(rail) {
    const section = createSection(rail, "D", "EXPORT");
    const row = createElement("div", "tone-sv16-row");
    const recordBtn = createButton("tone-sv16-key tone-sv16-key-rec", "● REC VIDEO");
    const snapshotBtn = createButton("tone-sv16-key", "PNG");
    row.append(recordBtn, snapshotBtn);

    const hint = createElement(
      "p",
      "tone-hint",
      "REC VIDEO records in real time from start to end. Keep this tab open while it runs.",
    );
    const statusEl = createElement("p", "tone-sampler-status tone-sv16-status");
    statusEl.setAttribute("aria-live", "polite");

    section.append(row, hint, statusEl);
    return { recordBtn, snapshotBtn, statusEl };
  }

  function buildLayout(container, onColors) {
    const root = createElement("div", "tone-sv16");
    const rail = createElement("div", "tone-sv16-rail");
    const stage = createElement("div", "tone-sv16-stage");

    const canvas = createElement("canvas", "tone-sv16-board");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Music visualization board");

    const video = createElement("video", "tone-sv16-video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    const input = buildInputControls(rail);
    const palette = buildPaletteControls(createSection(rail, "B", "COLOR"), onColors);
    const controls = {
      ...input,
      ...buildTransportControls(rail),
      ...buildExportControls(rail),
    };

    stage.append(canvas, video);
    root.append(stage, rail);
    container.appendChild(root);
    return { root, canvas, video, palette, ...controls };
  }

  function buildWindow(container) {
    let colors = null;
    let analysis = null;
    let buffer = null;
    let trackName = DEMO_TRACK_NAME;
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

    const ui = buildLayout(container, applyColors);
    const renderer = createRenderer(ui.canvas);
    const ctx = window.ToneEngine.init();
    const videoTap = ctx.createMediaStreamDestination();
    applyColors(ui.palette.colors());

    function applyColors(next) {
      colors = next;
      if (ui) ui.canvas.style.backgroundColor = colors.C.bg;
      if (demoImage) demoImage = makeDemoImage(colors);
      dirty = true;
    }

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
      ui.playBtn.textContent = playing ? "❚❚" : "▶";
      ui.playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
      ui.stopBtn.disabled = !ready || !!recorder;
      ui.recordBtn.disabled = !ready && !recorder;
      ui.recordBtn.textContent = recorder ? "■ STOP REC" : "● REC VIDEO";
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
      if (
        hasVideo &&
        playing &&
        Math.abs(ui.video.currentTime - time) > VIDEO_DRIFT_LIMIT_SECONDS
      ) {
        seekVideo(time);
      }
      dirty = false;
      if (!analysis) return;
      renderer.draw(time, { an: analysis, colors, media: currentMedia(), zoomCuts, trackName });
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
        known,
      );
      if (closed) return;
      buffer = decoded;
      analysis = result;
      offset = 0;
      busy = false;
      setStatus("");
      ui.metaEl.textContent =
        label + " / " + Math.round(result.bpm) + " BPM / " + result.notes.length + " NOTES";
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
          true,
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
      ui.stopBtn.addEventListener("click", () => {
        pause();
        seekTo(0);
      });
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
      demoImage = makeDemoImage(colors);
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

  window.ToneSv16 = { buildWindow };
})();
