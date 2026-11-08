/* =========================================================================
   multipage · app.js   (vanilla, no build, no chart lib)

   The PAGE-LEVEL LAYOUT ENGINE. shell.js has already injected the shared
   chrome and published window.LDW. This script:

     1. reads the current page from <body data-page="..."> (via LDW),
     2. picks a renderer from RENDERERS by that page's `layout`,
     3. paints it into <main id="page"> and wires its interactions.

   It paints once, in the language the URL declared. Switching language is a
   navigation to the twin page, so there is nothing to repaint on the way.

   RENDERERS is the LAYOUT REGISTRY — one entry per supported page layout:
     hub | gallery | article | dashboard | timeline | table |
     bento | kanban | faq | comparison | leaderboard | scrolly | map
   To add a layout, add one renderer (returns the inner HTML for #page) and,
   if it needs interaction, one matching WIRE entry. Nothing else changes.
   ========================================================================= */
(function () {
  "use strict";

  function boot() {
    // Wait until shell.js has injected the chrome (app bar, nav, footer, #dialog)
    // and published LDW. End-of-body scripts run while readyState === "loading",
    // so the shell defers its injection to DOMContentLoaded — we must wait for it.
    if (!window.LDW || !window.LDW.ready) {
      document.addEventListener("ldw:shell-ready", boot, { once: true });
      return;
    }
    var L = window.LDW;

    var t = L.t, esc = L.escapeHtml, r = L.r;
    var pageEl = document.getElementById("page");
    var teardowns = [];   // observers / listeners to disconnect before each repaint

    /* ---------- shared bits ---------- */
    var icon = L.icon || function () { return ""; };
    function head(p) {
      var n = L.pageNum ? L.pageNum(p) : "";
      var total = L.pages.length - 1;
      var sub = t(p.subtitle)
        ? '<p class="page-head__sub">' + esc(t(p.subtitle)) + "</p>" : "";
      return '<header class="page-head">' +
        (n ? '<span class="page-head__n">' + n + " / " + (total < 10 ? "0" : "") + total + "</span>" : "") +
        "<h1>" + esc(t(p.title)) + "</h1>" + sub + "</header>";
    }
    function txt(en, zh) { return L.state.lang === "en" ? en : zh; }
    /* "95%" -> 95<span>%</span>: the unit stays on the number's baseline */
    function numUnit(v) {
      var s = String(t(v)), m = s.match(/^([+~]?\d+(?:\.\d+)?)(%\+?)?$/);
      if (!m) return esc(s);
      return esc(m[1]) + (m[2] ? '<span class="meter__unit">' + esc(m[2]) + "</span>" : "");
    }
    function ticks() {
      return [25, 50, 75].map(function (v) { return '<i class="tick" style="left:' + v + '%"></i>'; }).join("");
    }
    function scaleRow(cls) {
      return '<div class="' + cls + '" aria-hidden="true"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>';
    }
    /* skills gauge: which stage a step puts the gauge in. Only the two numbers
       the essay reports (21% and 95%) are ever drawn — the steps in between
       show a hatched "being built" band instead of an invented score. */
    function gaugeState(p, i) {
      var s = (p.steps || [])[i], v = (s && s.visual) || {};
      var home = pageBySlug("home"), hero = (home && home.hero) || {};
      var raw = t(v.value);
      if (v.type === "bars") {
        var b = v.bars || [];
        var lo = b[0] ? b[0].value : 21, hi = b[1] ? b[1].value : 95;
        return { stage: "compare",
          readout: '<span class="g-from">' + numUnit(lo + "%") + '</span><span class="g-arrow" aria-hidden="true">→</span><span class="g-to">' + numUnit(hi + "%") + "</span>",
          caption: b.map(function (x) { return t(x.label) + " " + x.value + "%"; }).join(txt(" vs. ", "，對比 ")) };
      }
      if (/^\d+%/.test(raw)) {
        var pct = parseFloat(raw);
        return { stage: pct < 50 ? "guess" : "governed", readout: numUnit(raw),
          caption: t(pct < 50 ? (hero.from || {}).label : (hero.to || {}).label) };
      }
      return { stage: "build", readout: esc(raw), text: true,
        caption: txt("Skills are being added. The post reports no in-between score.", "正在加入 Skills。原文沒有公布中間階段的分數。") };
    }
    function pageBySlug(slug) {
      return L.pages.filter(function (q) { return q.slug === slug; })[0] || null;
    }

    function barChart(series, accent) {
      var W = 520, H = 240, padL = 16, padR = 16, padT = 16, padB = 44;
      var plotW = W - padL - padR, plotH = H - padT - padB;
      var max = Math.max.apply(null, series.map(function (d) { return d.value; }).concat([1]));
      var n = series.length || 1, gap = 14, bw = (plotW - gap * (n - 1)) / n, baseY = padT + plotH;
      var bars = series.map(function (d, i) {
        var x = padL + i * (bw + gap), h = (d.value / max) * plotH, y = baseY - h;
        var label = esc(t(d.label)), val = esc(String(d.value));
        return '<rect class="bar-rect" x="' + r(x) + '" y="' + r(y) + '" width="' + r(bw) +
          '" height="' + r(h) + '" rx="5"' + (accent ? ' style="fill:' + esc(accent) + '"' : "") +
          '><title>' + label + ": " + val + "</title></rect>" +
          '<text class="bar-value" x="' + r(x + bw / 2) + '" y="' + r(y - 6) + '" text-anchor="middle">' + val + "</text>" +
          '<text class="bar-label" x="' + r(x + bw / 2) + '" y="' + r(baseY + 18) + '" text-anchor="middle">' + label + "</text>";
      }).join("");
      return '<svg viewBox="0 0 ' + W + " " + H + '" role="img" preserveAspectRatio="xMidYMid meet" aria-label="bar chart">' +
        '<line class="axis-line" x1="' + padL + '" y1="' + r(baseY) + '" x2="' + r(W - padR) + '" y2="' + r(baseY) + '" />' +
        bars + "</svg>";
    }

    function lineChart(points) {
      var W = 520, H = 240, padL = 28, padR = 16, padT = 16, padB = 32;
      var plotW = W - padL - padR, plotH = H - padT - padB;
      var ys = points.map(function (d) { return d.y; });
      var max = Math.max.apply(null, ys.concat([1])), min = Math.min.apply(null, ys.concat([0]));
      var span = (max - min) || 1, n = points.length || 1;
      var xy = points.map(function (d, i) {
        var x = padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
        var y = padT + plotH - ((d.y - min) / span) * plotH;
        return { x: x, y: y, d: d };
      });
      var path = xy.map(function (pt, i) { return (i ? "L" : "M") + r(pt.x) + " " + r(pt.y); }).join(" ");
      var area = path + " L" + r(xy[xy.length - 1].x) + " " + r(padT + plotH) + " L" + r(xy[0].x) + " " + r(padT + plotH) + " Z";
      var dots = xy.map(function (pt) {
        return '<circle class="line-dot" cx="' + r(pt.x) + '" cy="' + r(pt.y) + '" r="3"><title>' +
          esc(String(pt.d.x)) + ": " + esc(String(pt.d.y)) + "</title></circle>";
      }).join("");
      var labels = xy.map(function (pt) {
        return '<text class="bar-label" x="' + r(pt.x) + '" y="' + r(padT + plotH + 20) + '" text-anchor="middle">' + esc(String(pt.d.x)) + "</text>";
      }).join("");
      return '<svg viewBox="0 0 ' + W + " " + H + '" role="img" preserveAspectRatio="xMidYMid meet" aria-label="line chart">' +
        '<path class="line-area" d="' + area + '" />' +
        '<path class="line-path" d="' + path + '" fill="none" />' + dots + labels + "</svg>";
    }

    /* =====================================================================
       LAYOUT REGISTRY
       ===================================================================== */
    var RENDERERS = {

      /* ---- hub: the accuracy meter, the four-layer stack, the reading path ---- */
      hub: function (p) {
        var h = p.hero || {};
        var from = h.from || { value: 0 }, to = h.to || { value: 100 };
        var span = to.value - from.value;

        /* the meter: static HTML already shows the final state (no-JS, crawlers) */
        var meter = '<figure class="meter" id="heroMeter" data-from="' + from.value + '" data-to="' + to.value + '">' +
          '<figcaption class="meter__label">' + esc(t(h.meterLabel)) + "</figcaption>" +
          '<p class="meter__readout" aria-label="' + from.value + "% → " + to.value + '%">' +
            '<span class="meter__from" aria-hidden="true"><span class="num">' + from.value + '</span><span class="meter__unit">%</span></span>' +
            '<span class="meter__arrow" aria-hidden="true">→</span>' +
            '<span class="meter__to" aria-hidden="true"><span class="num" id="meterNum">' + to.value + '</span><span class="meter__unit">%</span></span>' +
          "</p>" +
          '<div class="meter__track" aria-hidden="true">' + ticks() +
            '<div class="meter__fill meter__fill--guess" style="width:' + from.value + '%"></div>' +
            '<div class="meter__fill meter__fill--gov" id="meterGov" style="left:' + from.value + "%;width:" + span + '%"></div>' +
            '<span class="meter__pin meter__pin--to" style="right:' + (100 - to.value) + '%"><b>' + to.value + "%+</b><span>" + esc(t(to.label)) + "</span></span>" +
            '<span class="meter__pin meter__pin--from" style="left:' + from.value + '%"><b>' + from.value + "%</b><span>" + esc(t(from.label)) + "</span></span>" +
          "</div>" + scaleRow("meter__scale") +
        "</figure>";

        var cellLines = (h.cell && (h.cell[L.state.lang] || h.cell.en)) || [];
        var cell = cellLines.length ?
          '<pre class="cell" aria-label="' + esc(txt("The question behind the essay", "這篇文章要解決的問題")) + '">' +
            '<span class="cell__prompt" aria-hidden="true">In [1]:</span><code>' + esc(cellLines.join("\n")) + "</code></pre>" : "";
        var notes = (p.stats || []).map(function (s) {
          return "<div><dt>" + numUnit(s.value) + "</dt><dd>" + esc(t(s.label)) + "</dd></div>";
        }).join("");

        var stackPage = pageBySlug("stack");
        var slabs = (p.layers || []).map(function (ly, i) {
          return '<li><a class="slab' + (i === 2 ? " slab--key" : "") + '" href="' + esc(ly.href) + '">' +
            '<span class="slab__n">L' + (i + 1) + "</span>" +
            '<span class="slab__t">' + esc(t(ly.title)) + "</span>" +
            '<span class="slab__note">' + esc(t(ly.note)) + "</span></a></li>";
        }).join("");

        var path = L.pages.filter(function (q) { return q.slug !== "home"; }).map(function (q) {
          return '<li><a href="' + esc(L.pageHref(q)) + '">' +
            '<span class="path__n">' + L.pageNum(q) + "</span>" +
            '<span class="path__t">' + esc(t(q.title)) + "</span>" +
            '<span class="path__s">' + esc(t(q.subtitle)) + "</span></a></li>";
        }).join("");

        return '<section class="hero" aria-labelledby="heroTitle">' +
            '<h1 class="hero__title" id="heroTitle">' + esc(t(h.title) || t(p.title)) + "</h1>" +
            '<p class="hero__lede">' + esc(t(p.subtitle)) + "</p>" +
            meter +
            '<div class="hero__foot">' + cell + (notes ? '<dl class="notes">' + notes + "</dl>" : "") + "</div>" +
          "</section>" +
          (slabs ? '<section class="home-stack" aria-labelledby="stackTitle"><div>' +
            '<h2 class="section-title" id="stackTitle">' + esc(stackPage ? t(stackPage.title) : "") + "</h2>" +
            '<p class="section-sub">' + esc(stackPage ? t(stackPage.subtitle) : "") + " " +
              esc(txt("Skills is the layer that moved accuracy from 21% to 95%.", "其中 Skills 這一層，把準確率從 21% 推到 95%。")) + "</p>" +
            (stackPage ? '<a class="cta-link" href="' + esc(L.pageHref(stackPage)) + '">' + esc(txt("See all four layers", "看四層的細節")) + "</a>" : "") +
            '</div><ol class="slabs">' + slabs + "</ol></section>" : "") +
          '<section class="home-path" aria-labelledby="pathTitle">' +
            '<h2 class="section-title" id="pathTitle">' + esc(txt("Read it in order", "依序閱讀")) + "</h2>" +
            '<p class="section-sub">' + esc(txt("Seven short pages, from the failure modes to the takeaway.", "七個短頁，從失敗模式讀到結論。")) + "</p>" +
            '<ol class="path">' + path + "</ol></section>";
      },

      /* ---- gallery: search + chips + card grid + dialog ---- */
      gallery: function (p) {
        var cats = (p.categories || []).map(function (c) {
          return '<button class="chip" type="button" data-cat="' + esc(c.key) + '">' +
            esc(c[L.state.lang] || c.en) + "</button>";
        }).join("");
        var allLabel = L.state.lang === "en" ? "All" : "全部";
        return head(p) +
          '<div class="toolbar">' +
            '<input id="search" class="search" type="search" autocomplete="off" ' +
              'placeholder="' + (L.state.lang === "en" ? "Search…" : "搜尋…") + '" ' +
              'aria-label="' + (L.state.lang === "en" ? "Search" : "搜尋") + '" />' +
            (cats ? '<div class="chips"><button class="chip chip--active" type="button" data-cat="">' + esc(allLabel) + "</button>" + cats + "</div>" : "") +
          "</div>" +
          '<p class="result-count" id="resultCount" aria-live="polite"></p>' +
          '<div class="grid" id="grid"></div>';
      },

      /* ---- article: sticky TOC + prose + reading progress ---- */
      article: function (p) {
        var toc = (p.sections || []).map(function (s) {
          return '<a class="toc-link" href="#' + esc(s.id) + '" data-toc="' + esc(s.id) + '">' + esc(t(s.heading)) + "</a>";
        }).join("");
        var body = (p.sections || []).map(function (s) {
          var blocks = (s.blocks || []).map(function (b) {
            if (b.type === "h3") return "<h3>" + esc(t(b.text)) + "</h3>";
            if (b.type === "quote") return "<blockquote>" + esc(t(b.text)) + "</blockquote>";
            if (b.type === "code") return "<pre><code>" + esc(t(b.text)) + "</code></pre>";
            if (b.type === "link") return '<p class="prose-cta"><a class="cta-link" href="' + esc(b.url) +
              '" target="_blank" rel="noopener">' + esc(t(b.text)) +
              " " + icon("external") + "</a></p>";
            if (b.type === "ul") {
              var arr = (b.items && (b.items[L.state.lang] || b.items.en || b.items.zh)) || [];
              return "<ul>" + arr.map(function (li) { return "<li>" + esc(li) + "</li>"; }).join("") + "</ul>";
            }
            return "<p>" + esc(t(b.text)) + "</p>";
          }).join("");
          return '<section class="article-section" id="' + esc(s.id) + '" data-item ' +
            'aria-labelledby="' + esc(s.id) + '-h"><h2 id="' + esc(s.id) + '-h">' + esc(t(s.heading)) + "</h2>" +
            '<div class="nb nb-frame">' + blocks + "</div></section>";
        }).join("");
        return '<div class="reading-progress" id="readingProgress" aria-hidden="true"></div>' +
          head(p) +
          '<div class="article-layout">' +
            '<nav class="toc" aria-label="' + esc(txt("Contents", "目錄")) + '"><div class="toc__inner">' + toc + "</div></nav>" +
            '<div class="article-body prose">' + body + "</div>" +
          "</div>";
      },

      /* ---- dashboard: stat cards + bar + line + table ---- */
      dashboard: function (p) {
        /* readouts: number and unit together, label underneath — one ruled row, not boxes */
        var stats = (p.stats || []).map(function (s) {
          var unit = t(s.unit);
          return '<div class="readout" data-item><b>' + numUnit(s.value) + (unit ? " " + esc(unit) : "") + "</b>" +
            "<span>" + esc(t(s.label)) + "</span></div>";
        }).join("");
        /* horizontal bars on a shared 0-100% axis, gain vs cost coloured apart */
        var bars = "";
        if (p.bars) {
          var rows = (p.bars.series || []).map(function (d) {
            var v = Math.max(0, Math.min(100, Number(d.value) || 0));
            return '<div class="hbar hbar--' + esc(d.tone || "plain") + '" data-item>' +
              '<span class="hbar__label">' + esc(t(d.label)) + "</span>" +
              '<span class="hbar__track" aria-hidden="true"><span class="hbar__fill" style="width:' + v + '%"></span></span>' +
              '<b class="hbar__v">+' + esc(String(d.value)) + "%</b></div>";
          }).join("");
          bars = '<figure class="panel" data-item><figcaption>' + esc(t(p.bars.title)) + "</figcaption>" +
            '<div class="hbars">' + rows +
              '<div class="hbar__axis" aria-hidden="true"><span></span><span><span>0</span><span>50</span><span>100%</span></span><span></span></div>' +
            "</div></figure>";
        }
        var line = p.line ? '<figure class="panel" data-item><figcaption>' + esc(t(p.line.title)) + "</figcaption>" +
          '<div class="chart-wrap">' + lineChart(p.line.points || []) + "</div></figure>" : "";
        var table = "";
        if (p.table) {
          var thead = (p.table.columns || []).map(function (c) { return "<th>" + esc(t(c.label)) + "</th>"; }).join("");
          var tbody = (p.table.rows || []).map(function (row) {
            return "<tr data-item>" + (p.table.columns || []).map(function (c) {
              var v = row[c.key], val = typeof v === "object" ? t(v) : String(v == null ? "" : v);
              if (c.key === "type") {
                var online = v && typeof v === "object" && v.en === "Online";
                return '<td><span class="pill' + (online ? " pill--online" : "") + '">' + esc(val) + "</span></td>";
              }
              return "<td>" + esc(val) + "</td>";
            }).join("") + "</tr>";
          }).join("");
          table = '<div class="panel panel--wide" data-item><h2 class="panel__title">' + esc(txt("How they measure it", "怎麼量測")) + "</h2>" +
            '<div class="table-wrap"><table class="data-table">' +
            "<thead><tr>" + thead + "</tr></thead><tbody>" + tbody + "</tbody></table></div></div>";
        }
        return head(p) +
          (stats ? '<div class="readouts">' + stats + "</div>" : "") +
          '<div class="panel-grid">' + bars + line + "</div>" + table;
      },

      /* ---- timeline: dated event cards down a rail ---- */
      timeline: function (p) {
        var items = (p.events || []).map(function (ev, i) {
          return '<li class="layer' + (ev.key ? " layer--key" : "") + '" id="layer-' + (i + 1) + '" data-item>' +
            '<div class="layer__n"><b aria-hidden="true">' + (i < 9 ? "0" : "") + (i + 1) + "</b><span>" + esc(t(ev.date)) + "</span></div>" +
            '<div class="layer__body"><h3>' + esc(t(ev.title)) + "</h3>" +
            "<p>" + esc(t(ev.body)) + "</p></div></li>";
        }).join("");
        return head(p) + '<ol class="stack">' + items + "</ol>";
      },

      /* ---- table: searchable + sortable ---- */
      table: function (p) {
        return head(p) +
          '<div class="toolbar">' +
            '<input id="search" class="search" type="search" autocomplete="off" ' +
              'placeholder="' + (L.state.lang === "en" ? "Search…" : "搜尋…") + '" ' +
              'aria-label="' + (L.state.lang === "en" ? "Search" : "搜尋") + '" />' +
            '<div class="chips" id="tableChips"></div>' +
          "</div>" +
          '<div class="table-wrap"><table class="data-table" id="dataTable"><thead></thead><tbody></tbody></table></div>';
      },

      /* ---- bento: asymmetric tile grid ---- */
      bento: function (p) {
        /* the accent tile is the claim; the rest are the failure modes behind it */
        var lead = (p.tiles || []).filter(function (x) { return x.accent; })[0];
        var modes = (p.tiles || []).filter(function (x) { return !x.accent; });
        var leadHtml = lead ? '<div class="lead-claim" data-item><h2>' + esc(t(lead.title)) + "</h2>" +
          (t(lead.body) ? "<p>" + esc(t(lead.body)) + "</p>" : "") + "</div>" : "";
        var modeHtml = modes.map(function (m, i) {
          return '<article class="mode" data-item>' +
            '<span class="mode__k">' + esc(txt("Failure mode ", "失敗模式 ")) + (i + 1) + "</span>" +
            "<h3>" + esc(t(m.title)) + "</h3>" +
            (t(m.body) ? "<p>" + esc(t(m.body)) + "</p>" : "") + "</article>";
        }).join("");
        return head(p) + leadHtml + (modeHtml ? '<div class="modes">' + modeHtml + "</div>" : "");
      },

      /* ---- kanban: cards grouped by status column ---- */
      kanban: function (p) {
        var cols = (p.columns || []).map(function (col) {
          var cards = (p.cards || []).filter(function (c) { return c.column === col.key; }).map(function (c) {
            var tags = (c.tags || []).map(function (g) { return '<span class="tag">' + esc(g) + "</span>"; }).join("");
            return '<article class="kb-card" data-item><h3 class="kb-card__title">' + esc(t(c.title)) + "</h3>" +
              (t(c.body) ? '<p class="kb-card__body">' + esc(t(c.body)) + "</p>" : "") +
              (tags ? '<div class="card__tags">' + tags + "</div>" : "") + "</article>";
          }).join("");
          var count = (p.cards || []).filter(function (c) { return c.column === col.key; }).length;
          return '<div class="kb-col"><div class="kb-col__head">' + esc(t(col.label)) +
            ' <span class="kb-col__count">' + count + "</span></div>" +
            '<div class="kb-col__body">' + cards + "</div></div>";
        }).join("");
        return head(p) + '<div class="kanban">' + cols + "</div>";
      },

      /* ---- faq: searchable accordion ---- */
      faq: function (p) {
        var items = (p.qa || []).map(function (row) {
          return '<li><details class="acc-item" data-item data-q="' + esc((t(row.q) + " " + t(row.a)).toLowerCase()) + '">' +
            '<summary class="acc-q"><span>' + esc(t(row.q)) + "</span>" + icon("plus") + "</summary>" +
            '<div class="acc-a">' + esc(t(row.a)) + "</div></details></li>";
        }).join("");
        return head(p) +
          '<div class="toolbar"><input id="search" class="search" type="search" autocomplete="off" ' +
            'placeholder="' + (L.state.lang === "en" ? "Search…" : "搜尋…") + '" ' +
            'aria-label="' + (L.state.lang === "en" ? "Search" : "搜尋") + '" /></div>' +
          '<ol class="accordion" id="accordion">' + items + "</ol>";
      },

      /* ---- comparison: plans (cols) x features (rows) ---- */
      comparison: function (p) {
        var plans = p.plans || [], feats = p.features || [];
        var thead = '<th scope="col"></th>' + plans.map(function (pl) {
          return '<th scope="col" class="' + (pl.highlight ? "cmp-col--hl" : "") + '">' +
            '<div class="cmp-plan">' + esc(t(pl.name)) + "</div>" +
            '<div class="cmp-price">' + esc(t(pl.price)) + "</div>" +
            (t(pl.note) ? '<div class="cmp-note">' + esc(t(pl.note)) + "</div>" : "") + "</th>";
        }).join("");
        var rows = feats.map(function (f) {
          var cells = plans.map(function (pl) {
            var v = f.values ? f.values[pl.key] : undefined;
            var cell;
            if (v === true) cell = '<span class="cmp-yes" aria-label="yes">✓</span>';
            else if (v === false || v == null) cell = '<span class="cmp-no" aria-label="no">—</span>';
            else cell = esc(t(v));
            return '<td class="' + (pl.highlight ? "cmp-col--hl" : "") + '">' + cell + "</td>";
          }).join("");
          return '<tr data-item><th scope="row" class="cmp-feat">' + esc(t(f.label)) + "</th>" + cells + "</tr>";
        }).join("");
        return head(p) + '<div class="table-wrap"><table class="cmp-table">' +
          "<thead><tr>" + thead + "</tr></thead><tbody>" + rows + "</tbody></table></div>";
      },

      /* ---- leaderboard: ranked list + tier grouping toggle ---- */
      leaderboard: function (p) {
        var listLabel = L.state.lang === "en" ? "List" : "排名";
        var tierLabel = L.state.lang === "en" ? "Tiers" : "階級";
        return head(p) +
          '<div class="seg" role="tablist">' +
            '<button class="seg__btn seg__btn--active" type="button" data-view="list">' + esc(listLabel) + "</button>" +
            '<button class="seg__btn" type="button" data-view="tier">' + esc(tierLabel) + "</button>" +
          "</div>" +
          '<div id="lbView"></div>';
      },

      /* ---- scrolly: sticky visual + stepped narrative ---- */
      scrolly: function (p) {
        var steps = (p.steps || []).map(function (s, i) {
          return '<li class="scrolly-step' + (i === 0 ? " scrolly-step--active" : "") + '" data-item data-step="' + i + '">' +
            '<span class="scrolly-step__n" aria-hidden="true">' + (i + 1) + "</span>" +
            "<p>" + esc(t(s.text)) + "</p></li>";
        }).join("");
        var bars = [];
        (p.steps || []).forEach(function (s) { if (s.visual && s.visual.bars) bars = s.visual.bars; });
        var lo = bars[0] ? bars[0].value : 21, hi = bars[1] ? bars[1].value : 95;
        var first = gaugeState(p, 0);
        return head(p) +
          '<div class="scrolly">' +
            '<div class="scrolly-sticky">' +
              '<figure class="gauge" id="scrollyVisual" data-stage="' + first.stage + '">' +
                '<figcaption class="gauge__label"><span>' + esc(txt("Aggregate accuracy", "整體準確率")) + "</span>" +
                  '<span class="gauge__step" id="gaugeStep">1 / ' + (p.steps || []).length + "</span></figcaption>" +
                '<p class="gauge__readout' + (first.text ? " gauge__readout--text" : "") + '" id="gaugeReadout" aria-live="polite">' + first.readout + "</p>" +
                '<div class="gauge__track" aria-hidden="true">' + ticks() +
                  '<div class="gauge__fill gauge__fill--guess" style="width:' + lo + '%"></div>' +
                  '<div class="gauge__fill gauge__fill--build" style="left:' + lo + "%;width:" + (hi - lo) + '%"></div>' +
                  '<div class="gauge__fill gauge__fill--gov" style="left:' + lo + '%"></div>' +
                "</div>" +
                '<div class="gauge__pins" aria-hidden="true"><span class="pin-from" style="left:' + lo + '%">' + lo + "% " + esc(bars[0] ? t(bars[0].label) : "") + "</span>" +
                  '<span class="pin-to" style="right:' + (100 - hi) + '%">' + hi + "%+</span></div>" +
                scaleRow("gauge__scale") +
                '<p class="gauge__caption" id="gaugeCaption">' + esc(first.caption) + "</p>" +
              "</figure>" +
            "</div>" +
            '<ol class="scrolly-steps">' + steps + "</ol>" +
          "</div>";
      },

      /* ---- map: Leaflet map + list (needs Leaflet on the page) ---- */
      map: function (p) {
        return head(p) +
          '<div class="map-layout">' +
            '<div class="map-box" id="map" role="application" aria-label="Map"></div>' +
            '<ul class="map-list" id="mapList"></ul>' +
          "</div>";
      }
    };

    /* =====================================================================
       WIRING (interactions) — keyed by layout, run after innerHTML is set
       ===================================================================== */
    var WIRE = {
      hub: function () { animateMeter(); },

      gallery: function (p) {
        var grid = document.getElementById("grid");
        var search = document.getElementById("search");
        var count = document.getElementById("resultCount");
        var chips = [].slice.call(pageEl.querySelectorAll(".chip"));
        var st = { q: "", cat: "" };

        function matches(item) {
          if (st.cat && item.category !== st.cat) return false;
          if (!st.q) return true;
          var hay = (t(item.title) + " " + t(item.summary) + " " + (item.tags || []).join(" ")).toLowerCase();
          return hay.indexOf(st.q) !== -1;
        }
        function paint() {
          var rows = (p.items || []).filter(matches);
          grid.innerHTML = rows.map(function (item) {
            var tags = (item.tags || []).map(function (g) { return '<span class="tag">' + esc(g) + "</span>"; }).join("");
            return '<article class="card" tabindex="0" role="button" data-item data-slug="' + esc(item.slug) + '" ' +
              'data-cat="' + esc(item.category || "") + '" aria-label="' + esc(t(item.title)) + '" aria-haspopup="dialog">' +
              '<span class="card__file" aria-hidden="true">' + esc(item.slug) + "</span>" +
              '<h3 class="card__title">' + esc(t(item.title)) + "</h3>" +
              '<p class="card__summary">' + esc(t(item.summary)) + "</p>" +
              (tags ? '<div class="card__tags">' + tags + "</div>" : "") + "</article>";
          }).join("");
          if (count) count.textContent = rows.length + " / " + (p.items || []).length + (L.state.lang === "en" ? " references" : " 份參考");
          wireCards();
        }
        function wireCards() {
          [].forEach.call(grid.querySelectorAll(".card[data-slug]"), function (card) {
            var slug = card.dataset.slug;
            card.addEventListener("click", function () { openItem(slug); });
            card.addEventListener("keydown", function (e) {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openItem(slug); }
            });
          });
        }
        function findItem(slug) {
          return (p.items || []).filter(function (it) { return it.slug === slug; })[0] || null;
        }
        function openItem(slug) {
          var item = findItem(slug); if (!item) return;
          var dlg = L.dialog(), body = document.getElementById("dialogBody");
          var tags = (item.tags || []).map(function (g) { return '<span class="tag">' + esc(g) + "</span>"; }).join("");
          body.innerHTML = '<h2 id="dialogTitle">' + esc(t(item.title)) + "</h2>" +
            (tags ? '<div class="card__tags">' + tags + "</div>" : "") +
            "<p>" + esc(t(item.overview) || t(item.summary)) + "</p>";
          if (!dlg.open) dlg.showModal();
          if (location.hash.slice(1) !== slug) history.replaceState(null, "", "#" + slug);
        }
        function syncHash() {
          var slug = location.hash.slice(1);
          if (slug && findItem(slug)) openItem(slug);
        }
        if (search) search.addEventListener("input", function () { st.q = this.value.trim().toLowerCase(); paint(); });
        chips.forEach(function (chip) {
          chip.addEventListener("click", function () {
            chips.forEach(function (c) { c.classList.remove("chip--active"); });
            chip.classList.add("chip--active");
            st.cat = chip.dataset.cat || "";
            paint();
          });
        });
        /* closing the dialog clears the #slug so the URL returns to clean state
           and a later deep link to the SAME slug fires hashchange again */
        var dlg = L.dialog();
        function onClose() {
          var slug = location.hash.slice(1);
          if (slug && findItem(slug)) history.replaceState(null, "", location.pathname + location.search);
        }
        dlg.addEventListener("close", onClose);
        var onHash = function () { syncHash(); };
        window.addEventListener("hashchange", onHash);
        teardowns.push(function () {
          window.removeEventListener("hashchange", onHash);
          dlg.removeEventListener("close", onClose);
        });
        paint();
        syncHash();
      },

      article: function () {
        var prog = document.getElementById("readingProgress");
        var links = [].slice.call(pageEl.querySelectorAll(".toc-link"));
        var secs = [].slice.call(pageEl.querySelectorAll(".article-section"));
        function onScroll() {
          var h = document.documentElement;
          var max = h.scrollHeight - h.clientHeight;
          if (prog) prog.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
        }
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        teardowns.push(function () { window.removeEventListener("scroll", onScroll); });
        if ("IntersectionObserver" in window) {
          var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
              if (!en.isIntersecting) return;
              links.forEach(function (a) {
                var on = a.dataset.toc === en.target.id;
                a.classList.toggle("toc-link--active", on);
              });
            });
          }, { rootMargin: "-30% 0px -60% 0px" });
          secs.forEach(function (s) { io.observe(s); });
          teardowns.push(function () { io.disconnect(); });
        }
      },

      dashboard: function () { /* static charts; nothing to wire */ },

      table: function (p) {
        var table = document.getElementById("dataTable");
        var thead = table.querySelector("thead"), tbody = table.querySelector("tbody");
        var search = document.getElementById("search");
        var chipsBox = document.getElementById("tableChips");
        var cols = p.columns || [];
        var st = { q: "", filter: "", sortKey: null, dir: 1 };
        var filterCol = cols.filter(function (c) { return c.filter; })[0];

        function cellText(row, c) { var v = row[c.key]; return typeof v === "object" ? t(v) : String(v == null ? "" : v); }
        function rowMatches(row) {
          if (filterCol && st.filter && cellText(row, filterCol) !== st.filter) return false;
          if (!st.q) return true;
          return cols.some(function (c) { return cellText(row, c).toLowerCase().indexOf(st.q) !== -1; });
        }
        function paintHead() {
          thead.innerHTML = "<tr>" + cols.map(function (c) {
            var arrow = st.sortKey === c.key ? (st.dir > 0 ? " ▲" : " ▼") : "";
            return '<th class="th-sort" data-key="' + esc(c.key) + '" role="button" tabindex="0" aria-label="Sort by ' +
              esc(t(c.label)) + '">' + esc(t(c.label)) + esc(arrow) + "</th>";
          }).join("") + "</tr>";
          [].forEach.call(thead.querySelectorAll(".th-sort"), function (th) {
            th.addEventListener("click", function () { sortBy(th.dataset.key); });
            th.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sortBy(th.dataset.key); } });
          });
        }
        function sortBy(key) {
          if (st.sortKey === key) st.dir = -st.dir; else { st.sortKey = key; st.dir = 1; }
          paint();
        }
        function paint() {
          paintHead();
          var col = cols.filter(function (c) { return c.key === st.sortKey; })[0];
          var rows = (p.rows || []).filter(rowMatches).slice();
          if (col) {
            rows.sort(function (a, b) {
              var va = a[col.key], vb = b[col.key];
              if (col.type === "num") return (Number(va) - Number(vb)) * st.dir;
              return String(typeof va === "object" ? t(va) : va).localeCompare(String(typeof vb === "object" ? t(vb) : vb)) * st.dir;
            });
          }
          tbody.innerHTML = rows.map(function (row) {
            return "<tr data-item>" + cols.map(function (c) {
              if (c.type === "link") {
                var u = row[c.key];
                return '<td><a class="row-link" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(u) + "</a></td>";
              }
              return "<td>" + esc(cellText(row, c)) + "</td>";
            }).join("") + "</tr>";
          }).join("");
        }
        if (filterCol) {
          var vals = [];
          (p.rows || []).forEach(function (row) { var v = cellText(row, filterCol); if (vals.indexOf(v) === -1) vals.push(v); });
          var allLabel = L.state.lang === "en" ? "All" : "全部";
          chipsBox.innerHTML = '<button class="chip chip--active" type="button" data-v="">' + esc(allLabel) + "</button>" +
            vals.map(function (v) { return '<button class="chip" type="button" data-v="' + esc(v) + '">' + esc(v) + "</button>"; }).join("");
          [].forEach.call(chipsBox.querySelectorAll(".chip"), function (chip) {
            chip.addEventListener("click", function () {
              [].forEach.call(chipsBox.querySelectorAll(".chip"), function (c) { c.classList.remove("chip--active"); });
              chip.classList.add("chip--active");
              st.filter = chip.dataset.v || "";
              paint();
            });
          });
        }
        if (search) search.addEventListener("input", function () { st.q = this.value.trim().toLowerCase(); paint(); });
        paint();
      },

      bento: function () { /* static */ },
      kanban: function () { /* static */ },

      faq: function () {
        var search = document.getElementById("search");
        var items = [].slice.call(pageEl.querySelectorAll(".acc-item"));
        if (search) search.addEventListener("input", function () {
          var q = this.value.trim().toLowerCase();
          items.forEach(function (it) {
            var hit = !q || (it.dataset.q || "").indexOf(q) !== -1;
            it.style.display = hit ? "" : "none";
          });
        });
      },

      comparison: function () { /* static */ },

      leaderboard: function (p) {
        var view = document.getElementById("lbView");
        var btns = [].slice.call(pageEl.querySelectorAll(".seg__btn"));
        var entries = (p.entries || []).slice().sort(function (a, b) { return b.score - a.score; });
        function row(e, rank) {
          return '<li class="lb-row" data-item>' +
            (rank ? '<span class="lb-rank">' + rank + "</span>" : "") +
            '<span class="lb-tier lb-tier--' + esc(e.tier || "") + '">' + esc(e.tier || "") + "</span>" +
            '<span class="lb-name">' + esc(t(e.name)) + "</span>" +
            '<span class="lb-meta">' + esc(t(e.meta)) + "</span>" +
            '<span class="lb-score">' + esc(String(e.score)) + "</span></li>";
        }
        function listView() {
          view.innerHTML = '<ol class="lb-list">' + entries.map(function (e, i) { return row(e, i + 1); }).join("") + "</ol>";
        }
        function tierView() {
          var tiers = [];
          entries.forEach(function (e) { if (tiers.indexOf(e.tier) === -1) tiers.push(e.tier); });
          view.innerHTML = tiers.map(function (tier) {
            var rows = entries.filter(function (e) { return e.tier === tier; }).map(function (e) { return row(e); }).join("");
            return '<div class="lb-tier-group"><div class="lb-tier-head lb-tier--' + esc(tier) + '">' + esc(tier) + "</div>" +
              '<ol class="lb-list">' + rows + "</ol></div>";
          }).join("");
        }
        btns.forEach(function (b) {
          b.addEventListener("click", function () {
            btns.forEach(function (x) { x.classList.remove("seg__btn--active"); });
            b.classList.add("seg__btn--active");
            if (b.dataset.view === "tier") tierView(); else listView();
          });
        });
        listView();
      },

      scrolly: function (p) {
        var visual = document.getElementById("scrollyVisual");
        var readout = document.getElementById("gaugeReadout");
        var caption = document.getElementById("gaugeCaption");
        var stepLbl = document.getElementById("gaugeStep");
        var steps = [].slice.call(pageEl.querySelectorAll(".scrolly-step"));
        var current = -1;
        function paintVisual(i) {
          if (i === current || !(p.steps || [])[i]) return;
          current = i;
          var g = gaugeState(p, i);
          visual.setAttribute("data-stage", g.stage);
          readout.innerHTML = g.readout;
          readout.classList.toggle("gauge__readout--text", !!g.text);
          if (caption) caption.textContent = g.caption || "";
          if (stepLbl) stepLbl.textContent = (i + 1) + " / " + steps.length;
        }
        paintVisual(0);
        if ("IntersectionObserver" in window) {
          var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
              if (en.isIntersecting) {
                steps.forEach(function (s) { s.classList.remove("scrolly-step--active"); });
                en.target.classList.add("scrolly-step--active");
                paintVisual(parseInt(en.target.dataset.step, 10) || 0);
              }
            });
          }, { rootMargin: window.innerWidth < 960 ? "-55% 0px -35% 0px" : "-45% 0px -45% 0px" });
          steps.forEach(function (s) { io.observe(s); });
          teardowns.push(function () { io.disconnect(); });
        }
      },

      map: function (p) {
        var listEl = document.getElementById("mapList");
        var places = p.places || [];
        listEl.innerHTML = places.map(function (pl) {
          return '<li class="place" data-item data-slug="' + esc(pl.slug) + '" tabindex="0" role="button" ' +
            'aria-label="' + esc(t(pl.name)) + '"><b>' + esc(t(pl.name)) + "</b>" +
            '<span>' + esc(t(pl.body)) + "</span></li>";
        }).join("");

        if (typeof window.L === "undefined" || !window.L.map) {
          // Leaflet not loaded (offline / blocked): list-only graceful fallback.
          document.getElementById("map").innerHTML =
            '<div class="map-fallback">' + esc(L.state.lang === "en" ? "Map unavailable offline — see the list." : "離線時地圖無法載入 — 請看清單。") + "</div>";
          return;
        }
        var map = window.L.map("map", { scrollWheelZoom: false });
        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap", maxZoom: 19
        }).addTo(map);
        var markers = {}, group = [];
        places.forEach(function (pl) {
          /* alt + title give Leaflet's marker <img role="button"> an accessible name */
          var m = window.L.marker([pl.lat, pl.lng], { alt: t(pl.name), title: t(pl.name), keyboard: true })
            .addTo(map).bindPopup("<b>" + esc(t(pl.name)) + "</b><br>" + esc(t(pl.body)));
          markers[pl.slug] = m; group.push([pl.lat, pl.lng]);
        });
        if (group.length) map.fitBounds(group, { padding: [30, 30] });
        [].forEach.call(listEl.querySelectorAll(".place"), function (li) {
          function go() { var m = markers[li.dataset.slug]; if (m) { map.panTo(m.getLatLng()); m.openPopup(); } }
          li.addEventListener("click", go);
          li.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
        });
        teardowns.push(function () { try { map.remove(); } catch (e) {} });
      }
    };

    /* ---- hero meter: one orchestrated moment on load ----
       The markup already shows the final 95%. With motion allowed, the blue
       fill starts at the 21% mark and the readout counts up with it. */
    function animateMeter() {
      var meter = document.getElementById("heroMeter");
      var num = document.getElementById("meterNum");
      var gov = document.getElementById("meterGov");
      if (!meter || !num || !gov) return;
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce || !window.requestAnimationFrame) return;
      var from = parseFloat(meter.dataset.from) || 0, to = parseFloat(meter.dataset.to) || 0;
      var finalW = gov.style.width;
      gov.style.transition = "none";
      gov.style.width = "0%";
      num.textContent = String(from);
      void gov.offsetWidth;   /* commit the start frame before animating */
      gov.style.transition = "";
      var dur = 1400, start = null;
      requestAnimationFrame(function () { gov.style.width = finalW; });
      function step(ts) {
        if (start === null) start = ts;
        var pr = Math.min(1, (ts - start) / dur), eased = 1 - Math.pow(1 - pr, 3);
        num.textContent = String(Math.round(from + (to - from) * eased));
        if (pr < 1) requestAnimationFrame(step); else num.textContent = String(to);
      }
      requestAnimationFrame(step);
    }

    /* =====================================================================
       RENDER the current page
       ===================================================================== */
    function render() {
      teardowns.forEach(function (fn) { try { fn(); } catch (e) {} });
      teardowns = [];
      var p = L.currentPage();
      if (!p) { pageEl.innerHTML = '<p class="empty">No page data.</p>'; return; }
      var fn = RENDERERS[p.layout] || RENDERERS.gallery;
      pageEl.className = "page page--" + p.layout;
      pageEl.innerHTML = fn(p);
      var w = WIRE[p.layout];
      if (w) w(p);
    }

    render();
  }

  boot();
})();
