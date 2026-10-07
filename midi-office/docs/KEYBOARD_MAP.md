# MIDI OFFICE — Keyboard Map

This document is a complete, standalone reference for every computer-keyboard
binding active in the MIDI OFFICE app. There are **two** independent keyboard
systems running at the same time, globally, for the lifetime of the page:

1. **EP-133 Workstation keyboard** — `js/workstation/keyboard.js` — the pad
   grid, FUNCTION layer, transport, and sequencer controls.
2. **Synth computer-keyboard performance mode** — `js/synth.js` — a musical
   keyboard (piano-style) for playing notes with the Synth module.

They were built independently, own disjoint sets of physical keys, and do not
conflict with each other. The last section of this document explains exactly
why.

---

## 1. Workstation keyboard — physical layout

The Workstation keyboard treats the top number row (plus the two punctuation
keys to its right) as 12 pads, and uses the key immediately to the left of
`1` — `Backquote` — as a momentary FUNCTION modifier, the same way a hardware
grid controller uses a SHIFT button to multiplex one row of pads across many
jobs.

```
[Backquote/~ key] = FUNCTION

[1][2][3][4][5][6][7][8][9][0][-][=]

 P1  P2  P3  P4  P5  P6  P7  P8  P9  P10 P11 P12
```

- `Backquote` is read by `KeyboardEvent.code`, **not** `.key` — see
  Section 4 for why that matters.
- Holding FUNCTION changes what the 12 pad keys do (Section 2) instead of
  triggering pads directly.
- `BracketLeft` (`[`) and `BracketRight` (`]`) sit just to the right of `P12`
  on a standard layout and are documented separately in Section 3 — they are
  **not** part of the FUNCTION layer, despite sounding similar to it.

### Pad-only behavior (FUNCTION not held)

When FUNCTION is not held, pressing a pad key (`Digit1`–`Digit0`, `Minus`,
`Equal`) fires `padDown(padIndex, velocity)` for the currently active
group/mode, and releasing it fires `padUp(padIndex)`. Exactly what "fires"
means depends on the current mode and on whether Backspace (erase), Tab
(note repeat), or Shift is also held — see Section 2's "Modifier keys"
subsection; those interactions are not part of the FUNCTION layer and work
whether or not FUNCTION is involved.

---

## 2. FUNCTION layer — every FUNCTION+key combo

FUNCTION is the physical key that reports `KeyboardEvent.code === "Backquote"`.
While it is held down, the 12 pad keys stop triggering pads and instead act
as a 4-group / 6-mode selector, plus mode prev/next:

| Key (code)  | FUNCTION+key action                              |
|-------------|---------------------------------------------------|
| `Digit1`    | Select group **A**                                |
| `Digit2`    | Select group **B**                                |
| `Digit3`    | Select group **C**                                |
| `Digit4`    | Select group **D**                                |
| `Digit5`    | Switch to **SOUND** mode                           |
| `Digit6`    | Switch to **KEYS** mode                            |
| `Digit7`    | Switch to **SEQUENCER** mode                       |
| `Digit8`    | Switch to **SAMPLE** mode                          |
| `Digit9`    | Switch to **FX** mode                              |
| `Digit0`    | Switch to **MIXER** mode                           |
| `Minus`     | Previous mode (cycles backward through the 6 modes)|
| `Equal`     | Next mode (cycles forward through the 6 modes)     |

Notes:

- Groups are the four parallel pad banks `A`, `B`, `C`, `D` (see
  `js/workstation/groups.js`); FUNCTION+1..4 calls
  `WorkstationGroups.setActiveLetter(...)`.
- Modes are, in order, `sound → keys → sequencer → sample → fx → mixer`
  (the `MODES` array in `keyboard.js`); FUNCTION+5..0 jumps directly to one,
  FUNCTION+Minus/Equal moves one step at a time and wraps around at both
  ends (`cycleMode`).
- FUNCTION+anything-else does nothing (the handler returns without side
  effects) and OS key-repeat while FUNCTION is held is ignored
  (`if (e.repeat) return;`), so holding a combo down does not re-fire it.
