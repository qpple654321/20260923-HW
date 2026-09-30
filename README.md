# 台灣氣象觀測地圖

本專題使用中央氣象署（CWA）開放資料，製作互動式台灣氣象觀測地圖。

## 主要功能

- 台灣地圖與氣象測站標記
- 點擊縣市查看即時氣象資訊
- 溫度、濕度、風速與降雨資訊
- 縣市氣象資料比較
- SQLite 儲存觀測資料
- SQL 查詢歷史資料
- 日期選擇與歷史溫度折線圖
- Vercel 部署

## 資料流程

```
CWA API
  ↓
JSON
  ↓
JavaScript 資料整理
  ↓
SQLite WeatherObservations
  ↓
SQL GROUP BY / AVG / MIN / MAX
  ↓
日期歷史資料
  ↓
溫度折線圖
```

## 專案網址

https://20260923-hw.vercel.app/

## 技術

- React + Vite
- Leaflet
- CWA Open Data API
- SQLite / SQL
- Vercel Functions

## 注意

Vercel Function 的 SQLite 目前使用執行環境的 `/tmp` 暫存空間，因此資料會在函式執行個體被回收後清除；網站重新部署或冷啟動後，歷史資料需要重新累積。若未來需要長期保存完整歷史資料，再接正式的持久化資料庫即可。

## 作者

陳浩忻
