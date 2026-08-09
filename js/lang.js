/**
 * VELFONT OFFICE — Language Switch
 * A globe button in the header (left of the Instagram icon) opens a small
 * dropdown with English / 한국어. Swaps text on every element tagged
 * data-i18n (textContent), data-i18n-html (innerHTML — only the hero
 * subtitle and the contact form's "Email required" line need embedded
 * markup), or data-i18n-aria (the aria-label attribute, for icon-only
 * controls with no visible text to tag). Choice persists in localStorage.
 *
 * The <select name="reason"> options get explicit value="" attributes in
 * the HTML precisely so translating their text here doesn't also change
 * what gets submitted to Supabase — the stored value stays the English
 * label regardless of which language wrote it.
 */
(function () {
  var STORAGE_KEY = "velfontLang";
  var DEFAULT_LANG = "en";

  var TRANSLATIONS = {
    en: {
      "nav.shop": "shop",
      "nav.contact": "contact",
      "nav.membersOnly": "members only",
      "nav.office": "office",
      "nav.archive": "archive",
      "nav.about": "about",
      "nav.menu": "MENU",
      "lang.toggleLabel": "Change language",
      "hero.subtitle": "A Creative Office for Fashion,<br>Research,<br>Archive,<br>Documentation.",
      "section.officeTitle": "Office",
      "section.officeDesc": "Internal structure, process, and the working methods behind VELFONT OFFICE.",
      "section.archiveTitle": "Archive",
      "section.archiveDesc": "A growing record of collections, references, and research.",
      "section.aboutTitle": "About",
      "section.aboutDesc": "Notes on the studio, its practice, and the people behind it.",
      "contact.title": "Contact",
      "contact.closeLabel": "Close contact form",
      "contact.name": "Name",
      "contact.email": "Email <em>required</em>",
      "contact.reason": "Reason for Inquiry",
      "contact.reasonGeneral": "General",
      "contact.reasonCollab": "Collaboration",
      "contact.reasonPress": "Press",
      "contact.reasonOther": "Other",
      "contact.phone": "Phone",
      "contact.comment": "Comment",
      "contact.send": "Send",
      "nav.fifthAve": "5th ave. bipolar kids",
      "footer.copy": "© 2026 VELFONT OFFICE",
    },
    ko: {
      "nav.shop": "샵",
      "nav.contact": "문의",
      "nav.membersOnly": "멤버 전용",
      "nav.office": "오피스",
      "nav.archive": "아카이브",
      "nav.about": "소개",
      "nav.menu": "메뉴",
      "lang.toggleLabel": "언어 변경",
      "hero.subtitle": "패션,<br>리서치,<br>아카이브,<br>도큐멘테이션을 위한 크리에이티브 오피스.",
      "section.officeTitle": "오피스",
      "section.officeDesc": "VELFONT OFFICE의 내부 구조와 프로세스, 그리고 일하는 방식.",
      "section.archiveTitle": "아카이브",
      "section.archiveDesc": "컬렉션과 레퍼런스, 리서치가 쌓여가는 기록.",
      "section.aboutTitle": "소개",
      "section.aboutDesc": "스튜디오와 그 실천, 그리고 사람들에 대한 이야기.",
      "contact.title": "문의하기",
      "contact.closeLabel": "문의 창 닫기",
      "contact.name": "이름",
      "contact.email": "이메일 <em>필수</em>",
      "contact.reason": "문의 유형",
      "contact.reasonGeneral": "일반",
      "contact.reasonCollab": "협업",
      "contact.reasonPress": "언론",
      "contact.reasonOther": "기타",
      "contact.phone": "전화번호",
      "contact.comment": "메시지",
      "contact.send": "보내기",
      "nav.fifthAve": "5th ave. bipolar kids",
      "footer.copy": "© 2026 VELFONT OFFICE",
    },
  };

  var switchEl = document.getElementById("langSwitch");
  var toggle = document.getElementById("langToggle");
  var menu = document.getElementById("langMenu");
  if (!switchEl || !toggle || !menu) return;

  var options = menu.querySelectorAll(".lang-option");
  var isOpen = false;
  var currentLang = DEFAULT_LANG;

  function openMenu() {
    isOpen = true;
    switchEl.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    menu.setAttribute("aria-hidden", "false");
  }

  function closeMenu() {
    if (!isOpen) return;
    isOpen = false;
    switchEl.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-hidden", "true");
  }

  // `lock`: true only for a user-triggered switch (see the click handler
  // below) — it marks each element so main.js's typing animation bails
  // out if a step for it is still pending (see the dataset.i18nLocked
  // check in typeElement's step()). The initial call on page load never
  // locks: it always finishes before that animation's setTimeout chain
  // gets a chance to start (synchronous script execution runs to
  // completion first), so there's nothing to race against yet, and
  // locking here would permanently prevent the typing effect from ever
  // running on a first visit.
  function applyLang(lang, lock) {
    var dict = TRANSLATIONS[lang];
    if (!dict) return;
    currentLang = lang;
    document.documentElement.lang = lang;

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key] === undefined) return;
      if (lock) el.dataset.i18nLocked = "1";
      el.textContent = dict[key];
    });

    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (dict[key] === undefined) return;
      if (lock) el.dataset.i18nLocked = "1";
      el.innerHTML = dict[key];
    });

    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-aria");
      if (dict[key] !== undefined) el.setAttribute("aria-label", dict[key]);
    });

    options.forEach(function (opt) {
      opt.classList.toggle("is-active", opt.dataset.lang === lang);
    });

    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch (err) {
      // Private-browsing/storage-disabled — language just won't persist
      // across visits, nothing else depends on it.
    }
  }

  toggle.addEventListener("click", function (e) {
    e.preventDefault();
    if (isOpen) closeMenu();
    else openMenu();
  });

  options.forEach(function (opt) {
    opt.addEventListener("click", function () {
      applyLang(opt.dataset.lang, true);
      closeMenu();
    });
  });

  document.addEventListener("click", function (e) {
    if (!isOpen) return;
    if (switchEl.contains(e.target)) return;
    closeMenu();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) closeMenu();
  });

  var saved = null;
  try {
    saved = window.localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    // ignore
  }
  applyLang(saved && TRANSLATIONS[saved] ? saved : DEFAULT_LANG);
})();
