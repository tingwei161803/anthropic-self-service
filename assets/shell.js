/* =========================================================================
   multipage · shell.js   (vanilla, no build)

   The SHARED CHROME for every page: top bar, "unofficial summary" notice,
   page list, footer and the detail <dialog>. It also owns global state
   (language + theme) and exposes a tiny toolkit on window.LDW that each
   page's app.js reuses.

   Loaded on EVERY page BEFORE app.js. It:
     1. takes the language from <html lang>; the theme from localStorage, or
        from the system's prefers-color-scheme when nothing is saved,
     2. injects top bar + notice + page list + footer + dialog around <main id="page">,
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

  document.documentElement.classList.add("js");

  /* ---------- chrome i18n (page content strings live in the data) ---------- */
  var I18N = {
    en: { close: "Close", menu: "Pages", skip: "Skip to content", tag: "Unofficial summary",
          theme: "Switch light / dark theme", home: "peteraim.com home", star: "Star on GitHub" },
    zh: { close: "關閉", menu: "頁面", skip: "跳到內容", tag: "非官方整理",
          theme: "切換淺色／深色主題", home: "回 peteraim.com 首頁", star: "到 GitHub 按星星" }
  };

  /* ---------- small inline icons (no icon font) ---------- */
  var ICONS = {
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
    sun: '<circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    globe: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    chevron: '<path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    plus: '<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    close: '<path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    home: '<path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'
  };
  function icon(name) {
    return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONS[name] || "") + "</svg>";
  }
  /* brand mark: a gauge, red stub then blue fill — the whole essay in 24px */
  var MARK = '<svg class="brand__mark" viewBox="0 0 26 26" aria-hidden="true">' +
    '<rect x="1" y="1" width="24" height="24" rx="5" fill="var(--ink)"/>' +
    '<rect x="5" y="15" width="4" height="6" rx="1" fill="var(--guess)"/>' +
    '<rect x="11" y="10" width="4" height="11" rx="1" fill="var(--paper)" opacity=".55"/>' +
    '<rect x="17" y="5" width="4" height="16" rx="1" fill="var(--accent)"/></svg>';

  /* ---------- sandbox-safe storage ---------- */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }

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
  function systemTheme() {
    try { return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; }
    catch (e) { return "light"; }
  }
  var savedTheme = lsGet("theme");
  var state = {
    lang:  pageLang(),
    theme: savedTheme === "dark" || savedTheme === "light" ? savedTheme : systemTheme()
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
  function pageIndex(slug) {
    for (var i = 0; i < PAGES.length; i++) if (PAGES[i].slug === slug) return i;
    return -1;
  }
  /* "01".."07" — the essay is read in order; the overview has no number */
  function pageNum(p) {
    var i = pageIndex(p.slug);
    return i <= 0 ? "" : (i < 10 ? "0" : "") + i;
  }

  /* =======================================================================
     CHROME INJECTION
     ===================================================================== */
  function injectChrome() {
    var main = document.getElementById("page");
    if (!main) return;

    /* The language control is a link, so it names where it goes, not where
       you are — and it carries the target language on itself for screen readers. */
    var twinCode  = state.lang === "en" ? "zh-Hant" : "en";
    var twinLabel = state.lang === "en" ? "中文" : "EN";
    var twinName  = state.lang === "en" ? "中文" : "English";

    /* skip link */
    var skip = document.createElement("a");
    skip.className = "skip-link";
    skip.href = "#page";
    skip.id = "skipLink";
    document.body.insertBefore(skip, document.body.firstChild);

    /* top bar */
    var top = document.createElement("header");
    top.className = "topbar";
    top.innerHTML =
      '<div class="topbar__inner">' +
        '<a class="brand" href="index.html">' + MARK +
          '<span class="brand__name" id="brandName"></span>' +
        '</a>' +
        '<div class="topbar__actions">' +
          (META.repo ?
            '<a class="gh-star" id="ghStar" href="https://github.com/' + escapeHtml(META.repo) + '" ' +
              'target="_blank" rel="noopener" title="' + escapeHtml(ui("star")) + '" ' +
              'aria-label="' + escapeHtml(ui("star")) + '">' + icon("star") +
              '<span class="gh-star__label">Star</span>' +
              '<span class="gh-star__count" id="ghStarCount" aria-hidden="true" hidden></span>' +
            '</a>' : "") +
          '<a class="icon-btn" id="langToggle" href="' + escapeHtml(twinHref()) + '" ' +
            'hreflang="' + twinCode + '" lang="' + twinCode + '" rel="alternate" ' +
            'title="' + twinName + '" aria-label="' + twinName + '">' + icon("globe") +
            '<span class="icon-btn__txt" id="langLabel">' + twinLabel + '</span>' +
          '</a>' +
          '<button class="icon-btn" id="themeToggle" type="button" title="' + escapeHtml(ui("theme")) + '" ' +
            'aria-label="' + escapeHtml(ui("theme")) + '"><span id="themeIcon"></span></button>' +
        '</div>' +
      '</div>';
    document.body.insertBefore(top, main);

    /* unofficial-summary notice, right under the top bar on every page */
    if (t(META.notice)) {
      var notice = document.createElement("p");
      notice.className = "notice";
      notice.innerHTML = '<span class="notice__tag">' + escapeHtml(ui("tag")) + "</span>" +
        "<span>" + escapeHtml(t(META.notice)) + "</span>" +
        (META.source ? '<a href="' + escapeHtml(META.source.url) + '" target="_blank" rel="noopener">' +
          escapeHtml(t(META.source.label)) + "</a>" : "");
      document.body.insertBefore(notice, main);
    }

    /* page list: a <details> menu on phones, an always-open sidebar on desktop */
    var nav = document.createElement("nav");
    nav.className = "pagenav";
    nav.id = "pageNav";
    nav.innerHTML = '<details class="pagenav__menu" id="pageMenu"><summary id="pageMenuSummary"></summary>' +
      '<ol class="pagenav__list" id="pageNavInner"></ol></details>';
    document.body.insertBefore(nav, main);

    /* footer — also adopts the static "English version / 中文版" link that each
       HTML file carries for no-JS readers, so it no longer floats below the page */
    var footer = document.createElement("footer");
    footer.className = "footer";
    footer.innerHTML = '<p class="footer__note" id="footerText"></p>' +
      '<div class="footer__row" id="footerRow">' +
        (META.source ? '<a href="' + escapeHtml(META.source.url) + '" target="_blank" rel="noopener">' +
          escapeHtml(t(META.source.label)) + "</a>" : "") +
        '<a class="icon-btn" href="https://www.peteraim.com" target="_blank" rel="noopener" title="' + escapeHtml(ui("home")) + '" aria-label="' + escapeHtml(ui("home")) + '">' + icon("home") + "</a>" +
        '<a class="icon-btn" href="https://www.linkedin.com/in/ai-med/" target="_blank" rel="noopener" title="LinkedIn" aria-label="LinkedIn">' +
          '<svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/></svg>' +
        "</a>" +
      "</div>";
    main.parentNode.insertBefore(footer, main.nextSibling);
    var alt = document.querySelector("body > .lang-alt-link");
    if (alt) {
      alt.removeAttribute("style");
      document.getElementById("footerRow").insertBefore(alt, document.getElementById("footerRow").firstChild);
    }

    /* shared detail dialog (used by card layouts) */
    var dialog = document.createElement("dialog");
    dialog.className = "dialog";
    dialog.id = "dialog";
    dialog.setAttribute("aria-labelledby", "dialogTitle");
    dialog.innerHTML =
      '<div class="dialog__bar">' +
        '<span class="dialog__spacer"></span>' +
        '<button class="icon-btn" id="dialogClose" type="button" aria-label="' + escapeHtml(ui("close")) + '">' + icon("close") + "</button>" +
      '</div>' +
      '<div class="dialog__body" id="dialogBody"></div>';
    document.body.appendChild(dialog);

    document.getElementById("dialogClose").addEventListener("click", function () {
      if (dialog.open) dialog.close();
    });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
  }

  function paintNav() {
    var inner = document.getElementById("pageNavInner");
    if (!inner) return;
    var here = currentSlug();
    inner.innerHTML = PAGES.map(function (p) {
      var on = p.slug === here;
      return '<li><a class="pagenav__link" href="' + escapeHtml(pageHref(p)) + '"' +
        (on ? ' aria-current="page"' : "") + '>' +
        '<span class="pagenav__n" aria-hidden="true">' + (pageNum(p) || "—") + "</span>" +
        "<span>" + escapeHtml(t(p.title)) + "</span></a></li>";
    }).join("");
    var page = currentPage();
    var sum = document.getElementById("pageMenuSummary");
    if (sum && page) {
      sum.innerHTML = (pageNum(page) ? '<span class="pagenav__n">' + pageNum(page) + " / 0" + (PAGES.length - 1) + "</span>" : "") +
        "<span>" + escapeHtml(t(page.title)) + "</span>" + icon("chevron");
    }
  }

  /* desktop shows the list as an open sidebar; phones get a closed menu */
  function syncMenu() {
    var menu = document.getElementById("pageMenu");
    if (!menu || !window.matchMedia) return;
    var mq = window.matchMedia("(min-width: 1080px)");
    function apply() { menu.open = mq.matches; }
    apply();
    if (mq.addEventListener) mq.addEventListener("change", apply);
    else if (mq.addListener) mq.addListener(apply);
  }

  /* ---------- chrome text in the active language ---------- */
  function refreshChrome() {
    /* <html lang> is left alone: the page declares it and hreflang groups on that
       exact code, so writing "zh" back over "zh-Hant" would split the pair. */
    var page = currentPage();
    var siteTitle = t(META.title);
    var pageTitle = page ? t(page.title) : "";
    document.title = page && page.slug !== "home" && pageTitle ? pageTitle + " · " + siteTitle : siteTitle;

    var brand = document.getElementById("brandName");
    if (brand) brand.textContent = siteTitle;
    var foot = document.getElementById("footerText");
    if (foot) foot.textContent = t(META.footer);
    var skip = document.getElementById("skipLink");
    if (skip) skip.textContent = ui("skip");
    var nav = document.getElementById("pageNav");
    if (nav) nav.setAttribute("aria-label", ui("menu"));
    paintNav();
  }

  /* =======================================================================
     THEME  (language needs no runtime switch — the link navigates)
     ===================================================================== */
  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
    var ic = document.getElementById("themeIcon");
    if (ic) ic.innerHTML = icon(state.theme === "dark" ? "sun" : "moon");
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", state.theme === "dark" ? "#0D1117" : "#FBFCFD");
  }

  function wire() {
    document.getElementById("themeToggle").addEventListener("click", function () {
      state.theme = state.theme === "dark" ? "light" : "dark";
      lsSet("theme", state.theme);   /* only an explicit choice is remembered */
      applyTheme();
    });
    /* no saved choice: keep following the system setting live */
    if (!lsGet("theme") && window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      var follow = function (e) { if (!lsGet("theme")) { state.theme = e.matches ? "dark" : "light"; applyTheme(); } };
      if (mq.addEventListener) mq.addEventListener("change", follow);
    }
  }

  /* =======================================================================
     PUBLIC TOOLKIT (app.js uses this)
     ===================================================================== */
  window.LDW = {
    ready: false,          // flipped true once the chrome (incl. #dialog) is injected
    state: state,
    t: t, ui: ui, escapeHtml: escapeHtml, r: r, icon: icon,
    lsGet: lsGet, lsSet: lsSet,
    pages: PAGES, meta: META,
    currentPage: currentPage, currentSlug: currentSlug, pageHref: pageHref, pageNum: pageNum,
    refreshChrome: refreshChrome,
    dialog: function () { return document.getElementById("dialog"); }
  };

  /* ---------- GitHub star count ----------
     Read through shields.io's JSON badge endpoint, which answers 200 with CORS
     even when GitHub's anonymous API quota is used up — so a rate limit never
     shows up as a 403 in the console. The answer is cached per tab in
     sessionStorage. Anything that isn't a positive count (0, "repo not found",
     a network error) leaves the number hidden; the button still links to GitHub. */
  function showStars(el, v) {
    var ok = typeof v === "string" && /^\d+(\.\d+)?k?$/i.test(v) && v !== "0";
    el.textContent = ok ? v : "";
    el.hidden = !ok;
  }
  function loadStars() {
    if (!META.repo) return;
    var el = document.getElementById("ghStarCount");
    if (!el) return;
    var key = "gh-stars:" + META.repo;
    var cached = ssGet(key);
    if (cached !== null) { showStars(el, cached); return; }
    if (typeof fetch !== "function") return;
    fetch("https://img.shields.io/github/stars/" + META.repo + ".json")
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (j) {
        var v = j && j.value != null ? String(j.value) : "";
        ssSet(key, v);
        showStars(el, v);
      })
      .catch(function () { ssSet(key, ""); showStars(el, ""); });
  }

  /* =======================================================================
     INIT
     ===================================================================== */
  function init() {
    injectChrome();
    applyTheme();
    refreshChrome();
    syncMenu();
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
