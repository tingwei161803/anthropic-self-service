/* =========================================================================
   Self-Service Analytics with Claude — data.js   (multipage · zero-build)

   Unofficial visual summary of Anthropic's engineering blog post:
   "How Anthropic Enables Self-Service Data Analytics with Claude"
   https://claude.com/blog/how-anthropic-enables-self-service-data-analytics-with-claude

   ONE shared data file loaded by every .html. Two globals drive the whole site:
     window.SITE_META  = { title, subtitle, footer }
     window.SITE_PAGES = [ { slug, layout, icon, title, subtitle, ...layoutData } ]
   Each SITE_PAGES entry === one real page (home -> index.html, x -> x.html).
   Every visible string is {en,zh} so the language toggle repaints the whole site.
   ========================================================================= */

window.SITE_META = {
  title: {
    en: "Self-Service Analytics with Claude",
    zh: "用 Claude 打造自助式數據分析"
  },
  subtitle: {
    en: "How Anthropic turned its data warehouse into a 95%-accurate self-service analyst — an unofficial visual summary.",
    zh: "Anthropic 如何把資料倉儲變成 95% 準確率的自助分析師 —— 非官方視覺化整理。"
  },
  footer: {
    en: "Unofficial summary of Anthropic's engineering blog.",
    zh: "Anthropic 工程部落格的非官方整理。"
  }
};

