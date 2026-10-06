/**
 * MIDI OFFICE — EP-133 Workstation — Groups
 * Four independent groups (A-D), each owning its own 12 pad-sound
 * assignments, pattern list/selection, mute groups, and fader level.
 * Switching the active group only changes which one the UI/keyboard
 * currently points at — every group's own state lives here
 * permanently and is never cleared by switching away from it.
 */
(function () {
  var LETTERS = ["A", "B", "C", "D"];
  var listeners = [];

  function freshGroupState(letter) {
    return {
      letter: letter,
      soundIds: new Array(12).fill(null),
      patternIds: [],
      activePatternId: null,
      muteGroups: [], // array of arrays of pad indices
      fader: 0.8,
      faderTarget: "volume", // what FADER currently controls for this group
    };
  }

  var state = {};
  LETTERS.forEach(function (l) {
    state[l] = freshGroupState(l);
  });
  var activeLetter = "A";

  function onChange(fn) {
    listeners.push(fn);
  }

  function notify() {
    listeners.forEach(function (fn) {
      try {
        fn(activeLetter);
      } catch (e) {
        /* one bad listener can't break the rest */
      }
    });
  }

  function getActiveLetter() {
    return activeLetter;
  }

  function setActiveLetter(letter) {
    if (LETTERS.indexOf(letter) === -1 || letter === activeLetter) return;
    activeLetter = letter;
    if (window.WorkstationAudio) {
      // nothing destroyed — just point the rest of the app at a
      // different already-live state object.
    }
    notify();
  }

  function getGroup(letter) {
    return state[letter || activeLetter];
  }

  function getActiveGroup() {
    return state[activeLetter];
  }

  function setPadSound(letter, padIndex, soundId) {
    state[letter].soundIds[padIndex] = soundId;
  }

  function getPadSound(letter, padIndex) {
    return state[letter].soundIds[padIndex];
  }

  function addPattern(letter, patternId) {
    var g = state[letter];
    g.patternIds.push(patternId);
    if (!g.activePatternId) g.activePatternId = patternId;
  }

  function setActivePattern(letter, patternId) {
    state[letter].activePatternId = patternId;
  }

  function toggleMuteGroupMember(letter, muteGroupIndex, padIndex) {
    var g = state[letter];
    while (g.muteGroups.length <= muteGroupIndex) g.muteGroups.push([]);
    var members = g.muteGroups[muteGroupIndex];
    var idx = members.indexOf(padIndex);
    if (idx === -1) members.push(padIndex);
    else members.splice(idx, 1);
  }

  function getMuteGroupFor(letter, padIndex) {
    var g = state[letter];
    for (var i = 0; i < g.muteGroups.length; i++) {
      if (g.muteGroups[i].indexOf(padIndex) !== -1) return i;
    }
    return -1;
  }

  function setFader(letter, value) {
    state[letter].fader = Math.max(0, Math.min(1, value));
    if (window.WorkstationAudio) window.WorkstationAudio.setGroupFader(letter, state[letter].fader);
  }

  function serialize() {
    return LETTERS.map(function (l) { return state[l]; });
  }

  function restore(groupsArray, projectId) {
    LETTERS.forEach(function (l, i) {
      state[l] = groupsArray[i] ? groupsArray[i] : freshGroupState(l);
    });
    activeLetter = "A";
    notify();
  }

  function resetAll() {
    LETTERS.forEach(function (l) {
      state[l] = freshGroupState(l);
    });
    activeLetter = "A";
    notify();
  }

  window.WorkstationGroups = {
    LETTERS: LETTERS,
    onChange: onChange,
    getActiveLetter: getActiveLetter,
    setActiveLetter: setActiveLetter,
    getGroup: getGroup,
    getActiveGroup: getActiveGroup,
    setPadSound: setPadSound,
    getPadSound: getPadSound,
    addPattern: addPattern,
    setActivePattern: setActivePattern,
    toggleMuteGroupMember: toggleMuteGroupMember,
    getMuteGroupFor: getMuteGroupFor,
    setFader: setFader,
    serialize: serialize,
    restore: restore,
    resetAll: resetAll,
  };
})();
