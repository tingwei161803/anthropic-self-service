/* =========================================================================
   multipage · shell.js   (vanilla, no build)

   The SHARED CHROME for every page: app bar, cross-page nav, footer and the
   detail <dialog>. It also owns global state (language + theme) and exposes a
   tiny toolkit on window.LDW that each page's app.js reuses.

   Loaded on EVERY page BEFORE app.js. It:
     1. takes the language from <html lang> and the theme from localStorage,
     2. injects app bar + nav + footer + dialog around <main id="page">,
     3. wires the theme toggle and points the language link at this page's
        twin in the other language,
     4. highlights the current page (from <body data-page="...">).

   Each language has its own URL — 中文 at the root, English under /en/ — so the
   URL decides the language. Nothing stored decides it: a visitor landing on an
   /en/ page gets English even if they once picked 中文, and crawlers, which have
   no storage and never click, see whichever language the URL they fetched says.
   The theme still persists across pages via localStorage (an origin-wide store).
   ========================================================================= */
(function () {
  "use strict";

  var META = window.SITE_META || { title: {}, subtitle: {}, footer: {} };
  var PAGES = Array.isArray(window.SITE_PAGES) ? window.SITE_PAGES : [];

  /* ---------- chrome i18n (page content strings live in the data) ---------- */
  var I18N = {
    en: { close: "Close", menu: "Pages", skip: "Skip to content" },
    zh: { close: "關閉", menu: "頁面", skip: "跳到內容" }
  };

  /* ---------- sandbox-safe localStorage ---------- */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  /* ---------- one URL per language: 中文 at "/", English under "/en/" ---------- */
  var TWIN_PREFIX = "/en";
  function pageLang() {
    var declared = (document.documentElement.getAttribute("lang") || "en").toLowerCase();
    return declared.indexOf("zh") === 0 ? "zh" : "en";
  }
  /* This page's address in the other language — the same page, never the home
     page, so switching language keeps you where you are. */
  function twinHref() {
    var p = location.pathname;
    var inTwin = p === TWIN_PREFIX || p.indexOf(TWIN_PREFIX + "/") === 0;
    return inTwin ? (p.slice(TWIN_PREFIX.length) || "/") : TWIN_PREFIX + p;
  }

  /* ---------- global state ---------- */
  var state = {
    lang:  pageLang(),
    theme: lsGet("theme") || "light"
  };

  /* ---------- helpers shared with app.js ---------- */
  function t(obj) {
    if (obj == null) return "";
    if (typeof obj === "string") return obj;
    return obj[state.lang] || obj.en || obj.zh || "";
  }
  function ui(key) { return (I18N[state.lang] || I18N.en)[key]; }
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }
  function r(n) { return Math.round(n * 100) / 100; }

  function pageHref(p) { return p.slug === "home" ? "index.html" : p.slug + ".html"; }
  function currentSlug() { return document.body.getAttribute("data-page") || "home"; }
  function currentPage() {
    var slug = currentSlug();
    for (var i = 0; i < PAGES.length; i++) if (PAGES[i].slug === slug) return PAGES[i];
    return PAGES[0] || null;
  }

  /* =======================================================================
     CHROME INJECTION — app bar, nav, footer, dialog around <main id="page">
     ===================================================================== */
  function injectChrome() {
    var main = document.getElementById("page");
    if (!main) return;

    /* The language control is a link now, so it names where it goes, not where
       you are — and it carries the target language on itself for screen readers. */
    var twinCode  = state.lang === "en" ? "zh-Hant" : "en";
    var twinLabel = state.lang === "en" ? "中" : "EN";
    var twinName  = state.lang === "en" ? "中文" : "English";

    /* skip link */
    var skip = document.createElement("a");
    skip.className = "skip-link";
    skip.href = "#page";
    skip.id = "skipLink";
    document.body.insertBefore(skip, document.body.firstChild);

    /* app bar */
    var appbar = document.createElement("header");
    appbar.className = "appbar";
    appbar.innerHTML =
      '<div class="appbar__inner">' +
        '<a class="brand" href="index.html">' +
          '<span class="material-symbols-rounded brand__logo">hub</span>' +
          '<span class="brand__name" id="brandName"></span>' +
        '</a>' +
        '<div class="appbar__actions">' +
          (META.repo ?
            '<a class="gh-star" id="ghStar" href="https://github.com/' + escapeHtml(META.repo) + '" ' +
              'target="_blank" rel="noopener" title="Star on GitHub" ' +
              'aria-label="Star this project on GitHub / 到 GitHub 為此專案按星星">' +
              '<span class="material-symbols-rounded gh-star__icon" aria-hidden="true">star</span>' +
              '<span class="gh-star__label">Star</span>' +
              '<span class="gh-star__count" id="ghStarCount" aria-hidden="true"></span>' +
            '</a>' : "") +
          '<a class="icon-btn" id="langToggle" href="' + escapeHtml(twinHref()) + '" ' +
            'hreflang="' + twinCode + '" lang="' + twinCode + '" rel="alternate" ' +
            'title="' + twinName + '" aria-label="' + twinName + '">' +
            '<span class="material-symbols-rounded" aria-hidden="true">translate</span>' +
            '<span class="icon-btn__txt" id="langLabel">' + twinLabel + '</span>' +
          '</a>' +
          '<button class="icon-btn" id="themeToggle" type="button" title="Theme" aria-label="Toggle theme / 切換主題">' +
            '<span class="material-symbols-rounded" id="themeIcon">dark_mode</span>' +
          '</button>' +
        '</div>' +
      '</div>';
    document.body.insertBefore(appbar, main);

    /* cross-page nav */
    var nav = document.createElement("nav");
    nav.className = "pagenav";
    nav.id = "pageNav";
    nav.innerHTML = '<div class="pagenav__inner" id="pageNavInner"></div>';
    document.body.insertBefore(nav, main);

    /* footer */
    var footer = document.createElement("footer");
    footer.className = "footer";
    footer.innerHTML = '<p id="footerText"></p>' +
      '<div class="profile-links" style="display:flex;gap:12px;justify-content:center;align-items:center;margin-top:10px">' +
        '<a class="icon-btn" href="https://www.peteraim.com" target="_blank" rel="noopener" title="Home" aria-label="Back to peteraim.com / 返回首頁">' +
          '<span class="material-symbols-rounded">home</span>' +
        '</a>' +
        '<a class="icon-btn" href="https://www.linkedin.com/in/ai-med/" target="_blank" rel="noopener" title="LinkedIn" aria-label="LinkedIn (opens in new tab)">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/></svg>' +
        '</a>' +
      '</div>';
    main.parentNode.insertBefore(footer, main.nextSibling);

    /* shared detail dialog (used by card layouts) */
    var dialog = document.createElement("dialog");
    dialog.className = "dialog";
    dialog.id = "dialog";
    dialog.setAttribute("aria-labelledby", "dialogTitle");
    dialog.innerHTML =
      '<div class="dialog__bar">' +
        '<span class="dialog__spacer"></span>' +
        '<button class="icon-btn" id="dialogClose" type="button" aria-label="Close / 關閉">' +
          '<span class="material-symbols-rounded">close</span>' +
        '</button>' +
      '</div>' +
      '<div class="dialog__body" id="dialogBody"></div>';
    document.body.appendChild(dialog);

    /* dialog wiring (shared close behaviour; deep links handled by app.js) */
    document.getElementById("dialogClose").addEventListener("click", function () {
      if (dialog.open) dialog.close();
    });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
  }

  function paintNav() {
    var inner = document.getElementById("pageNavInner");
    if (!inner) return;
    inner.innerHTML = "";
    var here = currentSlug();
    PAGES.forEach(function (p) {
      var a = document.createElement("a");
      a.className = "navpill" + (p.slug === here ? " navpill--active" : "");
      a.href = pageHref(p);
      if (p.slug === here) a.setAttribute("aria-current", "page");
      a.innerHTML =
        '<span class="material-symbols-rounded" aria-hidden="true">' +
          escapeHtml(p.icon || "label") + "</span>" +
        "<span>" + escapeHtml(t(p.title)) + "</span>";
      inner.appendChild(a);
    });
    /* keep the active pill in view within the scrolling nav */
    var active = inner.querySelector(".navpill--active");
    if (active && active.scrollIntoView) {
      active.scrollIntoView({ block: "nearest", inline: "center" });
    }
  }

  /* ---------- chrome text in the active language ---------- */
  function refreshChrome() {
    /* <html lang> is left alone: the page declares it and hreflang groups on that
       exact code, so writing "zh" back over "zh-Hant" would split the pair. */
    var page = currentPage();
    var siteTitle = t(META.title);
    var pageTitle = page ? t(page.title) : "";
    document.title = pageTitle ? pageTitle + " · " + siteTitle : siteTitle;

    var brand = document.getElementById("brandName");
    if (brand) brand.textContent = siteTitle;
    var foot = document.getElementById("footerText");
    if (foot) foot.textContent = t(META.footer);
    var skip = document.getElementById("skipLink");
    if (skip) skip.textContent = ui("skip");
    var nav = document.getElementById("pageNav");
    if (nav) nav.setAttribute("aria-label", ui("menu"));
    var dc = document.getElementById("dialogClose");
    if (dc) dc.setAttribute("aria-label", ui("close"));
    paintNav();
  }

  /* =======================================================================
     THEME  (language needs no runtime switch — the link navigates)
     ===================================================================== */
  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
    var icon = document.getElementById("themeIcon");
    if (icon) icon.textContent = state.theme === "dark" ? "light_mode" : "dark_mode";
    lsSet("theme", state.theme);
  }

  function wire() {
    document.getElementById("themeToggle").addEventListener("click", function () {
      state.theme = state.theme === "dark" ? "light" : "dark";
      applyTheme();
    });
  }

  /* =======================================================================
     PUBLIC TOOLKIT (app.js uses this)
     ===================================================================== */
  window.LDW = {
    ready: false,          // flipped true once the chrome (incl. #dialog) is injected
    state: state,
    t: t, ui: ui, escapeHtml: escapeHtml, r: r,
    lsGet: lsGet, lsSet: lsSet,
    pages: PAGES, meta: META,
    currentPage: currentPage, currentSlug: currentSlug, pageHref: pageHref,
    refreshChrome: refreshChrome,
    dialog: function () { return document.getElementById("dialog"); }
  };

  /* ---------- GitHub star count (no auth; degrades silently) ---------- */
  function fmtStars(n) {
    if (n >= 1000) {
      var k = n / 1000;
      return (k >= 10 ? Math.round(k) : (Math.round(k * 10) / 10)) + "k";
    }
    return String(n);
  }
  function loadStars() {
    if (!META.repo) return;
    var el = document.getElementById("ghStarCount");
    if (!el || typeof fetch !== "function") return;
    fetch("https://api.github.com/repos/" + META.repo)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && typeof j.stargazers_count === "number") {
          el.textContent = fmtStars(j.stargazers_count);
        }
      })
      .catch(function () { /* offline / rate-limited: leave the link as-is */ });
  }

  /* =======================================================================
     INIT
     ===================================================================== */
  function init() {
    injectChrome();
    applyTheme();
    refreshChrome();
    wire();
    loadStars();
    window.LDW.ready = true;
    document.dispatchEvent(new CustomEvent("ldw:shell-ready"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
