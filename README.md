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
- `data/research.json`：研究唯一 `id`、`title`、`summary`、`category`。總覽目前只顯示 `current`（進行中的研究）與 `historical`（歷屆研究）；舊有 `masters` / `undergraduate` 範例保留供測試與研究模板相容使用，但不從公開成員頁連結。
- 研究的選填欄位包含 `field`（應用領域）、`status`（選填狀態文字）、`introduction`、`sections`（介紹段落）、`technologies`、`image`、`year`、`detailUrl`、`example`、`source`。`sections` 每段包含 `title`，並可填入文字陣列 `paragraphs` 或重點陣列 `items`。
- ID 使用小寫英文字開頭、英數與連字號，集合內不得重複；使用後盡量保留以維持連結。
- 只有專案歸屬的成員使用 `members.json` 的 `researchIds`；需要個人貢獻、年份或論文資訊時使用 `data/participations.json`。載入時合併並去重，讓成員頁與研究頁使用同一組關聯。已由參與紀錄關聯的研究，不必在 `members.json` 重複填寫同一個 `researchIds`。團隊關聯仍使用 `groups.json` 的 `researchIds`，團隊名稱與組員只維護於該檔。
- 圖片與詳細頁 URL 為相對 Repository 根目錄的站內路徑。人物使用 4:3 裁切預設圖；研究圖片以 contain 保留完整內容，遺失則移除圖片。無照片 Alumni 直接呈現文字卡片。
- `example: true` 會顯示範例標籤。現行三項研究使用實際主題名稱；成員主資料僅保留六位正式在籍成員與兩位正式畢業成員（顏嘉源、林志恩）；範例成員已移除。範例團隊與範例研究資料保留供既有功能與測試使用，不出現在公開成員頁。未提供的日期、技術規格、照片與成果不會補成正式資料。
- 畢業年度由新到舊，未填年度列在最後；不強制補研究或介紹頁。在籍區依 `status: "current"` 顯示正式研究成員，未確認學位不推測。
- 團隊區塊目前隱藏，資料及渲染能力保留；恢復時僅顯示非範例的 `status: "current"` 資料；過往專題可收錄於 `historical` 研究分類，無已知相關人員時不必建立團隊關聯。

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

## 研究成員頁

`members.html` 沿用現有資料服務與卡片渲染，公開顯示「研究成員」「歷屆畢業成員」兩區，大學部專題團隊區塊及其導覽暫時隱藏。保留原有 `#masters`、`#groups`、`#alumni` 與 `#member-ID` 錨點，不建立個人詳細頁。

- 桌機使用單欄橫向卡片，照片在左、資料在右；手機改為上下排列，照片縮為 112 × 84 px。使用既有品牌色、圓角、邊框、陰影與字型，樣式限定 `.members-page`，不影響研究圖集或其他頁面。
- 成員主資料新增選填字串 `researchTopic`、`researchFocus`。既有 `researchTopic` 內容保持不變，但所有成員卡片停止渲染該欄位。林睿鈞僅顯示已確認方向「視覺語言模型、無人機視覺感知、空地協作」；其他成員沒有方向時隱藏該欄。
- 卡片顯示姓名、照片、已確認的學位身分、已提供的研究方向與相關研究連結；研究主題只保留資料不渲染，沒有確認學位時不顯示身分欄；長篇介紹、參與角色、一般指導教授與完整論文不重複展示。正式長篇資料保留不刪除。
- 共同指導教授由該成員的參與紀錄 `thesis.coAdvisors` 取得並去重，未提供不顯示，不在成員資料另存副本。
- 團隊卡片從 `groups.json` 取得名稱與選填組員／圖片，從關聯研究取得主題與簡短摘要，不新增完整研究內容副本。沒有組員資料時省略該欄，不顯示待補占位文字。範例團隊資料及卡片函式保留，但目前不在公開成員頁渲染。
- 歷屆成員依畢業年份由新到舊歸類，缺少年份集中在最後的「年度待補」，使用原生 details／summary 支援滑鼠與鍵盤收合。未提供照片的畢業生使用純文字卡片。
- 所有相關研究仍指向 `areas/research.html?id=ID`；研究頁人名仍返回 `members.html#member-ID`。論文、貢獻與關鍵字繼續只由研究參與紀錄管理。

`identity` 為選填、已確認的身分文字，例如林志恩的「應屆畢業成員」；有明確身分文字時使用該值，否則只從已確認的 `degree` 顯示學位身分，不推測未提供的學位。該文字由成員主資料統一供成員頁與研究頁使用。

舊資料不必新增主題或方向也能顯示；缺少資料就隱藏對應欄位。新增欄位若不是字串，會沿用資料錯誤與重試提示。

### 正式在籍名單與專案歸屬

| 實際研究 ID | 正式在籍成員 |
| --- | --- |
| `mowing-robot` | 林睿鈞 |
| `thinning-weeding-robot` | 陳竑鈞、陳杰逸 |
| `marine-trash-collection-vessel` | 蔡宸祐、朱溢恩、林奕呈 |

新加入五位只記錄已確認的姓名、在籍狀態與研究 ID，不填寫尚未提供的學位、年級、照片、主題或研究方向。林睿鈞原資料保留；顏嘉源仍歸於 2026 年碩士畢業，完整論文與貢獻、關鍵字維持於參與紀錄。林志恩為 2026 年應屆畢業成員，使用 `researchIds` 關聯 `thinning-weeding-robot`；本次不填照片、方向、學位或論文資訊。

團隊 HTML 區塊以 `hidden` 隱藏，資料服務仍讀取 `groups.json`，`groupCard()` 保留。未來移除該區塊的 `hidden` 即可恢復非範例團隊渲染。公開成員頁會防禦性過濾 `example: true` 的人員與研究連結；範例團隊不產生指向已隱藏成員卡片的公開研究頁連結。

