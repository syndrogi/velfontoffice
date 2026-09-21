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
    "love-is-in-the-bin", "field-system", "roys-airplane-series", "dt-map-website",
    "definition-of-ct",
    "programming-languages", "ai-image-video",
    "photoshop-illustrator", "drawing",
    "interest-fashion", "interest-music", "interest-exercise",
    "creative-authorship-ai", "subculture-commercialization",
  ];
  var TIER2_SET = {};
  TIER2_IDS.forEach(function (id) { TIER2_SET[id] = true; });

  function isPositioned(id) {
    return id === "core" || !!TIER2_SET[id];
  }

  var CORE_POS = { x: 1000, y: 560 };

  // One entry per curated group. `label` is the pale background
  // typography; `members` are the TIER2_IDS that belong to it, laid
  // out as a tight row centered on (cx, cy). Moving a cluster, or how
  // far apart its members sit, is just editing the numbers here.
  //
  // The spread between clusters is deliberately TIGHT relative to card
  // size: resetView() fits this whole footprint to ~85% of the
  // viewport (see RESET_FILL below), so a wide-open composition
  // doesn't just look sparser — it forces a smaller fit scale and
  // every card physically renders smaller on screen. Keeping cluster
  // centers close together is what makes the cards themselves read as
  // large; if the composition ever needs more breathing room, prefer
  // nudging RESET_FILL down over spreading these back out.
  //
  // "definition" is a one-member cluster rather than a special case —
  // it sits close under core (see brief: "a meaningful position near
  // the central node") in the vertical gap between core's row and the
  // New Tech / Existing Skills row below it.
  var CLUSTERS = [
    { id: "sound", label: "SOUND", cx: 380, cy: 120, gap: 260, members: ["kim-ximya", "aphex-twin", "brutalismus-3000"] },
    { id: "fashion", label: "FASHION", cx: 1520, cy: 120, gap: 260, members: ["yumin-ha", "dongjoon-lim", "vivienne-westwood"] },
    { id: "art", label: "ART, DESIGN & CREATIVE PRACTICE", cx: 380, cy: 560, gap: 260, members: ["banksy", "mschf", "teenage-engineering"] },
    { id: "projects", label: "INSPIRING PROJECTS", cx: 1700, cy: 560, gap: 260, members: ["love-is-in-the-bin", "field-system", "roys-airplane-series", "dt-map-website"] },
    { id: "definition", label: "DEFINITION OF CREATIVE TECHNOLOGY", cx: 1000, cy: 640, gap: 0, members: ["definition-of-ct"] },
    { id: "new-tech", label: "NEW TECHNOLOGIES & SKILLS", cx: 700, cy: 1050, gap: 270, members: ["programming-languages", "ai-image-video"] },
    { id: "existing-skills", label: "EXISTING SKILLS TO IMPROVE", cx: 1300, cy: 1050, gap: 270, members: ["photoshop-illustrator", "drawing"] },
    { id: "personal-interests", label: "PERSONAL INTERESTS OUTSIDE DT", cx: 650, cy: 1450, gap: 260, members: ["interest-fashion", "interest-music", "interest-exercise"] },
    { id: "concepts", label: "CONCEPTS & PROBLEMS", cx: 1350, cy: 1450, gap: 270, members: ["creative-authorship-ai", "subculture-commercialization"] },
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
  var elEmptyState = document.getElementById("dtmEmptyState");
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
    allChip.setAttribute("aria-pressed", "true");
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
      chip.setAttribute("aria-pressed", "true");
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
      chip.setAttribute("aria-pressed", String(on));
      if (!on) allOn = false;
    });
    var allChip = elFilters.querySelector(".dtm-filter-chip:not([data-category])");
    allChip.classList.toggle("is-active", allOn);
    allChip.setAttribute("aria-pressed", String(allOn));
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
    var anyOn = CATEGORIES.some(function (c) { return c.filterable !== false && activeCategories[c.id]; });
    if (elEmptyState) elEmptyState.hidden = anyOn;
    renderArchive();
  }

  // ==========================================================================
  // Node card (desktop network) — only core + TIER2_IDS ever render
  // here (see Layout above); everything else stays data-only.
  // ==========================================================================

  // A short category code for the placeholder art area — "SND-01"
  // reads as an intentional archival index, not a missing asset.
  var CLUSTER_CODE = {
    sound: "SND", fashion: "FSH", art: "ART", projects: "PRJ",
    definition: "DEF", "new-tech": "TCH", "existing-skills": "IMP",
    "personal-interests": "INT", concepts: "CPT",
  };

  // Concepts & Problems nodes carry their "core question" in `role`
  // (shown as a proper subtitle in the detail panel, where there's
  // room for it) — too long to also fit on the small map card face,
  // so the card just omits it there rather than overflowing.
  var CARD_ROLE_MAX = 60;

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
      // The Definition node sits right under core and is a single
      // statement, not a reference card — it skips the art/code area
      // that every other card uses to stay compact at that close range.
      var skipArt = n.id === "definition-of-ct";
      if (skipArt) btn.classList.add("dtm-node--compact");

      if (!skipArt) {
        var art = document.createElement("span");
        art.className = "dtm-node-art";

        if (n.image) {
          art.classList.add("has-image");
          var thumb = document.createElement("img");
          thumb.className = "dtm-node-thumb";
          thumb.src = n.image;
          thumb.alt = n.name;
          thumb.loading = "lazy";
          // Falls back to the plain hatch placeholder — same "never a
          // broken-image icon" rule the detail panel already follows
          // (see buildImagePlaceholder) — rather than a missing thumb.
          thumb.onerror = function () {
            art.classList.remove("has-image");
            thumb.remove();
          };
          art.appendChild(thumb);
        }

        var code = document.createElement("span");
        code.className = "dtm-node-code";
        code.textContent = cluster ? CLUSTER_CODE[cluster.id] + "-" + String(index + 1).padStart(2, "0") : "";
        art.appendChild(code);
        btn.appendChild(art);
      }

      var body = document.createElement("span");
      body.className = "dtm-node-body";

      // No separate index number here — the art-area code badge above
      // ("SND-01" etc.) already carries it, at the lowest visual
      // priority by design (see brief: title > role > keywords > id).
      // A second "01" in the body would just duplicate it at a higher
      // position in the reading order.
      var name2 = document.createElement("span");
      name2.className = "dtm-node-name";
      name2.textContent = n.name;
      body.appendChild(name2);

      if (n.role && n.role.length < CARD_ROLE_MAX) {
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
  // Connection lines — three kinds. STRUCTURAL lines (core → each of the
  // six cluster centers) are the map's stable backbone and always
  // visible. The real relatedIds data then splits into two further
  // tiers, both only drawn between two nodes that already have a
  // position (i.e. both TIER2_IDS) — a relationship pointing at an
  // off-map concept/placeholder node just shows up as text in that
  // node's "Connected to" list instead of a dangling line:
  //   - PRIMARY (solid): a direct maker/creator relationship — a
  //     project whose own `role` field reads "Maker: X" pointing back
  //     at X. This is the only classification rule; nothing here is
  //     editorial judgment, it's read straight off the data.
  //   - SECONDARY (dashed): every other relatedIds pair — thematic or
  //     associative connections (shared references, inspirations,
  //     collaborations) rather than authorship.
  // Both tiers render at a low-but-visible resting opacity so the
  // network reads as connected at a glance, not just on hover.
  // ==========================================================================

  var edgeList = []; // [{ from, to, tier }]

  function normalizeMakerName(name) {
    return String(name || "").trim().toLowerCase();
  }

  function edgeTier(idA, idB) {
    var a = NODE_BY_ID[idA];
    var b = NODE_BY_ID[idB];
    if (!a || !b) return "secondary";

    function makes(project, maker) {
      if (project.category !== "projects" || typeof project.role !== "string") return false;
      var m = project.role.match(/^Maker:\s*(.+)$/);
      if (!m) return false;
      var makerName = normalizeMakerName(m[1]);
      if (makerName === normalizeMakerName(maker.name)) return true;
      if (makerName === "roy son" && maker.id === "core") return true;
      return false;
    }

    return makes(a, b) || makes(b, a) ? "primary" : "secondary";
  }

  function buildEdges() {
    var seen = {};
    NODES.forEach(function (n) {
      (n.relatedIds || []).forEach(function (otherId) {
        if (!isPositioned(n.id) || !isPositioned(otherId)) return;
        var key = [n.id, otherId].sort().join("|");
        if (seen[key]) return;
        seen[key] = true;
        edgeList.push({ from: n.id, to: otherId, tier: edgeTier(n.id, otherId) });
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
    edgeList.forEach(function (edge) {
      var a = positions[edge.from];
      var b = positions[edge.to];
      if (!a || !b) return;
      var line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("x1", a.x);
      line.setAttribute("y1", a.y);
      line.setAttribute("x2", b.x);
      line.setAttribute("y2", b.y);
      line.setAttribute("class", "dtm-line-" + edge.tier);
      line.dataset.from = edge.from;
      line.dataset.to = edge.to;
      line.dataset.tier = edge.tier;
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

    elLines.querySelectorAll(".dtm-line-primary, .dtm-line-secondary").forEach(function (line) {
      var active = relatedSet[line.dataset.from] && relatedSet[line.dataset.to];
      line.classList.toggle("is-active-line", !!active);
      line.classList.toggle("is-dimmed-line", !active);
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
    elLines.querySelectorAll(".dtm-line-primary, .dtm-line-secondary, .dtm-line-structural").forEach(function (line) {
      line.classList.remove("is-active-line", "is-dimmed-line");
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
  // Kept tight — with 24 cards now on the curated map (up from 17),
  // every extra pixel of padding costs legibility across the whole
  // composition once resetView divides it back down to fit.
  var NODE_PADDING = 130;

  // Reset frames the curated content at this fraction of the viewport
  // (not a full edge-to-edge 100% fit) — 0.9 leaves a small margin
  // instead of cards touching the frame, while still using nearly all
  // of a classroom projector's screen for legibility.
  var RESET_FILL = 0.9;

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
  // Overlay shell — shared by the node detail panel, Sources, and In
  // Development. Only one of the three is ever open at once (opening
  // one closes whichever else was open) and they share a single
  // backdrop/scroll-lock/focus-trap implementation instead of each
  // panel reinventing it. This is what fixes "opening Sources or In
  // Development used to push the whole page's height around" — all
  // three now render as fixed-position sheets outside document flow.
  // ==========================================================================

  var activeOverlay = null; // "panel" | "sources" | "drawer" | null
  var overlayReturnFocus = null;
  var savedScrollY = 0;

  function overlayEl(which) {
    if (which === "panel") return elPanel;
    if (which === "sources") return elSources;
    if (which === "drawer") return elDrawer;
    return null;
  }

  function lockBodyScroll() {
    savedScrollY = window.scrollY;
    document.body.classList.add("dtm-scroll-locked");
    document.body.style.top = -savedScrollY + "px";
  }

  function unlockBodyScroll() {
    document.body.classList.remove("dtm-scroll-locked");
    document.body.style.top = "";
    window.scrollTo(0, savedScrollY);
  }

  function trapFocus(container, e) {
    if (e.key !== "Tab") return;
    var focusables = container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openOverlay(which, triggerEl) {
    if (activeOverlay && activeOverlay !== which) closeOverlay();
    if (activeOverlay === which) return;
    activeOverlay = which;
    overlayReturnFocus = triggerEl || document.activeElement;
    lockBodyScroll();

    var el = overlayEl(which);
    el.hidden = false;
    elPanelBackdrop.hidden = false;
    requestAnimationFrame(function () {
      el.classList.add("is-open");
      elPanelBackdrop.classList.add("is-visible");
    });

    elDevToggle.setAttribute("aria-expanded", String(which === "drawer"));
    elSourcesToggle.setAttribute("aria-expanded", String(which === "sources"));
    if (which === "panel") el.setAttribute("aria-hidden", "false");

    window.setTimeout(function () { el.focus(); }, 260);
  }

  function closeOverlay() {
    if (!activeOverlay) return;
    var which = activeOverlay;
    var el = overlayEl(which);
    el.classList.remove("is-open");
    elPanelBackdrop.classList.remove("is-visible");
    elDevToggle.setAttribute("aria-expanded", "false");
    elSourcesToggle.setAttribute("aria-expanded", "false");
    if (which === "panel") el.setAttribute("aria-hidden", "true");
    activeOverlay = null;
    unlockBodyScroll();

    window.setTimeout(function () {
      el.hidden = true;
      if (which === "panel") setSelected(null);
    }, 260);

    var toFocus = overlayReturnFocus;
    overlayReturnFocus = null;
    if (toFocus && document.body.contains(toFocus)) toFocus.focus();
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
      var tag = document.createElement("span");
      tag.className = "dtm-status-tag dtm-status-tag--draft";
      tag.textContent = "Source pending";
      wrap.appendChild(tag);
    }
    return wrap;
  }

  function openPanel(id) {
    var n = NODE_BY_ID[id];
    if (!n) return;
    var trigger = document.activeElement;
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
        img.loading = "lazy";
        img.src = n.image;
        img.onerror = function () {
          var ph = buildImagePlaceholder(n.imagePlaceholderText);
          img.replaceWith(ph);
        };
        elPanelBody.appendChild(img);
      } else if (n.category === "people" || n.category === "projects") {
        elPanelBody.appendChild(buildImagePlaceholder(n.imagePlaceholderText));
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
        var row = document.createElement("div");
        row.className = "dtm-panel-related-row";
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "dtm-panel-related-link";
        chip.textContent = rn.name;
        chip.addEventListener("click", function () {
          selectNode(rid);
          focusNode(rid);
        });
        row.appendChild(chip);
        // Tier label is only meaningful for pairs that actually have an
        // edge drawn on the map (both positioned) — see edgeTier(): a
        // real, data-derived signal (project.role reading "Maker: X"),
        // not an invented interpretation of the relationship.
        if (isPositioned(n.id) && isPositioned(rid)) {
          var tier = edgeTier(n.id, rid);
          var tag = document.createElement("span");
          tag.className = "dtm-panel-related-tier dtm-panel-related-tier--" + tier;
          tag.textContent = tier === "primary" ? "Maker" : "Thematic";
          row.appendChild(tag);
        }
        relList.appendChild(row);
      });
      relWrap.appendChild(relList);
      elPanelBody.appendChild(relWrap);
    }

    if (n.id !== "core") elPanelBody.appendChild(sourceBlock(n));

    openOverlay("panel", trigger);
  }

  // Never surfaces the raw expected file path to visitors — that's an
  // implementation detail for whoever edits dt-map-data.js, not
  // something a reader needs to see spelled out on the page. A node
  // can set its own `imagePlaceholderText` (e.g. "PREVIOUS DRAWING TO
  // BE ADDED") for a more specific placeholder than the generic default.
  function buildImagePlaceholder(text) {
    var ph = document.createElement("div");
    ph.className = "dtm-panel-image-placeholder";
    var span = document.createElement("span");
    span.textContent = text || "Image forthcoming";
    ph.appendChild(span);
    return ph;
  }

  function focusNode(id) {
    var pos = positions[id];
    if (!pos) return;
    var rect = elViewport.getBoundingClientRect();
    view.x = rect.width / 2 - pos.x * view.scale;
    view.y = rect.height / 2 - pos.y * view.scale;
    applyView();
  }

  elPanelClose.addEventListener("click", closeOverlay);
  elPanelBackdrop.addEventListener("click", closeOverlay);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (activeOverlay) closeOverlay();
      if (document.body.classList.contains("is-print-view")) exitPrintView();
      if (document.body.classList.contains("is-presentation")) exitPresentation();
      return;
    }
    if (activeOverlay) trapFocus(overlayEl(activeOverlay), e);
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

    if (!elArchive.children.length) {
      var empty = document.createElement("p");
      empty.className = "dtm-empty-state";
      empty.textContent = "No categories selected — turn one on above to see nodes.";
      elArchive.appendChild(empty);
    }
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

  function sourceRow(n) {
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
        a.rel = "noopener noreferrer";
        a.setAttribute("aria-label", n.name + " — opens source in a new tab");
      }
      row.appendChild(a);
    } else if (n.sourceStatus === "reflection") {
      var flag = document.createElement("span");
      flag.className = "dtm-source-flag";
      flag.textContent = "Roy's reflection — no external source needed";
      row.appendChild(flag);
    } else {
      var flag2 = document.createElement("span");
      flag2.className = "dtm-source-flag dtm-source-flag--needed";
      flag2.textContent = "Source to be added";
      row.appendChild(flag2);
    }
    return row;
  }

  // Grouped so completion status reads at a glance instead of a single
  // flat list repeating "Source to be added" between the few that
  // actually have one.
  function renderSources() {
    elSources.innerHTML = "";

    var close = document.createElement("button");
    close.type = "button";
    close.className = "dtm-side-drawer-close";
    close.setAttribute("aria-label", "Close sources");
    close.innerHTML = "&times;";
    close.addEventListener("click", closeOverlay);
    elSources.appendChild(close);

    var title = document.createElement("div");
    title.className = "dtm-sources-title";
    title.textContent = "Sources";
    elSources.appendChild(title);

    var citable = NODES.filter(function (n) { return n.id !== "core" && n.type !== "Group" && n.status !== "planned"; });
    var groups = [
      { label: "External Sources", items: citable.filter(function (n) { return !!n.sourceUrl; }) },
      { label: "Personal Reflections — No External Source Required", items: citable.filter(function (n) { return !n.sourceUrl && n.sourceStatus === "reflection"; }) },
      { label: "Sources Needed", items: citable.filter(function (n) { return !n.sourceUrl && n.sourceStatus !== "reflection"; }) },
    ];

    groups.forEach(function (group) {
      if (!group.items.length) return;
      var section = document.createElement("div");
      section.className = "dtm-sources-group";
      var label = document.createElement("div");
      label.className = "dtm-archive-category-label";
      label.textContent = group.label + " (" + group.items.length + ")";
      section.appendChild(label);
      group.items.forEach(function (n) { section.appendChild(sourceRow(n)); });
      elSources.appendChild(section);
    });
  }

  elSourcesToggle.addEventListener("click", function () {
    if (activeOverlay === "sources") closeOverlay();
    else openOverlay("sources", elSourcesToggle);
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
  // In Development drawer — the content decisions are final (every
  // node is status:"complete"), so this is no longer a list of
  // unfinished NODES. It's a checklist of outstanding ASSETS: images
  // whose file hasn't actually loaded yet, and citations still owed.
  // "Needed" images are verified at runtime (an Image() probe per
  // candidate `image` path) rather than assumed from the path merely
  // existing in the data — a path can be set and genuinely working
  // (see dt-map-data.js's many now-real photos), so presence alone
  // isn't "missing." Sources are still read straight from the data,
  // since there's no equivalent runtime check for a citation.
  // ==========================================================================

  function drawerRow(name, note) {
    var row = document.createElement("div");
    row.className = "dtm-source-item";
    var nameEl = document.createElement("span");
    nameEl.className = "dtm-source-name";
    nameEl.textContent = name;
    row.appendChild(nameEl);
    var flag = document.createElement("span");
    flag.className = "dtm-source-flag dtm-source-flag--needed";
    flag.textContent = note;
    row.appendChild(flag);
    return row;
  }

  function probeImage(src, cb) {
    var probe = new Image();
    probe.onload = function () { cb(true); };
    probe.onerror = function () { cb(false); };
    probe.src = src;
  }

  function renderDrawer() {
    elDrawer.innerHTML = "";

    var close = document.createElement("button");
    close.type = "button";
    close.className = "dtm-side-drawer-close";
    close.setAttribute("aria-label", "Close in-development items");
    close.innerHTML = "&times;";
    close.addEventListener("click", closeOverlay);
    elDrawer.appendChild(close);

    var title = document.createElement("div");
    title.className = "dtm-sources-title";
    title.textContent = "In Development — outstanding assets & sources";
    elDrawer.appendChild(title);

    var checking = document.createElement("p");
    checking.className = "dtm-panel-empty";
    checking.textContent = "Checking assets…";
    elDrawer.appendChild(checking);

    var realNodes = NODES.filter(function (n) { return n.id !== "core" && n.type !== "Group"; });
    var withImage = realNodes.filter(function (n) { return !!n.image; });
    var pendingSources = realNodes.filter(function (n) { return !n.sourceUrl && n.sourceStatus !== "reflection"; });

    var pendingImages = [];
    var remaining = withImage.length;

    function finish() {
      checking.remove();

      if (pendingImages.length) {
        var imgGroup = document.createElement("div");
        imgGroup.className = "dtm-drawer-group";
        var imgLabel = document.createElement("div");
        imgLabel.className = "dtm-archive-category-label";
        imgLabel.textContent = "Reference Images Needed (" + pendingImages.length + ")";
        imgGroup.appendChild(imgLabel);
        pendingImages.forEach(function (n) {
          imgGroup.appendChild(drawerRow(n.name, n.imagePlaceholderText || "Image expected — file not yet added"));
        });
        elDrawer.appendChild(imgGroup);
      }

      if (pendingSources.length) {
        var srcGroup = document.createElement("div");
        srcGroup.className = "dtm-drawer-group";
        var srcLabel = document.createElement("div");
        srcLabel.className = "dtm-archive-category-label";
        srcLabel.textContent = "Sources Needed (" + pendingSources.length + ")";
        srcGroup.appendChild(srcLabel);
        pendingSources.forEach(function (n) {
          srcGroup.appendChild(drawerRow(n.name, "Verified source not yet added"));
        });
        elDrawer.appendChild(srcGroup);
      }

      if (!pendingImages.length && !pendingSources.length) {
        var empty = document.createElement("p");
        empty.className = "dtm-panel-empty";
        empty.textContent = "Nothing outstanding — every node has its expected assets and sources.";
        elDrawer.appendChild(empty);
      }
    }

    if (!withImage.length) {
      finish();
      return;
    }

    withImage.forEach(function (n) {
      probeImage(n.image, function (ok) {
        if (!ok) pendingImages.push(n);
        remaining--;
        if (remaining === 0) finish();
      });
    });
  }

  elDevToggle.addEventListener("click", function () {
    if (activeOverlay === "drawer") closeOverlay();
    else openOverlay("drawer", elDevToggle);
  });

  // ==========================================================================
  // Presentation Mode — the finalized ten-step sequence: central
  // identity + definition, the three People groups, Inspiring
  // Projects, New Technologies & Skills, Existing Skills to Improve,
  // Personal Interests, Concepts & Problems, and a closing "final
  // connected overview" that reveals the whole relationship graph at
  // once. Each category stop is followed by its own member nodes, one
  // at a time, before moving to the next category. Each stop
  // pans/zooms to frame its own subject and dims everything not
  // currently relevant, reusing the exact same highlight machinery as
  // a hover/selection on the normal map. The viewer's own pan/zoom
  // from before entering is restored on exit rather than snapping
  // back to the default reset framing.
  // ==========================================================================

  var PRESENT_CATEGORY_ORDER = [
    "sound", "fashion", "art", "projects",
    "new-tech", "existing-skills", "personal-interests", "concepts",
  ];

  var PRESENT_STOPS = (function () {
    var stops = [{ type: "identity" }];
    PRESENT_CATEGORY_ORDER.forEach(function (clusterId) {
      var cluster = CLUSTERS.filter(function (c) { return c.id === clusterId; })[0];
      if (!cluster) return;
      stops.push({ type: "cluster", cluster: cluster });
      cluster.members.forEach(function (id) { stops.push({ type: "node", id: id }); });
    });
    stops.push({ type: "final-overview" });
    return stops;
  })();

  var presentIndex = 0;
  var prePresentView = null;
  var IDENTITY_IDS = ["core", "definition-of-ct"];

  function boundsFor(ids) {
    var xs = ids.map(function (id) { return positions[id].x; });
    var ys = ids.map(function (id) { return positions[id].y; });
    return {
      minX: Math.min.apply(null, xs) - NODE_PADDING,
      maxX: Math.max.apply(null, xs) + NODE_PADDING,
      minY: Math.min.apply(null, ys) - NODE_PADDING,
      maxY: Math.max.apply(null, ys) + NODE_PADDING,
    };
  }

  function fitToIds(ids, fill) {
    var rect = elViewport.getBoundingClientRect();
    var b = boundsFor(ids);
    var contentW = b.maxX - b.minX;
    var contentH = b.maxY - b.minY;
    var scale = Math.min(rect.width / contentW, rect.height / contentH) * fill;
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    var cx = (b.minX + b.maxX) / 2;
    var cy = (b.minY + b.maxY) / 2;
    view.scale = scale;
    view.x = rect.width / 2 - cx * scale;
    view.y = rect.height / 2 - cy * scale;
    applyView();
  }

  function focusNodeZoomed(id, scale) {
    var pos = positions[id];
    if (!pos) return;
    var rect = elViewport.getBoundingClientRect();
    view.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    view.x = rect.width / 2 - pos.x * view.scale;
    view.y = rect.height / 2 - pos.y * view.scale;
    applyView();
  }

  // Highlights an arbitrary set of ids (used for both the identity
  // stop — core + definition — and each category's cluster stop),
  // generalizing the same is-highlighted/is-dimmed treatment a
  // hover/selection applies to a single node.
  function highlightSet(ids, ownClusterId) {
    var set = {};
    ids.forEach(function (id) { set[id] = true; });
    NODES.forEach(function (n) {
      var el = document.getElementById("dtm-node-" + n.id);
      if (!el) return;
      el.classList.toggle("is-highlighted", !!set[n.id]);
      el.classList.toggle("is-dimmed", !set[n.id]);
    });
    elLines.querySelectorAll(".dtm-line-primary, .dtm-line-secondary").forEach(function (line) {
      var active = set[line.dataset.from] && set[line.dataset.to];
      line.classList.toggle("is-active-line", !!active);
      line.classList.toggle("is-dimmed-line", !active);
    });
    elLines.querySelectorAll(".dtm-line-structural").forEach(function (line) {
      line.classList.toggle("is-dimmed-line", !ownClusterId || line.dataset.cluster !== ownClusterId);
    });
  }

  function stopLabel(stop) {
    if (stop.type === "identity") return "CENTRAL IDENTITY & DEFINITION";
    if (stop.type === "cluster") return stop.cluster.label;
    if (stop.type === "node") return NODE_BY_ID[stop.id].name;
    return "FINAL CONNECTED OVERVIEW";
  }

  function goToStop(index) {
    presentIndex = Math.min(Math.max(index, 0), PRESENT_STOPS.length - 1);
    var stop = PRESENT_STOPS[presentIndex];
    elPresentLabel.textContent = stopLabel(stop);
    document.body.classList.toggle("dtm-present-show-all-lines", stop.type === "final-overview");

    if (stop.type === "identity") {
      highlightSet(IDENTITY_IDS, "definition");
      fitToIds(IDENTITY_IDS, 0.5);
    } else if (stop.type === "cluster") {
      highlightSet(["core"].concat(stop.cluster.members), stop.cluster.id);
      fitToIds(stop.cluster.members, 0.78);
    } else if (stop.type === "node") {
      applyHighlight(stop.id);
      focusNodeZoomed(stop.id, 1.3);
    } else {
      clearHighlightClasses();
      fitToIds(Object.keys(positions), RESET_FILL);
    }

    elPresentPrev.disabled = presentIndex === 0;
    elPresentPrev.setAttribute("aria-disabled", String(presentIndex === 0));
    elPresentNext.disabled = presentIndex === PRESENT_STOPS.length - 1;
    elPresentNext.setAttribute("aria-disabled", String(presentIndex === PRESENT_STOPS.length - 1));
  }

  function enterPresentation() {
    prePresentView = { x: view.x, y: view.y, scale: view.scale };
    document.body.classList.add("is-presentation");
    elPresentToggle.setAttribute("aria-pressed", "true");
    elPresentNav.hidden = false;
    goToStop(0);
  }

  function exitPresentation() {
    document.body.classList.remove("is-presentation");
    document.body.classList.remove("dtm-present-show-all-lines");
    elPresentToggle.setAttribute("aria-pressed", "false");
    elPresentNav.hidden = true;
    applyHighlight(selectedId);
    if (prePresentView) {
      view = prePresentView;
      applyView();
      prePresentView = null;
    } else {
      resetView();
    }
  }

  elPresentToggle.addEventListener("click", function () {
    if (document.body.classList.contains("is-presentation")) exitPresentation();
    else enterPresentation();
  });
  elPresentExit.addEventListener("click", exitPresentation);
  elPresentNext.addEventListener("click", function () { goToStop(presentIndex + 1); });
  elPresentPrev.addEventListener("click", function () { goToStop(presentIndex - 1); });

  document.addEventListener("keydown", function (e) {
    if (!document.body.classList.contains("is-presentation")) return;
    if (e.key === "ArrowRight") goToStop(presentIndex + 1);
    else if (e.key === "ArrowLeft") goToStop(presentIndex - 1);
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
