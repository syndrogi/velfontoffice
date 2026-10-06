/**
 * MIDI OFFICE — EP-133 Workstation — Projects
 * Top-level container: tempo/time signature, the 4 groups (via
 * groups.js), scenes (a named snapshot of which pattern each group
 * has active — EP-133's "commit" workflow), and song mode (an
 * ordered list of up to 99 positions, each referencing a scene).
 *
 * Persistence (storage.js/IndexedDB) is opt-in per action (saveProject/
 * loadProject), not automatic on every edit — matches the EP-133's own
 * model where nothing is written to the sample/project store until
 * you explicitly commit it, and keeps this module simple regardless
 * of whether storage.js's IndexedDB is actually available.
 */
(function () {
  var MAX_SONG_POSITIONS = 99;

  var current = null; // { id, name, createdAt, updatedAt, tempo, timeSigNum, timeSigDen, scenes: [], songPositions: [] }
  var changeListeners = [];

  function onChange(fn) {
    changeListeners.push(fn);
  }

  function notify() {
    changeListeners.forEach(function (fn) {
      try {
        fn(current);
      } catch (e) { /* listener errors shouldn't break project state */ }
    });
  }

  function newProject(name) {
    current = {
      id: "proj_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name || "UNTITLED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scenes: [],
      songPositions: [],
    };
    window.WorkstationGroups.resetAll();
    window.WorkstationTransport.setBpm(120);
    window.WorkstationTransport.setTimeSignature(4, 4);
    // Every pad is silent on a brand new project — correct (no EP-133
    // factory samples to fall back on), but pressing pad keys with
    // nothing loaded anywhere is a confusing first impression. Auto-
    // loading the generated (not sampled) demo kit into Group A only
    // means pads 1-5 make sound immediately; B/C/D stay empty for the
    // user's own sounds, same "don't fill every slot" balance the
    // Sequencer module's starter pattern already strikes.
    if (window.WorkstationSampler) window.WorkstationSampler.loadDemoKit("A");
    notify();
    return current;
  }

  function getCurrent() {
    return current;
  }

  function rename(name) {
    if (!current) return;
    current.name = name;
    notify();
  }

  /* ---------- Scenes (commit) ---------- */

  function commitScene(name) {
    if (!current) return null;
    var groupPatternIds = {};
    window.WorkstationGroups.LETTERS.forEach(function (l) {
      groupPatternIds[l] = window.WorkstationGroups.getGroup(l).activePatternId;
    });
    var scene = {
      id: "scene_" + (current.scenes.length + 1) + "_" + Date.now().toString(36),
      name: name || "SCENE " + (current.scenes.length + 1),
      groupPatternIds: groupPatternIds,
    };
    current.scenes.push(scene);
    notify();
    return scene;
  }

  function getScenes() {
    return current ? current.scenes : [];
  }

  function recallScene(sceneId) {
    if (!current) return;
    var scene = current.scenes.filter(function (s) { return s.id === sceneId; })[0];
    if (!scene) return;
    window.WorkstationGroups.LETTERS.forEach(function (l) {
      if (scene.groupPatternIds[l]) window.WorkstationGroups.setActivePattern(l, scene.groupPatternIds[l]);
    });
    notify();
  }

  /* ---------- Song mode ---------- */

  function addSceneToSong(sceneId) {
    if (!current || current.songPositions.length >= MAX_SONG_POSITIONS) return false;
    current.songPositions.push(sceneId);
    notify();
    return true;
  }

  function setSongPosition(index, sceneId) {
    if (!current || index < 0 || index >= MAX_SONG_POSITIONS) return;
    current.songPositions[index] = sceneId;
    notify();
  }

  function cutSongPosition(index) {
    if (!current) return;
    current.songPositions.splice(index, 1);
    notify();
  }

  function insertSongPosition(index, sceneId) {
    if (!current) return;
    current.songPositions.splice(index, 0, sceneId);
    notify();
  }

  function getSongPositions() {
    return current ? current.songPositions : [];
  }

  /* ---------- Persistence ---------- */

  function saveProject() {
    if (!current || !window.WorkstationStorage.isAvailable()) {
      return Promise.reject(new Error("Storage unavailable"));
    }
    current.updatedAt = new Date().toISOString();
    var transportState = window.WorkstationTransport.getState();
    var record = {
      id: current.id,
      name: current.name,
      createdAt: current.createdAt,
      updatedAt: current.updatedAt,
      tempo: transportState.bpm,
      timeSigNum: transportState.timeSigNum,
      timeSigDen: transportState.timeSigDen,
      scenes: current.scenes,
      songPositions: current.songPositions,
    };

    var groupRecords = window.WorkstationGroups.serialize().map(function (g, i) {
      return Object.assign({ id: current.id + ":" + window.WorkstationGroups.LETTERS[i], projectId: current.id }, g);
    });

    var allPatternIds = {};
    groupRecords.forEach(function (g) {
      g.patternIds.forEach(function (pid) { allPatternIds[pid] = true; });
    });
    var patternRecords = Object.keys(allPatternIds).map(function (pid) {
      var p = window.WorkstationPatterns.getPattern(pid);
      return p ? Object.assign({ projectId: current.id }, p) : null;
    }).filter(Boolean);

    var soundPromises = [];
    if (window.WorkstationSampler) {
      soundPromises = window.WorkstationSampler.serializeSounds(current.id);
    }

    return Promise.all([
      window.WorkstationStorage.put("projects", record),
      Promise.all(groupRecords.map(function (g) { return window.WorkstationStorage.put("groups", g); })),
      Promise.all(patternRecords.map(function (p) { return window.WorkstationStorage.put("patterns", p); })),
      Promise.all(soundPromises),
    ]).then(function () {
      return record;
    });
  }

  function listProjects() {
    if (!window.WorkstationStorage.isAvailable()) return Promise.resolve([]);
    return window.WorkstationStorage.getAll("projects");
  }

  function loadProject(id) {
    if (!window.WorkstationStorage.isAvailable()) return Promise.reject(new Error("Storage unavailable"));
    return Promise.all([
      window.WorkstationStorage.get("projects", id),
      window.WorkstationStorage.getAllByIndex("groups", "projectId", id),
      window.WorkstationStorage.getAllByIndex("patterns", "projectId", id),
      window.WorkstationStorage.getAllByIndex("sounds", "projectId", id),
    ]).then(function (results) {
      var projectRecord = results[0];
      var groupRecords = results[1];
      var patternRecords = results[2];
      var soundRecords = results[3];
      if (!projectRecord) throw new Error("Project not found");

      current = {
        id: projectRecord.id,
        name: projectRecord.name,
        createdAt: projectRecord.createdAt,
        updatedAt: projectRecord.updatedAt,
        scenes: projectRecord.scenes || [],
        songPositions: projectRecord.songPositions || [],
      };

      window.WorkstationTransport.setBpm(projectRecord.tempo || 120);
      window.WorkstationTransport.setTimeSignature(projectRecord.timeSigNum || 4, projectRecord.timeSigDen || 4);

      patternRecords.forEach(function (p) {
        window.WorkstationPatterns.registerPattern(p);
      });

      var orderedGroups = window.WorkstationGroups.LETTERS.map(function (l) {
        return groupRecords.filter(function (g) { return g.letter === l; })[0];
      });
      window.WorkstationGroups.restore(orderedGroups, current.id);

      var soundLoadPromise = window.WorkstationSampler
        ? window.WorkstationSampler.restoreSounds(soundRecords)
        : Promise.resolve();

      return soundLoadPromise.then(function () {
        notify();
        return current;
      });
    });
  }

  function deleteProject(id) {
    if (!window.WorkstationStorage.isAvailable()) return Promise.reject(new Error("Storage unavailable"));
    return window.WorkstationStorage.deleteProjectCascade(id);
  }

  window.WorkstationProjects = {
    MAX_SONG_POSITIONS: MAX_SONG_POSITIONS,
    onChange: onChange,
    newProject: newProject,
    getCurrent: getCurrent,
    rename: rename,
    commitScene: commitScene,
    getScenes: getScenes,
    recallScene: recallScene,
    addSceneToSong: addSceneToSong,
    setSongPosition: setSongPosition,
    cutSongPosition: cutSongPosition,
    insertSongPosition: insertSongPosition,
    getSongPositions: getSongPositions,
    saveProject: saveProject,
    listProjects: listProjects,
    loadProject: loadProject,
    deleteProject: deleteProject,
  };
})();
