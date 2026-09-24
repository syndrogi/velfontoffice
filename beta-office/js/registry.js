/**
 * BETA OFFICE — Experiment Registry
 * Mirrors the root site's js/labs.js `registerLab()` pattern (self-
 * registering modules, nothing central to edit when adding one) but
 * richer: each experiment carries a category, a description, and an
 * explicit launch()/cleanup contract instead of a single click action.
 *
 * A module registers itself once, at load time:
 *
 *   BetaExperiments.registerExperiment({
 *     id: "typography",
 *     name: "Typography",
 *     category: "TYPOGRAPHY",
 *     description: "Live text controls",
 *     launch: function (container) {
 *       // build UI into `container`, wire it up
 *       return function cleanup() { ... };   // or { cleanup: fn }
 *     },
 *     randomize: function (container) { ... },  // optional
 *     reset: function (container) { ... },      // optional
 *   });
 *
 * `run(id)` is what actually opens the window (via window-manager.js)
 * and owns the launch → cleanup lifecycle; callers (category tiles,
 * the command palette, taskbar re-opens) never touch launch() directly.
 */
(function () {
  var experiments = [];
  var byId = {};
  var categoryOrder = [];
  // id -> { container, cleanup, spec } for every currently-open window,
  // so RANDOMIZE/RESET (see app.js) can reach live instances without
  // the registry needing to know anything about window chrome itself.
  var openInstances = {};

  function registerExperiment(spec) {
    if (!spec || !spec.id || !spec.name || !spec.category || typeof spec.launch !== "function") return;
    if (byId[spec.id]) return; // one registration per id, first wins
    experiments.push(spec);
    byId[spec.id] = spec;
    if (categoryOrder.indexOf(spec.category) === -1) categoryOrder.push(spec.category);
  }

  function getAll() {
    return experiments.slice();
  }

  function getCategories() {
    return categoryOrder.slice();
  }

  function getByCategory(category) {
    return experiments.filter(function (e) {
      return e.category === category;
    });
  }

  function get(id) {
    return byId[id];
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
    registerExperiment: registerExperiment,
    getAll: getAll,
    getCategories: getCategories,
    getByCategory: getByCategory,
    get: get,
    noteOpened: noteOpened,
    noteClosed: noteClosed,
    getOpenInstances: getOpenInstances,
    isOpen: isOpen,
  };
})();
