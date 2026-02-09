# 包包滴消消乐（可玩含音效 ZIP）

## 結構（全部同一層）
- index.html / style.css / config.js / game.js
- 1.png~5.png / win.png
- swap.mp3（滑動）/ pop.mp3（消除，可選）/ win.mp3（通關）

## 換圖
直接用你自己的圖覆蓋 1.png~5.png、win.png（檔名不變）。

## 換音效
用你的 mp3 覆蓋 swap.mp3 / pop.mp3 / win.mp3（檔名不變）。
若不想要「消除」音效：把 pop.mp3 留空或刪掉也可以（程式會自動忽略播放錯誤）。

## 上線
- GitHub Pages：把所有檔案放到 repo 根目錄（要直接看到 index.html）
- 阿里雲 OSS 靜態網站：把檔案上傳到根目錄，並把 index document 設為 index.html
