/**
 * BETA OFFICE experiment — Word Cloud
 * Paste text, get a quick word-frequency cloud on canvas — size scales
 * with count, placement is random (not collision-checked, so words can
 * overlap on dense input; good enough for a fun toy, not a layout tool).
 */
(function () {
  if (!window.BetaExperiments) return;

  var STOPWORDS = ["the", "a", "an", "and", "or", "of", "to", "in", "is", "it", "for", "on", "with", "this", "that"];
  var MAX_WORDS = 20;

  window.BetaExperiments.registerExperiment({
    id: "wordcloud",
    name: "Word Cloud",
    category: "WORDCLOUD",
    description: "Paste text, see a word-frequency cloud",
    launch: function (container) {
      var textarea = document.createElement("textarea");
      textarea.className = "beta-textarea";
      textarea.placeholder = "Paste some text...";
      textarea.value = "velfont office archive fashion studio pattern velfont archive design velfont";
      container.appendChild(textarea);

      var stage = window.BetaControls.stage(container, true);
      var canvas = stage.canvas;
      var ctx2d = canvas.getContext("2d");
      var rect = stage.el.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      function build() {
        var words = textarea.value
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, "")
          .split(/\s+/)
          .filter(function (w) { return w.length > 1 && STOPWORDS.indexOf(w) === -1; });

        var counts = {};
        words.forEach(function (w) { counts[w] = (counts[w] || 0) + 1; });
        var entries = Object.keys(counts).map(function (w) { return { word: w, count: counts[w] }; });
        entries.sort(function (a, b) { return b.count - a.count; });
        entries = entries.slice(0, MAX_WORDS);

        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        if (!entries.length) return;
        var maxCount = entries[0].count;
        ctx2d.textBaseline = "middle";
        ctx2d.fillStyle = "#000";
        entries.forEach(function (e) {
          var size = 10 + (e.count / maxCount) * 22;
          ctx2d.font = "bold " + Math.round(size) + "px monospace";
          var textWidth = ctx2d.measureText(e.word).width;
          var x = 4 + Math.random() * Math.max(1, canvas.width - textWidth - 8);
          var y = 10 + Math.random() * Math.max(1, canvas.height - 20);
          ctx2d.fillText(e.word, x, y);
        });
      }

      window.BetaControls.miniBtn(container, "Generate", build);
      build();

      return function cleanup() {};
    },
  });
})();
