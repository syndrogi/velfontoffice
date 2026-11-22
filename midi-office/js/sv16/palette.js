/**
 * MIDI OFFICE — SV-16 / Palette
 * Three colour slots — ACC (signal colour), INK (lines and type) and
 * PAP (paper) — edited Photoshop-style: pick a slot, then drag the
 * saturation/brightness field and hue strip, type HEX or RGB, or click
 * a swatch. derive() mixes every other board colour from the three, so
 * any combination stays coherent. Saved swatches live in this browser's
 * localStorage only.
 */
(() => {
  const DEFAULT_SLOTS = { acc: "#FF5A00", ink: "#121212", pap: "#ECEBE6" };
  const PRESETS = [
    "#FF5A00",
    "#FF2A1A",
    "#FFC300",
    "#00A651",
    "#0047FF",
    "#6A3DF0",
    "#121212",
    "#4A4A46",
    "#8C8C86",
    "#ECEBE6",
    "#F7F7F2",
    "#D8D2C4",
    "#1C1D1F",
    "#C9DDE4",
  ];
  const SLOT_LABELS = { acc: "ACC", ink: "INK", pap: "PAP" };
  const STORAGE_KEY = "vfo-sv16-swatches";
  const MAX_SAVED = 28;
  const LIGHT_ACCENT = 0.35; // relative luminance above which text on ACC turns dark

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const isHex = (hex) => /^#[0-9a-f]{6}$/i.test(hex);

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbToHex(r, g, b) {
    return (
      "#" +
      [r, g, b]
        .map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()
    );
  }

  function mix(from, to, amount) {
    const a = hexToRgb(from);
    const b = hexToRgb(to);
    return "rgb(" + a.map((v, i) => Math.round(v + (b[i] - v) * amount)).join(",") + ")";
  }

  function luminance(hex) {
    const [r, g, b] = hexToRgb(hex).map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function hsvToHex(h, s, v) {
    const f = (n) => {
      const k = (n + h / 60) % 6;
      return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    };
    return rgbToHex(f(5) * 255, f(3) * 255, f(1) * 255);
  }

  function hexToHsv(hex) {
    const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
    const max = Math.max(r, g, b);
    const d = max - Math.min(r, g, b);
    let h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return [h, max ? d / max : 0, max];
  }

  /** Every colour the renderer uses, mixed from the three slots. */
  function derive(slots) {
    const P = slots.pap;
    const I = slots.ink;
    const X = slots.acc;
    return {
      C: {
        bg: P,
        line: mix(I, P, 0.7),
        grid: mix(I, P, 0.84),
        faint: mix(I, P, 0.89),
        ghost: mix(I, P, 0.66),
        stripe: mix(I, P, 0.95),
        text: mix(I, P, 0.46),
        ink: I,
        box: mix(I, P, 0.93),
        bar: mix(I, P, 0.18),
      },
      A: { main: X, soft: mix(X, P, 0.45), pale: mix(X, P, 0.72), deep: mix(X, I, 0.32) },
      onA: luminance(X) > LIGHT_ACCENT ? I : P,
    };
  }

  function loadSaved() {
    try {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(list) ? list.filter(isHex) : [];
    } catch (error) {
      return [];
    }
  }

  function storeSaved(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (error) {
      /* private mode or blocked storage: swatches just won't persist */
    }
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function button(className, text, label) {
    const node = el("button", className, text);
    node.type = "button";
    if (label) node.setAttribute("aria-label", label);
    return node;
  }

  // Pointer drag on a canvas, reporting the position as 0-1 fractions.
  function onDrag(canvas, handler) {
    let active = false;
    const report = (event) => {
      const rect = canvas.getBoundingClientRect();
      handler(
        clamp((event.clientX - rect.left) / rect.width, 0, 1),
        clamp((event.clientY - rect.top) / rect.height, 0, 1),
      );
    };
    canvas.addEventListener("pointerdown", (event) => {
      active = true;
      canvas.setPointerCapture(event.pointerId);
      report(event);
    });
    canvas.addEventListener("pointermove", (event) => {
      if (active) report(event);
    });
    canvas.addEventListener("pointerup", () => (active = false));
    canvas.addEventListener("pointercancel", () => (active = false));
  }

  /**
   * Builds the COLOR controls into `parent` and calls onChange(colors)
   * whenever a slot changes. Returns { colors() } for the current set.
   */
  function buildPaletteControls(parent, onChange) {
    const slots = { ...DEFAULT_SLOTS };
    let active = "acc";
    let hsv = hexToHsv(slots.acc);
    let saved = loadSaved();

    const slotRow = el("div", "tone-sv16-slots");
    const slotButtons = Object.keys(SLOT_LABELS).map((key) => {
      const slot = button("tone-sv16-slot");
      slot.dataset.slot = key;
      slot.append(el("i"), SLOT_LABELS[key]);
      slotRow.appendChild(slot);
      return slot;
    });
    const swapBtn = button("tone-sv16-key", "⇄", "Swap INK and PAP");
    const resetBtn = button("tone-sv16-key", "↺", "Reset colours");
    slotRow.append(swapBtn, resetBtn);

    const field = el("canvas", "tone-sv16-sv");
    field.width = 480;
    field.height = 240;
    field.setAttribute("aria-label", "Saturation and brightness");
    const strip = el("canvas", "tone-sv16-hue");
    strip.width = 480;
    strip.height = 32;
    strip.setAttribute("aria-label", "Hue");
    const fieldCtx = field.getContext("2d");
    const stripCtx = strip.getContext("2d");

    const values = el("div", "tone-sv16-values");
    const inputs = {};
    [
      ["hex", "HEX"],
      ["r", "R"],
      ["g", "G"],
      ["b", "B"],
    ].forEach(([key, text]) => {
      const label = el("label", "tone-sv16-value", text);
      const input = el("input");
      if (key === "hex") {
        input.maxLength = 7;
        input.spellcheck = false;
        input.autocomplete = "off";
      } else {
        input.type = "number";
        input.min = "0";
        input.max = "255";
        input.inputMode = "numeric";
      }
      label.appendChild(input);
      values.appendChild(label);
      inputs[key] = input;
    });

    const swatchGrid = el("div", "tone-sv16-swatches");
    const hint = el(
      "p",
      "tone-hint",
      "Click a swatch to fill the selected slot. + saves the current colour; Shift-click a saved swatch to remove it.",
    );

    parent.append(slotRow, field, strip, values, swatchGrid, hint);

    const colors = () => derive(slots);

    function drawField() {
      const w = field.width;
      const h = field.height;
      fieldCtx.fillStyle = hsvToHex(hsv[0], 1, 1);
      fieldCtx.fillRect(0, 0, w, h);
      let gradient = fieldCtx.createLinearGradient(0, 0, w, 0);
      gradient.addColorStop(0, "#fff");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      fieldCtx.fillStyle = gradient;
      fieldCtx.fillRect(0, 0, w, h);
      gradient = fieldCtx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, "#000");
      fieldCtx.fillStyle = gradient;
      fieldCtx.fillRect(0, 0, w, h);
      fieldCtx.lineWidth = 3;
      fieldCtx.strokeStyle = hsv[2] > 0.55 ? "#000" : "#fff";
      fieldCtx.strokeRect(hsv[1] * w - 8, (1 - hsv[2]) * h - 8, 16, 16);

      const sw = strip.width;
      const sh = strip.height;
      const hues = stripCtx.createLinearGradient(0, 0, sw, 0);
      for (let i = 0; i <= 6; i++) hues.addColorStop(i / 6, hsvToHex((i * 60) % 360, 1, 1));
      stripCtx.fillStyle = hues;
      stripCtx.fillRect(0, 0, sw, sh);
      const x = (hsv[0] / 360) * sw;
      stripCtx.fillStyle = "#000";
      stripCtx.fillRect(x - 4, 0, 8, sh);
      stripCtx.fillStyle = "#fff";
      stripCtx.fillRect(x - 1.5, 4, 3, sh - 8);
    }

    function syncInputs() {
      const hex = slots[active];
      const [r, g, b] = hexToRgb(hex);
      inputs.hex.value = hex.toUpperCase();
      inputs.r.value = r;
      inputs.g.value = g;
      inputs.b.value = b;
      slotButtons.forEach((slot) => {
        slot.setAttribute("aria-pressed", String(slot.dataset.slot === active));
        slot.querySelector("i").style.backgroundColor = slots[slot.dataset.slot];
      });
    }

    function commit() {
      syncInputs();
      drawField();
      onChange(colors());
    }

    function setColor(hex, keepHsv) {
      if (!isHex(hex)) return;
      slots[active] = hex.toUpperCase();
      if (!keepHsv) hsv = hexToHsv(hex);
      commit();
    }

    function selectSlot(key) {
      active = key;
      hsv = hexToHsv(slots[key]);
      syncInputs();
      drawField();
    }

    function renderSwatches() {
      swatchGrid.replaceChildren();
      [...PRESETS, ...saved].forEach((hex, index) => {
        const swatch = button("tone-sv16-swatch", "", hex);
        swatch.style.backgroundColor = hex;
        swatch.title = hex;
        swatch.addEventListener("click", (event) => {
          const savedIndex = index - PRESETS.length;
          if (event.shiftKey) {
            if (savedIndex >= 0) {
              saved.splice(savedIndex, 1);
              storeSaved(saved);
              renderSwatches();
            }
            return;
          }
          setColor(hex);
        });
        swatchGrid.appendChild(swatch);
      });
      const add = button("tone-sv16-swatch tone-sv16-swatch-add", "+", "Save current colour");
      add.addEventListener("click", () => {
        const hex = slots[active];
        if (PRESETS.includes(hex) || saved.includes(hex)) return;
        saved.push(hex);
        if (saved.length > MAX_SAVED) saved.shift();
        storeSaved(saved);
        renderSwatches();
      });
      swatchGrid.appendChild(add);
    }

    onDrag(field, (x, y) => {
      hsv[1] = x;
      hsv[2] = 1 - y;
      setColor(hsvToHex(...hsv), true);
    });
    onDrag(strip, (x) => {
      hsv[0] = x * 359.9;
      setColor(hsvToHex(...hsv), true);
    });
    inputs.hex.addEventListener("change", () => {
      let value = inputs.hex.value.trim();
      if (!value.startsWith("#")) value = "#" + value;
      if (/^#[0-9a-f]{3}$/i.test(value))
        value = "#" + [...value.slice(1)].map((c) => c + c).join("");
      if (isHex(value)) setColor(value);
      else syncInputs();
    });
    ["r", "g", "b"].forEach((key) => {
      inputs[key].addEventListener("change", () => {
        setColor(rgbToHex(+inputs.r.value || 0, +inputs.g.value || 0, +inputs.b.value || 0));
      });
    });
    slotButtons.forEach((slot) =>
      slot.addEventListener("click", () => selectSlot(slot.dataset.slot)),
    );
    swapBtn.addEventListener("click", () => {
      [slots.ink, slots.pap] = [slots.pap, slots.ink];
      hsv = hexToHsv(slots[active]);
      commit();
    });
    resetBtn.addEventListener("click", () => {
      Object.assign(slots, DEFAULT_SLOTS);
      hsv = hexToHsv(slots[active]);
      commit();
    });

    renderSwatches();
    syncInputs();
    drawField();
    return { colors };
  }

  window.ToneSv16Palette = { buildPaletteControls, derive, DEFAULT_SLOTS };
})();
