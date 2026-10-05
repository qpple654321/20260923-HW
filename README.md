# 20260923-HW · AIoT Weather & Personal Dashboard

> 國立中興大學 AIoT & Data Analytics 課程實作。整合個人入口網站、即時資訊、中央氣象署開放資料、互動式地圖與歷史氣象查詢。

## Live Demo

**https://20260923-hw.vercel.app/**

---

## 專案內容

本 repository 目前包含兩個主要展示模組：

### 1. Personal Digital Workspace

以原生 HTML / CSS / JavaScript 製作的互動式個人入口網站，作為課程作品與其他專案的展示入口。

主要功能：

- 毫秒級即時時鐘與 SVG 秒數進度環
- 12 / 24 小時制切換
- UNIX timestamp 顯示
- Open-Meteo 即時天氣
- 臺中、臺北、新竹、臺南、高雄城市切換
- Projects / About / Connect 側邊面板
- Aurora / Minimal / Sunset 多主題
- Zen 專注模式
- Web Audio API 即時合成滴答聲
- localStorage 儲存使用者偏好
- Responsive Web Design
- Reduced Motion 無障礙支援

### 2. Taiwan Weather Platform

使用中央氣象署（CWA）開放資料建立互動式台灣氣象觀測與歷史資料平台。

主要功能：

- 台灣互動式地圖
- 縣市與氣象測站資料
- 即時溫度、濕度、風速、降雨資訊
- 三日氣象預報
- 縣市氣象資料比較
- SQLite 儲存觀測資料
- SQL 歷史資料查詢
- AVG / MIN / MAX 統計
- 日期篩選
- 歷史溫度折線圖
- Vercel 部署

---

## System Flow

```text
CWA Open Data API
        │
        ▼
      JSON
        │
        ▼
JavaScript Data Processing
        │
        ├──────────────► Interactive Map / Forecast UI
        │
        ▼
SQLite WeatherObservations
        │
        ▼
SQL Query / GROUP BY
        │
        ▼
AVG / MIN / MAX / History
        │
        ▼
Historical Temperature Chart
```

個人入口網站的即時資料流程：

```text
Browser
  │
  ├── Date / Time ─────► Real-time Clock + SVG Ring
  ├── Open-Meteo API ──► Current Weather
  ├── projects.json ───► Dynamic Project Cards
  └── localStorage ─────► Theme / City / User Preferences
```

---

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | HTML5, CSS3, JavaScript ES6+, React, Vite |
| Map | Leaflet |
| Data | CWA Open Data API, Open-Meteo API |
| Storage | SQLite, localStorage |
| Visualization | Interactive Map, Charts |
| Browser API | Fetch API, Web Audio API, SVG |
| Deployment | Vercel |
| Version Control | Git, GitHub |

---

## Repository Structure

```text
20260923-HW/
├── index.html            # 個人入口網站
├── style.css             # 核心樣式與主題
├── polish.css            # UI / UX 精修樣式
├── app.js                # 時鐘、天氣、狀態與互動邏輯
├── projects.json         # 作品集資料
├── weather-platform/     # 台灣氣象平台
├── vercel.json
└── README.md
```

---

## Design Highlights

這份作業除了完成資料呈現，也刻意加入一些前端工程細節：

- CSS custom properties 管理多主題色彩系統
- Glassmorphism 與 responsive layout
- requestAnimationFrame 驅動即時時鐘
- SVG stroke-dashoffset 動態呈現一分鐘進度
- 非同步 Fetch API 與錯誤 fallback
- localStorage state hydration
- Web Audio API 無音檔產生音效
- Keyboard shortcuts（Z / ESC）
- `prefers-reduced-motion` accessibility support

---

## Local Development

個人入口網站沒有額外相依套件，可以直接使用 Live Server 或任何靜態 HTTP server 啟動。

```bash
python -m http.server 8000
```

接著開啟：

```text
http://localhost:8000
```

氣象平台請依 `weather-platform` 目錄內的 package 設定安裝並啟動。

---

## SQLite / Vercel Note

目前 Vercel Function 的 SQLite 使用執行環境 `/tmp` 暫存空間，因此資料會在 serverless function instance 被回收後清除。

目前架構適合作業展示與短期資料累積；若後續要做長期歷史分析，可再改用正式 persistence database，例如 PostgreSQL、Supabase 或其他託管式資料庫。

---

## Author

**陳浩忻**  
National Chung Hsing University  
AIoT & Data Analytics