## 跨屆研究參與與論文

`data/members.json` 是姓名、照片、學位（`degree`）、學籍狀態（`status`）、畢業年份（`graduationYear`）、簡短研究主題／方向（選填 `researchTopic`、`researchFocus`）與個人研究介紹（選填 `introduction`）的主資料。沒有照片的在籍成員沿用預設圖，無照片的畢業成員保留文字卡片。`degree` 與 `grade` 未確認時省略，成員卡片省略沒有正式資料的身分欄，不推定為碩士或大學部學生。

`data/participations.json` 每筆代表一位成員參與一項研究，不儲存姓名、照片或學籍身分副本：

| 欄位 | 用途 |
| --- | --- |
| `id` | 唯一紀錄 ID |
| `researchId`、`memberId` | 指向既有研究與成員 ID，兩者組合不可重複 |
| `role` | 保留該研究的參與角色供資料維護，研究詳細頁不顯示；不是學籍狀態 |
| `researchYear` | 選填整數研究年份；未確認時省略 |
| `focus`、`contribution` | 選填的個人研究方向、該專案貢獻 |
| `thesis.title` | 有論文時填入確認的題名 |
| `thesis.advisor` | 保留一般指導教授資料，研究詳細頁不顯示 |
| `thesis.keywords` | 選填字串陣列，僅填正式論文已確認的關鍵字 |
| `thesis.coAdvisors` | 選填字串陣列，明確有共同指導教授時才顯示 |
| `thesis.url` | 選填的正式論文網址，缺少時僅顯示題名 |

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

顏嘉源的畢業年份只存於成員主資料（2026），論文題名、指導教授、三項確認關鍵字與該研究貢獻存於參與紀錄；一般指導教授僅保留資料，不在研究詳細頁顯示。未提供論文網址，因此不產生下載連結。新成員不重複儲存 `researchIds`，資料服務在記憶體中由參與紀錄產生對應研究連結；舊 `researchIds` 仍可與新關聯合併並去重。

有正式關聯成員或參與紀錄的專案，詳細頁依成員主資料 `status` 自動分成「現階段研究人員」與「歷屆研究生與論文」，並另列相關專題團隊；沒有參與紀錄的舊研究維持原有關聯展示。修改主資料姓名、介紹、學籍狀態或畢業年份時，所有相關研究頁同步更新。無效 ID 關聯、重複成員／研究組合或錯誤欄位型別會顯示資料載入錯誤與重試。

所有專案使用一致的人員展示規則：現階段人員顯示姓名連結、照片、學籍身分與研究方向，不顯示參與角色、研究年份或長篇個人介紹。長篇 `members.introduction` 保留於正式資料，研究專案與研究成員卡片皆不展示。歷屆區保留姓名、學位與畢業年份、貢獻、論文完整題名、確認關鍵字與正式論文連結；不顯示參與角色或一般指導教授。只有 `thesis.coAdvisors` 有非空文字時，才顯示「共同指導教授」，不從 `advisor` 推定。

割草機器人目前使用以下原始研究素材，存放於 `image/research/mowing-robot/`，圖說皆標明「來源：顏嘉源（2026）碩士論文相關研究素材」。未加入詳細演算法、參數或實作流程：

| 檔名 | 用途／圖說 |
| --- | --- |
| `prototype-photo.jpg` | 研究代表圖片／自主割草機器人原型機 |
| `field-test.jpeg` | 圖集／戶外研究照片 |
| `orthophoto.jpeg` | 圖集／空拍建圖成果 |
| `segmentation.png` | 圖集／環境感知成果 |
| `prototype-cutout.png` | 原檔保留備用，未加入研究圖片欄位，不顯示 |

代表圖使用既有 `image` 欄位；`gallery` 保存四張圖片的替代文字與圖說。當 `gallery` 的 `src` 與 `image` 相同，詳細頁會使用該筆的圖說與替代文字作為代表圖，並從後續圖集略過，避免重複顯示。所有研究圖片完整顯示原圖，可使用既有放大檢視功能。原始檔案不裁切、不重新壓縮。

研究可選填 `references` 陣列，每筆包含已確認的 `title` 與選填 `url`；沒有資料不顯示參考文獻區塊。論文與文獻僅接受安全 HTTPS 網址或站內網址，不安全網址只顯示文字。割草機器人已加入確認的研究圖片；尚未提供確認的參考文獻，因此文獻區塊保持隱藏。`gallery` 與 `sections[].images` 繼續沿用。

## 原始內容保留

成員主資料已移除所有範例人員；範例團隊及歷屆研究仍保留資料，公開成員頁不呈現範例。現行研究已改為「疏苗除草機器人」「垃圾收集海漂船」「割草機器人」，並統一使用共用研究模板。研究介紹從同一份 JSON 產生，名稱與介紹段落可直接在資料檔更新。

疏苗除草機器人與垃圾收集海漂船保留原有介紹。割草機器人採使用者確認的公開簡介與研究特色，不展示演算法、參數、原始碼或未確認成果。正式參與者由成員主資料與參與紀錄關聯；沒有將範例成員分派到正式研究。

研究總覽使用 `css/research.css` 的單欄橫向卡片，整張卡片可點入介紹。未提供日期時以狀態與應用領域標示。首頁的現行研究入口同步連到 `#current`。

所有研究介紹皆使用 `areas/research.html?id=研究ID`；研究列表、研究生與團隊的研究連結均由 ID 產生，不依賴 `detailUrl`。新增研究只需新增 `data/research.json` 資料，不必建立 HTML。`current` / `historical` 會自動列入研究總覽；其他範例分類仍可由共用網址開啟，但公開成員頁不提供範例研究連結。

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
