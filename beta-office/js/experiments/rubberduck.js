/**
 * BETA OFFICE experiment — Rubber Duck
 * Type your problem, click Explain, get a canned rubber-duck-debugging
 * response back. No real listening involved.
 */
(function () {
  if (!window.BetaExperiments) return;

  var RESPONSES = [
    "Keep going — say the next line out loud.",
    "What did you expect to happen there?",
    "Have you checked the obvious thing yet?",
    "Try explaining it to me more slowly.",
    "That's interesting. What happens right before that?",
    "Sounds like you already know the answer.",
    "Quack.",
  ];

  window.BetaExperiments.registerExperiment({
    id: "rubberduck",
    name: "Rubber Duck",
    category: "RUBBERDUCK",
    number: 74,
    description: "Explain your problem, the duck listens",
    launch: function (container) {
      var textarea = document.createElement("textarea");
      textarea.className = "beta-textarea";
      textarea.placeholder = "Explain your bug to the duck...";
      container.appendChild(textarea);

      var readout = window.BetaControls.readout(container);

      window.BetaControls.miniBtn(container, "Explain", function () {
        if (!textarea.value.trim()) {
          readout.textContent = "The duck is waiting.";
          return;
        }
        readout.textContent = RESPONSES[(Math.random() * RESPONSES.length) | 0];
      });

      return function cleanup() {};
    },
  });
})();
