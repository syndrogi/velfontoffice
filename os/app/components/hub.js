/**
 * Founder OS — Hub Component
 *
 * Builds the module launcher grid from FOUNDER_MODULES (app/js/manifest.js)
 * and, when a tile is opened, fetch()es that module's markup from
 * app/modules on demand — nothing is preloaded, and nothing is fetched
 * twice (each module's HTML is cached after first load).
 *
 * The hub grid stays on screen the whole time — opening a module reveals
 * its workspace underneath the grid rather than replacing it, and the
 * opened tile is marked .active. "Close" just collapses the workspace
 * again. Switching modules never reloads app/index.html or touches the URL.
 */
(function () {
  const hub = document.getElementById("app-hub");
  const workspace = document.getElementById("app-workspace");
  const backButton = document.getElementById("app-back");
  const mount = document.getElementById("app-mount");

  if (!hub || !workspace || !mount) return;

  const modules = window.FOUNDER_MODULES || [];
  const modulesById = {};
  modules.forEach(function (module) {
    modulesById[module.id] = module;
  });

  const tilesById = {};
  let activeId = null;

  function setActiveTile(id) {
    if (activeId && tilesById[activeId]) {
      tilesById[activeId].classList.remove("active");
    }
    activeId = id;
    if (id && tilesById[id]) {
      tilesById[id].classList.add("active");
    }
  }

  const cache = {};

  // A couple of modules need a value a static fragment can't hold (today's
  // date, live data from Supabase). Enhancers run every time that module's
  // HTML lands in #app-mount — including from cache — so Contact re-fetches
  // fresh on each visit rather than showing whatever it first loaded.
  const enhancers = {
    calendar: enhanceCalendar,
    journal: enhanceJournal,
    contact: enhanceContact
  };

  // Same project/anon key as VELFONT OFFICE's contact form (js/contact.js).
  // The anon key can only INSERT there; a separate "Allow public read"
  // policy on contact_submissions is what lets this module SELECT — see
  // sql/contact_table.sql in vfo_main. That policy has no auth check, so
  // anyone with the anon key (not just signed-in founders) can read
  // submissions; the passphrase gate in front of this app is the only
  // thing standing in the way today, not real access control.
  const SUPABASE_URL = "https://miqfpvtmmvuvaezexazw.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pcWZwdnRtbXZ1dmFlemV4YXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMTYwNTEsImV4cCI6MjEwMDc5MjA1MX0.JeN31q4ahSoqjFVAZS3Is1nMOc_mkiLB4nv3yxP2aY0";

  let supabaseClient = null;
  function getSupabaseClient() {
    if (!window.supabase || !window.supabase.createClient) return null;
    if (!supabaseClient) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderContactEntry(row) {
    const date = row.created_at
      ? new Date(row.created_at).toLocaleString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      : "";
    const name = escapeHtml(row.name || "(no name)");
    const email = escapeHtml(row.email || "");
    const phone = row.phone ? escapeHtml(row.phone) : "";
    const reason = row.reason ? escapeHtml(row.reason) : "";
    const comment = row.comment ? escapeHtml(row.comment) : "";

    return (
      '<div class="content-card contact-entry">' +
        '<div class="card-title">' + name + "</div>" +
        '<div class="feed-date">' + date + (reason ? " · " + reason : "") + "</div>" +
        '<div class="contact-meta">' + email + (phone ? " · " + phone : "") + "</div>" +
        (comment ? '<p class="contact-comment">' + comment + "</p>" : "") +
      "</div>"
    );
  }

  function enhanceContact(root) {
    const listEl = root.querySelector("[data-contact-list]");
    if (!listEl) return;

    const client = getSupabaseClient();
    if (!client) {
      listEl.innerHTML = '<p class="app-message">Couldn’t reach Supabase.</p>';
      return;
    }

    listEl.innerHTML = '<p class="app-message">Loading…</p>';

    client
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .then(function (result) {
        if (result.error) {
          listEl.innerHTML = '<p class="app-message">Couldn’t load submissions.</p>';
          return;
        }
        const rows = result.data || [];
        if (!rows.length) {
          listEl.innerHTML = '<p class="app-message">No submissions yet.</p>';
          return;
        }
        listEl.innerHTML = rows.map(renderContactEntry).join("");
      });
  }

  function enhanceCalendar(root) {
    const headerEl = root.querySelector("[data-calendar-header]");
    const gridEl = root.querySelector("[data-calendar-grid]");
    if (!headerEl || !gridEl) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    headerEl.textContent = now
      .toLocaleDateString(undefined, { month: "long", year: "numeric" })
      .toUpperCase();

    const weekdays = ["S", "M", "T", "W", "T", "F", "S"];
    let cells = weekdays
      .map(function (day) {
        return '<span class="calendar-weekday">' + day + "</span>";
      })
      .join("");

    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstWeekday; i++) {
      cells += '<span class="calendar-day empty"></span>';
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = day === now.getDate();
      cells +=
        '<span class="calendar-day' + (isToday ? " today" : "") + '">' + day + "</span>";
    }

    gridEl.innerHTML = cells;
  }

  function renderJournalEntry(row) {
    const date = row.created_at
      ? new Date(row.created_at).toLocaleString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      : "";
    const author = escapeHtml(row.author || "");
    const content = escapeHtml(row.content || "");

    return (
      '<div class="journal-entry">' +
        '<div class="journal-entry-meta">' + author + (date ? " · " + date : "") + "</div>" +
        '<p class="journal-entry-text">' + content + "</p>" +
      "</div>"
    );
  }

  function loadJournalEntries(listEl) {
    const client = getSupabaseClient();
    if (!client) {
      listEl.innerHTML = '<p class="app-message">Couldn’t reach Supabase.</p>';
      return;
    }

    listEl.innerHTML = '<p class="app-message">Loading…</p>';

    client
      .from("journal_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .then(function (result) {
        if (result.error) {
          listEl.innerHTML = '<p class="app-message">Couldn’t load entries.</p>';
          return;
        }
        const rows = result.data || [];
        if (!rows.length) {
          listEl.innerHTML = '<p class="app-message">No entries yet.</p>';
          return;
        }
        listEl.innerHTML = rows.map(renderJournalEntry).join("");
      });
  }

  function currentFounderName() {
    const raw = sessionStorage.getItem("founderSession");
    if (!raw) return "Founder";
    try {
      return JSON.parse(raw).name || "Founder";
    } catch (err) {
      return "Founder";
    }
  }

  function enhanceJournal(root) {
    const dateEl = root.querySelector("[data-journal-date]");
    if (dateEl) dateEl.textContent = new Date().toDateString();

    const listEl = root.querySelector("[data-journal-list]");
    const inputEl = root.querySelector("[data-journal-input]");
    const saveButton = root.querySelector("[data-journal-save]");
    if (!listEl) return;

    loadJournalEntries(listEl);

    if (!inputEl || !saveButton) return;

    saveButton.addEventListener("click", function () {
      const content = inputEl.value.trim();
      if (!content) return;

      const client = getSupabaseClient();
      if (!client) return;

      saveButton.disabled = true;

      client
        .from("journal_entries")
        .insert({ author: currentFounderName(), content: content })
        .then(function (result) {
          saveButton.disabled = false;
          if (result.error) return;
          inputEl.value = "";
          loadJournalEntries(listEl);
        });
    });
  }

  function showLoading() {
    mount.innerHTML = '<p class="app-message">Loading…</p>';
  }

  function showError() {
    mount.innerHTML = '<p class="app-message">Couldn’t load this module.</p>';
  }

  function renderModule(id, html) {
    mount.innerHTML = html;
    const enhance = enhancers[id];
    if (enhance) enhance(mount);
  }

  function openModule(id) {
    const module = modulesById[id];
    if (!module || !module.file) return;

    workspace.hidden = false;
    setActiveTile(id);

    if (cache[id]) {
      renderModule(id, cache[id]);
      return;
    }

    showLoading();

    fetch(module.file)
      .then(function (response) {
        if (!response.ok) throw new Error("Failed to load " + module.file);
        return response.text();
      })
      .then(function (html) {
        cache[id] = html;
        renderModule(id, html);
      })
      .catch(showError);
  }

  function showHub() {
    workspace.hidden = true;
    setActiveTile(null);
  }

  // Small brand badges for external-service tiles (bottom-right corner of
  // the tile), keyed by manifest `icon`. Add a new entry here, then
  // reference its key as `icon` on that module — e.g. for a future
  // YouTube or Instagram tile.
  const ICONS = {
    notion:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<rect x="0.75" y="0.75" width="22.5" height="22.5" rx="5" fill="#fff" stroke="#000" stroke-width="1.5"/>' +
      '<text x="12" y="16.5" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="13" fill="#000">N</text>' +
      "</svg>",
    supabase:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<defs><linearGradient id="sbGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
      '<stop offset="0%" stop-color="#1f7a52"/>' +
      '<stop offset="100%" stop-color="#3ecf8e"/>' +
      "</linearGradient></defs>" +
      '<rect x="0.75" y="0.75" width="22.5" height="22.5" rx="5" fill="#fff" stroke="#000" stroke-width="1.5"/>' +
      '<polygon points="13,4 5,13 13,13" fill="#3ecf8e"/>' +
      '<polygon points="11,20 19,11 11,11" fill="url(#sbGrad)"/>' +
      "</svg>",
    analytics:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<rect x="0.75" y="0.75" width="22.5" height="22.5" rx="5" fill="#fff" stroke="#000" stroke-width="1.5"/>' +
      '<rect x="5.5" y="13" width="3" height="6" rx="1" fill="#f9ab00"/>' +
      '<rect x="10.5" y="9" width="3" height="10" rx="1" fill="#e37400"/>' +
      '<rect x="15.5" y="5" width="3" height="14" rx="1" fill="#f9ab00"/>' +
      "</svg>"
  };

  function tileInnerHtml(module) {
    let html =
      '<span class="tile-label">' +
      module.label +
      "</span>" +
      '<span class="tile-sub">' +
      (module.sub || "") +
      "</span>";
    if (module.status === "wip") {
      html += '<span class="tile-status" aria-label="Work in progress">WIP</span>';
    }
    if (module.icon && ICONS[module.icon]) {
      html += '<span class="tile-icon">' + ICONS[module.icon] + "</span>";
    }
    return html;
  }

  modules.forEach(function (module) {
    if (module.external) {
      const link = document.createElement("a");
      link.className = "app-tile";
      link.innerHTML = tileInnerHtml(module);
      link.dataset.module = module.id;
      link.href = module.external;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      hub.appendChild(link);
      return;
    }

    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "app-tile";
    tile.innerHTML = tileInnerHtml(module);
    tile.dataset.module = module.id;
    tile.addEventListener("click", function () {
      openModule(module.id);
    });
    tilesById[module.id] = tile;
    hub.appendChild(tile);
  });

  if (backButton) {
    backButton.addEventListener("click", showHub);
  }

  window.FounderHub = {
    open: openModule,
    showHub: showHub,
    openDefault: function () {
      showHub();
    }
  };
})();
