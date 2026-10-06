/**
 * MIDI OFFICE — EP-133 Workstation — Bootstrap
 * Exposes buildWindow(container) in the same shape every other MIDI
 * OFFICE module uses (js/modules.js registers it, js/window-manager.js
 * opens it) — the Workstation is one more window in the existing
 * dock, not a separate page/route.
 */
(function () {
  function buildWindow(container) {
    return window.WorkstationUI.buildWindow(container);
  }

  window.Workstation = { buildWindow: buildWindow };
})();
