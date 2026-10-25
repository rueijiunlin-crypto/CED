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
├── areas/                 # research.html 共用模板與舊網址轉址入口
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
- 研究的選填欄位包含 `field`（應用領域）、`status`（選填狀態文字）、`introduction`、`sections`（介紹段落）、`technologies`、`image`、`year`、`detailUrl`、`example`、`source`。`sections` 每段包含 `title`，並可填入文字陣列 `paragraphs` 或重點陣列 `items`。
- ID 使用小寫英文字開頭、英數與連字號，集合內不得重複；使用後盡量保留以維持連結。
- 新的成員研究關聯維護於 `data/participations.json`；既有 `researchIds` 保留相容。載入時合併並去重，讓成員頁與研究頁使用同一組關聯。新正式成員不必在 `members.json` 重複填寫 `researchIds`。團隊關聯仍使用 `groups.json` 的 `researchIds`，團隊名稱與組員只維護於該檔。
- 圖片與詳細頁 URL 為相對 Repository 根目錄的站內路徑。人物使用 4:3 裁切預設圖；研究圖片以 contain 保留完整內容，遺失則移除圖片。無照片 Alumni 直接呈現文字卡片。
- `example: true` 會顯示範例標籤。現行三項研究使用實際主題名稱；成員已包含確認的林睿鈞與顏嘉源，其餘範例成員、範例團隊及範例研究仍保留標記。未提供的日期、技術規格、照片與成果不會補成正式資料。
- 畢業年度由新到舊，未填年度列在最後；不強制補研究或介紹頁。博士資料結構保留，但目前在籍區僅顯示碩士。
- 團隊目前顯示 `status: "current"` 的資料；過往專題可收錄於 `historical` 研究分類，無已知相關人員時不必建立團隊關聯。

`js/data-service.js` 負責讀取與基本驗證，回傳 members、groups、research、participations 與索引；未來改接 API 可維持這個介面。`js/directory-render.js` 負責 DOM 卡片，`js/directory.js` 負責分類、載入狀態與錨點定位。資料文字使用 textContent，URL 限站內。資料錯誤顯示重試；遺失研究 ID 顯示待補並略過無效連結。

`css/directory.css` 套用成員、研究總覽與研究介紹模板；`css/style.css`、`partials/header.html`、`partials/footer.html` 保持原有內容。`js/include.js` 提供 includesReady，`js/script.js` 在頁尾載入後設定版權年份，避免非同步時序問題。

## 研究圖片與段落

既有 `image` 仍為選填的代表圖片路徑：研究總覽會顯示代表圖，無圖時維持原有純文字卡片。卡片仍整張可點擊，技術標籤沿用 `technologies`，分類與排序不變。

新增兩個選填欄位：研究層級的 `gallery`，以及每個 `sections` 段落的 `images`。兩者皆為圖片物件陣列，每張圖片的 `src` 必填，`alt`、`caption`、`fit` 選填。`fit` 預設為 `contain`，適合系統架構圖並完整保留比例；照片可指定 `cover` 使用 4:3 縮圖。點擊任何詳細頁圖片後，放大視窗一律完整顯示原圖，不沿用縮圖裁切。

以下為要合併至研究記錄的欄位範例，檔案路徑與文字須替換為已確認的實際內容；不應直接當作正式研究成果：

```json
{
  "gallery": [
    {
      "src": "image/research/example-photo.jpg",
      "alt": "研究操作情境示意",
      "caption": "請替換為已確認的照片說明",
      "fit": "cover"
    }
  ],
  "sections": [
    {
      "title": "系統架構",
      "paragraphs": ["請填入已確認的架構介紹。"],
      "items": ["請填入已確認的系統組成。"],
      "images": [
        {
          "src": "image/research/example-diagram.png",
          "alt": "系統各模組的連接關係",
          "caption": "請替換為已確認的架構圖說明",
          "fit": "contain"
        }
      ]
    }
  ]
}
```

`sections` 依陣列順序呈現，每段依序顯示標題、`paragraphs`、`items`、`images`；若需在兩段文字之間插圖，可拆成依序排列的段落。研究層級 `gallery` 放在介紹段落之後、技術與相關人員之前，各圖片依陣列順序顯示。可建立純圖片段落；空段落、不安全路徑或全部圖片失敗的純圖片區塊會隱藏，有文字的段落則保留。

圖片路徑僅接受相對網站根目錄的站內路徑，不接受外部網址、`data:`、`javascript:`、絕對路徑、反斜線或父目錄跳轉。文字一律使用安全 DOM API，缺少圖說不會以檔名代替。圖片陣列與欄位型別錯誤會沿用資料載入錯誤與重試提示。

放大視窗支援滑鼠／觸控、Enter／Space 開啟、Escape／關閉按鈕／點擊背景關閉，Tab 焦點保留於視窗內，關閉後回到原圖片按鈕。需要支援原生 HTML `dialog` 的現代瀏覽器，不需額外套件。

## 跨屆研究參與與論文

`data/members.json` 是姓名、照片、學位（`degree`）、學籍狀態（`status`）、畢業年份（`graduationYear`）與個人研究介紹（選填 `introduction`）的主資料。沒有照片的在籍成員沿用預設圖，無照片的畢業成員保留文字卡片。

`data/participations.json` 每筆代表一位成員參與一項研究，不儲存姓名、照片或學籍身分副本：

