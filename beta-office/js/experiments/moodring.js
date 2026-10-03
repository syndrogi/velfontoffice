/**
 * BETA OFFICE experiment — Mood Ring
 * Click for a random mood reading plus a matching color swatch.
 */
(function () {
  if (!window.BetaExperiments) return;

  var MOODS = [
    { name: "Focused", color: "#2b5fd9" },
    { name: "Restless", color: "#e0261f" },
    { name: "Content", color: "#1f9e5a" },
    { name: "Curious", color: "#e0b400" },
    { name: "Wistful", color: "#8a6fd9" },
    { name: "Bold", color: "#111111" },
  ];

  window.BetaExperiments.registerExperiment({
    id: "moodring",
    name: "Mood Ring",
    category: "VISUAL",
    number: 73,
    description: "Click for a random mood + color",
    launch: function (container) {
      var swatch = document.createElement("div");
      swatch.className = "beta-moodring-swatch";
      container.appendChild(swatch);

      var readout = window.BetaControls.readout(container);

      function read() {
        var mood = MOODS[(Math.random() * MOODS.length) | 0];
        swatch.style.backgroundColor = mood.color;
        readout.innerHTML = "You are feeling: <strong>" + mood.name + "</strong>";
      }

      window.BetaControls.miniBtn(container, "Read mood", read);
      read();

      return function cleanup() {};
    },
  });
})();
