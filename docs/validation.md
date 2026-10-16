# 改版驗證紀錄

2026-10-15，以 Python HTTP Server、Playwright 與系統 Chromium 驗證。

- 1440、1024、768、390、320 px：兩頁無水平溢位；碩士卡片依寬度為 3 / 2 / 1 欄。
- 所有動態產生的跨頁研究、成員、團隊連結：目標存在、可見且不被 sticky header 遮住。
- Alumni 2025 / 2024 範例年度排序、開合、深層連結自動展開；無照片與研究資料的成員不顯示空白欄位。
- 手機選單開合、header 導覽網址、footer 年份正常。
- 首頁、教授、論文、消息、聯絡、位置與六個研究詳細頁共 12 頁載入；子目錄導覽連結使用 ../ 前綴。
- JSON 格式錯誤、非陣列、重複 ID、HTTP 404：顯示錯誤與重試；重試可恢復。
- 三份資料皆為空陣列：各區顯示空資料訊息。
- 缺少研究 ID：顯示待補訊息，其他卡片仍可操作。
- 人物圖片 404 使用本機預設圖；研究圖片 404 移除，避免破圖。
- 沒有未處理的 JavaScript pageerror。
- git diff --check 通過；原共用 CSS、partials 與六個詳細頁沒有內容變更。

自動測試程式：tests/directory.cjs。外部字型與既有 dummyimage / Unsplash 裝飾資源在測試時刻意攔截，不將外部資源可用性列為通過項目。已人工檢視兩頁桌機、手機截圖；核心展示資料與新預設圖均為本機檔案。

## 修改檔案清單

調整：members.html、areas.html、include.js、script.js。

新增：

- data/members.json
- data/groups.json
- data/research.json
- js/data-service.js
- js/directory-render.js
- js/directory.js
- directory.css
- image/member-placeholder.svg
- README.md
- docs/original-members.md
- docs/validation.md
- tests/directory.cjs

未提交、未 Push；資料皆為明確標記的範例，正式名單與研究關聯仍待實驗室提供與確認。
