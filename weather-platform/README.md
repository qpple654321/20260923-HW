# Taiwan Weather Intelligence Dashboard

以中央氣象署（CWA）開放資料為核心的即時氣象觀測與歷史分析平台。

本專案整合 **React、Leaflet、FastAPI、SQLite**，將即時地面測站資料、縣市統計、三日天氣預報與歷史溫度趨勢集中在同一個 Dashboard 中。

## Features

- 臺灣縣市互動式氣象地圖
- 即時溫度、濕度、風速與雨量觀測
- 全台與縣市 KPI 摘要
- 縣市平均溫度快速比較
- 測站數值分布圖
- 未來三天天氣預報
- SQLite 歷史觀測資料
- SQL 時段聚合與歷史溫度趨勢
- 5 分鐘自動刷新
- Responsive Dashboard UI
- API loading / error / empty states

## Architecture

```text
CWA Open Data API
        │
        ▼
FastAPI Backend
        │
        ├── 即時觀測 API
        ├── 三日預報 API
        └── 歷史資料 API
                │
                ▼
        SQLite WeatherObservations
                │
                ▼
React + Leaflet Dashboard
```

## Frontend

- React
- Vite
- React Leaflet
- Leaflet
- TopoJSON
- Responsive CSS Dashboard

主要頁面資訊層級：

1. 全台 / 縣市 KPI 摘要
2. 即時觀測地圖
3. 縣市快速比較
4. 測站數值分布
5. 三日預報
6. SQLite 歷史溫度趨勢
7. 測站觀測明細

## Backend

- FastAPI
- CWA Open Data API
- SQLite
- SQL aggregation

## Data Flow

```text
CWA Observation
    ↓
FastAPI normalize / transform
    ↓
Latest observation endpoint
    ↓
SQLite WeatherObservations
    ↓
SQL GROUP BY date / hour
    ↓
History endpoint
    ↓
React visualization
```

## Local Development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

請依 `backend` 目錄內設定安裝 Python dependencies，並設定 CWA API Key。

### Docker

```bash
docker compose up --build
```

## Dashboard Design

第二版介面採用 dark data-dashboard style，重點不是單純美化，而是讓使用者能按照「摘要 → 空間分布 → 趨勢 → 明細」的順序閱讀氣象資料。

## Notes

若部署於 serverless 環境並將 SQLite 放在暫存檔案系統，歷史資料可能因 instance recycle 而被清除。正式環境建議改用持久化資料庫。

## Author

陳浩忻 · National Chung Hsing University