| 欄位 | 用途 |
| --- | --- |
| `id` | 唯一紀錄 ID |
| `researchId`、`memberId` | 指向既有研究與成員 ID，兩者組合不可重複 |
| `role` | 該研究的參與角色，例如研究參與、論文研究；不是學籍狀態 |
| `researchYear` | 選填整數研究年份；未確認時省略 |
| `focus`、`contribution` | 選填的個人研究方向、該專案貢獻 |
| `thesis.title` | 有論文時填入確認的題名 |
| `thesis.advisor`、`thesis.url` | 選填的指導教授與已確認論文網址 |

例如，下列關聯已收錄於資料中；成員的姓名與介紹仍由主資料讀取：

```json
{
  "id": "mowing-lin-ruei-jiun",
  "researchId": "mowing-robot",
  "memberId": "lin-ruei-jiun",
  "role": "研究參與",
  "focus": "視覺語言模型、無人機視覺感知、空地協作自主系統"
}
```

顏嘉源的畢業年份只存於成員主資料（2026），論文題名、指導教授與該研究貢獻存於參與紀錄。未提供論文網址，因此不產生下載連結。新成員不重複儲存 `researchIds`，資料服務在記憶體中由參與紀錄產生對應研究連結；舊 `researchIds` 仍可與新關聯合併並去重。

有參與紀錄的專案，詳細頁依成員主資料 `status` 自動分成「現階段研究人員」與「歷屆研究生與論文」，並另列相關專題團隊；沒有參與紀錄的舊研究維持原有關聯展示。修改主資料姓名、介紹、學籍狀態或畢業年份時，所有相關研究頁同步更新。無效 ID 關聯、重複成員／研究組合或錯誤欄位型別會顯示資料載入錯誤與重試。

研究可選填 `references` 陣列，每筆包含已確認的 `title` 與選填 `url`；沒有資料不顯示參考文獻區塊。論文與文獻僅接受安全 HTTPS 網址或站內網址，不安全網址只顯示文字。割草機器人目前沒有確認的照片或參考文獻，對應區塊保持隱藏。`gallery` 與 `sections[].images` 繼續沿用。

## 原始內容保留

部分成員、團隊及歷屆研究仍維持範例；已確認的正式成員與範例分別標記。現行研究已改為「疏苗除草機器人」「垃圾收集海漂船」「割草機器人」，並統一使用共用研究模板。研究介紹從同一份 JSON 產生，名稱與介紹段落可直接在資料檔更新。

疏苗除草機器人與垃圾收集海漂船保留原有介紹。割草機器人採使用者確認的公開簡介與研究特色，不展示演算法、參數、原始碼或未確認成果。正式參與者由參與資料關聯；沒有將範例成員分派到正式研究。

研究總覽使用 `css/research.css` 的單欄橫向卡片，整張卡片可點入介紹。未提供日期時以狀態與應用領域標示。首頁的現行研究入口同步連到 `#current`。

所有研究介紹皆使用 `areas/research.html?id=研究ID`；研究列表、研究生與團隊的研究連結均由 ID 產生，不依賴 `detailUrl`。新增研究只需新增 `data/research.json` 資料，不必建立 HTML。`current` / `historical` 會自動列入研究總覽；其他範例分類仍可由成員頁或共用網址開啟。

`sections` 可包含「研究目的」「研究內容」等段落；只有實際提供的文字與重點會顯示。圖片、簡介、應用領域、狀態、年份、技術標籤與人員關聯皆依資料顯示，空段落不產生區塊。範例研究保留範例標籤。共用模板使用安全 DOM API 呈現文字；網址僅接受單一、符合既有 ID 格式的 `id`，缺少、重複、不合法或查無資料時顯示找不到研究的提示。

現存九個 `areas/area-*.html` 保留為相對路徑的 HTML 轉址入口，並附可點擊的備援連結。既有 `detailUrl` 僅保留為舊網址紀錄，不再控制研究連結或成為新增研究的必要欄位。舊總覽的 `#masters` / `#undergraduate` 錨點仍導向進行中區塊，舊範例主題錨點導向共用介紹頁。

改版前成員 HTML 原樣記錄於 `docs/original-members.md`。先前研究資料與六個詳細頁原文備份於 `docs/original-research/`，只供歷史參考，不由展示頁載入；原圖片檔仍保留。年度、學位與關聯僅用於測試，不代表實際紀錄。

## 驗證

先在 8000 埠啟動 HTTP Server；測試會先檢查網站服務，未啟動時明確回報環境未就緒。環境若已安裝 Playwright 與 Chromium，可執行：

```sh
node tests/directory.cjs
# 若使用系統 Chromium：
CHROMIUM_PATH=/usr/bin/chromium node tests/directory.cjs
```

測試涵蓋 JSON 關聯、桌機 / 平板 / 手機、兩頁雙向錨點、Alumni 展開、共用導覽與頁尾、舊頁載入，以及 JSON / 圖片失敗情境。Playwright 僅為開發驗證工具，不是網站執行相依。

測試亦涵蓋全部研究的共用模板、九個舊網址轉址、無 `detailUrl` 的 JSON 測試研究、選填欄位、參數驗證、安全文字與雙向人員關聯。截圖預設存於作業系統暫存目錄，可用 `CED_SCREENSHOT_DIR` 指定已存在的輸出目錄。可設定 `CED_TEST_BASE=http://127.0.0.1:8000/CED/` 驗證子路徑部署。

圖片擴充測試使用 Playwright 暫時攔截的 JSON 與 SVG 圖形，涵蓋多圖、圖說、段落順序、架構圖完整比例、照片縮圖與原圖、失敗清理、欄位型別、安全網址、鍵盤焦點與手機觸控；正式 `data/research.json` 不加入測試內容。
