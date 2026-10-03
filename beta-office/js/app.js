/**
 * BETA OFFICE — Bootstrap
 * Runs last (after registry/manifest/window-manager/sphere/command-
 * palette/keyboard are all wired, and the eagerly-loaded experiments —
 * grid, color — have self-registered). Renders the control area as
 * real category groups (js/registry.js's getCategories()/getByCategory()
 * read from the static manifest, not from what's happened to load), each
 * filterable by the search box, and exposes window.BetaApp =
 * { randomizeAll, resetAll } — the single thing the RANDOMIZE/RESET
 * buttons, the command palette, and the `R`/`0` keyboard shortcuts all
 * call into, so there's one source of truth for "what does randomize/
 * reset actually do" (sections 15).
 */
(function () {
  if (!window.BetaExperiments || !window.BetaWM) return;

  var groupsEl = document.getElementById("betaCategoryGroups");
  var searchEl = document.getElementById("betaControlSearch");
  var randomizeBtn = document.getElementById("betaRandomizeBtn");
  var resetBtn = document.getElementById("betaResetBtn");

  function matches(entry, query) {
    if (!query) return true;
    return (
      entry.name.toLowerCase().indexOf(query) !== -1 ||
      entry.category.toLowerCase().indexOf(query) !== -1 ||
      (entry.description || "").toLowerCase().indexOf(query) !== -1
    );
  }

  function renderGroups() {
    if (!groupsEl) return;
    var query = (searchEl ? searchEl.value.trim().toLowerCase() : "");
    groupsEl.innerHTML = "";

    var any = false;
    window.BetaExperiments.getCategories().forEach(function (category) {
      var entries = window.BetaExperiments.getByCategory(category)
        .filter(function (entry) { return matches(entry, query); })
        .sort(function (a, b) { return (a.number || 0) - (b.number || 0); });
      if (!entries.length) return;
      any = true;

      var group = document.createElement("div");
      group.className = "beta-category-group";

      var title = document.createElement("h2");
      title.className = "beta-category-title";
      title.textContent = category;
      var count = document.createElement("span");
      count.className = "beta-category-count";
      count.textContent = entries.length;
      title.appendChild(count);
      group.appendChild(title);

      var items = document.createElement("div");
      items.className = "beta-category-items";
      entries.forEach(function (entry) {
        var item = document.createElement("button");
        item.type = "button";
        item.className = "beta-exp-item";

        var name = document.createElement("span");
        name.className = "beta-exp-name";
        name.textContent = (entry.number != null ? "#" + entry.number + " " : "") + entry.name;

        var desc = document.createElement("span");
        desc.className = "beta-exp-desc";
        desc.textContent = entry.description || "";

        item.appendChild(name);
        item.appendChild(desc);
        item.addEventListener("click", function () {
          window.BetaWM.openExperiment(entry.id);
        });
        items.appendChild(item);
      });
      group.appendChild(items);
      groupsEl.appendChild(group);
    });

    if (!any) {
      var empty = document.createElement("p");
      empty.className = "beta-category-empty";
      empty.textContent = 'No experiments match "' + query + '".';
      groupsEl.appendChild(empty);
    }
  }

  function randomizeAll() {
    if (window.BetaSphere) window.BetaSphere.randomize();
    window.BetaExperiments.getOpenInstances().forEach(function (instance) {
      if (instance.spec && typeof instance.spec.randomize === "function") {
        try {
          instance.spec.randomize(instance.container);
        } catch (e) {
          /* one experiment misbehaving shouldn't stop the others */
        }
      }
    });
  }

  function resetAll() {
    if (window.BetaSphere) window.BetaSphere.reset();
    window.BetaExperiments.getOpenInstances().forEach(function (instance) {
      if (instance.spec && typeof instance.spec.reset === "function") {
        try {
          instance.spec.reset(instance.container);
        } catch (e) {
          /* same as above */
        }
      }
    });
  }

  if (randomizeBtn) randomizeBtn.addEventListener("click", randomizeAll);
  if (resetBtn) resetBtn.addEventListener("click", resetAll);
  if (searchEl) searchEl.addEventListener("input", renderGroups);

  renderGroups();

  window.BetaApp = { randomizeAll: randomizeAll, resetAll: resetAll };
})();
