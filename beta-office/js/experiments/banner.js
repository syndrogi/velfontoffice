/**
 * BETA OFFICE experiment — Banner
 * Type text and see it rendered huge across the window; a button cycles
 * through a few display styles.
 */
(function () {
  if (!window.BetaExperiments) return;

  var STYLES = ["normal", "outline", "strike"];

  window.BetaExperiments.registerExperiment({
    id: "banner",
    name: "Banner",
    category: "VISUAL",
    number: 56,
    description: "Type text, see it rendered huge",
    launch: function (container) {
      var input = document.createElement("input");
      input.type = "text";
      input.className = "beta-text-input";
      input.value = "HELLO";
      container.appendChild(input);

      var banner = window.BetaControls.sampleText(container, "HELLO");
      banner.classList.add("beta-banner-text");

      var state = { styleIndex: 0 };

      function applyStyle() {
        banner.classList.remove("beta-banner-outline", "beta-banner-strike");
        var s = STYLES[state.styleIndex];
        if (s === "outline") banner.classList.add("beta-banner-outline");
        if (s === "strike") banner.classList.add("beta-banner-strike");
      }

      input.addEventListener("input", function () {
        banner.textContent = input.value || " ";
      });

      window.BetaControls.miniBtn(container, "Cycle style", function () {
        state.styleIndex = (state.styleIndex + 1) % STYLES.length;
        applyStyle();
      });

      applyStyle();

      return function cleanup() {};
    },
  });
})();
