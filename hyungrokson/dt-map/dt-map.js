/**
 * DT MAP — PLAYING FIELD
 * Reads window.DT_MAP_DATA (dt-map-data.js) and builds:
 *   - the desktop pan/zoom network (SVG lines + positioned node buttons)
 *   - the mobile vertical archive (same data, grouped list)
 *   - the detail panel shared by both
 *   - the consolidated Sources list
 *   - the print/PDF view
 * No frameworks, no build step, no physics engine — node positions are
 * a fixed, hand-tunable floor plan (see LAYOUT below) rather than a
 * force simulation, so the map looks the same on every load and is
 * easy to adjust by hand as content grows.
 */
(function () {
  var DATA = window.DT_MAP_DATA;
  if (!DATA) return;

  var CATEGORIES = DATA.categories;
  var GROUPS = DATA.groups;
  var NODES = DATA.nodes;

  var CATEGORY_BY_ID = {};
  CATEGORIES.forEach(function (c) { CATEGORY_BY_ID[c.id] = c; });

  var GROUP_BY_ID = {};
  GROUPS.forEach(function (g) { GROUP_BY_ID[g.id] = g; });

  var NODE_BY_ID = {};
  NODES.forEach(function (n) { NODE_BY_ID[n.id] = n; });

  // Every relationship only needs to be written on one side in the
  // data file — mirror it here so hover/click highlighting works
  // regardless of which node the pair was declared from.
  (function symmetrizeLinks() {
    NODES.forEach(function (n) {
      (n.relatedIds || []).forEach(function (otherId) {
        var other = NODE_BY_ID[otherId];
        if (!other) return;
        if (!other.relatedIds) other.relatedIds = [];
        if (other.relatedIds.indexOf(n.id) === -1) other.relatedIds.push(n.id);
      });
    });
  })();

  // ==========================================================================
  // Layout — a curated editorial composition, not a "fit everything"
  // network. Only TIER2_IDS (the confirmed core references: the 9
  // People, the 2 official Inspiring Projects, and the non-planned
  // Technology/Skill items) get a position on the desktop canvas and
  // count toward the initial "reset" framing. Everything else —
  // concept-connector nodes, the People group hubs, Roy's own
  // secondary projects, and every status:"planned" slot — still lives
  // fully in the data (Sources, the mobile archive, and Print view
  // show all of it) but stays off the curated map itself, reachable
  // only via a node's own "Connected to" list or the In Development
  // drawer. This is what keeps the primary view legible instead of
  // fitting all 46 nodes into one shot.
  // ==========================================================================

  var TIER2_IDS = [
    "kim-ximya", "aphex-twin", "brutalismus-3000",
    "yumin-ha", "dongjoon-lim", "vivienne-westwood",
    "banksy", "mschf", "teenage-engineering",
    "love-is-in-the-bin", "field-system",
    "programming-languages", "english-communication",
    "higgsfield-ai",
  ];
  var TIER2_SET = {};
  TIER2_IDS.forEach(function (id) { TIER2_SET[id] = true; });

  function isPositioned(id) {
    return id === "core" || !!TIER2_SET[id];
  }

  var CORE_POS = { x: 950, y: 560 };

  // One entry per one of the six main category groups the brief asks
  // for. `label` is the pale background typography; `members` are the
  // TIER2_IDS that belong to it, laid out as a tight row centered on
  // (cx, cy). Moving a cluster, or how far apart its members sit, is
  // just editing the numbers here.
  //
  // The spread between clusters is deliberately TIGHT relative to card
  // size: resetView() fits this whole footprint to ~80% of the
  // viewport (see RESET_FILL below), so a wide-open composition
  // doesn't just look sparser — it forces a smaller fit scale and
  // every card physically renders smaller on screen. Keeping cluster
  // centers close together is what makes the cards themselves read as
  // large; if the composition ever needs more breathing room, prefer
  // nudging RESET_FILL down over spreading these back out.
  var CLUSTERS = [
    { id: "sound", label: "SOUND", cx: 380, cy: 220, gap: 240, members: ["kim-ximya", "aphex-twin", "brutalismus-3000"] },
    { id: "fashion", label: "FASHION", cx: 1520, cy: 220, gap: 240, members: ["yumin-ha", "dongjoon-lim", "vivienne-westwood"] },
    { id: "art", label: "ART, DESIGN & CREATIVE PRACTICE", cx: 380, cy: 560, gap: 240, members: ["banksy", "mschf", "teenage-engineering"] },
    { id: "projects", label: "INSPIRING PROJECTS", cx: 1520, cy: 560, gap: 255, members: ["love-is-in-the-bin", "field-system"] },
    { id: "new-tech", label: "TECHNOLOGIES & SKILLS", cx: 660, cy: 900, gap: 255, members: ["programming-languages", "english-communication"] },
    { id: "existing-skills", label: "SKILLS TO IMPROVE", cx: 1240, cy: 900, gap: 0, members: ["higgsfield-ai"] },
  ];

  var positions = {}; // id -> {x, y} — only core + TIER2_IDS ever get an entry

  function buildLayout() {
    positions.core = CORE_POS;
    CLUSTERS.forEach(function (cluster) {
      var n = cluster.members.length;
      var startX = cluster.cx - (cluster.gap * (n - 1)) / 2;
      cluster.members.forEach(function (id, i) {
        positions[id] = { x: startX + cluster.gap * i, y: cluster.cy + 110 };
      });
    });
  }

  buildLayout();

  // ==========================================================================
  // DOM refs
  // ==========================================================================

  var elFilters = document.getElementById("dtmFilters");
  var elStage = document.getElementById("dtmStage");
  var elViewport = document.getElementById("dtmViewport");
  var elCanvas = document.getElementById("dtmCanvas");
  var elLines = document.getElementById("dtmLines");
  var elNodes = document.getElementById("dtmNodes");
  var elArchive = document.getElementById("dtmArchive");
  var elSources = document.getElementById("dtmSources");
  var elSourcesToggle = document.getElementById("dtmSourcesToggle");
  var elPanelBackdrop = document.getElementById("dtmPanelBackdrop");
  var elPanel = document.getElementById("dtmPanel");
  var elPanelClose = document.getElementById("dtmPanelClose");
  var elPanelBody = document.getElementById("dtmPanelBody");
  var elPrintView = document.getElementById("dtmPrintView");
  var elPrintBtn = document.getElementById("dtmPrint");
  var elResetBtn = document.getElementById("dtmReset");
  var elZoomIn = document.getElementById("dtmZoomIn");
  var elZoomOut = document.getElementById("dtmZoomOut");
  var elDrawer = document.getElementById("dtmDrawer");
  var elDevToggle = document.getElementById("dtmDevToggle");
  var elPresentToggle = document.getElementById("dtmPresentToggle");
  var elPresentNav = document.getElementById("dtmPresentNav");
  var elPresentPrev = document.getElementById("dtmPresentPrev");
  var elPresentNext = document.getElementById("dtmPresentNext");
  var elPresentExit = document.getElementById("dtmPresentExit");
  var elPresentLabel = document.getElementById("dtmPresentLabel");

  var SVG_NS = "http://www.w3.org/2000/svg";

  // ==========================================================================
  // Filters
  // ==========================================================================

  var activeCategories = {};
  CATEGORIES.forEach(function (c) { activeCategories[c.id] = true; });

  function renderFilters() {
    var allChip = document.createElement("button");
    allChip.type = "button";
    allChip.className = "dtm-filter-chip is-active";
    allChip.textContent = "All";
    allChip.addEventListener("click", function () {
      CATEGORIES.forEach(function (c) { activeCategories[c.id] = true; });
      syncFilterChips();
      applyFilters();
    });
    elFilters.appendChild(allChip);

    CATEGORIES.forEach(function (c) {
      if (c.filterable === false) return;
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "dtm-filter-chip is-active";
      chip.textContent = c.label;
      chip.dataset.category = c.id;
      chip.addEventListener("click", function () {
        activeCategories[c.id] = !activeCategories[c.id];
        syncFilterChips();
        applyFilters();
      });
      elFilters.appendChild(chip);
    });
  }

  function syncFilterChips() {
    var chips = elFilters.querySelectorAll(".dtm-filter-chip[data-category]");
    var allOn = true;
    chips.forEach(function (chip) {
      var on = !!activeCategories[chip.dataset.category];
      chip.classList.toggle("is-active", on);
      if (!on) allOn = false;
    });
    elFilters.querySelector(".dtm-filter-chip:not([data-category])").classList.toggle("is-active", allOn);
  }

  function applyFilters() {
    NODES.forEach(function (n) {
      var visible = n.category === "core" || activeCategories[n.category];
      var el = document.getElementById("dtm-node-" + n.id);
      if (el) el.classList.toggle("is-filtered-out", !visible);
    });
    elLines.querySelectorAll("line").forEach(function (line) {
      var a = document.getElementById("dtm-node-" + line.dataset.from);
      var b = document.getElementById("dtm-node-" + line.dataset.to);
      var hidden = (a && a.classList.contains("is-filtered-out")) || (b && b.classList.contains("is-filtered-out"));
      line.style.display = hidden ? "none" : "";
    });
    renderArchive();
  }

  // ==========================================================================
  // Node card (desktop network) — only core + TIER2_IDS ever render
  // here (see Layout above); everything else stays data-only.
  // ==========================================================================

  // A short category code for the placeholder art area — "SND-01"
  // reads as an intentional archival index, not a missing asset.
  var CLUSTER_CODE = { sound: "SND", fashion: "FSH", art: "ART", projects: "PRJ", "new-tech": "TCH", "existing-skills": "IMP" };

  function clusterOf(id) {
    for (var i = 0; i < CLUSTERS.length; i++) {
      if (CLUSTERS[i].members.indexOf(id) !== -1) return CLUSTERS[i];
    }
    return null;
  }

  function createNodeEl(n, index) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dtm-node";
    var cluster = clusterOf(n.id);
    if (n.id === "core") {
      btn.classList.add("dtm-node--core");
    } else if (cluster) {
      btn.classList.add("dtm-node--" + cluster.id);
    }
    btn.id = "dtm-node-" + n.id;
    btn.dataset.id = n.id;
    btn.dataset.category = n.category;
    var pos = positions[n.id] || CORE_POS;
    btn.style.left = pos.x + "px";
    btn.style.top = pos.y + "px";

    if (n.id === "core") {
      var name = document.createElement("span");
      name.className = "dtm-node-name";
      name.textContent = n.name;
      btn.appendChild(name);
    } else {
      var art = document.createElement("span");
      art.className = "dtm-node-art";
      var code = document.createElement("span");
      code.className = "dtm-node-code";
      code.textContent = cluster ? CLUSTER_CODE[cluster.id] + "-" + String(index + 1).padStart(2, "0") : "";
      art.appendChild(code);
      btn.appendChild(art);

      var body = document.createElement("span");
      body.className = "dtm-node-body";

      var idx = document.createElement("span");
      idx.className = "dtm-node-index";
      idx.textContent = String(index + 1).padStart(2, "0");
      body.appendChild(idx);

      var name2 = document.createElement("span");
      name2.className = "dtm-node-name";
      name2.textContent = n.name;
      body.appendChild(name2);

      if (n.role) {
        var role = document.createElement("span");
        role.className = "dtm-node-role";
        role.textContent = n.role.split(" — ")[0].split(" (")[0];
        body.appendChild(role);
      }

      if (n.keywords) {
        var kw = document.createElement("span");
        kw.className = "dtm-node-keywords";
        kw.textContent = n.keywords;
        body.appendChild(kw);
      }

      if (n.status !== "complete") {
        var tag = document.createElement("span");
        tag.className = "dtm-status-tag dtm-status-tag--" + n.status;
        tag.textContent = n.status.toUpperCase();
        body.appendChild(tag);
      }

      btn.appendChild(body);
    }

    btn.addEventListener("click", function () { selectNode(n.id); });
    btn.addEventListener("mouseenter", function () { previewHighlight(n.id); });
    btn.addEventListener("mouseleave", clearPreview);
    btn.addEventListener("focus", function () { previewHighlight(n.id); });
    btn.addEventListener("blur", clearPreview);

    return btn;
  }

  function renderNodes() {
    elNodes.appendChild(createNodeEl(NODE_BY_ID.core, 0));
    CLUSTERS.forEach(function (cluster) {
      cluster.members.forEach(function (id, i) {
        elNodes.appendChild(createNodeEl(NODE_BY_ID[id], i));
      });

      var label = document.createElement("div");
      label.className = "dtm-cluster-label";
      label.style.left = cluster.cx + "px";
      label.style.top = cluster.cy - 60 + "px";
      label.textContent = cluster.label;
      elNodes.appendChild(label);
    });
  }

  // ==========================================================================
  // Connection lines — two kinds. STRUCTURAL lines (core → each of the
  // six cluster centers) are the map's stable backbone and always
  // visible. SECONDARY lines are the real relatedIds data, but only
  // drawn between two nodes that both have a position (i.e. both
  // TIER2_IDS) — a relationship pointing at an off-map concept/
  // placeholder node just shows up as text in that node's "Connected
  // to" list instead of a dangling line. Secondary lines stay almost
  // invisible until a hover/selection asks for them (see Highlight).
  // ==========================================================================

  var edgeList = []; // [idA, idB]

  function buildEdges() {
    var seen = {};
    NODES.forEach(function (n) {
      (n.relatedIds || []).forEach(function (otherId) {
        if (!isPositioned(n.id) || !isPositioned(otherId)) return;
        var key = [n.id, otherId].sort().join("|");
        if (seen[key]) return;
        seen[key] = true;
        edgeList.push([n.id, otherId]);
      });
    });
  }

  function renderStructuralLines() {
    CLUSTERS.forEach(function (cluster) {
      var line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("x1", CORE_POS.x);
      line.setAttribute("y1", CORE_POS.y);
      line.setAttribute("x2", cluster.cx);
      line.setAttribute("y2", cluster.cy);
      line.setAttribute("class", "dtm-line-structural");
      line.dataset.cluster = cluster.id;
      elLines.appendChild(line);
    });
  }

  function renderLines() {
    edgeList.forEach(function (pair) {
      var a = positions[pair[0]];
      var b = positions[pair[1]];
      if (!a || !b) return;
      var line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("x1", a.x);
      line.setAttribute("y1", a.y);
      line.setAttribute("x2", b.x);
      line.setAttribute("y2", b.y);
      line.setAttribute("class", "dtm-line-secondary");
      line.dataset.from = pair[0];
      line.dataset.to = pair[1];
      elLines.appendChild(line);
    });
  }

  // ==========================================================================
  // Highlight — a hover is just a PREVIEW of a node's direct network;
  // it reverts to whatever is currently SELECTED (the last node
  // clicked, i.e. whose detail panel is open) the moment the pointer
  // leaves, rather than clearing to nothing. Selection itself persists
  // until the panel closes or another node is picked, per the brief:
  // "keep that node and its direct network highlighted until the
  // detail panel is closed or another node is selected."
  // ==========================================================================

  var selectedId = null;

  function applyHighlight(id) {
    if (!id) {
      clearHighlightClasses();
      return;
    }
    var n = NODE_BY_ID[id];
    if (!n) return;
    var related = [id].concat(n.relatedIds || []);
    var relatedSet = {};
    related.forEach(function (r) { relatedSet[r] = true; });

    NODES.forEach(function (other) {
      var el = document.getElementById("dtm-node-" + other.id);
      if (!el) return;
      el.classList.toggle("is-highlighted", !!relatedSet[other.id]);
      el.classList.toggle("is-dimmed", !relatedSet[other.id]);
    });

    elLines.querySelectorAll(".dtm-line-secondary").forEach(function (line) {
      var active = relatedSet[line.dataset.from] && relatedSet[line.dataset.to];
      line.classList.toggle("is-active-line", !!active);
    });

    // The hovered/selected node's own cluster line stays at full
    // strength; the other five fade — everything but "core" belongs
    // to exactly one cluster, and core itself touches all six, so
    // nothing dims when core is what's highlighted.
    var ownCluster = clusterOf(id);
    elLines.querySelectorAll(".dtm-line-structural").forEach(function (line) {
      var fade = ownCluster && line.dataset.cluster !== ownCluster.id;
      line.classList.toggle("is-dimmed-line", !!fade);
    });
  }

  function clearHighlightClasses() {
    NODES.forEach(function (n) {
      var el = document.getElementById("dtm-node-" + n.id);
      if (!el) return;
      el.classList.remove("is-highlighted", "is-dimmed");
    });
    elLines.querySelectorAll(".dtm-line-secondary").forEach(function (line) {
      line.classList.remove("is-active-line");
    });
    elLines.querySelectorAll(".dtm-line-structural").forEach(function (line) {
      line.classList.remove("is-dimmed-line");
    });
  }

  function previewHighlight(id) {
    applyHighlight(id);
  }

  function clearPreview() {
    applyHighlight(selectedId);
  }

  function setSelected(id) {
    selectedId = id;
    applyHighlight(id);
  }

  // Click entry point for both the desktop cards and the mobile
  // archive rows — opens the detail panel and (when the node actually
  // lives on the canvas) locks its highlight in until something else
  // is selected or the panel closes.
  function selectNode(id) {
    if (isPositioned(id)) setSelected(id);
    openPanel(id);
  }

  // ==========================================================================
  // Pan + zoom
  // ==========================================================================

  var view = { x: 0, y: 0, scale: 0.55 };
  var MIN_SCALE = 0.35;
  var MAX_SCALE = 2;

  // The node cards' own footprint (plus the cluster label sitting
  // above each group) around each position, so "fit to content"
  // doesn't clip the edge cards flush against the viewport border.
  var NODE_PADDING = 170;

  // Reset frames the curated content at this fraction of the viewport
  // (not a full edge-to-edge 100% fit) — the brief asks for ~70-80%
  // occupied, leaving a deliberate margin instead of cards touching
  // the frame.
  var RESET_FILL = 0.8;

  function contentBounds() {
    var xs = Object.keys(positions).map(function (id) { return positions[id].x; });
    var ys = Object.keys(positions).map(function (id) { return positions[id].y; });
    return {
      minX: Math.min.apply(null, xs) - NODE_PADDING,
      maxX: Math.max.apply(null, xs) + NODE_PADDING,
      minY: Math.min.apply(null, ys) - NODE_PADDING,
      maxY: Math.max.apply(null, ys) + NODE_PADDING,
    };
  }

  function applyView() {
    elCanvas.style.transform = "translate(" + view.x + "px, " + view.y + "px) scale(" + view.scale + ")";
  }

  // Wheel events can arrive faster than the browser repaints during a
  // trackpad gesture — coalescing every pending pan/zoom into one
  // applyView() per animation frame keeps it smooth instead of
  // stacking up redundant, jittery transform writes.
  var applyScheduled = false;
  function scheduleApply() {
    if (applyScheduled) return;
    applyScheduled = true;
    requestAnimationFrame(function () {
      applyScheduled = false;
      applyView();
    });
  }

  // .dtm-stage's CSS height is only a rough calc(100vh - Npx) guess —
  // the header's actual height shifts with content (description
  // line-wrap, viewport width), so it's measured here instead of
  // trusted, and the stage is set to exactly fill what's left of the
  // window below it. Without this, "fit to content" fits the CSS
  // guess's height, not the height actually visible before the page
  // itself has to scroll.
  function sizeStage() {
    var top = elStage.getBoundingClientRect().top;
    var h = Math.max(420, window.innerHeight - top);
    elStage.style.height = h + "px";
  }

  // Fits the curated content (core + the six clusters' confirmed
  // members — see TIER2_IDS) into ~80% of the viewport, rather than a
  // fixed guessed scale — stays correct however the layout above is
  // edited later, and never shrinks to fit the planned/secondary
  // nodes because they were never given a position to begin with.
  function resetView() {
    sizeStage();
    var rect = elViewport.getBoundingClientRect();
    var b = contentBounds();
    var contentW = b.maxX - b.minX;
    var contentH = b.maxY - b.minY;
    var scale = Math.min(rect.width / contentW, rect.height / contentH) * RESET_FILL;
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    var cx = (b.minX + b.maxX) / 2;
    var cy = (b.minY + b.maxY) / 2;
    view.scale = scale;
    view.x = rect.width / 2 - cx * scale;
    view.y = rect.height / 2 - cy * scale;
    applyView();
  }

  function zoomBy(factor, anchor) {
    var rect = elViewport.getBoundingClientRect();
    var ax = anchor ? anchor.x - rect.left : rect.width / 2;
    var ay = anchor ? anchor.y - rect.top : rect.height / 2;
    var newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale * factor));
    var ratio = newScale / view.scale;
    view.x = ax - (ax - view.x) * ratio;
    view.y = ay - (ay - view.y) * ratio;
    view.scale = newScale;
    scheduleApply();
  }

  // Two-finger trackpad scroll (and a plain mouse wheel) pans by
  // whatever delta the browser reports — natural-scrolling convention,
  // so content tracks the gesture the way Figma/Miro's canvases do.
  function panBy(dx, dy) {
    view.x -= dx;
    view.y -= dy;
    scheduleApply();
  }

  function setupPanZoom() {
    var dragging = false;
    var startX = 0;
    var startY = 0;
    var startViewX = 0;
    var startViewY = 0;
    var moved = false;

    elViewport.addEventListener("pointerdown", function (e) {
      if (e.target.closest(".dtm-node")) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      startViewX = view.x;
      startViewY = view.y;
      elViewport.setPointerCapture(e.pointerId);
      elViewport.classList.add("is-panning");
    });

    elViewport.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      view.x = startViewX + dx;
      view.y = startViewY + dy;
      applyView();
    });

    function endDrag() {
      dragging = false;
      elViewport.classList.remove("is-panning");
    }
    elViewport.addEventListener("pointerup", endDrag);
    elViewport.addEventListener("pointercancel", endDrag);

    // Trackpad pinch is reported by Chrome/Safari as a wheel event
    // with ctrlKey set (Cmd+wheel from an actual keyboard lands here
    // too, which is the requested behavior) — that's the only signal
    // available to tell a pinch apart from a two-finger pan, so it's
    // the branch. Deltas are clamped before use: a trackpad pinch
    // reports small smooth values (~1-10), a physical mouse wheel
    // notch can report 100+, and without a cap a single notch would
    // jump the zoom by a jarring amount instead of one small step.
    // Listener lives on the viewport only, not window/document, so
    // scrolling the header/toolbar/drawer/panel is never touched.
    elViewport.addEventListener(
      "wheel",
      function (e) {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          var d = Math.max(-40, Math.min(40, e.deltaY));
          zoomBy(Math.exp(-d * 0.012), { x: e.clientX, y: e.clientY });
        } else {
          var dx = Math.max(-120, Math.min(120, e.deltaX));
          var dy = Math.max(-120, Math.min(120, e.deltaY));
          panBy(dx, dy);
        }
      },
      { passive: false }
    );

    elZoomIn.addEventListener("click", function () { zoomBy(1.2); });
    elZoomOut.addEventListener("click", function () { zoomBy(1 / 1.2); });
    elResetBtn.addEventListener("click", resetView);

    window.addEventListener("resize", resetView);
  }

  // ==========================================================================
  // Detail panel
  // ==========================================================================

  function fieldBlock(label, value) {
    if (!value) return null;
    var wrap = document.createElement("div");
    wrap.className = "dtm-panel-field";
    var l = document.createElement("div");
    l.className = "dtm-panel-field-label";
    l.textContent = label;
    var v = document.createElement("div");
    v.className = "dtm-panel-field-value";
    v.textContent = value;
    wrap.appendChild(l);
    wrap.appendChild(v);
    return wrap;
  }

  function sourceBlock(n) {
    var wrap = document.createElement("div");
    wrap.className = "dtm-panel-field";
    var l = document.createElement("div");
    l.className = "dtm-panel-field-label";
    l.textContent = "Source";
    wrap.appendChild(l);

    if (n.sourceUrl) {
      var a = document.createElement("a");
      a.className = "dtm-panel-source-link";
      a.href = n.sourceUrl;
      a.textContent = n.sourceUrl;
      if (/^https?:\/\//.test(n.sourceUrl)) {
        a.target = "_blank";
        a.rel = "noopener";
      }
      wrap.appendChild(a);
    } else if (n.sourceStatus === "reflection") {
      var v = document.createElement("div");
      v.className = "dtm-panel-field-value";
      v.textContent = "Roy's reflection — personal experience, no external source needed.";
      wrap.appendChild(v);
    } else {
      var v2 = document.createElement("div");
      v2.className = "dtm-panel-field-value";
      v2.textContent = "SOURCE TO BE ADDED";
      wrap.appendChild(v2);
    }
    return wrap;
  }

  function openPanel(id) {
    var n = NODE_BY_ID[id];
    if (!n) return;
    elPanelBody.innerHTML = "";

    var category = CATEGORY_BY_ID[n.category];
    var eyebrow = document.createElement("div");
    eyebrow.className = "dtm-panel-eyebrow";
    eyebrow.textContent = (category ? category.label : n.category) + (n.status !== "complete" ? " — " + n.status.toUpperCase() : "");
    elPanelBody.appendChild(eyebrow);

    var title = document.createElement("h2");
    title.className = "dtm-panel-title";
    title.textContent = n.name;
    elPanelBody.appendChild(title);

    var roleParts = [n.role, n.location].filter(Boolean);
    if (roleParts.length) {
      var role = document.createElement("div");
      role.className = "dtm-panel-role";
      role.textContent = roleParts.join(" — ");
      elPanelBody.appendChild(role);
    }

    if (n.status === "planned" && !n.description && !n.personalConnection) {
      var empty = document.createElement("div");
      empty.className = "dtm-panel-empty";
      empty.textContent = "Not yet written. This slot is reserved in dt-map-data.js.";
      elPanelBody.appendChild(empty);
    } else {
      if (n.image) {
        var img = document.createElement("img");
        img.className = "dtm-panel-image";
        img.alt = n.name;
        img.src = n.image;
        img.onerror = function () {
          var ph = buildImagePlaceholder(n.image);
          img.replaceWith(ph);
        };
        elPanelBody.appendChild(img);
      } else if (n.category === "people" || n.category === "projects") {
        elPanelBody.appendChild(buildImagePlaceholder(null));
      }

      [
        fieldBlock("Representative Work", n.representativeWork),
        fieldBlock("Recent Contribution", n.recentContribution),
        fieldBlock("Description", n.description),
        fieldBlock("Personal Connection", n.personalConnection),
      ].forEach(function (b) { if (b) elPanelBody.appendChild(b); });

      (n.notes || []).forEach(function (note) {
        var b = fieldBlock(note.label, note.text);
        if (b) elPanelBody.appendChild(b);
      });
    }

    if ((n.relatedIds || []).length) {
      var relWrap = document.createElement("div");
      relWrap.className = "dtm-panel-field";
      var relLabel = document.createElement("div");
      relLabel.className = "dtm-panel-field-label";
      relLabel.textContent = "Connected To";
      relWrap.appendChild(relLabel);
      var relList = document.createElement("div");
      relList.className = "dtm-panel-related";
      n.relatedIds.forEach(function (rid) {
        var rn = NODE_BY_ID[rid];
        if (!rn) return;
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "dtm-panel-related-link";
        chip.textContent = rn.name;
        chip.addEventListener("click", function () {
          selectNode(rid);
          focusNode(rid);
        });
        relList.appendChild(chip);
      });
      relWrap.appendChild(relList);
      elPanelBody.appendChild(relWrap);
    }

    if (n.id !== "core") elPanelBody.appendChild(sourceBlock(n));

    elPanel.classList.add("is-open");
    elPanel.setAttribute("aria-hidden", "false");
    elPanelBackdrop.hidden = false;
    requestAnimationFrame(function () { elPanelBackdrop.classList.add("is-visible"); });
    elPanel.focus();
  }

  function buildImagePlaceholder(expectedPath) {
    var ph = document.createElement("div");
    ph.className = "dtm-panel-image-placeholder";
    var span = document.createElement("span");
    span.textContent = expectedPath ? "IMAGE PENDING — " + expectedPath : "NO IMAGE YET";
    ph.appendChild(span);
    return ph;
  }

  function closePanel() {
    elPanel.classList.remove("is-open");
    elPanel.setAttribute("aria-hidden", "true");
    elPanelBackdrop.classList.remove("is-visible");
    window.setTimeout(function () { elPanelBackdrop.hidden = true; }, 200);
    setSelected(null);
  }

  function focusNode(id) {
    var pos = positions[id];
    if (!pos) return;
    var rect = elViewport.getBoundingClientRect();
    view.x = rect.width / 2 - pos.x * view.scale;
    view.y = rect.height / 2 - pos.y * view.scale;
    applyView();
  }

  elPanelClose.addEventListener("click", closePanel);
  elPanelBackdrop.addEventListener("click", closePanel);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (elPanel.classList.contains("is-open")) closePanel();
      if (document.body.classList.contains("is-print-view")) exitPrintView();
      if (document.body.classList.contains("is-presentation")) exitPresentation();
      if (!elDrawer.hidden) {
        elDrawer.hidden = true;
        elDevToggle.setAttribute("aria-expanded", "false");
      }
    }
  });

  // ==========================================================================
  // Mobile archive
  // ==========================================================================

  function renderArchive() {
    elArchive.innerHTML = "";

    CATEGORIES.forEach(function (cat) {
      if (cat.id === "core") return;
      if (!activeCategories[cat.id]) return;
      var catNodes = NODES.filter(function (n) { return n.category === cat.id; });
      if (!catNodes.length) return;

      var section = document.createElement("div");
      section.className = "dtm-archive-category";
      var label = document.createElement("div");
      label.className = "dtm-archive-category-label";
      label.textContent = cat.label;
      section.appendChild(label);

      if (cat.id === "people") {
        GROUPS.forEach(function (g) {
          var members = catNodes.filter(function (n) { return n.group === g.id && n.type !== "Group"; });
          if (!members.length) return;
          var gLabel = document.createElement("div");
          gLabel.className = "dtm-archive-group-label";
          gLabel.textContent = g.label;
          section.appendChild(gLabel);
          members.forEach(function (n) { section.appendChild(archiveItem(n)); });
        });
      } else {
        catNodes.forEach(function (n) { section.appendChild(archiveItem(n)); });
      }

      elArchive.appendChild(section);
    });
  }

  function archiveItem(n) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dtm-archive-item";
    var name = document.createElement("span");
    name.className = "dtm-archive-item-name";
    name.textContent = n.name;
    var type = document.createElement("span");
    type.className = "dtm-archive-item-type";
    type.textContent = n.status === "complete" ? n.type : n.status.toUpperCase();
    btn.appendChild(name);
    btn.appendChild(type);
    btn.addEventListener("click", function () { selectNode(n.id); });
    return btn;
  }

  // ==========================================================================
  // Sources
  // ==========================================================================

  function renderSources() {
    elSources.innerHTML = "";
    var title = document.createElement("div");
    title.className = "dtm-sources-title";
    title.textContent = "Sources";
    elSources.appendChild(title);

    NODES.forEach(function (n) {
      if (n.id === "core" || n.type === "Group") return;
      if (n.status === "planned") return;
      var row = document.createElement("div");
      row.className = "dtm-source-item";
      var name = document.createElement("span");
      name.className = "dtm-source-name";
      name.textContent = n.name;
      row.appendChild(name);

      if (n.sourceUrl) {
        var a = document.createElement("a");
        a.className = "dtm-source-link";
        a.href = n.sourceUrl;
        a.textContent = n.sourceUrl;
        if (/^https?:\/\//.test(n.sourceUrl)) {
          a.target = "_blank";
          a.rel = "noopener";
        }
        row.appendChild(a);
      } else {
        var flag = document.createElement("span");
        flag.className = "dtm-source-flag";
        flag.textContent = n.sourceStatus === "reflection" ? "Roy's reflection — no external source needed" : "Source to be added";
        row.appendChild(flag);
      }
      elSources.appendChild(row);
    });
  }

  elSourcesToggle.addEventListener("click", function () {
    var open = elSources.hidden;
    elSources.hidden = !open;
    elSourcesToggle.setAttribute("aria-expanded", String(open));
    if (open) elSources.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ==========================================================================
  // Print / PDF view
  // ==========================================================================

  function buildPrintView() {
    elPrintView.innerHTML = "";

    var exit = document.createElement("button");
    exit.type = "button";
    exit.className = "dtm-print-exit";
    exit.textContent = "← Back to map";
    exit.addEventListener("click", exitPrintView);
    elPrintView.appendChild(exit);

    var title = document.createElement("h1");
    title.className = "dtm-print-title";
    title.textContent = "DT MAP — PLAYING FIELD";
    elPrintView.appendChild(title);

    var meta = document.createElement("div");
    meta.className = "dtm-print-meta";
    meta.textContent = "ROY SON — CORE STUDIO OBJECTS: CT — FALL 2026";
    elPrintView.appendChild(meta);

    var desc = document.createElement("p");
    desc.className = "dtm-print-desc";
    desc.textContent = "An evolving map of the sounds, garments, objects, technologies, and ideas shaping my creative practice.";
    elPrintView.appendChild(desc);

    CATEGORIES.forEach(function (cat) {
      var catNodes = NODES.filter(function (n) { return n.category === cat.id; });
      if (!catNodes.length) return;

      var section = document.createElement("section");
      section.className = "dtm-print-category";
      var label = document.createElement("div");
      label.className = "dtm-print-category-label";
      label.textContent = cat.label;
      section.appendChild(label);

      catNodes.forEach(function (n) {
        var item = document.createElement("div");
        item.className = "dtm-print-node";

        var name = document.createElement("div");
        name.className = "dtm-print-node-name";
        name.textContent = n.name + (n.status !== "complete" ? "  [" + n.status.toUpperCase() + "]" : "");
        item.appendChild(name);

        if (n.role) {
          var role = document.createElement("div");
          role.className = "dtm-print-node-role";
          role.textContent = n.role;
          item.appendChild(role);
        }

        [n.description, n.personalConnection].filter(Boolean).forEach(function (t) {
          var p = document.createElement("div");
          p.className = "dtm-print-node-desc";
          p.textContent = t;
          item.appendChild(p);
        });

        if ((n.relatedIds || []).length) {
          var rel = document.createElement("div");
          rel.className = "dtm-print-node-related";
          rel.textContent =
            "Related: " +
            n.relatedIds
              .map(function (rid) { return NODE_BY_ID[rid] ? NODE_BY_ID[rid].name : rid; })
              .join(", ");
          item.appendChild(rel);
        }

        var src = document.createElement("div");
        src.className = "dtm-print-node-source";
        src.textContent = n.sourceUrl
          ? "Source: " + n.sourceUrl
          : n.sourceStatus === "reflection"
          ? "Source: Roy's reflection"
          : "Source: to be added";
        item.appendChild(src);

        section.appendChild(item);
      });

      elPrintView.appendChild(section);
    });

    var footer = document.createElement("div");
    footer.className = "dtm-print-footer";
    footer.textContent = "Velfont Office — velfontoffice.com/hyungrokson/dt-map/";
    elPrintView.appendChild(footer);
  }

  function enterPrintView() {
    buildPrintView();
    document.body.classList.add("is-print-view");
    elPrintBtn.setAttribute("aria-expanded", "true");
    window.scrollTo(0, 0);
  }

  function exitPrintView() {
    document.body.classList.remove("is-print-view");
    elPrintBtn.setAttribute("aria-expanded", "false");
  }

  elPrintBtn.addEventListener("click", function () {
    if (document.body.classList.contains("is-print-view")) exitPrintView();
    else enterPrintView();
  });

  // ==========================================================================
  // In Development drawer — every status:"planned" node (the brief's
  // "unconfirmed" slots), grouped by category. Kept off the curated
  // map entirely (see Layout) so it can never affect the initial fit;
  // this is the only place it's browsable on desktop besides the
  // Sources/Print views, which already list everything regardless.
  // ==========================================================================

  function renderDrawer() {
    elDrawer.innerHTML = "";
    var title = document.createElement("div");
    title.className = "dtm-sources-title";
    title.textContent = "In Development — not yet written";
    elDrawer.appendChild(title);

    var planned = NODES.filter(function (n) { return n.status === "planned"; });
    var byCategory = {};
    planned.forEach(function (n) {
      (byCategory[n.category] = byCategory[n.category] || []).push(n);
    });

    CATEGORIES.forEach(function (cat) {
      var items = byCategory[cat.id];
      if (!items || !items.length) return;
      var group = document.createElement("div");
      group.className = "dtm-drawer-group";
      var label = document.createElement("div");
      label.className = "dtm-archive-category-label";
      label.textContent = cat.label;
      group.appendChild(label);
      items.forEach(function (n) { group.appendChild(archiveItem(n)); });
      elDrawer.appendChild(group);
    });
  }

  elDevToggle.addEventListener("click", function () {
    var open = elDrawer.hidden;
    elDrawer.hidden = !open;
    elDevToggle.setAttribute("aria-expanded", String(open));
    if (open) elDrawer.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ==========================================================================
  // Presentation Mode — collapses the intro/controls and enlarges the
  // map, starting from the same curated reset framing. Prev/Next just
  // pan-and-zoom to one cluster at a time; it's still the same
  // interactive map underneath, not a slideshow.
  // ==========================================================================

  var PRESENT_STOPS = [{ id: "core", label: "ROY SON / VELFONT OFFICE" }].concat(
    CLUSTERS.map(function (c) { return { id: c.id, label: c.label }; })
  );
  var presentIndex = 0;

  function focusCluster(stop) {
    var rect = elViewport.getBoundingClientRect();
    var target = stop.id === "core" ? CORE_POS : (function () {
      var c = CLUSTERS.filter(function (x) { return x.id === stop.id; })[0];
      return { x: c.cx, y: c.cy + 40 };
    })();
    view.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, 1));
    view.x = rect.width / 2 - target.x * view.scale;
    view.y = rect.height / 2 - target.y * view.scale;
    applyView();
    elPresentLabel.textContent = stop.label;
  }

  function enterPresentation() {
    document.body.classList.add("is-presentation");
    elPresentToggle.setAttribute("aria-pressed", "true");
    elPresentNav.hidden = false;
    presentIndex = 0;
    resetView();
    elPresentLabel.textContent = "OVERVIEW";
  }

  function exitPresentation() {
    document.body.classList.remove("is-presentation");
    elPresentToggle.setAttribute("aria-pressed", "false");
    elPresentNav.hidden = true;
    resetView();
  }

  elPresentToggle.addEventListener("click", function () {
    if (document.body.classList.contains("is-presentation")) exitPresentation();
    else enterPresentation();
  });
  elPresentExit.addEventListener("click", exitPresentation);
  elPresentNext.addEventListener("click", function () {
    presentIndex = (presentIndex + 1) % PRESENT_STOPS.length;
    focusCluster(PRESENT_STOPS[presentIndex]);
  });
  elPresentPrev.addEventListener("click", function () {
    presentIndex = (presentIndex - 1 + PRESENT_STOPS.length) % PRESENT_STOPS.length;
    focusCluster(PRESENT_STOPS[presentIndex]);
  });

  // ==========================================================================
  // Init
  // ==========================================================================

  renderFilters();
  buildEdges();
  renderStructuralLines();
  renderLines();
  renderNodes();
  renderArchive();
  renderSources();
  renderDrawer();
  setupPanZoom();
  resetView();
})();
