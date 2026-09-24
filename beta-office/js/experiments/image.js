/**
 * BETA OFFICE experiment — Image
 * Drop (or pick) an image file, preview it, toggle grayscale/invert/
 * blur CSS filters — independently combinable, not radio-style.
 */
(function () {
  if (!window.BetaExperiments) return;

  window.BetaExperiments.registerExperiment({
    id: "image",
    name: "Image",
    category: "IMAGE",
    description: "Drop a file, grayscale/invert/blur",
    launch: function (container) {
      var drop = document.createElement("div");
      drop.className = "beta-drop-zone";
      drop.textContent = "Drop an image here, or click to choose one";
      drop.tabIndex = 0;

      var fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.style.display = "none";

      var preview = document.createElement("img");
      preview.className = "beta-drop-preview";
      preview.hidden = true;

      container.appendChild(drop);
      container.appendChild(fileInput);
      container.appendChild(preview);

      var active = { grayscale: false, invert: false, blur: false };
      function applyFilter() {
        var parts = [];
        if (active.grayscale) parts.push("grayscale(1)");
        if (active.invert) parts.push("invert(1)");
        if (active.blur) parts.push("blur(4px)");
        preview.style.filter = parts.join(" ");
      }

      function loadFile(file) {
        if (!file || file.type.indexOf("image/") !== 0) return;
        var reader = new FileReader();
        reader.onload = function () {
          preview.src = reader.result;
          preview.hidden = false;
          applyFilter();
        };
        reader.readAsDataURL(file);
      }

      drop.addEventListener("click", function () { fileInput.click(); });
      drop.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") fileInput.click();
      });
      fileInput.addEventListener("change", function () {
        if (fileInput.files && fileInput.files[0]) loadFile(fileInput.files[0]);
      });
      drop.addEventListener("dragover", function (e) {
        e.preventDefault();
        drop.classList.add("beta-is-over");
      });
      drop.addEventListener("dragleave", function () {
        drop.classList.remove("beta-is-over");
      });
      drop.addEventListener("drop", function (e) {
        e.preventDefault();
        drop.classList.remove("beta-is-over");
        if (e.dataTransfer && e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
      });

      window.BetaControls.toggleButton(container, { label: "Grayscale", onToggle: function (v) { active.grayscale = v; applyFilter(); } });
      window.BetaControls.toggleButton(container, { label: "Invert", onToggle: function (v) { active.invert = v; applyFilter(); } });
      window.BetaControls.toggleButton(container, { label: "Blur", onToggle: function (v) { active.blur = v; applyFilter(); } });

      return function cleanup() {};
    },
  });
})();
