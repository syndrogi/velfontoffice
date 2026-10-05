/**
 * TONE OFFICE — Module Registry
 * One entry per window the dock (app.js) and the Help panel (help.js)
 * both read from — single source of truth, so a new module only needs
 * one entry here to show up in both places automatically.
 *
 * Convention: whenever a module is added or a control inside one
 * changes, update its `description` here too — this is the only copy
 * of "what does this do" that exists, there's no separate help-text
 * file to fall out of sync with it.
 */
(function () {
  window.ToneModules = [
    {
      id: "sequencer",
      name: "SEQUENCER",
      description: "A 4-track, 16-step drum machine — Kick/Snare/Hat/Clap, all synthesized live (no samples). Click a step to toggle it on or off; the playhead outline shows where the beat currently is. CLEAR wipes the whole pattern. Runs on the shared transport (PLAY/STOP, BPM, TAP) at the top of the page.",
      defaultWidth: 460,
      defaultHeight: 280,
      build: function (container) { return window.ToneSequencer.buildWindow(container); },
    },
    {
      id: "synth",
      name: "SYNTH",
      description: "A subtractive synth voice (oscillator through a lowpass filter). Play it by clicking/dragging across the on-screen keyboard — holding down and sliding to another key glides the note across, no need to lift and re-press — or with the computer keyboard (A S D F G H J K L for white keys, W E T Y U for black), which works even while this window is closed. Resize the window wider to reveal more octaves on either side; the computer-keyboard letters always stay pinned to the same middle range, and the extra keys show their note name instead of a letter since there's no key mapped to them. WAVE picks the oscillator shape; CUTOFF sweeps the filter live, even while a note is held; ATTACK/RELEASE shape the envelope. ARP arpeggiates every note currently held, locked to the sequencer's own clock.",
      defaultWidth: 480,
      defaultHeight: 340,
      build: function (container) { return window.ToneSynth.buildWindow(container); },
    },
    {
      id: "delay",
      name: "DELAY",
      description: "The one shared effect every synth note passes through. TIME sets the delay length, FEEDBACK controls how many repeats you hear, MIX blends it with the dry signal. The sequencer's drum hits, the sampler's pads, and the DJ decks skip this effect on purpose — it's synth-only, so it never turns the drums to mud.",
      defaultWidth: 320,
      defaultHeight: 200,
      build: function (container) { return window.ToneDelay.buildWindow(container); },
    },
    {
      id: "sampler",
      name: "SAMPLER",
      description: "Load an MP3 or WAV from your own computer — nothing uploads anywhere — and it's chopped into equal slices (4/8/16, pick with SLICES). Tap a numbered pad to play that slice directly, or use the step grid below to lay slices out on the sequencer's own 16-step clock and reassemble the file into a new pattern.",
      defaultWidth: 480,
      defaultHeight: 380,
      build: function (container) { return window.ToneSampler.buildWindow(container); },
    },
    {
      id: "dj",
      name: "DJ DECKS",
      description: "Two independent decks, each loading its own file and looping once played. SPEED changes each deck's playback rate independently. The CROSSFADER blends between them. Not a beat-matching DJ app — just two loopers and a mixer — and a deck keeps playing even if you close this window; only its own PLAY/STOP button stops it.",
      defaultWidth: 440,
      defaultHeight: 340,
      build: function (container) { return window.ToneDJ.buildWindow(container); },
    },
    {
      id: "aijam",
      name: "AI JAM",
      description: "Not real AI — there's no model behind this, just weighted randomness and a few music-theory rules, said plainly so nobody's misled. GENERATE BEAT reshuffles the sequencer's pattern with per-track probabilities tuned to land on a plausible rhythm. GENERATE RIFF plays a short random walk through a pentatonic scale on the synth.",
      defaultWidth: 320,
      defaultHeight: 280,
      build: function (container) { return window.ToneAiJam.buildWindow(container); },
    },
    {
      id: "recorder",
      name: "RECORDER",
      description: "RECORD captures the master output — everything audible across every module, live, exactly as you hear it — and STOP finishes the take, adding it to the list below with an inline player and a SAVE link to download it. Nothing is uploaded; each take only exists in this browser tab until you save or close it.",
      defaultWidth: 380,
      defaultHeight: 300,
      build: function (container) { return window.ToneRecorder.buildWindow(container); },
    },
  ];
})();
