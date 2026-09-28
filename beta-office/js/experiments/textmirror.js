/**
 * BETA OFFICE experiment — Text Mirror
 * Type text and see it echoed back reversed, upside-down (rotated), or
 * mirrored (flipped horizontally) — cycled by a single button.
 */
(function () {
  if (!window.BetaExperiments) return;

  var MODES = ["reverse", "upside-down", "mirror"];

  function reverseString(s) { return s.split("").reverse().join(""); }

  window.BetaExperiments.registerExperiment({
    id: "textmirror",
    name: "Text Mirror",
    category: "TEXTMIRROR",
    description: "Type text, see it reversed/flipped/mirrored",
    launch: function (container) {
      var input = document.createElement("input");
      input.type = "text";
      input.className = "beta-text-input";
      input.value = "VELFONT";
      container.appendChild(input);

      var output = window.BetaControls.sampleText(container, "");
      output.classList.add("beta-textmirror-output");

      var state = { modeIndex: 0 };

      function render() {
        var mode = MODES[state.modeIndex];
        output.classList.remove("beta-textmirror-flip", "beta-textmirror-mirror");
        if (mode === "reverse") {
          output.textContent = reverseString(input.value);
        } else if (mode === "upside-down") {
          output.textContent = input.value;
          output.classList.add("beta-textmirror-flip");
        } else {
          output.textContent = input.value;
          output.classList.add("beta-textmirror-mirror");
        }
      }

      input.addEventListener("input", render);
      window.BetaControls.miniBtn(container, "Cycle mode", function () {
        state.modeIndex = (state.modeIndex + 1) % MODES.length;
        render();
      });

      render();

      return function cleanup() {};
    },
  });
})();
