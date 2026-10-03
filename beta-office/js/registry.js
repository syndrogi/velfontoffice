/**
 * BETA OFFICE — Experiment Registry
 * Mirrors the root site's js/labs.js `registerLab()` pattern (self-
 * registering modules, nothing central to edit when adding one) but
 * richer: each experiment carries a category, a description, and an
 * explicit launch()/cleanup contract instead of a single click action.
 *
 * Two layers:
 *   - Manifest: static metadata (id/name/category/description/number/
 *     file) for all 99, registered once by js/manifest.js and loaded
 *     eagerly. getAll()/getCategories()/getByCategory() read from this,
 *     so tiles/search/the command palette can list everything before a
 *     single experiment script has actually run.
 *   - Live specs: the real launch()/randomize()/reset() contract, added
 *     only once an experiment module has actually executed:
 *
 *   BetaExperiments.registerExperiment({
 *     id: "typography",
 *     name: "Typography",
 *     category: "PAGEFX",
 *     description: "Live text controls",
 *     launch: function (container) {
 *       // build UI into `container`, wire it up
 *       return function cleanup() { ... };   // or { cleanup: fn }
 *     },
 *     randomize: function (container) { ... },  // optional
 *     reset: function (container) { ... },      // optional
 *   });
 *
 * `get(id)` only returns a spec once it's actually loaded — callers
 * that need to *open* an experiment (window-manager.js) go through
 * loadExperiment(id) first, which injects js/experiments/<file>.js on
 * demand and resolves once that module's own registerExperiment() call
 * has run (synchronous, during the script's own execution — done by
 * the time its load event fires).
 */
(function () {
  var experiments = [];
  var byId = {};
  var manifestList = [];
  var manifestById = {};
  var categoryOrder = [];
  // id -> { container, cleanup, spec } for every currently-open window,
  // so RANDOMIZE/RESET (see app.js) can reach live instances without
  // the registry needing to know anything about window chrome itself.
  var openInstances = {};
  var pendingLoads = {};

  function noteCategory(category) {
    if (category && categoryOrder.indexOf(category) === -1) categoryOrder.push(category);
  }

  function registerManifest(list) {
    (list || []).forEach(function (entry) {
      if (!entry || !entry.id || manifestById[entry.id]) return;
      manifestById[entry.id] = entry;
      manifestList.push(entry);
      noteCategory(entry.category);
    });
  }

  function registerExperiment(spec) {
    if (!spec || !spec.id || !spec.name || !spec.category || typeof spec.launch !== "function") return;
    if (byId[spec.id]) return; // one registration per id, first wins
    experiments.push(spec);
    byId[spec.id] = spec;
    // A module is always the source of truth for its own metadata — fill
    // in the manifest if this id somehow wasn't pre-declared there.
    if (!manifestById[spec.id]) {
      manifestById[spec.id] = spec;
      manifestList.push(spec);
    }
    noteCategory(spec.category);
  }

  function getAll() {
    return manifestList.slice();
  }

  function getCategories() {
    return categoryOrder.slice();
  }

  function getByCategory(category) {
    return manifestList.filter(function (e) {
      return e.category === category;
    });
  }

  // Only ever returns a *loaded* spec (the one with .launch/.randomize/
  // .reset) — metadata-only listing should use getAll()/getMeta().
  function get(id) {
    return byId[id];
  }

  function getMeta(id) {
    return manifestById[id];
  }

  function isLoaded(id) {
    return !!byId[id];
  }

  // Injects js/experiments/<file>.js the first time an experiment is
  // actually opened. Resolves with the loaded spec (or null on failure/
  // unknown id). Safe to call repeatedly — in-flight and already-loaded
  // requests short-circuit.
  function loadExperiment(id) {
    if (byId[id]) return Promise.resolve(byId[id]);
    if (pendingLoads[id]) return pendingLoads[id];
    var meta = manifestById[id];
    if (!meta || !meta.file) return Promise.resolve(null);

    var promise = new Promise(function (resolve) {
      var script = document.createElement("script");
      script.src = "js/experiments/" + meta.file;
      script.onload = function () {
        resolve(byId[id] || null);
      };
      script.onerror = function () {
        resolve(null);
      };
      document.body.appendChild(script);
    }).then(function (spec) {
      delete pendingLoads[id];
      return spec;
    });

    pendingLoads[id] = promise;
    return promise;
  }

  // Called by window-manager.js right after it builds a window's content
  // container and calls spec.launch(container) itself — the registry
  // only needs to remember the result so randomize/reset can find it,
  // and to forget it again once the window closes.
  function noteOpened(id, container, cleanup) {
    openInstances[id] = { container: container, cleanup: cleanup, spec: byId[id] };
  }

  function noteClosed(id) {
    delete openInstances[id];
  }

  function getOpenInstances() {
    var ids = Object.keys(openInstances);
    var out = [];
    for (var i = 0; i < ids.length; i++) out.push(openInstances[ids[i]]);
    return out;
  }

  function isOpen(id) {
    return !!openInstances[id];
  }

  window.BetaExperiments = {
    registerManifest: registerManifest,
    registerExperiment: registerExperiment,
    getAll: getAll,
    getCategories: getCategories,
    getByCategory: getByCategory,
    get: get,
    getMeta: getMeta,
    isLoaded: isLoaded,
    loadExperiment: loadExperiment,
    noteOpened: noteOpened,
    noteClosed: noteClosed,
    getOpenInstances: getOpenInstances,
    isOpen: isOpen,
  };
})();