window.SITE_PAGES = [

  /* ----- home / hub ----- */
  {
    slug: "home", layout: "hub", icon: "insights",
    title: { en: "Overview", zh: "總覽" },
    subtitle: {
      en: "Pick a section. Every page shares this nav, language and theme.",
      zh: "選一個區段。所有頁面共用導覽、語言與主題。"
    },
    stats: [
      { value: 95, label: { en: "% of business queries automated", zh: "% 商業分析查詢自動化" } },
      { value: 95, label: { en: "% aggregate accuracy", zh: "% 整體準確率" } },
      { value: 4,  label: { en: "layers in the analytics stack", zh: "層分析堆疊架構" } }
    ]
  },

  /* ----- challenge / bento ----- */
  {
    slug: "challenge", layout: "bento", icon: "report",
    title: { en: "The Challenge", zh: "挑戰" },
    subtitle: {
      en: "Why pointing an LLM at a warehouse isn't enough — three ways analytics agents fail.",
      zh: "為什麼把 LLM 指向資料倉儲還不夠 —— 分析代理會失敗的三種方式。"
    },
    tiles: [
      { size: "wide", accent: true, icon: "warning",
        title: { en: "False precision", zh: "虛假的精確" },
        body: { en: "Pointing Claude at a data warehouse without safeguards produces confident, wrong answers — and cuts stakeholders off from infrastructure expertise.",
                zh: "沒有防護就把 Claude 指向資料倉儲,會產生自信卻錯誤的答案,也讓使用者與基礎架構專業脫節。" } },
      { size: "md", icon: "device_hub",
        title: { en: "Concept-to-Entity Ambiguity", zh: "概念對應實體的歧義" },
        body: { en: "With hundreds of viable tables, which fields define an 'active user' — what filters, what lookback window?",
                zh: "有上百張可用的表,到底哪些欄位定義「活躍用戶」?用什麼篩選、回看多長?" } },
      { size: "md", icon: "schedule",
        title: { en: "Data Staleness", zh: "資料過時" },
        body: { en: "Business definitions and schemas change constantly, so the agent's knowledge silently decays.",
                zh: "業務定義與 schema 不斷改變,代理的知識會悄悄過時。" } },
      { size: "md", icon: "search_off",
        title: { en: "Retrieval Failure", zh: "檢索失敗" },
        body: { en: "The right information exists but stays buried in a vast search space the agent never reaches.",
                zh: "正確資訊其實存在,卻埋在龐大的搜尋空間裡,代理永遠找不到。" } }
    ]
  },

  /* ----- stack / timeline ----- */
  {
    slug: "stack", layout: "timeline", icon: "layers",
    title: { en: "The Agentic Analytics Stack", zh: "代理式分析堆疊" },
    subtitle: {
      en: "A layered system, each layer fixing a specific failure mode.",
      zh: "分層系統,每一層各自解決一種失敗模式。"
    },
    events: [
      { date: { en: "Layer 01", zh: "第 1 層" },
        title: { en: "Data Foundations", zh: "資料基礎" },
        body: { en: "Canonical, heavily-governed single-source-of-truth datasets. Standards are enforced through tooling, CI checks and mandates, with metadata (descriptions, definitions, lineage) treated as a first-class product.",
                zh: "標準化、嚴格治理的單一真實來源資料集。透過工具、CI 檢查與規範強制標準,並把中繼資料(描述、定義、血緣)當成一級產品來經營。" } },
      { date: { en: "Layer 02", zh: "第 2 層" },
        title: { en: "Sources of Truth", zh: "真實來源" },
        body: { en: "A semantic layer of compiled metric definitions, a lineage graph, a distilled query corpus and a business knowledge graph — governed answer keys the agent can rely on.",
                zh: "由編譯後的指標定義組成的語意層、血緣圖、提煉過的查詢語料庫,以及業務知識圖譜 —— 代理可以信賴的治理化答案。" } },
      { date: { en: "Layer 03", zh: "第 3 層" },
        title: { en: "Skills", zh: "技能 (Skills)" },
        body: { en: "Procedural knowledge encoded as markdown folders Claude reads on demand. Adding Skills lifted aggregate accuracy from 21% to 95%+.",
                zh: "以 markdown 資料夾編碼、Claude 隨需讀取的程序性知識。加入 Skills 後,整體準確率從 21% 提升到 95%+。" } },
      { date: { en: "Layer 04", zh: "第 4 層" },
        title: { en: "Validation", zh: "驗證" },
        body: { en: "Offline evals, ablation testing and online safeguards — adversarial review, provenance footers, data-quality checks and automated correction harvesting.",
                zh: "離線評測、消融測試與線上防護 —— 對抗式複查、來源出處註腳、資料品質檢查,以及自動化的修正回收。" } }
    ]
  },

  /* ----- sources / gallery ----- */
  {
    slug: "sources", layout: "gallery", icon: "account_tree",
    title: { en: "Sources of Truth", zh: "真實來源" },
    subtitle: {
      en: "Four governed references the agent maps questions onto. Search or filter.",
      zh: "代理把問題對應到的四種治理化參考。可搜尋或篩選。"
    },
    categories: [
      { key: "structure", en: "Structure", zh: "結構" },
      { key: "knowledge", en: "Knowledge", zh: "知識" }
    ],
    items: [
      { slug: "semantic-layer", category: "structure",
        title: { en: "Semantic Layer", zh: "語意層" },
        summary: { en: "Highest priority — compiled metric definitions.", zh: "最高優先 —— 編譯後的指標定義。" },
        tags: ["metrics", "priority", "consistency"],
        overview: { en: "Compiled metric definitions that guarantee a number means the same thing everywhere. The single highest-impact source of truth: it collapses concept-to-entity ambiguity at the definition level.",
                    zh: "編譯後的指標定義,確保同一個數字在各處意義一致。影響最大的真實來源:在定義層級就消除概念對應實體的歧義。" } },
      { slug: "lineage-graph", category: "structure",
        title: { en: "Lineage & Transformation Graph", zh: "血緣與轉換圖" },
        summary: { en: "Maps every upstream dependency.", zh: "描繪每一個上游依賴。" },
        tags: ["lineage", "dependencies", "trust"],
        overview: { en: "A graph of upstream dependencies and transformations, so the agent can trace where a field comes from and judge whether to trust it.",
                    zh: "上游依賴與轉換的圖譜,讓代理能追溯某個欄位的來源,判斷是否該信任它。" } },
      { slug: "query-corpus", category: "knowledge",
        title: { en: "Query Corpus", zh: "查詢語料庫" },
        summary: { en: "Historical SQL distilled into reference docs.", zh: "把歷史 SQL 提煉成參考文件。" },
        tags: ["sql", "history", "patterns"],
        overview: { en: "Years of historical SQL distilled into structured reference docs, capturing the patterns analysts actually use rather than raw query logs.",
                    zh: "把多年的歷史 SQL 提煉成結構化參考文件,記錄分析師真正使用的模式,而非原始查詢紀錄。" } },
      { slug: "business-context", category: "knowledge",
        title: { en: "Business Context", zh: "業務脈絡" },
        summary: { en: "A company knowledge graph for ambient references.", zh: "處理隱含指涉的公司知識圖譜。" },
        tags: ["context", "knowledge-graph", "semantics"],
        overview: { en: "A company knowledge graph that resolves ambient references — what 'the launch', 'Q3', or 'the funnel' mean inside this specific business.",
                    zh: "解析隱含指涉的公司知識圖譜 —— 在這家公司裡,「那次發表」「Q3」「漏斗」到底指什麼。" } }
    ]
  },

  /* ----- skills / scrolly ----- */
  {
    slug: "skills", layout: "scrolly", icon: "auto_stories",
    title: { en: "Skills: 21% → 95%", zh: "Skills:21% → 95%" },
    subtitle: {
      en: "The single biggest lever. Scroll to watch accuracy climb.",
      zh: "最關鍵的槓桿。捲動看準確率攀升。"
    },
    steps: [
      { text: { en: "Before Skills, the agent guessed at structure. Aggregate accuracy sat at just 21%.",
                zh: "在加入 Skills 之前,代理只能猜測結構。整體準確率僅有 21%。" },
        visual: { type: "stat", value: { en: "21%", zh: "21%" }, color: "#B3261E" } },
      { text: { en: "Skills are procedural knowledge — markdown folders Claude reads on demand, encoding how a senior analyst actually works.",
                zh: "Skills 是程序性知識 —— Claude 隨需讀取的 markdown 資料夾,編碼資深分析師真正的工作方式。" },
        visual: { type: "color", value: { en: "Procedural knowledge", zh: "程序性知識" }, color: "#6750A4" } },
      { text: { en: "Knowledge Skills act as routers, narrowing hundreds of tables down to about 30 curated reference files.",
                zh: "Knowledge Skills 像路由器,把上百張表收斂成大約 30 份精選參考文件。" },
        visual: { type: "stat", value: { en: "~30 files", zh: "約 30 份" }, color: "#386A20" } },
      { text: { en: "Unbook Skills capture senior-analyst workflows: adversarial review, reusable patterns and known gotchas.",
                zh: "Unbook Skills 捕捉資深分析師的工作流程:對抗式複查、可重用模式與已知陷阱。" },
        visual: { type: "color", value: { en: "Senior workflows", zh: "資深工作流程" }, color: "#7D5260" } },
      { text: { en: "Together they collapse ambiguity into governed answers. Accuracy climbed past 95%.",
                zh: "兩者合力把歧義收斂成治理化答案。準確率攀過 95%。" },
        visual: { type: "stat", value: { en: "95%+", zh: "95%+" }, color: "#386A20" } },
      { text: { en: "From 21% to 95% — same model, same data. The win was structure, not raw access.",
                zh: "從 21% 到 95% —— 同樣的模型、同樣的資料。致勝關鍵是結構,而非原始存取權。" },
        visual: { type: "bars", color: "#386A20", bars: [
          { label: { en: "Without Skills", zh: "沒有 Skills" }, value: 21 },
          { label: { en: "With Skills", zh: "有 Skills" }, value: 95 }
        ] } }
    ]
  },

  /* ----- validation / dashboard ----- */
  {
    slug: "validation", layout: "dashboard", icon: "fact_check",
    title: { en: "Validation", zh: "驗證" },
    subtitle: {
      en: "Trust comes from measurement. One ablation even showed direct SQL access didn't help — the bottleneck was structure, not access.",
      zh: "信任來自量測。一項消融實驗甚至顯示,直接給 SQL 存取權也沒有幫助 —— 瓶頸是結構,而不是存取權。"
    },
    stats: [
      { label: { en: "Aggregate accuracy", zh: "整體準確率" }, value: "95%", unit: { en: "", zh: "" } },
      { label: { en: "Adversarial review → accuracy", zh: "對抗式複查 → 準確率" }, value: "+6%", unit: { en: "", zh: "" } },
      { label: { en: "Adversarial review → tokens", zh: "對抗式複查 → token" }, value: "+32%", unit: { en: "", zh: "" } },
      { label: { en: "Adversarial review → latency", zh: "對抗式複查 → 延遲" }, value: "+72%", unit: { en: "", zh: "" } }
    ],
    bars: {
      title: { en: "The cost of adversarial review", zh: "對抗式複查的代價" },
      series: [
        { label: { en: "Accuracy gain", zh: "準確率提升" }, value: 6 },
        { label: { en: "Extra tokens", zh: "額外 token" }, value: 32 },
        { label: { en: "Extra latency", zh: "額外延遲" }, value: 72 }
      ]
    },
    table: {
      columns: [
        { key: "method", label: { en: "Method", zh: "方法" } },
        { key: "what",   label: { en: "What it does", zh: "作用" } },
        { key: "type",   label: { en: "Type", zh: "類型" } }
      ],
      rows: [
        { method: { en: "Dashboard-based evals", zh: "以儀表板為基礎的評測" },
          what: { en: "Auto-generated, human-validated ground truth", zh: "自動產生、人工驗證的標準答案" },
          type: { en: "Offline", zh: "離線" } },
        { method: { en: "Long-tail evals", zh: "長尾評測" },
          what: { en: "LLM-generated from business context", zh: "由 LLM 依業務脈絡產生" },
          type: { en: "Offline", zh: "離線" } },
        { method: { en: "Ablation testing", zh: "消融測試" },
          what: { en: "Isolate which component actually moves accuracy", zh: "找出真正影響準確率的元件" },
          type: { en: "Offline", zh: "離線" } },
        { method: { en: "Adversarial review", zh: "對抗式複查" },
          what: { en: "A second pass that critiques the answer", zh: "再跑一次、對答案提出批判" },
          type: { en: "Online", zh: "線上" } },
        { method: { en: "Provenance footers", zh: "來源出處註腳" },
          what: { en: "Show data source tier and freshness", zh: "標示資料來源層級與新鮮度" },
          type: { en: "Online", zh: "線上" } },
        { method: { en: "Correction harvesting", zh: "修正回收" },
          what: { en: "Turn stakeholder fixes into automated PRs", zh: "把使用者的更正轉成自動化 PR" },
          type: { en: "Online", zh: "線上" } }
      ]
    }
  },

  /* ----- playbook / faq ----- */
  {
    slug: "playbook", layout: "faq", icon: "rocket_launch",
    title: { en: "Getting Started", zh: "上手策略" },
    subtitle: {
      en: "From zero, and the principles to align on first.",
      zh: "從零開始,以及該先對齊的原則。"
    },
    qa: [
      { q: { en: "Where should we start from zero?", zh: "從零開始該從哪裡下手?" },
        a: { en: "Canonical datasets + a few dozen offline evals + one thin knowledge skill capture most of the upside. You don't need the whole stack to launch.",
             zh: "標準化資料集 + 幾十個離線評測 + 一個精簡的 knowledge skill,就能拿下大部分效益。不需要整套堆疊才能上線。" } },
      { q: { en: "How much does current accuracy matter vs. future improvement?", zh: "當下的準確率與未來的改進,哪個更重要?" },
        a: { en: "Decide up front. It changes how much you invest in validation before launch versus iterating in production.",
             zh: "先講清楚。這會決定你在上線前投入多少驗證,還是上線後再迭代。" } },
      { q: { en: "How much business complexity should we expect to grow into?", zh: "要預期成長到多複雜的業務?" },
        a: { en: "Anticipated complexity drives how much you invest in the semantic layer and business context graph now.",
             zh: "預期的複雜度,決定你現在要在語意層與業務知識圖譜上投入多少。" } },
      { q: { en: "How technical is the intended audience?", zh: "目標使用者有多技術?" },
        a: { en: "A more technical audience tolerates raw fields and caveats; a business audience needs governed, unambiguous answers.",
             zh: "越技術的使用者越能接受原始欄位與但書;業務型使用者則需要治理化、無歧義的答案。" } },
      { q: { en: "What's our budget for accuracy?", zh: "準確率的預算有多少?" },
        a: { en: "Adversarial validation buys about +6% accuracy but costs +32% tokens and +72% latency. Decide whether that trade is worth it per domain.",
             zh: "對抗式驗證大約換來 +6% 準確率,但代價是 +32% token 與 +72% 延遲。逐領域決定這筆交易值不值得。" } },
      { q: { en: "How comfortable are we with data access controls?", zh: "對資料存取控制的容忍度?" },
        a: { en: "Your comfort with access controls sets the boundary of what the agent may read — and shapes the safeguards you need.",
             zh: "你對存取控制的容忍度,劃出代理能讀取的範圍,也決定你需要的防護措施。" } }
    ]
  },

  /* ----- conclusion / article ----- */
  {
    slug: "conclusion", layout: "article", icon: "flag",
    title: { en: "The Takeaway", zh: "結論" },
    subtitle: {
      en: "Map the question to the right entities — execution is the easy part.",
      zh: "把問題對應到正確的實體 —— 執行反而是最簡單的部分。"
    },
    sections: [
      { id: "central-problem", heading: { en: "The Central Problem", zh: "核心問題" }, blocks: [
        { type: "p", text: { en: "Strip everything away and one mapping problem remains.",
                             zh: "把一切剝除後,只剩下一個對應問題。" } },
        { type: "quote", text: { en: "The central problem comes down to our ability to map a user's question to specific and up-to-date entities in our data model.",
                                 zh: "核心問題在於:我們能不能把使用者的問題,對應到資料模型中具體且即時的實體。" } },
        { type: "p", text: { en: "Get that mapping right and execution becomes trivial — generating the SQL is the easy part.",
                             zh: "只要對應對了,執行就變得微不足道 —— 產生 SQL 反而是最簡單的部分。" } }
      ] },
      { id: "what-success-requires", heading: { en: "What Success Requires", zh: "成功需要什麼" }, blocks: [
        { type: "p", text: { en: "Success isn't perfect code generation or raw SQL capability. It is three disciplines:",
                             zh: "成功的關鍵不是完美的程式生成,也不是原始 SQL 能力,而是三項紀律:" } },
        { type: "ul", items: {
            en: ["Collapse ambiguity into governed answers.", "Make the right data discoverable.", "Flag staleness before it misleads."],
            zh: ["把歧義收斂成治理化的答案。", "讓正確的資料可被發現。", "在過時資料誤導之前先標記它。"] } },
        { type: "p", text: { en: "With those in place, 95% of business analytics questions answer themselves — freeing data scientists for strategic work.",
                             zh: "做到這些,95% 的商業分析問題就能自己回答 —— 把資料科學家釋放去做策略性工作。" } }
      ] },
      { id: "read-original", heading: { en: "Read the Original", zh: "閱讀原文" }, blocks: [
        { type: "p", text: { en: "This is an unofficial visual summary. The full engineering post lives on the Anthropic blog.",
                             zh: "這是非官方的視覺化整理。完整的工程文章請見 Anthropic 部落格。" } },
        { type: "link", url: "https://claude.com/blog/how-anthropic-enables-self-service-data-analytics-with-claude",
          text: { en: "How Anthropic Enables Self-Service Data Analytics with Claude",
                  zh: "How Anthropic Enables Self-Service Data Analytics with Claude(原文)" } }
      ] }
    ]
  }

];
