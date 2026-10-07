# EP-133 Feature → MIDI OFFICE Implementation Matrix

This document is **not** a copy of, substitute for, or summary of Teenage
Engineering's EP-133 K.O. II manual. It exists so that nobody — including
us — can claim this browser app has 1:1 parity with the hardware without
being able to point at the actual code that proves it, row by row.

Every row below was written by reading the current source in
`midi-office/js/workstation/` (`storage.js`, `audio-engine.js`,
`patterns.js`, `groups.js`, `projects.js`, `transport.js`, `sequencer.js`,
`sampler.js`, `keyboard.js`, `sound-editor.js`, `effects.js`, `mixer.js`,
`keys-mode.js`, `midi.js`, `ui.js`, `app.js`) as it exists today, not from
the original design plan. Where the code's own comments already state a
limitation honestly, this document quotes that intent rather than
re-inventing it.

STATUS legend:

- **IMPLEMENTED** — the concept has a real, working equivalent in this
  codebase, built on Web Audio / browser APIs, not hardware.
- **PARTIAL** — something exists but is incomplete, approximate, stored
  without an audio path, or diverges from the hardware behavior in a
  documented way.
- **NOT APPLICABLE** — the concept is intrinsic to physical hardware (a
  connector, a power switch, a manual-formatting convention, a hardware
  error code) and has no meaningful browser analog, or the analog is
  covered by a separate row.
- **PLANNED** — nothing resembling this exists in the code yet, but it
  would make sense to build in a browser context.

---

## Hardware I/O, Power, Physical Concerns

| EP-133 FEATURE | REFERENCE MANUAL SECTION | MIDI OFFICE EQUIVALENT | IMPLEMENTATION FILE | STATUS | NOTES / BROWSER LIMITATION |
|---|---|---|---|---|---|
| Power on/off switch | Hardware / Getting Started | — | — | NOT APPLICABLE | A browser tab has no power switch. Opening/closing the Workstation window (`app.js` → `WorkstationUI.buildWindow`) is the closest analog, and it tears down listeners on close (`ui.js` `cleanup()`), not "power". |
| Battery / USB-C power input | Hardware | — | — | NOT APPLICABLE | No physical power rail exists in a browser tab. |
| Audio out (3.5mm / USB audio) | Hardware I/O | `AudioContext` output via `ToneEngine.connectDry()` | `audio-engine.js:53-55` | IMPLEMENTED | Routed into the page's shared master bus, which ultimately reaches the OS's default audio output device through the browser's Web Audio implementation — no direct hardware jack control (no selecting which physical output jack, no line/headphone switching) is possible from script. |
| Audio in (mic/line in jack) | Hardware I/O | `getUserMedia({ audio: true })` | `sampler.js:382-391` (sample-to-pad), `effects.js:335-363` (live input FX) | IMPLEMENTED | Browser mic capture via `getUserMedia`, gated behind a user permission prompt every session (no persistent hardware connection). No line-level input selection — browsers only expose "a microphone device", not a 1/4" line input distinct from mic. |
| MIDI In/Out (5-pin / USB MIDI) | Hardware I/O | Web MIDI API (`navigator.requestMIDIAccess`) | `midi.js:48,241-249` | PARTIAL | Note In/Out, CC, and MIDI Clock/Start/Stop are read (`midi.js:176-201`). There is no MIDI Out — this app only *receives* MIDI, it never sends note/CC/clock back to a device. Entirely dependent on browser Web MIDI support (Chromium-family only as of this writing; Safari/Firefox lack it) and OS-level device drivers already being installed — this file cannot do anything about either. |
| Memory card slot / sample import via SD | Hardware I/O | `<input type="file" accept="audio/*">` + drag-and-drop | `sound-editor.js:240-276,468-493`, `sampler.js:71-82` | IMPLEMENTED | No removable storage; "import" means a browser file picker or OS drag-and-drop onto the panel. |

---

## Power-On / Boot / Display

| EP-133 FEATURE | REFERENCE MANUAL SECTION | MIDI OFFICE EQUIVALENT | IMPLEMENTATION FILE | STATUS | NOTES / BROWSER LIMITATION |
|---|---|---|---|---|---|
| Power-on boot sequence | Getting Started | — | — | NOT APPLICABLE | No boot sequence; `WorkstationUI.buildWindow()` runs synchronously and calls `newProject()` immediately if none exists (`ui.js:545-547`). |
| Segment/icon-map LCD screen | Screen Overview | Text readout strip (`#wsDisplay`) | `ui.js:28-49,192-231` | PARTIAL | This is an **original, from-scratch display design**, not a recreation or copy of the EP-133's actual icon-map LCD. It shows project name, BPM, time signature, MIDI status, mode, group, bar.step, FX status, play/rec state as plain text spans (`setDv()`), refreshed via `requestAnimationFrame`-batched updates (`scheduleRefresh()`). It communicates roughly the same *categories* of information (mode, transport, pad) the real display shows, but using an entirely different visual language (readable English labels, not the hardware's icon grid), so it is marked PARTIAL rather than IMPLEMENTED on the "is this the EP-133's screen" question, and IMPLEMENTED on "does the app have a working status readout." |
| Guide book formatting conventions (bold key-names, icon legends, etc.) | How to use this guide | — | — | NOT APPLICABLE | A manual-formatting convention, not a product feature — there is nothing in the app that corresponds to a style guide for a paper manual. |

