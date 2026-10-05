/**
 * TONE OFFICE — Delay
 * The UI for the one shared effect send every synth note already
 * passes through (see audio-engine.js's delay bus) — this window just
 * exposes its three knobs. Drum hits, sampler pads, and DJ decks skip
 * it on purpose (see audio-engine.js's connectDry) so it only ever
 * colors the synth.
 */
(function () {
  function sliderField(labelText, min, max, value, onInput) {
    var field = document.createElement("div");
    field.className = "tone-field";
    var label = document.createElement("label");
    label.textContent = labelText;
    var input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.value = String(value);
    input.addEventListener("input", function () {
      onInput(Number(input.value));
    });
    field.appendChild(label);
    field.appendChild(input);
    return field;
  }

  function buildWindow(container) {
    var controls = document.createElement("div");
    controls.className = "tone-fx-controls";

    controls.appendChild(sliderField("TIME", 0, 800, 260, function (v) {
      window.ToneEngine.setDelayTime(v / 1000);
    }));
    controls.appendChild(sliderField("FEEDBACK", 0, 85, 35, function (v) {
      window.ToneEngine.setDelayFeedback(v / 100);
    }));
    controls.appendChild(sliderField("MIX", 0, 100, 25, function (v) {
      window.ToneEngine.setDelayMix(v / 100);
    }));

    container.appendChild(controls);
  }

  window.ToneDelay = { buildWindow: buildWindow };
})();
