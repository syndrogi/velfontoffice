/**
 * MIDI OFFICE — EP-133 Workstation — Mixer
 * Renders the MIXER mode body: one channel strip per group (A-D) plus
 * a MASTER strip. Group faders are already wired end-to-end in the
 * audio graph (audio-engine.js's groupFader nodes) — this module adds
 * the piece that graph doesn't have yet: mute and solo.
 *
 * groups.js only has room for one fader number per group, so muting
 * or soloing a group necessarily overwrites that number (via
 * WorkstationGroups.setFader) whenever it gets silenced. To keep the
 * user's actual dialed-in level from being lost, this module keeps its
 * own copy — `storedFader` — per letter, entirely local to mixer.js.
 * Every render() call re-syncs storedFader from the live group fader
 * for any channel that isn't currently being forced silent, so the
 * strip always reflects reality even if something else moved that
 * group's level while this panel was off-screen.
 *
 * Composition rule: mute always wins. A channel that is both muted and
 * soloed stays silent. When nothing is soloed, every unmuted channel
 * plays at its own storedFader. When one or more channels are soloed,
 * every non-soloed, non-muted channel is forced to 0 and every soloed,
 * non-muted channel plays at its storedFader.
 *
 * Known limitation: the main panel (ui.js) has its own single FADER
 * knob that calls WorkstationGroups.setFader() directly for whichever
 * group is active, bypassing this module's mute/solo bookkeeping. If a
 * group is muted or losing a solo contest here and the user then moves
 * that other knob, it will audibly override the mute/solo state until
 * this mixer is re-opened (which re-applies whatever this module last
 * decided). Fixing that would mean teaching ui.js about mixer state,
 * which is out of scope for this file.
 */
(function () {
  var G = window.WorkstationGroups;
  var LETTERS = G ? G.LETTERS : ["A", "B", "C", "D"];
  var MASTER_RAMP_SEC = 0.01;

  // Mixer-local per-group state, keyed by letter. Never written into
  // groups.js's own state object — that object only knows one fader
  // number, not "muted" or "soloed".
  var channels = {};
  LETTERS.forEach(function (letter) {
    channels[letter] = {
      muted: false,
      soloed: false,
      storedFader: 0.8,
    };
  });

  function isForcedSilent(letter) {
    var channel = channels[letter];
    if (channel.muted) return true;
    var solo = LETTERS.some(function (l) { return channels[l].soloed; });
    return solo && !channel.soloed;
  }

  // Pulls the live group fader into storedFader for any channel this
  // module isn't currently forcing to 0 — so a strip rebuilt after the
  // user adjusted that group's level elsewhere (or on first render)
  // shows the real value instead of the 0.8 placeholder.
  function syncStoredFaderFromLive(letter) {
    if (isForcedSilent(letter)) return;
    channels[letter].storedFader = G.getGroup(letter).fader;
  }

  // Recomputes and applies the one effective fader value for `letter`
  // given its own mute/solo plus every other channel's solo state.
  function applyChannel(letter) {
    var channel = channels[letter];
    var effective = isForcedSilent(letter) ? 0 : channel.storedFader;
    G.setFader(letter, effective);
  }

  function applyAllChannels() {
    LETTERS.forEach(applyChannel);
  }

  function buildFaderField(labelText, ariaLabel, initialPercent) {
    var field = document.createElement("label");
    field.className = "ws-field ws-mixer-fader-field";

    var span = document.createElement("span");
    span.textContent = labelText;

    var input = document.createElement("input");
    input.type = "range";
    input.min = "0";
    input.max = "100";
    input.step = "1";
    input.value = String(initialPercent);
    input.className = "ws-mixer-fader";
    input.setAttribute("aria-label", ariaLabel);

    field.appendChild(span);
    field.appendChild(input);
    return { field: field, input: input };
  }

  function buildToggleButton(text, ariaLabel, isActive, onToggle) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ws-btn ws-mixer-toggle";
    btn.textContent = text;
    btn.setAttribute("aria-label", ariaLabel);
    btn.setAttribute("aria-pressed", String(isActive));
    btn.classList.toggle("ws-is-active", isActive);
    btn.addEventListener("click", onToggle);
    return btn;
  }

  function buildChannelStrip(letter) {
    syncStoredFaderFromLive(letter);
    var channel = channels[letter];

    var strip = document.createElement("div");
    strip.className = "ws-mixer-strip";

    var label = document.createElement("div");
    label.className = "ws-mixer-strip-label";
    label.textContent = "GROUP " + letter;
    strip.appendChild(label);

    var percent = Math.round(channel.storedFader * 100);
    var faderParts = buildFaderField("FADER", "Group " + letter + " fader", percent);
    strip.appendChild(faderParts.field);

    var readout = document.createElement("span");
    readout.className = "ws-dv ws-dv-big ws-mixer-readout";
    readout.textContent = String(percent);
    strip.appendChild(readout);

    faderParts.input.addEventListener("input", function (e) {
      var value = Number(e.target.value);
      channel.storedFader = value / 100;
      readout.textContent = String(value);
      applyChannel(letter);
    });

    var buttonRow = document.createElement("div");
    buttonRow.className = "ws-row ws-mixer-strip-buttons";

    var muteBtn = buildToggleButton("MUTE", "Mute group " + letter, channel.muted, function () {
      channel.muted = !channel.muted;
      muteBtn.classList.toggle("ws-is-active", channel.muted);
      muteBtn.setAttribute("aria-pressed", String(channel.muted));
      applyAllChannels();
    });
    buttonRow.appendChild(muteBtn);

    var soloBtn = buildToggleButton("SOLO", "Solo group " + letter, channel.soloed, function () {
      channel.soloed = !channel.soloed;
      soloBtn.classList.toggle("ws-is-active", channel.soloed);
      soloBtn.setAttribute("aria-pressed", String(channel.soloed));
      applyAllChannels();
    });
    buttonRow.appendChild(soloBtn);

    strip.appendChild(buttonRow);
    return strip;
  }

  function buildMasterStrip() {
    var master = window.WorkstationAudio.getWorkstationMaster();

    var strip = document.createElement("div");
    strip.className = "ws-mixer-master";

    var label = document.createElement("div");
    label.className = "ws-mixer-strip-label";
    label.textContent = "MASTER";
    strip.appendChild(label);

    var percent = Math.round(master.gain.value * 100);
    var faderParts = buildFaderField("LEVEL", "Master level", percent);
    strip.appendChild(faderParts.field);

    var readout = document.createElement("span");
    readout.className = "ws-dv ws-dv-big ws-mixer-readout";
    readout.textContent = String(percent);
    strip.appendChild(readout);

    faderParts.input.addEventListener("input", function (e) {
      var value = Number(e.target.value);
      readout.textContent = String(value);
      var ctx = window.WorkstationAudio.context();
      master.gain.setTargetAtTime(value / 100, ctx.currentTime, MASTER_RAMP_SEC);
    });

    return strip;
  }

  function render(container) {
    container.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "ws-mixer";

    var strips = document.createElement("div");
    strips.className = "ws-mixer-strips";
    LETTERS.forEach(function (letter) {
      strips.appendChild(buildChannelStrip(letter));
    });
    wrap.appendChild(strips);
    wrap.appendChild(buildMasterStrip());

    container.appendChild(wrap);
  }

  window.WorkstationMixer = {
    render: render,
  };
})();
