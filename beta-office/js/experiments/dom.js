/**
 * BETA OFFICE experiment — DOM
 * Outline everything (documented-element `outline`, cheap, matches the
 * root site's js/labs/blueprint.js technique), a bounded set of
 * element-bounds/name labels (capped so a few thousand nodes can't
 * jank the page), and a live DOM node count.
 */
(function () {
  if (!window.BetaExperiments) return;

  var MAX_LABELS = 80;

  window.BetaExperiments.registerExperiment({
    id: "dom",
    name: "DOM",
    category: "DOM",
    description: "Outline, bounds, live node count",
    launch: function (container) {
      var html = document.documentElement;
      var labels = [];
      var boundsOn = false;

      var readout = window.BetaControls.readout(container);
      function updateCount() {
        readout.innerHTML = "<strong>" + document.getElementsByTagName("*").length + "</strong> elements in document";
      }
      updateCount();
      var countTimer = window.setInterval(updateCount, 800);

      function clearLabels() {
        labels.forEach(function (l) { l.remove(); });
        labels = [];
      }

      function drawLabels() {
        clearLabels();
        if (!boundsOn) return;
        var all = document.querySelectorAll(".beta-office *");
        var vw = window.innerWidth, vh = window.innerHeight;
        var shown = 0;
        for (var i = 0; i < all.length && shown < MAX_LABELS; i++) {
          var elx = all[i];
          if (elx.closest(".beta-dom-label")) continue;
          var rect = elx.getBoundingClientRect();
          if (rect.width < 4 || rect.height < 4) continue;
          if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) continue;
          var label = document.createElement("div");
          label.className = "beta-dom-label";
          label.style.left = Math.max(0, rect.left) + "px";
          label.style.top = Math.max(0, rect.top - 12) + "px";
          label.textContent = elx.tagName.toLowerCase() + (elx.className && typeof elx.className === "string" ? "." + elx.className.split(" ")[0] : "");
          document.body.appendChild(label);
          labels.push(label);
          shown++;
        }
      }

      function onViewportChange() {
        if (boundsOn) drawLabels();
      }
      window.addEventListener("scroll", onViewportChange, { passive: true });
      window.addEventListener("resize", onViewportChange);

      window.BetaControls.toggleButton(container, {
        label: "Outline everything",
        onToggle: function (next) { html.classList.toggle("beta-dom-outline", next); },
      });
      window.BetaControls.toggleButton(container, {
        label: "Show bounds + names",
        onToggle: function (next) { boundsOn = next; drawLabels(); },
      });

      return function cleanup() {
        window.clearInterval(countTimer);
        window.removeEventListener("scroll", onViewportChange);
        window.removeEventListener("resize", onViewportChange);
        html.classList.remove("beta-dom-outline");
        clearLabels();
      };
    },
  });
})();
