/**
 * MIDI OFFICE — EP-133 Workstation — Storage
 * IndexedDB persistence. Normalized stores rather than one giant
 * nested blob, so editing a single sound/pattern doesn't require
 * re-serializing the whole project:
 *
 *   projects  — id, name, createdAt, updatedAt, tempo, timeSigNum,
 *               timeSigDen, activeGroup, songPositions: [sceneId,...]
 *   groups    — id "<projectId>:<letter>", projectId, letter,
 *               soundIds: [12] (one per pad, null if empty),
 *               activePatternId, patternIds: [...], muteGroups: [[padIndex,...],...]
 *   sounds    — id, projectId, blobId (ref into `blobs`, null if no
 *               audio loaded yet), name, trimStart, trimEnd, pitch,
 *               gain, pan, playMode, attack, release, reverse,
 *               timeMode, timeValue, midiChannel, rootNote, muteGroupId
 *   patterns  — id, projectId, groupLetter, name, lengthSteps,
 *               lanes: [12][ {step, velocity, durationTicks, offsetTicks} ]
 *   scenes    — id, projectId, name, groupPatternIds: {A,B,C,D}
 *   blobs     — id, data (ArrayBuffer) — raw audio, kept separate from
 *               sound metadata since it's the only genuinely large part
 *
 * Every public function returns a Promise. If IndexedDB is unavailable
 * (private browsing in some browsers, very old browsers), isAvailable()
 * reports false and every call rejects — callers (projects.js) decide
 * how to degrade.
 */
(function () {
  var DB_NAME = "midi-office-ep133";
  var DB_VERSION = 1;
  var STORES = ["projects", "groups", "sounds", "patterns", "scenes", "blobs"];

  var dbPromise = null;

  function isAvailable() {
    return typeof indexedDB !== "undefined";
  }

  function open() {
    if (!isAvailable()) return Promise.reject(new Error("IndexedDB unavailable"));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        STORES.forEach(function (name) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: "id" });
          }
        });
        var projectsStore = req.transaction.objectStore("groups");
        if (!projectsStore.indexNames.contains("projectId")) {
          projectsStore.createIndex("projectId", "projectId");
        }
        ["sounds", "patterns", "scenes"].forEach(function (name) {
          var store = req.transaction.objectStore(name);
          if (!store.indexNames.contains("projectId")) {
            store.createIndex("projectId", "projectId");
          }
        });
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
    return dbPromise;
  }

  function tx(storeName, mode) {
    return open().then(function (db) {
      return db.transaction(storeName, mode).objectStore(storeName);
    });
  }

  function put(storeName, record) {
    return tx(storeName, "readwrite").then(function (store) {
      return new Promise(function (resolve, reject) {
        var req = store.put(record);
        req.onsuccess = function () {
          resolve(record);
        };
        req.onerror = function () {
          reject(req.error);
        };
      });
    });
  }

  function get(storeName, id) {
    return tx(storeName, "readonly").then(function (store) {
      return new Promise(function (resolve, reject) {
        var req = store.get(id);
        req.onsuccess = function () {
          resolve(req.result || null);
        };
        req.onerror = function () {
          reject(req.error);
        };
      });
    });
  }

  function del(storeName, id) {
    return tx(storeName, "readwrite").then(function (store) {
      return new Promise(function (resolve, reject) {
        var req = store.delete(id);
        req.onsuccess = function () {
          resolve();
        };
        req.onerror = function () {
          reject(req.error);
        };
      });
    });
  }

  function getAll(storeName) {
    return tx(storeName, "readonly").then(function (store) {
      return new Promise(function (resolve, reject) {
        var req = store.getAll();
        req.onsuccess = function () {
          resolve(req.result || []);
        };
        req.onerror = function () {
          reject(req.error);
        };
      });
    });
  }

  function getAllByIndex(storeName, indexName, value) {
    return tx(storeName, "readonly").then(function (store) {
      return new Promise(function (resolve, reject) {
        var req = store.index(indexName).getAll(value);
        req.onsuccess = function () {
          resolve(req.result || []);
        };
        req.onerror = function () {
          reject(req.error);
        };
      });
    });
  }

  function deleteByIndex(storeName, indexName, value) {
    return tx(storeName, "readwrite").then(function (store) {
      return new Promise(function (resolve, reject) {
        var req = store.index(indexName).getAllKeys(value);
        req.onsuccess = function () {
          var keys = req.result || [];
          Promise.all(keys.map(function (k) {
            return new Promise(function (res, rej) {
              var dreq = store.delete(k);
              dreq.onsuccess = res;
              dreq.onerror = function () { rej(dreq.error); };
            });
          })).then(resolve, reject);
        };
        req.onerror = function () {
          reject(req.error);
        };
      });
    });
  }

  // Deletes every record belonging to a project across all per-project
  // stores, plus any blobs referenced by its sounds — used by
  // projects.js's deleteProject().
  function deleteProjectCascade(projectId) {
    return getAllByIndex("sounds", "projectId", projectId).then(function (sounds) {
      var blobDeletes = sounds
        .filter(function (s) { return s.blobId; })
        .map(function (s) { return del("blobs", s.blobId); });
      return Promise.all(blobDeletes);
    }).then(function () {
      return Promise.all([
        deleteByIndex("groups", "projectId", projectId),
        deleteByIndex("sounds", "projectId", projectId),
        deleteByIndex("patterns", "projectId", projectId),
        deleteByIndex("scenes", "projectId", projectId),
        del("projects", projectId),
      ]);
    });
  }

  window.WorkstationStorage = {
    isAvailable: isAvailable,
    put: put,
    get: get,
    delete: del,
    getAll: getAll,
    getAllByIndex: getAllByIndex,
    deleteProjectCascade: deleteProjectCascade,
  };
})();