---

## Groups, Pads, Core Navigation

| EP-133 FEATURE | REFERENCE MANUAL SECTION | MIDI OFFICE EQUIVALENT | IMPLEMENTATION FILE | STATUS | NOTES / BROWSER LIMITATION |
|---|---|---|---|---|---|
| 4 sound groups (A/B/C/D) | Groups | `WorkstationGroups` state keyed by letter, each with its own 12 pad-sound slots, patterns, mute groups, fader | `groups.js:9-29,131-148` | IMPLEMENTED | All four groups play simultaneously regardless of which is "active" (`sequencer.js:101-119` iterates `G.LETTERS` every tick) — matches the hardware's own concurrent-group playback model. |
| 12 pads per group | Pads | 12-pad grid, keyboard rows `Digit1..Digit0,Minus,Equal` plus on-screen `.ws-pad` buttons | `keyboard.js:31-35`, `ui.js:152-183` | IMPLEMENTED | One dispatch path (`WorkstationKeyboard.padDown/padUp`) is shared by physical-keyboard, on-screen pointer, and incoming MIDI input (`midi.js:101-107`), so behavior is consistent across all three triggers. |
| Pressure-sensitive pads (velocity) | Pads | — | `keyboard.js:189-195` | PARTIAL | Explicitly, deliberately NOT implemented for computer-keyboard input: `velocityFromKeydown()` always returns `1` with a code comment stating "a browser keyboard fundamentally can't reproduce that." Velocity *is* respected end-to-end for real MIDI input (`midi.js:88-89` divides the velocity byte by 127 and passes it through to `triggerPad`/`KeysMode.noteOn`) and for the on-screen pads' `pointerdown` (hardcoded to `1`, since a mouse/touchscreen click also has no pressure channel on most devices). Pointer Events *can* expose `event.pressure` on pressure-sensitive hardware (stylus/some trackpads), but this code does not read it. |
| MINUS / PLUS buttons (scroll/increment) | Navigation | `[` / `]` keys, on-screen MINUS/PLUS buttons | `keyboard.js:251-260,297-319`, `ui.js:373-374,493-507` | IMPLEMENTED | Context-sensitive like the hardware: nudges a Shift-selected pad's notes by one step in sequencer mode while a pad is nudge-targeted, moves the step-record cursor while stopped, or falls through to `ui.js`'s simple "cycle selected pad" behavior in Sound mode. |
| FUNCTION key (secondary-function access) | Navigation | Backquote (`` ` ``/`~`/`₩`) held modifier | `keyboard.js:30,214-239` | IMPLEMENTED | Uses `KeyboardEvent.code` ("Backquote") rather than `.key` specifically so US and Korean physical keyboards, which print different glyphs on that key, both resolve to the same physical key — documented in the file's own header comment. |
| SHIFT key (secondary modifier) | Navigation | Real `Shift` key | `keyboard.js:46,200-203` | IMPLEMENTED | Used for nudge-target-select in sequencer mode and for note-repeat latch; this is a software remapping of the physical Shift key, not a dedicated hardware SHIFT button. |
| ERASE (hold + pad) | Navigation | `Backspace` held modifier | `keyboard.js:47,204-208,112-123` | IMPLEMENTED | Erases a pad's whole lane while playing, or just the step-cursor's hit while stopped — mirrors the hardware's "erase while playing vs. while stopped" distinction. |

---

## Fader, Knobs, Timing Control

| EP-133 FEATURE | REFERENCE MANUAL SECTION | MIDI OFFICE EQUIVALENT | IMPLEMENTATION FILE | STATUS | NOTES / BROWSER LIMITATION |
|---|---|---|---|---|---|
| FADER (physical slider, per-group level) | Controls | `#wsFader` range input → `WorkstationGroups.setFader()` → `groupFader` GainNode | `ui.js:370-372`, `groups.js:106-109`, `audio-engine.js:62-67,97-101` | PARTIAL | Functionally works as a per-group level control. Documented known gap (see `mixer.js:24-31`): this single main-panel fader bypasses the Mixer module's mute/solo bookkeeping, so moving it while a group is muted/losing a solo contest in the Mixer can audibly override that state until the Mixer panel is reopened and re-applies its own decision. |
| X/Y performance knobs | Controls | `#wsKnobX` / `#wsKnobY` range inputs | `ui.js:72-73` | PARTIAL | The two sliders exist in the DOM and are rendered, but **no `input` listener is wired to them anywhere in `ui.js` or any other file** — moving them currently does nothing. This is a UI stub, not a working X/Y performance control (compare to `#wsFader`/`#wsBpm`, which do have listeners at `ui.js:364-372`). |
| TIMING button (note-repeat / resolution select) | Controls | `Tab` held modifier | `keyboard.js:48,209-213,106-110`, `sequencer.js:20-29,192-217` | IMPLEMENTED | Holding Tab + a pad arms note-repeat at the current `timingInterval` (one of `1/1` … `1/32`, including triplets); Shift+Tab+pad latches it on without holding. |

---

## Sampling

| EP-133 FEATURE | REFERENCE MANUAL SECTION | MIDI OFFICE EQUIVALENT | IMPLEMENTATION FILE | STATUS | NOTES / BROWSER LIMITATION |
|---|---|---|---|---|---|
| Sample via built-in mic | Sample | `getUserMedia` → `MediaRecorder` → `decodeAudioData` onto a pad | `sampler.js:379-425` | IMPLEMENTED | Requires an explicit per-session browser permission grant (no persistent "device paired once" state); `startRecordingToPad`/`stopRecordingToPad` wired to Sample-mode pad-hold (`keyboard.js:130-133,170-173`). |
| Sample via line/aux in | Sample | Same `getUserMedia` path | `sampler.js:382-391` | PARTIAL | Browsers expose "a microphone input device" generically; there is no API distinction for a dedicated line-level input, so this only works as well as the OS/browser's own input device selection allows. |
| Import audio file | Sample | File picker / drag-and-drop | `sampler.js:71-82`, `sound-editor.js:240-276,468-493` | IMPLEMENTED | Reuses the existing site-wide decode helper (`window.ToneEngine.decodeFile`) rather than duplicating `FileReader`/`decodeAudioData` plumbing — explicit reuse-over-duplication per the file's own header comment. |
| Factory sample library | Sample | Generated demo kit (kick/snare/hat/clap/tone) | `sampler.js:94-154` | PARTIAL | No EP-133 factory samples are bundled or extracted (explicitly stated in the file header); instead a tiny set of **synthesized** placeholder sounds is rendered on demand via `OfflineAudioContext` so a new project isn't silent. This is a deliberately different, honest substitute, not an attempt to replicate the real factory kit. |
| SAMPLE TOOL (trim) | Sample Tool | Waveform canvas with START/END range sliders | `sound-editor.js:146-236` | IMPLEMENTED | Draws real peak data (`getWaveformPeaks`) and lets trim bounds be dragged; trim is honored at playback time (`sampler.js:174-179,205-215`). |
| CHOP (equal slices) | Sample Tool / Chop | `chopEqual(soundId, n)` | `sampler.js:325-333`, `sound-editor.js:280-334` | IMPLEMENTED | Produces evenly-spaced slice boundaries across the trimmed region. |
| CHOP (transient/attack-based) | Sample Tool / Chop | `chopAttack(soundId, n)` | `sampler.js:340-367` | PARTIAL | A real, working energy-based onset detector (short-window RMS envelope, picks the N tallest local peaks with a minimum spacing) — but the file's own header comment is explicit that this is "a real, working heuristic; not the EP-133's own (undocumented, DSP-level) beat-tracking algorithm." Results will differ from the hardware on the same sample. |
| REVERSE | Sample Tool | `setParam(soundId, "reverse", true)` → reversed-buffer cache | `sampler.js:275-290,211-214`, `sound-editor.js:313-322` | IMPLEMENTED | Builds a real reversed `AudioBuffer` once per load and caches it keyed to the live buffer reference. |
| TIME (pitch-preserving time-stretch to BPM/bar) | Sample Tool / Time | TIME MODE (free/bpm/bar) + TIME VALUE fields | `sound-editor.js:384-414`, `sampler.js:43-44` | PLANNED | Explicitly stored-but-inert: the module header and the field's own on-screen hint text both say so verbatim — "Stored only — does not yet time-stretch playback (no pitch-preserving stretch implemented)." `setParam()` just records `timeMode`/`timeValue` on the sound record; nothing reads them back during playback. Real pitch-preserving stretch needs a phase-vocoder-class DSP pipeline with no Web Audio built-in primitive, which is why this is PLANNED rather than PARTIAL — there's no partial audio path at all yet. |
| LOOP point setting | Sample Tool | — | — | PLANNED | No loop-region concept exists on the `sound` record (only `trimStart`/`trimEnd`, which bound a one-shot/sustained play range, not a seamless loop with its own in/out points independent of the trimmed playback window). Would be a natural `AudioBufferSourceNode.loop`/`loopStart`/`loopEnd` addition. |
| NOTE REPEAT | Sample Tool / Timing | `setNoteRepeat` / `latchNoteRepeat` | `sequencer.js:36,192-201,121-127` | IMPLEMENTED | Re-triggers a held pad on the active `timingInterval` grid while held, or indefinitely if Shift-latched; starts playback automatically if the transport isn't already running (`setNoteRepeat`, line 195). |
| TIMING CORRECT (quantize existing notes) | Sample Tool / Timing | `quantizePad()` | `sequencer.js:221-226`, `patterns.js:135-144` | IMPLEMENTED | Zeroes `offsetTicks` for one pad's lane (or the whole pattern if no pad is targeted), pushing an undo snapshot first. |

---

## Sound Edit Sub-Modes

| EP-133 FEATURE | REFERENCE MANUAL SECTION | MIDI OFFICE EQUIVALENT | IMPLEMENTATION FILE | STATUS | NOTES / BROWSER LIMITATION |
|---|---|---|---|---|---|
| Sound Mode (play mode: oneshot/key/legato, pan) | Sound Edit | `buildSoundModeSection()` | `sound-editor.js:338-359`, `sampler.js:38,181-245` | IMPLEMENTED | `playMode` genuinely changes voice-stealing behavior at playback time: `legato` cuts the previous voice on the same pad (`triggerSoundVoice`, lines 185-189), `oneshot` ignores requested duration and always plays the full trimmed region (line 206-208). |
| Trim | Sound Edit | See "SAMPLE TOOL (trim)" above | `sound-editor.js:146-236` | IMPLEMENTED | Same feature, listed under both EP-133 Sample Tool and Sound Edit since the hardware's own menu structure also surfaces trim in more than one place. |
| Envelope (Attack/Release) | Sound Edit | `buildEnvelopeSection()` | `sound-editor.js:363-382`, `sampler.js:158-169` | IMPLEMENTED | Real linear-ramp AD envelope applied via `GainNode.gain` scheduling in `buildEnvelope()` — attack always ramps in, release only applies for non-oneshot play modes (oneshot plays the full trimmed region and stops naturally). No sustain/decay stage — this is an AR envelope, not full ADSR. |
| Time (see TIME above) | Sound Edit | `buildTimeSection()` | `sound-editor.js:384-414` | PLANNED | Same stored-only gap described above. |
| MIDI (channel, root note) | Sound Edit | `buildMidiSection()` | `sound-editor.js:416-435`, `sampler.js:44-45` | PARTIAL | `rootNote` is fully functional — it's the pitch reference `triggerNote()`/Keys mode compute semitone shift against (`sampler.js:194`, `keys-mode.js:103-104`). `midiChannel` is stored on the sound record but nothing in `midi.js` currently filters incoming messages by channel — every input message is handled regardless of its channel nibble (`midi.js:187` masks off the channel bits entirely: `status & 0xF0`). So the field exists and is editable, but doesn't yet gate anything. |
| Mute Group | Sound Edit | `buildMuteGroupSection()` + `WorkstationGroups.toggleMuteGroupMember` | `sound-editor.js:439-466`, `groups.js:89-104`, `sampler.js:263-273` | IMPLEMENTED | Up to 8 mute-group slots per group; triggering a pad in a mute group calls `cutMuteGroup()`, which stops every other currently-sounding voice sharing that slot (`sequencer.js:83-87`). |

---

## Main Mode / Commit / Song Mode

| EP-133 FEATURE | REFERENCE MANUAL SECTION | MIDI OFFICE EQUIVALENT | IMPLEMENTATION FILE | STATUS | NOTES / BROWSER LIMITATION |
|---|---|---|---|---|---|
| Main Mode (top-level pad play + pattern switching) | Main Mode | Default pad behavior outside FX/Sample/Keys context | `keyboard.js:140-157` | IMPLEMENTED | Default `padDown` branch: triggers the sound immediately and, depending on record/play state, writes a live or step-recorded hit. |
| COMMIT (save current group pattern selection as a scene) | Commit Mode | `#wsCommit` button → `commitScene()` | `ui.js:378-381`, `projects.js:72-86` | IMPLEMENTED | Snapshots each group's `activePatternId` into a named scene object appended to the project's `scenes` array. |
| Scene recall | Commit Mode | `recallScene(sceneId)` | `projects.js:92-100` | IMPLEMENTED | Sets each group's active pattern back to what the scene recorded. No dedicated UI control currently calls this directly from `ui.js` (Song Mode would be the consumer) — the function is implemented and exported, but not yet wired to an on-screen scene-recall button outside Song Mode's own list. |
| Song Mode (up to 99 chained scene positions) | Song Mode | `addSceneToSong`/`setSongPosition`/`cutSongPosition`/`insertSongPosition` | `projects.js:15,104-131` | PARTIAL | The full data model and ordering logic exists and is capped at `MAX_SONG_POSITIONS = 99`, matching the hardware's own ceiling. However there is **no playback engine that advances through `songPositions` during playback** — nothing in `transport.js`/`sequencer.js` reads `getSongPositions()` to auto-advance scenes as a song plays. It is a complete editable data structure with no player wired to it yet, and no dedicated Song Mode screen exists in `ui.js`/`keyboard.js`'s mode list (`MODES = ["sound","keys","sequencer","sample","fx","mixer"]` has no "song" entry). |

---

## Make-a-Beat / Sequence-a-Beat Workflows

| EP-133 FEATURE | REFERENCE MANUAL SECTION | MIDI OFFICE EQUIVALENT | IMPLEMENTATION FILE | STATUS | NOTES / BROWSER LIMITATION |
|---|---|---|---|---|---|
| "Make a beat" (assign sounds to pads, play them) | How To | Sound-mode pad assignment + default pad trigger | `sampler.js:57-92`, `keyboard.js:147-151` | IMPLEMENTED | Same end-to-end flow: load/record a sound onto a pad, play it from Sound mode. |
| "Sequence a beat" (record a pattern) | How To | Live record + step record, see below | `sequencer.js:136-188` | IMPLEMENTED | Both recording styles exist and are reachable from the same Enter/Record-arm + Space/Play controls as the rest of the transport. |
| Live record (hits while playing land on the clock) | How To | `liveRecordHit()` | `sequencer.js:136-155` | IMPLEMENTED | Quantizes to the nearest step when `quantizeEnabled` is true, or records the raw `offsetTicks` within the step when free-time recording is selected. |
| Step sequence (move cursor while stopped, place hits) | How To | `stepRecordHit()` / `moveStepCursor()` | `sequencer.js:159-181` | IMPLEMENTED | Cursor wraps within `pattern.lengthSteps`; placing a hit always records at full `offsetTicks: 0` (step-grid-exact by construction, since there's no sub-step nudge during step entry itself — nudging happens afterward via "offset notes"). |
| Offset notes (nudge one pad's hits) | How To / Timing | `offsetPad()` | `sequencer.js:228-233`, `patterns.js:118-131` | IMPLEMENTED | Nudges every event on one lane by whole steps (`stepDelta`), wrapping within pattern length. |
| Offset all notes (nudge whole pattern / timing-correct variant) | How To / Timing | `offsetAll()` | `sequencer.js:235-240`, `patterns.js:118-131` (padIndex `null` case) | IMPLEMENTED | Same `nudge()` primitive, applied across every lane when no pad is targeted. |
| Erase / Undo | How To | `eraseAtCursor`/erase-while-playing + single-level `undo()` | `sequencer.js:46-62,183-188`, `keyboard.js:112-123` | PARTIAL | Erase is fully implemented for both playing and stopped states. Undo is explicitly single-level by design — the module header states this is deliberate, matching "the EP-133's own umbrella-icon model: the previous pattern snapshot is kept and swapped back in, not a full history stack." A second undo press re-does rather than going further back (swaps current ⇄ last snapshot, `sequencer.js:51-58`), which is a real behavioral difference from an arbitrary-depth history stack — call out explicitly rather than silently treating "undo" as the familiar unlimited-steps-back meaning. |
| Copy / Paste (bar copy) | How To / Copy | `copyBar()` / `pasteBar()` | `patterns.js:163-191` | PARTIAL | Both functions are fully implemented and tested against the data model (clip one bar's events out, splice them back in at a target bar, replacing whatever was there). **No UI control in `ui.js`/`keyboard.js` currently calls either function** — there is no copy/paste keybinding or on-screen button wired up yet, so the capability exists in `patterns.js` but is not reachable by a user in the running app. |
| Pattern copy (whole-pattern clone) | How To / Copy | `clonePattern()` | `patterns.js:146-161` | PARTIAL | Same situation as bar copy/paste: fully implemented in the data layer, not yet exposed through any UI affordance. |

---

## Keys Mode

| EP-133 FEATURE | REFERENCE MANUAL SECTION | MIDI OFFICE EQUIVALENT | IMPLEMENTATION FILE | STATUS | NOTES / BROWSER LIMITATION |
|---|---|---|---|---|---|
| Keys mode (12 pads play one sound across pitches) | Keys Mode | `WorkstationKeysMode` | `keys-mode.js` (whole file) | IMPLEMENTED | Selects a "source pad" and maps the other 12 physical pads to scale degrees around its root note, going through the exact same `triggerNote()` voice path `sampler.js` uses elsewhere — no separate playback code. |
| Scale select | Keys Mode | `SCALES`/`SCALE_OPTIONS` dropdown | `keys-mode.js:20-36,209-232` | IMPLEMENTED | Chromatic, major, natural minor, major/minor pentatonic, blues — 6 scales, each wrapping across octaves once pad index exceeds the scale's own degree count (`computeTargetMidi()`). |
| Octave shift | Keys Mode | OCT −/+ stepper | `keys-mode.js:40,48,149-183` | IMPLEMENTED | Clamped to ±3 octaves. |
| Transpose | Keys Mode | TRANSPOSE numeric field | `keys-mode.js:42,49,185-207` | IMPLEMENTED | Clamped to ±12 semitones. |
| Reference note-map strip | Keys Mode | `buildReferenceStrip()` | `keys-mode.js:237-261` | IMPLEMENTED | Read-only preview of which note each of the 12 pads currently maps to — explicitly not interactive, deferring to the real playable pads elsewhere in `ui.js`. |

---

## Fader Automation, Mixer, Effects

| EP-133 FEATURE | REFERENCE MANUAL SECTION | MIDI OFFICE EQUIVALENT | IMPLEMENTATION FILE | STATUS | NOTES / BROWSER LIMITATION |
|---|---|---|---|---|---|
| Fader automation (record fader moves into a pattern) | Fader | — | — | PLANNED | No file records fader movement over time against the pattern/tick clock; `setFader()` is an immediate, non-recorded set (`groups.js:106-109`). The `faderTarget` field on group state (`groups.js:21`, "what FADER currently controls for this group") exists but nothing reads or writes it beyond initialization — it is dead/unused state today, a placeholder for a feature not yet built. |
| Mixer (per-group level/mute/solo + master) | Mixer | `WorkstationMixer` | `mixer.js` (whole file) | IMPLEMENTED | Real mute/solo composition logic ("mute always wins", solo narrows playback to soloed+unmuted channels) implemented in `isForcedSilent()`/`applyChannel()`; keeps its own `storedFader` per channel so muting/soloing doesn't destroy the user's dialed-in level. See the FADER row above for the one known cross-module gap. |
| FX engine: DELAY | FX | `buildDelayProcessor()` | `effects.js:144-160` | IMPLEMENTED | Real feedback delay, feedback gain capped below 1.0 to prevent runaway. |
| FX engine: REVERB | FX | `buildReverbProcessor()` | `effects.js:74-86,162-190` | IMPLEMENTED | Convolution reverb using a procedurally generated (white-noise + exponential decay) impulse response — no bundled/fetched IR audio file, so it won't sound identical to any specific hardware/real-space IR, by design. |
| FX engine: DISTORTION | FX | `buildDistortionProcessor()` | `effects.js:61-70,192-209` | IMPLEMENTED | Standard tanh-style soft-clip `WaveShaperNode` curve scaled by drive. |
| FX engine: CHORUS | FX | `buildChorusProcessor()` | `effects.js:91-119,211-223` | IMPLEMENTED | LFO-modulated `DelayNode` with feedback, shared builder also reused for punch-in's flanger. |
| FX engine: FILTER | FX | `buildFilterProcessor()` | `effects.js:225-239` | IMPLEMENTED | Lowpass `BiquadFilterNode` with exponential frequency mapping and adjustable Q. |
| FX engine: COMPRESSOR | FX | `buildCompressorProcessor()` | `effects.js:241-258` | IMPLEMENTED | `DynamicsCompressorNode` with drive→threshold/ratio and speed→attack/release mappings. |
| FX SEND/RETURN per group | FX | Per-letter send gain into shared `fxInputBus` | `effects.js:270-291,321-325` | IMPLEMENTED | Taps the same `groupInput` node every voice already plays into — dry signal is untouched, so SEND=0 is silent-FX, not silent-group (stated explicitly in the file header). |
| PUNCH-IN FX (momentary, held, per-pad) | FX / Punch In | 12 fixed `PUNCH_DEFS` effects inserted into the master→punchBus edge while a pad is held in FX mode | `effects.js:393-610`, `keyboard.js:125-128,166-169` | IMPLEMENTED | Each of the 12 pads is a distinct effect (filter sweeps, distortion spike, delay stutter, tremolo, flanger, reverb splash, bandpass "telephone," gate, long delay wash, low/high shelf). Multiple held pads chain in series, matching the hardware's "these combine" behavior. A documented Escape-key safety net (`releaseAllPunchImmediate`) guarantees the punch bus returns to transparent even if a pad-up event is missed (e.g. mouse left the window while held). |
| LIVE INPUT FX (mic through the FX engine) | FX / Live Input | Mic toggle feeding the same shared `fxInputBus` | `effects.js:331-386` | IMPLEMENTED | No dry mic path exists while enabled — the mic is only audible through whichever FX type is currently selected, matching the stated "OFF = silent mic" hardware model. |
| OUTPUT routing (assign groups to separate physical outs) | FX / Output | — | — | NOT APPLICABLE | The hardware's separate physical output jacks per group have no browser equivalent — there is exactly one audio destination (the OS default output device via `AudioContext`), and Web Audio has no API to enumerate/select among multiple physical output jacks the way a DAW's audio interface routing would. Mixer mute/solo (see above) is the closest in-browser substitute for "isolate what's audible," but it doesn't route to separate physical outputs. |
| SIDECHAIN ducking | FX / Sidechain | `WorkstationAudio.duck()` detection in `effects.js` | `audio-engine.js:103-122`, `effects.js:620-653` | IMPLEMENTED | Detection mirrors `sequencer.js`'s own tick-matching math exactly (by design, to avoid duplicating "did a hit land on this tick" logic) and calls the already-built `duck()` ramp; LENGTH/SHAPE/DEPTH are all adjustable, matching the hardware's sidechain knob set. |

---

## MIDI Reference, Note Map, CC Map

| EP-133 FEATURE | REFERENCE MANUAL SECTION | MIDI OFFICE EQUIVALENT | IMPLEMENTATION FILE | STATUS | NOTES / BROWSER LIMITATION |
|---|---|---|---|---|---|
| MIDI note map (pads ↔ note numbers) | MIDI Reference | `mapNoteToGroupPad()`, notes 36-83 → Groups A-D × 12 pads | `midi.js:32-35,79-86` | IMPLEMENTED | Follows the EP-133's own documented mapping (notes 36-47 → Group A pads 0-11, 48-59 → B, 60-71 → C, 72-83 → D) exactly, per the file's header comment. Notes outside 36-83 are ignored in pad modes (but see Keys mode below). |
| MIDI CC map | MIDI Reference | `handleControlChange()` — sustain (CC64) + MIDI Learn | `midi.js:122-141` | PARTIAL | Only CC 64 (sustain) is given fixed, hardcoded meaning. There is no broader CC map (no CCs wired to FX params, fader, etc. by default) — instead there's a generic one-shot "MIDI Learn" callback mechanism (`startLearn()`) that any other module *could* use to bind the next incoming CC to something, but nothing in this codebase currently calls `startLearn()` to wire up a learned mapping — the mechanism is implemented and exported but currently unused by any other file. |
| Sequence external MIDI gear (MIDI Out / Clock Out) | MIDI Reference | — | — | NOT APPLICABLE | There is no MIDI Out in this implementation — `midi.js` only attaches `onmidimessage` handlers to **inputs** (`attachInputListeners`, line 215-219); nothing ever calls `output.send()`. The app cannot drive or clock an external device. |
| Receive MIDI Clock / Start / Stop | MIDI Reference | `recordClockPulse()`, `handleStart()`, `handleStop()` | `midi.js:145-172` | PARTIAL | Start/Stop (`0xFA`/`0xFC`) directly call the internal transport's `play()`/`stop()` — that part is fully wired. Incoming Clock (`0xF8`) pulses are only used for an **advisory** BPM estimate via `getIncomingClockBpm()` — the file's own comment is explicit that "this never slaves the internal transport's own clock; fully syncing playback to incoming MIDI clock is a much larger resync effort and is out of scope here." So the internal sequencer clock will drift relative to an external MIDI clock source over time; nothing corrects for that. |
| Velocity sensitivity over MIDI | How To | `handleNoteOn(note, velocityByte)` | `midi.js:88-108` | IMPLEMENTED | Full 0-127 velocity byte is converted to a 0-1 float and passed through untouched to `triggerPad`/`KeysMode.noteOn` — a velocity-sensitive external controller's dynamics are preserved end-to-end, unlike the fixed-velocity computer-keyboard/on-screen-pad paths. |
| External MIDI keyboard control | How To | Same `handleNoteOn`/`handleNoteOff` path, chromatic in Keys mode | `midi.js:88-120` | IMPLEMENTED | In Keys mode, the raw 0-127 note number (not just the 36-83 pad range) drives `KeysMode.noteOn/noteOff` directly, so an external keyboard can play chromatically across the full range rather than being limited to 12 pads' worth of notes. |
| Hardware sync between physical devices (clock master/slave over 5-pin or TRS sync) | How To | — | — | NOT APPLICABLE | Requires physical sync hardware/cabling this app has no access to; Web MIDI Clock receive (see above) is the only related capability, and it is explicitly advisory-only, not a sync lock. |

---

## Lock Mode

| EP-133 FEATURE | REFERENCE MANUAL SECTION | MIDI OFFICE EQUIVALENT | IMPLEMENTATION FILE | STATUS | NOTES / BROWSER LIMITATION |
|---|---|---|---|---|---|
| Lock Mode (lock the keypad against accidental input) | Lock Mode | — | — | NOT APPLICABLE | No code anywhere in `js/workstation/` implements an input-lock concept (searched every module for a matching idea — none exists). This is being called NOT APPLICABLE rather than PLANNED: the hardware's Lock Mode exists mainly to prevent accidental physical button presses while the device is loose in a bag — a risk that essentially doesn't exist for a browser tab (it isn't jostled in transit the same way, and closing/switching tabs is the natural "stop touching this" action). A software analog isn't meaningless, but it isn't addressing the same real risk, so it isn't tracked here as a pending feature the way genuinely-missing audio features (TIME stretch, LOOP points, Song Mode playback) are. |

---

## Error Codes

| EP-133 FEATURE | REFERENCE MANUAL SECTION | MIDI OFFICE EQUIVALENT | IMPLEMENTATION FILE | STATUS | NOTES / BROWSER LIMITATION |
|---|---|---|---|---|---|
| Hardware error codes (e.g. storage full, card error) | Error Codes | — | — | NOT APPLICABLE | These are specific to the EP-133's own firmware/storage hardware. This app's actual failure modes are different and are surfaced differently: `WorkstationStorage.isAvailable()` gates IndexedDB access and every caller (`projects.js` save/load/delete) rejects a `Promise` on failure, which `ui.js` turns into plain-text status messages ("SAVE FAILED — STORAGE UNAVAILABLE", "LOAD FAILED", etc., `ui.js:448-487`) rather than a numbered code. Mic/MIDI permission failures degrade to a status string ("MIC UNAVAILABLE", "MIDI UNAVAILABLE") instead of an error code, per `sampler.js:413-418` and `midi.js:58-61`. |

---

## Technical Specifications

| EP-133 FEATURE | REFERENCE MANUAL SECTION | MIDI OFFICE EQUIVALENT | IMPLEMENTATION FILE | STATUS | NOTES / BROWSER LIMITATION |
|---|---|---|---|---|---|
| Sample rate / bit depth of hardware converters | Technical Specifications | Whatever the browser's shared `AudioContext` runs at | `audio-engine.js:38` (`window.ToneEngine.init()`) | NOT APPLICABLE | Determined entirely by the browser/OS audio stack, typically 44.1/48kHz float32 internally — this codebase neither reads nor sets a sample rate; it is not a configurable spec here the way a hardware datasheet would list one. |
| Sequencer resolution (ticks per quarter note) | Technical Specifications | 96 PPQN | `patterns.js:15`, `transport.js:15` | IMPLEMENTED | Explicitly chosen to match "the EP-133's own sequencer resolution" per `patterns.js`'s header comment, so swing/note-repeat/per-note offset are tick math rather than step-grid rounding. |
| Pattern step resolution | Technical Specifications | Fixed 16 steps/bar (16th notes) | `patterns.js:16-18` | IMPLEMENTED | `lengthSteps` scales how many bars a pattern spans (16/32/64/128 = 1/2/4/8 bars via the UI's bar-count selector, `ui.js:313-320`), not a variable subdivision — the grid itself is always 16th notes. |
| Max pattern length | Technical Specifications | `MAX_STEPS = 16 * 32` (32 bars) | `patterns.js:20` | IMPLEMENTED | A practical cap chosen in software, not a reverse-engineered hardware limit. |
| BPM range | Technical Specifications | 40-399 BPM | `transport.js:18-19` | IMPLEMENTED | Clamped in `setBpm()` (`transport.js:132-135`). |
| Max song positions | Technical Specifications | 99 | `projects.js:15` | IMPLEMENTED | Matches the hardware's documented ceiling; see Song Mode row above for the playback-engine gap. |
| Internal clock implementation | Technical Specifications | Web Audio lookahead scheduler | `transport.js:86-99` | IMPLEMENTED | Standard Web Audio pattern: schedules slightly ahead of `AudioContext.currentTime` and polls via `setTimeout`, specifically *not* driving audio timing off `setInterval`, which the file's own header comment notes "drifts audibly within seconds under any UI jank." This is a software-timing concern unique to the browser environment; the hardware has no equivalent failure mode to document here. |

---

## Summary of the honest gaps

For quick reference, the features this document found to be **incomplete,
unwired, or missing outright** in the current code (not counting the
NOT APPLICABLE hardware-only rows):

- X/Y knobs render but have no event listeners — functionally inert (`ui.js`).
- TIME MODE/VALUE (sample time-stretch) is stored but never read during playback (`sound-editor.js`, `sampler.js`).
- No loop-point concept exists on a sound record.
- Song Mode's data model (scenes, up to 99 positions) has no playback engine that advances through it, and no dedicated mode screen.
- Copy/paste bar and whole-pattern clone are implemented in `patterns.js` but have no UI control wired to them anywhere.
- Fader automation has a placeholder field (`faderTarget`) that nothing reads or writes.
- `midiChannel` on a sound is stored but not used to filter incoming MIDI messages.
- MIDI CC Learn is a working generic mechanism with zero current callers.
- MIDI Clock sync is advisory-only (tempo estimate), never slaves the internal transport.
- Lock Mode has no implementation of any kind.
- The main-panel FADER can override Mixer mute/solo state (documented cross-module gap in `mixer.js`'s own header comment).
