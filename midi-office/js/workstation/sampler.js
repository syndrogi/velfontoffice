/**
 * MIDI OFFICE — EP-133 Workstation — Sampler
 * Owns every sound's data (buffer + parameters) and is the only
 * module that actually builds a playback voice — sequencer.js and
 * keys-mode.js both call triggerPad()/triggerNote() here rather than
 * touching AudioBufferSourceNode themselves, so there's one place
 * "how does a sound actually play" lives.
 *
 * No EP-133 factory samples are included or extracted — new projects
 * start with a small set of generated demo sounds (synthesized here,
 * not sampled from anywhere) so the instrument isn't silent on first
 * load; everything else is user-imported via file picker or drag/drop.
 */
(function () {
  var soundsById = {};
  var nextId = 1;
  var waveformCache = {};

  function reuseDecode(file) {
    // Reuses the existing midi-office decode helper (js/audio-engine.js,
    // the module the original Sequencer/Synth/DJ features already use)
    // instead of duplicating FileReader/decodeAudioData plumbing.
    return window.ToneEngine.decodeFile(file);
  }

  function createSound(overrides) {
    var id = "snd_" + (nextId++);
    var sound = Object.assign({
      id: id,
      name: "EMPTY",
      blobId: null,
      buffer: null,
      trimStart: 0,
      trimEnd: 1,
      pitch: 0,
      gain: 1,
      pan: 0,
      playMode: "oneshot", // oneshot | key | legato
      attack: 2,
      release: 80,
      reverse: false,
      timeMode: "free", // free | bpm | bar
      timeValue: 120,
      midiChannel: 1,
      rootNote: 60,
      muteGroupId: -1,
      chop: null, // { slices: [{start, end}, ...] } fractions of trimmed region
    }, overrides || {});
    soundsById[id] = sound;
    return sound;
  }

  function getSound(id) {
    return soundsById[id] || null;
  }

  function assignEmptySound(letter, padIndex) {
    var sound = createSound({ name: "PAD " + (padIndex + 1) });
    window.WorkstationGroups.setPadSound(letter, padIndex, sound.id);
    return sound;
  }

  function ensurePadSound(letter, padIndex) {
    var existingId = window.WorkstationGroups.getPadSound(letter, padIndex);
    if (existingId && soundsById[existingId]) return soundsById[existingId];
    return assignEmptySound(letter, padIndex);
  }

  /* ---------- Loading ---------- */

  function loadFileToPad(letter, padIndex, file) {
    var sound = ensurePadSound(letter, padIndex);
    return reuseDecode(file).then(function (buffer) {
      sound.buffer = buffer;
      sound.name = file.name.replace(/\.[^.]+$/, "").slice(0, 16).toUpperCase();
      sound.trimStart = 0;
      sound.trimEnd = 1;
      sound.chop = null;
      delete waveformCache[sound.id];
      return sound;
    });
  }

  function loadBufferToPad(letter, padIndex, buffer, name) {
    var sound = ensurePadSound(letter, padIndex);
    sound.buffer = buffer;
    sound.name = (name || "SAMPLE").slice(0, 16).toUpperCase();
    sound.trimStart = 0;
    sound.trimEnd = 1;
    delete waveformCache[sound.id];
    return sound;
  }

  /* ---------- Generated demo kit (NOT EP-133 factory samples) ---------- */

  function renderDemo(type) {
    var ctx = window.ToneEngine.init();
    var OfflineCtor = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    var duration = type === "tone" ? 0.6 : 0.35;
    var offline = new OfflineCtor(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);

    if (type === "kick") {
      var osc = offline.createOscillator();
      var gain = offline.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, 0);
      osc.frequency.exponentialRampToValueAtTime(42, 0.11);
      gain.gain.setValueAtTime(1, 0);
      gain.gain.exponentialRampToValueAtTime(0.001, 0.3);
      osc.connect(gain);
      gain.connect(offline.destination);
      osc.start(0);
      osc.stop(0.3);
    } else if (type === "snare" || type === "hat" || type === "clap") {
      var bufferSize = offline.length;
      var noiseBuffer = offline.createBuffer(1, bufferSize, offline.sampleRate);
      var data = noiseBuffer.getChannelData(0);
      for (var i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      var noise = offline.createBufferSource();
      noise.buffer = noiseBuffer;
      var filter = offline.createBiquadFilter();
      filter.type = type === "hat" ? "highpass" : "bandpass";
      filter.frequency.value = type === "hat" ? 7000 : 1600;
      var ngain = offline.createGain();
      ngain.gain.setValueAtTime(0.9, 0);
      ngain.gain.exponentialRampToValueAtTime(0.001, type === "hat" ? 0.08 : 0.25);
      noise.connect(filter);
      filter.connect(ngain);
      ngain.connect(offline.destination);
      noise.start(0);
    } else {
      var tone = offline.createOscillator();
      var tgain = offline.createGain();
      tone.type = "triangle";
      tone.frequency.value = 220;
      tgain.gain.setValueAtTime(0.6, 0);
      tgain.gain.exponentialRampToValueAtTime(0.001, duration);
      tone.connect(tgain);
      tgain.connect(offline.destination);
      tone.start(0);
    }

    return offline.startRendering();
  }

  var DEMO_KIT = ["kick", "snare", "hat", "clap", "tone"];

  function loadDemoKit(letter) {
    return Promise.all(DEMO_KIT.map(function (type, i) {
      return renderDemo(type).then(function (buffer) {
        return loadBufferToPad(letter, i, buffer, type);
      });
    }));
  }

  /* ---------- Playback ---------- */

  function buildEnvelope(ctx, gainNode, velocity, sound, startTime, stopTime) {
    var peak = Math.max(0.001, Math.min(1, sound.gain * velocity));
    var attackSec = Math.max(sound.attack / 1000, 0.001);
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(peak, startTime + attackSec);
    if (stopTime != null) {
      var releaseSec = Math.max(sound.release / 1000, 0.01);
      var releaseStart = Math.max(startTime + attackSec, stopTime);
      gainNode.gain.setValueAtTime(peak, releaseStart);
      gainNode.gain.linearRampToValueAtTime(0, releaseStart + releaseSec);
    }
  }

  var legatoVoiceByPad = {}; // "letter:pad" -> stop fn
  var voicesBySound = {}; // soundId -> [ {stop, padIndex, letter} ]

  function trimToOffsetDuration(sound) {
    var dur = sound.buffer.duration;
    var start = sound.trimStart * dur;
    var end = sound.trimEnd * dur;
    return { offset: start, duration: Math.max(0.01, end - start) };
  }

  function triggerSoundVoice(letter, padIndex, sound, velocity, time, requestedDurationSec, rootMidi, playedMidi) {
    if (!sound.buffer) return null;
    var ctx = window.WorkstationAudio.context();

    var key = letter + ":" + padIndex;
    if (sound.playMode === "legato" && legatoVoiceByPad[key]) {
      legatoVoiceByPad[key]();
      legatoVoiceByPad[key] = null;
    }

    var src = ctx.createBufferSource();
    src.buffer = sound.buffer;

    var semitoneShift = sound.pitch + ((playedMidi != null && rootMidi != null) ? (playedMidi - rootMidi) : 0);
    src.playbackRate.value = Math.pow(2, semitoneShift / 12);

    var gain = ctx.createGain();
    var pan = ctx.createStereoPanner();
    pan.pan.value = sound.pan;

    src.connect(gain);
    gain.connect(pan);
    pan.connect(window.WorkstationAudio.getGroupInput(letter));

    var trim = trimToOffsetDuration(sound);
    var playDuration = sound.playMode === "oneshot" ? trim.duration : Math.max(trim.duration, requestedDurationSec || trim.duration);

    var stopTime = sound.playMode === "oneshot" ? null : time + (requestedDurationSec || trim.duration);
    buildEnvelope(ctx, gain, velocity, sound, time, stopTime);

    var bufferToPlay = sound.reverse ? getReversedBuffer(sound) : sound.buffer;
    if (bufferToPlay !== sound.buffer) src.buffer = bufferToPlay;

    var actualOffset = sound.reverse ? (sound.buffer.duration - trim.offset - trim.duration) : trim.offset;
    src.start(time, Math.max(0, actualOffset), trim.duration);

    var stopped = false;
    function stop() {
      if (stopped) return;
      stopped = true;
      var now = ctx.currentTime;
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(0, now, 0.01);
        src.stop(now + 0.05);
      } catch (e) { /* already stopped */ }
    }

    var unregister = window.WorkstationAudio.registerVoice(stop);
    src.onended = function () {
      stopped = true;
      unregister();
      var list = voicesBySound[sound.id];
      if (list) {
        var idx = list.findIndex(function (v) { return v.stop === stop; });
        if (idx !== -1) list.splice(idx, 1);
      }
    };

    if (sound.playMode === "legato") legatoVoiceByPad[key] = stop;

    voicesBySound[sound.id] = voicesBySound[sound.id] || [];
    voicesBySound[sound.id].push({ stop: stop, padIndex: padIndex, letter: letter });

    return stop;
  }

  function triggerPad(letter, padIndex, soundId, velocity, time, durationSec) {
    var sound = soundsById[soundId];
    if (!sound) return null;
    return triggerSoundVoice(letter, padIndex, sound, velocity, time, durationSec, sound.rootNote, sound.rootNote);
  }

  // Used by keys-mode.js — same voice-building code, but with an
  // explicit played-MIDI-note so pitch shifts relative to the sound's
  // own root note.
  function triggerNote(letter, padIndex, soundId, playedMidi, velocity, time, durationSec) {
    var sound = soundsById[soundId];
    if (!sound) return null;
    return triggerSoundVoice(letter, padIndex, sound, velocity, time, durationSec, sound.rootNote, playedMidi);
  }

  function cutMuteGroup(letter, muteGroupIndex, exceptPadIndex) {
    var group = window.WorkstationGroups.getGroup(letter);
    var members = group.muteGroups[muteGroupIndex] || [];
    members.forEach(function (padIndex) {
      if (padIndex === exceptPadIndex) return;
      var soundId = group.soundIds[padIndex];
      var list = voicesBySound[soundId];
      if (!list) return;
      list.slice().forEach(function (v) { v.stop(); });
    });
  }

  var reversedCache = {};
  function getReversedBuffer(sound) {
    if (!sound.buffer) return null;
    var cacheKey = sound.id;
    if (reversedCache[cacheKey] && reversedCache[cacheKey].source === sound.buffer) return reversedCache[cacheKey].buffer;
    var ctx = window.WorkstationAudio.context();
    var src = sound.buffer;
    var rev = ctx.createBuffer(src.numberOfChannels, src.length, src.sampleRate);
    for (var ch = 0; ch < src.numberOfChannels; ch++) {
      var srcData = src.getChannelData(ch);
      var revData = rev.getChannelData(ch);
      for (var i = 0; i < srcData.length; i++) revData[i] = srcData[srcData.length - 1 - i];
    }
    reversedCache[cacheKey] = { source: sound.buffer, buffer: rev };
    return rev;
  }

  /* ---------- Parameter setters ---------- */

  function setParam(soundId, key, value) {
    var sound = soundsById[soundId];
    if (!sound) return;
    sound[key] = value;
    if (key === "reverse") delete reversedCache[soundId];
  }

  /* ---------- Waveform + chop ---------- */

  function getWaveformPeaks(soundId, numBuckets) {
    var sound = soundsById[soundId];
    if (!sound || !sound.buffer) return [];
    var cacheKey = soundId + ":" + numBuckets;
    if (waveformCache[cacheKey]) return waveformCache[cacheKey];
    var data = sound.buffer.getChannelData(0);
    var bucketSize = Math.max(1, Math.floor(data.length / numBuckets));
    var peaks = [];
    for (var i = 0; i < numBuckets; i++) {
      var start = i * bucketSize;
      var min = 0;
      var max = 0;
      for (var j = start; j < Math.min(start + bucketSize, data.length); j++) {
        if (data[j] > max) max = data[j];
        if (data[j] < min) min = data[j];
      }
      peaks.push([min, max]);
    }
    waveformCache[cacheKey] = peaks;
    return peaks;
  }

  function chopEqual(soundId, n) {
    var sound = soundsById[soundId];
    if (!sound || !sound.buffer) return;
    var slices = [];
    for (var i = 0; i < n; i++) {
      slices.push({ start: i / n, end: (i + 1) / n });
    }
    sound.chop = { slices: slices, mode: "equal" };
  }

  // Attack-mode chop: simple energy-based onset detection — walks a
  // short-window RMS envelope of the trimmed region and picks the N
  // tallest local peaks, spaced at least one window apart. A real,
  // working heuristic; not the EP-133's own (undocumented, DSP-level)
  // beat-tracking algorithm.
  function chopAttack(soundId, n) {
    var sound = soundsById[soundId];
    if (!sound || !sound.buffer) return;
    var data = sound.buffer.getChannelData(0);
    var windowSize = Math.floor(sound.buffer.sampleRate * 0.01);
    var envelope = [];
    for (var i = 0; i < data.length; i += windowSize) {
      var sum = 0;
      for (var j = i; j < Math.min(i + windowSize, data.length); j++) sum += data[j] * data[j];
      envelope.push({ index: i, rms: Math.sqrt(sum / windowSize) });
    }
    var sorted = envelope.slice().sort(function (a, b) { return b.rms - a.rms; });
    var picked = [];
    var minGap = Math.floor(envelope.length / (n * 2));
    for (var k = 0; k < sorted.length && picked.length < n; k++) {
      var candidate = sorted[k];
      var tooClose = picked.some(function (p) { return Math.abs(p.index - candidate.index) < minGap * windowSize; });
      if (!tooClose) picked.push(candidate);
    }
    picked.sort(function (a, b) { return a.index - b.index; });
    var boundaries = picked.map(function (p) { return p.index / data.length; });
    boundaries.push(1);
    var slices = [];
    for (var s = 0; s < boundaries.length - 1; s++) {
      slices.push({ start: boundaries[s], end: boundaries[s + 1] });
    }
    sound.chop = { slices: slices, mode: "attack" };
  }

  function playChopSlice(letter, padIndex, soundId, sliceIndex, velocity, time) {
    var sound = soundsById[soundId];
    if (!sound || !sound.chop || !sound.chop.slices[sliceIndex]) return;
    var slice = sound.chop.slices[sliceIndex];
    var tempSound = Object.assign({}, sound, { trimStart: slice.start, trimEnd: slice.end, playMode: "oneshot" });
    return triggerSoundVoice(letter, padIndex, tempSound, velocity, time, null, sound.rootNote, sound.rootNote);
  }

  /* ---------- Mic sampling ---------- */

  var micStream = null;
  var activeRecorders = {}; // "letter:pad" -> MediaRecorder

  function getMicStream() {
    if (micStream) return Promise.resolve(micStream);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Promise.reject(new Error("getUserMedia unavailable"));
    }
    return navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      micStream = stream;
      return stream;
    });
  }

  function startRecordingToPad(letter, padIndex) {
    var key = letter + ":" + padIndex;
    if (activeRecorders[key]) return Promise.resolve();
    return getMicStream().then(function (stream) {
      var recorder = new MediaRecorder(stream);
      var chunks = [];
      recorder.ondataavailable = function (e) {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.onstop = function () {
        var blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        blob.arrayBuffer().then(function (ab) {
          return window.ToneEngine.init().decodeAudioData(ab);
        }).then(function (buffer) {
          loadBufferToPad(letter, padIndex, buffer, "REC " + (padIndex + 1));
        }).catch(function () { /* decode failed — pad stays as it was */ });
        delete activeRecorders[key];
      };
      recorder.start();
      activeRecorders[key] = recorder;
    }).catch(function (err) {
      // Graceful degradation — no mic permission/device. Caller (ui.js)
      // surfaces this via the display; sampling from file import still
      // works regardless.
      return Promise.reject(err);
    });
  }

  function stopRecordingToPad(letter, padIndex) {
    var key = letter + ":" + padIndex;
    var recorder = activeRecorders[key];
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  /* ---------- Persistence bridge (projects.js calls these) ---------- */

  function serializeSounds(projectId) {
    var promises = [];
    window.WorkstationGroups.LETTERS.forEach(function (letter) {
      var group = window.WorkstationGroups.getGroup(letter);
      group.soundIds.forEach(function (soundId) {
        if (!soundId || !soundsById[soundId]) return;
        var sound = soundsById[soundId];
        var p;
        if (sound.buffer && !sound._blobSaved) {
          p = bufferToWavBlob(sound.buffer).then(function (blob) {
            return blob.arrayBuffer();
          }).then(function (ab) {
            var blobId = "blob_" + sound.id;
            return window.WorkstationStorage.put("blobs", { id: blobId, data: ab }).then(function () {
              sound.blobId = blobId;
              sound._blobSaved = true;
            });
          });
        } else {
          p = Promise.resolve();
        }
        promises.push(p.then(function () {
          return window.WorkstationStorage.put("sounds", Object.assign({ projectId: projectId, groupLetter: letter }, stripRuntimeFields(sound)));
        }));
      });
    });
    return promises;
  }

  function stripRuntimeFields(sound) {
    var copy = Object.assign({}, sound);
    delete copy.buffer;
    return copy;
  }

  function restoreSounds(records) {
    return Promise.all(records.map(function (record) {
      var sound = createSound(record);
      soundsById[sound.id] = sound;
      window.WorkstationGroups.setPadSound(record.groupLetter, record.padIndex, sound.id);
      if (!record.blobId) return Promise.resolve();
      return window.WorkstationStorage.get("blobs", record.blobId).then(function (blobRecord) {
        if (!blobRecord) return;
        return window.ToneEngine.init().decodeAudioData(blobRecord.data.slice(0)).then(function (buffer) {
          sound.buffer = buffer;
          sound._blobSaved = true;
        });
      }).catch(function () { /* corrupt/missing blob — sound stays empty */ });
    }));
  }

  // Minimal PCM WAV encoder — used only so saved sounds survive a
  // page reload as plain, dependency-free binary data in IndexedDB.
  function bufferToWavBlob(buffer) {
    return new Promise(function (resolve) {
      var numChannels = buffer.numberOfChannels;
      var sampleRate = buffer.sampleRate;
      var length = buffer.length * numChannels * 2 + 44;
      var out = new ArrayBuffer(length);
      var view = new DataView(out);

      function writeString(offset, str) {
        for (var i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
      }

      writeString(0, "RIFF");
      view.setUint32(4, length - 8, true);
      writeString(8, "WAVE");
      writeString(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numChannels * 2, true);
      view.setUint16(32, numChannels * 2, true);
      view.setUint16(34, 16, true);
      writeString(36, "data");
      view.setUint32(40, length - 44, true);

      var offset = 44;
      var channelData = [];
      for (var c = 0; c < numChannels; c++) channelData.push(buffer.getChannelData(c));
      for (var i = 0; i < buffer.length; i++) {
        for (var ch = 0; ch < numChannels; ch++) {
          var sample = Math.max(-1, Math.min(1, channelData[ch][i]));
          view.setInt16(offset, sample * 0x7fff, true);
          offset += 2;
        }
      }
      resolve(new Blob([out], { type: "audio/wav" }));
    });
  }

  window.WorkstationSampler = {
    createSound: createSound,
    getSound: getSound,
    assignEmptySound: assignEmptySound,
    ensurePadSound: ensurePadSound,
    loadFileToPad: loadFileToPad,
    loadBufferToPad: loadBufferToPad,
    loadDemoKit: loadDemoKit,
    triggerPad: triggerPad,
    triggerNote: triggerNote,
    cutMuteGroup: cutMuteGroup,
    setParam: setParam,
    getWaveformPeaks: getWaveformPeaks,
    chopEqual: chopEqual,
    chopAttack: chopAttack,
    playChopSlice: playChopSlice,
    startRecordingToPad: startRecordingToPad,
    stopRecordingToPad: stopRecordingToPad,
    serializeSounds: serializeSounds,
    restoreSounds: restoreSounds,
  };
})();
