# CED Lab 前端模板

純 HTML、CSS、JavaScript 網站，沒有後端、資料庫、登入或建置流程。

## 本機啟動

在 Repository 根目錄執行：

```sh
python3 -m http.server 8000
```

開啟 http://localhost:8000/members.html 或 http://localhost:8000/areas.html。
請勿直接以 `file://` 開啟：JSON、ES modules 與共用 header/footer 需要 HTTP Server。
可部署到支援靜態檔案的主機（含 GitHub Pages 子路徑），不需要 API。

## 檔案與資料管理

- `data/members.json`：成員唯一 `id`、`name`、`degree`（`master` / `phd`）、`status`（`current` / `alumni`）、選填 `grade`、`photo`、西元整數 `graduationYear`、`researchIds`、`example`。
- `data/groups.json`：團隊唯一 `id`、`name`、`memberNames`、`status`、`researchIds`，選填 `image`、`example`。新增或移除組別只須修改資料。
- `data/research.json`：研究唯一 `id`、`title`、`summary`、`category`（`masters` / `undergraduate` / `historical`），選填 `technologies`、`image`、`year`、`detailUrl`、`example`、`source`。
- ID 使用小寫英文字開頭、英數與連字號，集合內不得重複；使用後盡量保留以維持連結。
- `researchIds` 是多對多關聯的唯一維護位置。研究頁反查成員與團隊，不另存姓名、研究簡介或團隊成員副本。團隊名稱與組員只維護於 groups.json。
- 圖片與詳細頁 URL 為相對 Repository 根目錄的站內路徑。人物使用 4:3 裁切預設圖；研究圖片以 contain 保留完整內容，遺失則移除圖片。無照片 Alumni 直接呈現文字卡片。
- `example: true` 會顯示範例標籤。全部現有資料皆為模板；正式資料確認後再更新欄位與標籤。
- 畢業年度由新到舊，未填年度列在最後；不強制補研究或介紹頁。博士資料結構保留，但目前在籍區僅顯示碩士。
- 團隊目前顯示 `status: "current"` 的資料；過往專題可收錄於 `historical` 研究分類，無已知相關人員時不必建立團隊關聯。

`js/data-service.js` 負責讀取與基本驗證，回傳 members、groups、research 與索引；未來改接 API 可維持這個介面。`js/directory-render.js` 負責 DOM 卡片，`js/directory.js` 負責分類、載入狀態與錨點定位。資料文字使用 textContent，URL 限站內。資料錯誤顯示重試；遺失研究 ID 顯示待補並略過無效連結。

`directory.css` 套用成員、研究總覽與研究介紹模板；style.css、partials/header.html、partials/footer.html 保持原有內容。include.js 提供 includesReady，script.js 在頁尾載入後設定版權年份，避免非同步時序問題。

## 原始內容保留

目前所有成員姓名、團隊、研究主題與技術均使用明顯的範例文字；不展示原研究圖片、計畫或成果。研究介紹頁也從 JSON 產生模板與相關成員，原有 ID 與頁面路徑保留以維持連結。

改版前成員 HTML 原樣記錄於 `docs/original-members.md`。先前研究資料與六個詳細頁原文備份於 `docs/original-research/`，只供歷史參考，不由展示頁載入；原圖片檔仍保留。年度、學位與關聯僅用於測試，不代表實際紀錄。

## 驗證

先啟動 HTTP Server。環境若已安裝 Playwright 與 Chromium，可執行：

```sh
node tests/directory.cjs
# 若使用系統 Chromium：
CHROMIUM_PATH=/usr/bin/chromium node tests/directory.cjs
```

測試涵蓋 JSON 關聯、桌機 / 平板 / 手機、兩頁雙向錨點、Alumni 展開、共用導覽與頁尾、舊頁載入，以及 JSON / 圖片失敗情境。Playwright 僅為開發驗證工具，不是網站執行相依。