- Releasing `Backquote` clears FUNCTION and the next press of a pad key
  goes back to firing pads normally.

---

## 3. Non-pad controls — Space, Enter, Shift, Backspace, Tab, Escape, Brackets

These are read independently of FUNCTION — they do the same thing whether or
not FUNCTION happens to be held, because the FUNCTION branch in `keydown`
returns early only for the 12 pad codes and `Minus`/`Equal`, never for these.

| Key            | Behavior                                                                                                                                                                                 |
|----------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Space**      | Toggles playback (`WorkstationTransport.togglePlay()`). Ignored on OS key-repeat.                                                                                                        |
| **Enter**      | Toggles record-arm (`toggleRecordArm()`), which also calls `WorkstationTransport.setRecording(...)`. Ignored on OS key-repeat.                                                          |
| **Shift**      | *Held* modifier (either `ShiftLeft` or `ShiftRight`). Alone it does nothing; combined with a pad in `sequencer` mode it begins "nudge-select" (remembers which pad to nudge); combined with a pad while Tab (note-repeat) is held it latches note-repeat for that pad. Releasing Shift clears the nudge target. |
| **Backspace**  | *Held* modifier ("erase"). While held, pressing a pad erases that pad's lane from the active pattern (if playing) or erases at the sequencer's step cursor (if stopped), instead of triggering the pad's sound. `preventDefault()`'d so it never navigates back in the browser. |
| **Tab**        | *Held* modifier ("note repeat" — stands in for the EP-133's physical TIMING button). While held, pressing a pad arms note-repeat for that pad instead of triggering it once; releasing the pad disarms it; Shift+pad while Tab is held latches the repeat on. `preventDefault()`'d so it never moves keyboard focus. |
| **Escape**     | Not handled by this module at all. It is handled by `audio-engine.js`'s `panic()` function, which has its own independent listener and fires on every Escape press regardless of what else is listening — see Section 4. |
| **BracketLeft** (`[`)  | **MINUS.** If Shift is held and a pad is nudge-targeted (see Shift above), nudges that pad's recorded notes earlier (`offsetPad(..., -1)`). Otherwise, in `sequencer` mode while stopped, moves the step cursor back one step. Otherwise, delegates to `WorkstationUI.handleMinus()` (whatever "minus/scroll back" means for the currently visible screen). |
| **BracketRight** (`]`) | **PLUS.** Same three-way dispatch as BracketLeft, mirrored: nudges the targeted pad's notes later, or moves the step cursor forward one step, or delegates to `WorkstationUI.handlePlus()`. |

**On MINUS/PLUS vs. FUNCTION+Minus/Equal:** these are deliberately two
different physical keys that happen to serve a similar "move/scroll"
concept. `BracketLeft`/`BracketRight` (`[`/`]`) are the EP-133's own
ubiquitous increment/decrement control, used without FUNCTION. `Digit0`'s
neighbors `Minus`/`Equal` (the `-`/`=` keys, i.e. pads P11/P12) only mean
"previous/next mode" when FUNCTION is also held — without FUNCTION they are
just pads 11 and 12. Same-sounding names (MINUS/PLUS vs. mode prev/next),
different keys, intentional, documented here so it does not read as a bug.

---

## 4. Synth module — its own, separate keyboard mapping

`js/synth.js` predates and is completely independent of the Workstation
keyboard. It implements a piano-style "computer MIDI keyboard" performance
mode (the same concept as Ableton Live's Computer MIDI Keyboard), and reads
`KeyboardEvent.key` (lowercased), not `.code`.

```
Black keys:   W   E       T   Y   U
              │   │       │   │   │
White keys: A   S   D   F   G   H   J   K
```

| Key | Role                                  |
|-----|----------------------------------------|
| `A` | White key, offset 0 (root of current octave) |
| `S` | White key, offset 2                    |
| `D` | White key, offset 4                    |
| `F` | White key, offset 5                    |
| `G` | White key, offset 7                    |
| `H` | White key, offset 9                    |
| `J` | White key, offset 11                   |
| `K` | White key, offset 12 (root, one octave up) |
| `W` | Black key, offset 1                    |
| `E` | Black key, offset 3                    |
| `T` | Black key, offset 6                    |
| `Y` | Black key, offset 8                    |
| `U` | Black key, offset 10                    |
| `Z` | Octave down (`setOctave(octave - 1)`)   |
| `X` | Octave up (`setOctave(octave + 1)`)     |
| `C` | Velocity down (`setVelocity(velocityIndex - 1)`) |
| `V` | Velocity up (`setVelocity(velocityIndex + 1)`)   |

All note offsets are semitones from the current octave's C, stored in a
single source-of-truth map (`keyboardMap`) so Z/X (octave) only changes what
`pressNote()` resolves an offset to — nothing else needs to update. Pressing
a mapped key calls `pressNote(key, offset)`; releasing it calls
`releaseNote(key)`. Mouse/touch input (click, or "glide" — dragging across
the on-screen keyboard without lifting) funnels through the exact same
`pressNote`/`releaseNote` pair under a synthetic `"mouse-glide"` identifier,
so there is one note-playing path, not two, regardless of input device.
OS key-repeat is ignored (`e.repeat` check), and typing into an `<input>`,
`<select>`, `<textarea>`, or `contenteditable` element suppresses all of
this, exactly like the Workstation keyboard does.

---

## 5. Why the two systems do not conflict

The Workstation keyboard owns exactly this set of physical keys:

```
Digit1 Digit2 Digit3 Digit4 Digit5 Digit6 Digit7 Digit8 Digit9 Digit0
Minus Equal Backquote Space Enter Tab BracketLeft BracketRight Backspace
(and the real Shift keys, ShiftLeft/ShiftRight)
```

The Synth module owns exactly this set:

```
a s d f g h j k   (white keys)
w e t y u         (black keys)
z x               (octave down/up)
c v               (velocity down/up)
```

**No key appears in both lists.** Both modules attach their own
`document.addEventListener("keydown"/"keyup", ...)` at load time and both
run for the entire lifetime of the page — neither one ever removes the
other's listener, and neither checks whether the other is "active" first.
They simply never fire for the same key, by construction of the two key
sets above, so there is nothing to arbitrate: every keypress belongs to at
most one of the two systems (or to neither, if it's an unmapped key, or if
the focus is inside a text input, which both modules independently check
for and bail out of).

The one exception worth calling out explicitly is **Escape**. It is not
claimed by either module described in this document — the Workstation
keyboard has no `Escape` handling at all, and the Synth keyboard map doesn't
include it either. A third, independent listener in `audio-engine.js`
(`panic()`) handles Escape, and fires on every press of it regardless of
whatever else is listening. That's intentional: an audio panic button should
always work, not be gated behind which window happens to be focused.

---

## 6. Why `KeyboardEvent.code`, not `.key`

The Workstation keyboard binds every pad, FUNCTION, and control key by
`KeyboardEvent.code`, never `.key`. This matters most for `Backquote` — the
physical key immediately to the left of `1` on a standard row.

`.key` reports *what character the key currently produces*, which depends on
both the physical keyboard layout and the OS's active input language:

- On a US keyboard/layout, that key's `.key` value is `` ` `` (backtick) or
  `~` when Shifted.
- On many Korean keyboards/layouts, the same physical key's `.key` value is
  `₩` (the Won sign) instead.
- Other layouts (e.g. various European ones) put yet other characters there.

If FUNCTION were bound by `.key`, it would only work for whichever character
set the author tested with, and would silently stop working — with no error,
just a dead keyboard shortcut — the moment a user's OS input language or
physical layout differed from that assumption.

`.code` instead reports *which physical key was pressed*, independent of
what it's labeled or what character it currently types. `Backquote` always
means "the physical key left of 1," on every layout and every input
language, so FUNCTION (and every other Workstation-keyboard binding) keeps
working identically no matter what the key happens to display.
