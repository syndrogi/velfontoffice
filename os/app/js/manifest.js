/**
 * Founder OS — Module Manifest
 *
 * Navigation metadata only: which modules exist, their hub label, and which
 * file under /app/modules holds their markup. No module HTML lives here or
 * in app/index.html — app/components/hub.js fetches module.file on demand,
 * only when that module is opened.
 *
 * To add a future module: add one entry here and create its file under
 * app/modules — nothing else in app/index.html needs to change.
 *
 * A module may set `external` instead of `file` — the hub then renders it
 * as a plain link that opens that URL in a new tab, rather than fetching
 * and mounting a fragment (used for Notion, which can't be embedded — and
 * for any future external service like YouTube or Instagram).
 *
 * `sub` is the Korean line shown under the label on its hub tile.
 *
 * `icon` is an optional key into the ICONS lookup in hub.js — a small
 * badge drawn in the tile's bottom-right corner. Used for external
 * modules so their destination is recognizable at a glance; add a new
 * ICONS entry in hub.js before referencing it here.
 *
 * `status: "wip"` marks a module whose content is still static
 * scaffolding (no real data wired up yet) — hub.js draws a small "WIP"
 * tag on its tile, and the module's own markup should carry a matching
 * .app-status-banner line, so opening it never reads as a live feature.
 * Omit `status` once a module is backed by real data.
 */
const FOUNDER_MODULES = [
  { id: "dashboard", label: "DASHBOARD", sub: "대시보드", file: "modules/dashboard.html", status: "wip" },
  { id: "contact", label: "CONTACT", sub: "문의하기", file: "modules/contact.html" },
  {
    id: "notion",
    label: "NOTION",
    sub: "노션",
    external: "https://app.notion.com/p/rgb-2ee47832a35a80d18531fc923ec9c9b0",
    icon: "notion"
  },
  {
    id: "database",
    label: "DATABASE",
    sub: "데이터베이스",
    external: "https://supabase.com/dashboard/project/miqfpvtmmvuvaezexazw",
    icon: "supabase"
  },
  {
    id: "analytics",
    label: "ANALYTICS",
    sub: "애널리틱스",
    external:
      "https://analytics.google.com/analytics/web/provision/?hl=ko#/a403981634p549090957/reports/intelligenthome",
    icon: "analytics"
  },
  { id: "brain", label: "BRAIN", sub: "브레인", file: "modules/brain.html", status: "wip" },
  { id: "projects", label: "PROJECTS", sub: "프로젝트", file: "modules/projects.html", status: "wip" },
  { id: "money", label: "MONEY", sub: "재무", file: "modules/money.html", status: "wip" },
  { id: "network", label: "NETWORK", sub: "네트워크", file: "modules/network.html", status: "wip" },
  { id: "vault", label: "VAULT", sub: "보관함", file: "modules/vault.html", status: "wip" },
  { id: "timeline", label: "TIMELINE", sub: "타임라인", file: "modules/timeline.html", status: "wip" },
  { id: "journal", label: "DAILY JOURNAL", sub: "데일리 저널", file: "modules/journal.html" },
  { id: "studio", label: "STUDIO", sub: "스튜디오", file: "modules/studio.html", status: "wip" },
  { id: "playground", label: "PLAYGROUND", sub: "플레이그라운드", file: "modules/playground.html", status: "wip" },
  {
    id: "inspiration",
    label: "INSPIRATION LIBRARY",
    sub: "레퍼런스 라이브러리",
    file: "modules/inspiration.html",
    status: "wip"
  },
  { id: "calendar", label: "CALENDAR", sub: "캘린더", file: "modules/calendar.html" },
  { id: "activity", label: "ACTIVITY FEED", sub: "활동 피드", file: "modules/activity.html", status: "wip" },
  { id: "members", label: "MEMBERS", sub: "멤버", file: "modules/members.html" },
  { id: "dreamboard", label: "DREAM BOARD", sub: "드림보드", file: "modules/dreamboard.html", status: "wip" },
  { id: "ai", label: "AI FOUNDER", sub: "AI 파운더", file: "modules/ai.html", status: "wip" }
];

window.FOUNDER_MODULES = FOUNDER_MODULES;
