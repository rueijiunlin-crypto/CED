# CED Lab 前端模板

純 HTML、CSS、JavaScript 網站，沒有後端、資料庫、登入或建置流程。

## 程式碼排版

網站程式碼統一使用兩個空白縮排，長程式碼換行；HTML 多屬性標籤與 CSS 屬性各自分行，JSON 陣列元素也逐行列出，方便閱讀與修改。

`.editorconfig` 記錄編輯器縮排設定，`.prettierrc.json` 記錄自動排版規則。若已安裝 Node.js，可執行：

```sh
npx prettier@3.6.2 --check "**/*.{html,css,js,cjs,json,svg}"
npx prettier@3.6.2 --write "**/*.{html,css,js,cjs,json,svg}"
```

`.prettierignore` 排除歷史內容備份，保留當時的原始程式碼。

## 本機啟動

在 Repository 根目錄執行：

```sh
python3 -m http.server 8000
```

開啟 http://localhost:8000/members.html 或 http://localhost:8000/areas.html。
請勿直接以 `file://` 開啟：JSON、ES modules 與共用 header/footer 需要 HTTP Server。
可部署到支援靜態檔案的主機（含 GitHub Pages 子路徑），不需要 API。

## 檔案與資料管理

```text
CED/
├── *.html                 # 首頁、教授、成員、研究總覽、消息等主要頁面
├── css/
│   ├── style.css          # 全站主題與版面
│   ├── directory.css      # 成員、研究目錄與介紹模板
│   ├── research.css       # 研究卡片與介紹頁
│   └── card-anchor.css    # 保留的卡片連結樣式（目前未引用）
├── js/
│   ├── include.js         # 共用導覽列、頁尾載入
│   ├── script.js          # 全站互動與版權年份
│   ├── data-service.js    # JSON 讀取與驗證
│   ├── directory-render.js
│   └── directory.js
├── areas/                 # 既有研究詳細頁，網址不變
├── data/                  # 成員、團隊與研究 JSON
├── image/                 # 圖片與預設圖
├── partials/              # 共用 header / footer
├── docs/                  # 驗證紀錄與原始內容備份
└── tests/                 # 現有 Playwright 自動化測試
```

根目錄頁面引用 `css/*.css` 與 `js/*.js`，`areas/` 詳細頁則引用 `../css/*.css` 與 `../js/*.js`。共用區塊的 `data-include` 路徑仍相對於 HTML 頁面；JavaScript 模組與 JSON 路徑仍由 `js/` 模組位置解析。歷史備份保留當時的路徑，不作為展示頁使用。

- `data/members.json`：成員唯一 `id`、`name`、`degree`（`master` / `phd`）、`status`（`current` / `alumni`）、選填 `grade`、`photo`、西元整數 `graduationYear`、`researchIds`、`example`。
- `data/groups.json`：團隊唯一 `id`、`name`、`memberNames`、`status`、`researchIds`，選填 `image`、`example`。新增或移除組別只須修改資料。
- `data/research.json`：研究唯一 `id`、`title`、`summary`、`category`。總覽目前只顯示 `current`（進行中的研究）與 `historical`（歷屆研究）；舊有 `masters` / `undergraduate` 範例保留，供成員頁連結使用。
- 研究的選填欄位包含 `field`（應用領域）、`introduction`、`sections`（介紹段落）、`technologies`、`image`、`year`、`detailUrl`、`example`、`source`。`sections` 每段包含 `title`，並可填入文字陣列 `paragraphs` 或重點陣列 `items`。
- ID 使用小寫英文字開頭、英數與連字號，集合內不得重複；使用後盡量保留以維持連結。
- `researchIds` 是多對多關聯的唯一維護位置。研究頁反查成員與團隊，不另存姓名、研究簡介或團隊成員副本。團隊名稱與組員只維護於 groups.json。
- 圖片與詳細頁 URL 為相對 Repository 根目錄的站內路徑。人物使用 4:3 裁切預設圖；研究圖片以 contain 保留完整內容，遺失則移除圖片。無照片 Alumni 直接呈現文字卡片。
- `example: true` 會顯示範例標籤。現行三項研究使用實際主題名稱；歷屆研究、成員及團隊目前仍是範例。未提供的日期、技術規格、照片與成果不會補成正式資料。
- 畢業年度由新到舊，未填年度列在最後；不強制補研究或介紹頁。博士資料結構保留，但目前在籍區僅顯示碩士。
- 團隊目前顯示 `status: "current"` 的資料；過往專題可收錄於 `historical` 研究分類，無已知相關人員時不必建立團隊關聯。

`js/data-service.js` 負責讀取與基本驗證，回傳 members、groups、research 與索引；未來改接 API 可維持這個介面。`js/directory-render.js` 負責 DOM 卡片，`js/directory.js` 負責分類、載入狀態與錨點定位。資料文字使用 textContent，URL 限站內。資料錯誤顯示重試；遺失研究 ID 顯示待補並略過無效連結。

`css/directory.css` 套用成員、研究總覽與研究介紹模板；`css/style.css`、`partials/header.html`、`partials/footer.html` 保持原有內容。`js/include.js` 提供 includesReady，`js/script.js` 在頁尾載入後設定版權年份，避免非同步時序問題。

## 原始內容保留

成員、團隊及歷屆研究仍維持範例。現行研究已改為「疏苗除草機器人」「垃圾收集海漂船」「割草機器人」，並各有一個獨立頁面。研究介紹從同一份 JSON 產生，名稱與三段介紹可直接在資料檔更新。

目前三項研究的介紹依使用者提供的名稱撰寫，以研究目的、應用情境與關注議題為初稿；尚未提供的實作技術、進度、成果與規格不作事實陳述。沒有將範例成員分派到正式研究，待確認實際人員後才設定 `researchIds`。

研究總覽使用 `css/research.css` 的單欄橫向卡片，整張卡片可點入介紹。未提供日期時以狀態與應用領域標示。首頁的現行研究入口同步連到 `#current`。

新研究介紹頁為 `areas/area-thinning-weeding-robot.html`、`areas/area-marine-trash-collection-vessel.html`、`areas/area-mowing-robot.html`。早期範例的 ID、資料與路徑繼續保留；沒有專頁的舊範例由 `areas/research.html?id=研究ID` 顯示。舊總覽的 `#masters` / `#undergraduate` 錨點導向進行中區塊，舊範例主題錨點導向其介紹頁。

改版前成員 HTML 原樣記錄於 `docs/original-members.md`。先前研究資料與六個詳細頁原文備份於 `docs/original-research/`，只供歷史參考，不由展示頁載入；原圖片檔仍保留。年度、學位與關聯僅用於測試，不代表實際紀錄。

## 驗證

先啟動 HTTP Server。環境若已安裝 Playwright 與 Chromium，可執行：

```sh
node tests/directory.cjs
# 若使用系統 Chromium：
CHROMIUM_PATH=/usr/bin/chromium node tests/directory.cjs
```

測試涵蓋 JSON 關聯、桌機 / 平板 / 手機、兩頁雙向錨點、Alumni 展開、共用導覽與頁尾、舊頁載入，以及 JSON / 圖片失敗情境。Playwright 僅為開發驗證工具，不是網站執行相依。
