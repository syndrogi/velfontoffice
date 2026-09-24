/**
 * BETA OFFICE experiment — Fortune
 * Click for a cryptic one-liner from a fixed pool — a magic-8-ball for
 * an office that makes clothes. Purely textual, no timers/canvas.
 */
(function () {
  if (!window.BetaExperiments) return;

  var FORTUNES = [
    "The seam holds. Ship it.",
    "Reconsider the hemline.",
    "A stranger will ask about your archive.",
    "The pattern was correct all along.",
    "Rest the fabric before you cut.",
    "Today favors the second draft.",
    "Someone is grading on a curve you can't see.",
    "The right size doesn't exist yet — make it.",
    "Return to the sketch. It knew something you forgot.",
    "Delay the launch by one day. Just one.",
    "The archive remembers what the calendar forgot.",
    "Not everything needs a zipper.",
    "Ask the intern. They already know.",
    "The mirror is right more often than the model.",
    "Velfont favors those who iron first.",
  ];

  window.BetaExperiments.registerExperiment({
    id: "fortune",
    name: "Fortune",
    category: "FORTUNE",
    description: "Click for a one-line fortune",
    launch: function (container) {
      var box = window.BetaControls.sampleText(container, "Click Ask for a fortune.");
      window.BetaControls.miniBtn(container, "Ask", function () {
        box.textContent = FORTUNES[(Math.random() * FORTUNES.length) | 0];
      });
      return function cleanup() {};
    },
  });
})();
