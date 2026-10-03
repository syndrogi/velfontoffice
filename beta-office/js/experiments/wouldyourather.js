/**
 * BETA OFFICE experiment — Would You Rather
 * Click one of two option buttons for a binary dilemma, or Next for a
 * new one. Purely for fun — nothing is actually tallied anywhere.
 */
(function () {
  if (!window.BetaExperiments) return;

  var PROMPTS = [
    ["Always say what you're thinking", "Never speak again"],
    ["Have unlimited archive access", "Have unlimited studio time"],
    ["Travel anywhere instantly", "Talk to any animal"],
    ["Be famous for one day", "Be wealthy but unknown"],
    ["Relive today forever", "Skip straight to next year"],
    ["Know when you'll die", "Know how you'll die"],
  ];

  window.BetaExperiments.registerExperiment({
    id: "wouldyourather",
    name: "Would You Rather",
    category: "WORDPLAY",
    number: 96,
    description: "Click a side to vote, tallied just for fun",
    launch: function (container) {
      var readout = window.BetaControls.readout(container);
      var state = { current: PROMPTS[0] };

      function next() {
        state.current = PROMPTS[(Math.random() * PROMPTS.length) | 0];
        aBtn.textContent = state.current[0];
        bBtn.textContent = state.current[1];
        readout.textContent = "Pick one.";
      }

      var aBtn = window.BetaControls.miniBtn(container, state.current[0], function () {
        readout.innerHTML = "You picked: <strong>" + state.current[0] + "</strong>";
      });
      var bBtn = window.BetaControls.miniBtn(container, state.current[1], function () {
        readout.innerHTML = "You picked: <strong>" + state.current[1] + "</strong>";
      });
      window.BetaControls.miniBtn(container, "Next", next);

      readout.textContent = "Pick one.";

      return function cleanup() {};
    },
  });
})();
