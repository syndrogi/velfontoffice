/**
 * MIDI OFFICE Manual — table-of-contents search filter only. The
 * content itself is plain static HTML in index.html (no build step
 * on this site, so there's nothing to generate it from at runtime).
 */
(function () {
  var search = document.getElementById("manualSearch");
  var tocList = document.getElementById("manualTocList");
  if (!search || !tocList) return;

  var items = Array.prototype.slice.call(tocList.querySelectorAll("li"));

  search.addEventListener("input", function () {
    var query = search.value.trim().toLowerCase();
    items.forEach(function (li) {
      var matches = !query || li.textContent.toLowerCase().indexOf(query) !== -1;
      li.classList.toggle("ws-is-hidden", !matches);
    });
  });
})();
