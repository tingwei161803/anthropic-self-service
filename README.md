# 用 Claude 打造自助式數據分析 · Self-Service Analytics with Claude

> 把 Anthropic 工程部落格〈How Anthropic Enables Self-Service Data Analytics with Claude〉整理成一個漂亮、可互動、雙語的多頁面靜態網站。

這個網站把那篇文章的重點 —— 三大失敗模式、四層「代理式分析堆疊」、Skills 讓準確率從 **21% 躍升到 95%+** 的關鍵發現、驗證與消融實驗、上手策略 —— 拆成 8 個各有專屬版型與獨立網址的頁面,讓你用瀏覽、捲動、搜尋的方式消化內容。內容整理自 Anthropic 官方部落格,屬**非官方**視覺化整理。

---

## 🔗 線上版 / Live

| | |
|---|---|
| 🌐 網站 | <https://tingwei161803.github.io/anthropic-self-service/> |

> 直接點進去就能用,無需安裝。每一頁都有獨立網址(如 `/skills.html`),「真實來源」頁的每張卡片還能用 `…/sources.html#semantic-layer` 深連結直接分享。

---

## ✨ 功能特色

- 🧭 **多頁面架構** — 一個 hub 首頁 + 7 個主題頁,每頁有獨立 URL、各自的 SEO 與 JSON-LD
- 🎨 **8 種版型,適材適所** — hub 總覽、bento 重點磚牆、timeline 時間軸、gallery 卡片牆、scrollytelling 捲動敘事、dashboard 圖表儀表板、FAQ 手風琴、article 長文
- 🌏 **全頁雙語切換** — 中文 / English 一鍵切換,整站(含導覽、頁尾、卡片、詳情)即時重繪,跨頁記憶語言
- 🌗 **深色 / 淺色模式** — 手動切換並透過 `localStorage` 跨頁記憶
- 🔍 **即時搜尋 + 分類篩選** — 「真實來源」卡片牆可依關鍵字與「結構 / 知識」分類過濾
- 🗂️ **彈出詳情 + 深連結** — 卡片點開為對話框,網址帶 `#<slug>`,可直接分享、鍵盤可操作
- 📊 **純前端圖表** — 儀表板的長條圖、捲動敘事的視覺皆為 inline SVG,無任何圖表函式庫
- 📱 **響應式設計** — 手機(375px)、平板、桌機皆適配,無水平溢出
- ⚡ **零 build 純靜態** — 無 npm、無打包工具、無後端,載入快、可離線瀏覽

---

## 📂 內容結構 / 資料來源

本站內容整理自 **Anthropic 工程部落格〈[How Anthropic Enables Self-Service Data Analytics with Claude](https://claude.com/blog/how-anthropic-enables-self-service-data-analytics-with-claude)〉**。

```
anthropic-self-service/
├── index.html          # 首頁 / hub 總覽
├── challenge.html      # 挑戰(bento:三大失敗模式)
├── stack.html          # 代理式分析堆疊(timeline:四層架構)
├── sources.html        # 真實來源(gallery:可搜尋/篩選)
├── skills.html         # Skills:21% → 95%(scrollytelling)
├── validation.html     # 驗證(dashboard:評測 + 消融實驗)
├── playbook.html       # 上手策略(FAQ 手風琴)
├── conclusion.html     # 結論(article:核心金句 + 原文連結)
├── assets/
│   ├── styles.css      # Material Design 3 設計 token(深/淺色)+ 版型樣式
│   ├── shell.js        # 共用 chrome:appbar / 跨頁導覽 / footer / dialog / 語言+主題
│   └── app.js          # 版型引擎:依 data-page 選 renderer 渲染進 #page
├── data/
│   └── data.js         # 唯一資料檔:SITE_META + SITE_PAGES[](每頁一筆,全雙語)
└── .nojekyll           # 讓 GitHub Pages 原樣提供 assets/ 等資料夾
```

整站只由 `data/data.js` 兩個全域物件(`SITE_META`、`SITE_PAGES`)驅動:每個 `SITE_PAGES` 條目就是一個 `.html` 頁面,`app.js` 依 `<body data-page>` 找到對應條目、用其 `layout` 選定的 renderer 渲染。要加頁、改內容、調順序,基本上只動這一個資料檔。

> ⚠️ **非官方**:本網站為個人整理之非官方資源,內容整理自上述 Anthropic 官方部落格文章,
> 如有錯誤或出入,請以官方來源為準。文中數據(95%、21%→95%、+6%/+32%/+72% 等)均引自原文。

---

## 🛠 本機使用

```bash
# 1. clone 專案
git clone https://github.com/tingwei161803/anthropic-self-service.git
cd anthropic-self-service

# 2a. 最簡單:直接開啟首頁
open index.html

# 2b. 或啟動本機伺服器(建議,跨頁導覽 / 深連結才完全正常)
uv run python -m http.server 4173
# 然後瀏覽 http://localhost:4173
```

> 本專案為純靜態網站,不需安裝任何依賴。若要跑本機伺服器或測試,依偏好一律使用 `uv`,不要用裸 `python3` / `pip`。

### (選配)跑 UX 驗收

```bash
uv run --with playwright playwright install chromium      # 首次
uv run --with playwright python <lazy-data2web>/scripts/verify.py --dir .
```

驗收會自動偵測多頁面,逐頁檢查標題、內容渲染、語言/主題切換、搜尋/篩選/對話框/深連結、375px 響應式、a11y 與 console 無錯誤,並驗「跨頁 nav 皆 200」「語言跨頁持久」。

---

## 📝 聲明 / License

- 本站為非官方整理,內容著作權歸原始來源 **Anthropic** 所有。
- 程式碼以 **MIT** 授權釋出。
- 如為權利人且希望調整或移除內容,請開 issue 聯絡。
