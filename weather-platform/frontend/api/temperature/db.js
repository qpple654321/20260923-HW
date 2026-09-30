import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { importHistoricalYear } from "./historical.js";

const dbPath = "/tmp/cwa-weather.sqlite";
let db;

function getDb() {
  if (db) return db;
  mkdirSync("/tmp", { recursive: true });
  db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS WeatherObservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      station_id TEXT NOT NULL,
      station_name TEXT,
      county TEXT,
      town TEXT,
      observed_at TEXT NOT NULL,
      temperature REAL,
      humidity REAL,
      wind_speed REAL,
      rain REAL,
      UNIQUE(station_id, observed_at)
    );
    CREATE INDEX IF NOT EXISTS idx_weather_county_time
      ON WeatherObservations(county, observed_at);
    CREATE TABLE IF NOT EXISTS TemperatureForecasts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      regionName TEXT NOT NULL,
      dataDate TEXT NOT NULL,
      min REAL,
      max REAL,
      avg REAL,
      UNIQUE(regionName, dataDate)
    );
  `);
  return db;
}

export function saveObservations(stations) {
  const database = getDb();
  const insert = database.prepare(`
    INSERT OR IGNORE INTO WeatherObservations
      (station_id, station_name, county, town, observed_at, temperature, humidity, wind_speed, rain)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const s of stations) {
    if (!s.station_id || !s.observed_at) continue;
    insert.run(
      s.station_id, s.station_name || "", s.county || "", s.town || "",
      s.observed_at, s.temperature, s.humidity, s.wind_speed, s.rain
    );
  }
  insert.close();

  const grouped = new Map();
  for (const s of stations) {
    if (!s.county || s.temperature == null || !s.observed_at) continue;
    const date = s.observed_at.slice(0, 10);
    const key = s.county + "|" + date;
    const list = grouped.get(key) || [];
    list.push(Number(s.temperature));
    grouped.set(key, list);
  }

  const upsert = database.prepare(`
    INSERT INTO TemperatureForecasts(regionName, dataDate, min, max, avg)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(regionName, dataDate) DO UPDATE SET
      min=excluded.min, max=excluded.max, avg=excluded.avg
  `);
  for (const [key, values] of grouped) {
    const [region, date] = key.split("|");
    upsert.run(
      region,
      date,
      Math.min(...values),
      Math.max(...values),
      values.reduce((a, b) => a + b, 0) / values.length
    );
  }
  upsert.close();
}

export async function queryHistory(county, date) {
  const database = getDb();
  const target = county && county !== "全部" ? county : "全部";
  const safeDate = /^\\d{4}-\\d{2}-\\d{2}$/.test(date || "") ? date : new Date().toISOString().slice(0,10);
  const year = Number(safeDate.slice(0,4));

  const imported = database.prepare(
    "SELECT 1 FROM HistoricalImports WHERE county=? AND data_year=? LIMIT 1"
  ).get(target, year);

  if (!imported) {
    const insert = database.prepare(`
      INSERT OR IGNORE INTO WeatherObservations
        (station_id, station_name, county, town, observed_at, temperature, humidity, wind_speed, rain)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    try {
      const importedRows = await importHistoricalYear(database, target, year, row => {
        insert.run(
          row.station_id, row.station_name, row.county, row.town,
          row.observed_at, row.temperature, row.humidity, row.wind_speed, row.rain
        );
      });
      database.prepare(
        "INSERT OR REPLACE INTO HistoricalImports(county,data_year,imported_at) VALUES(?,?,?)"
      ).run(target, year, new Date().toISOString());
    } finally {
      insert.close();
    }
  }

  const sql = target === "全部"
    ? `
      SELECT substr(observed_at,1,10) AS date,
             ROUND(AVG(temperature),1) AS avgTemp,
             ROUND(MIN(temperature),1) AS minTemp,
             ROUND(MAX(temperature),1) AS maxTemp,
             ROUND(AVG(humidity),0) AS avgHumidity,
             ROUND(AVG(wind_speed),1) AS avgWind
      FROM WeatherObservations
      WHERE substr(observed_at,1,10) BETWEEN date(?, '-3 day') AND date(?, '+3 day')
        AND station_id NOT LIKE 'CWA:%'
      GROUP BY substr(observed_at,1,10)
      ORDER BY date
    `
    : `
      SELECT substr(observed_at,1,10) AS date,
             ROUND(AVG(temperature),1) AS avgTemp,
             ROUND(MIN(temperature),1) AS minTemp,
             ROUND(MAX(temperature),1) AS maxTemp,
             ROUND(AVG(humidity),0) AS avgHumidity,
             ROUND(AVG(wind_speed),1) AS avgWind
      FROM WeatherObservations
      WHERE county=? AND substr(observed_at,1,10) BETWEEN date(?, '-3 day') AND date(?, '+3 day')
      GROUP BY substr(observed_at,1,10)
      ORDER BY date
    `;

  const rows = target === "全部"
    ? database.prepare(sql).all(safeDate, safeDate)
    : database.prepare(sql).all(target, safeDate, safeDate);

  const dates = availableDatesForYear(database, target, year);
  return { rows, dates, sql: sql.trim() };
}

function availableDatesForYear(database, county, year) {
  const target = county && county !== "全部" ? county : "全部";
  const rows = database.prepare(
    "SELECT DISTINCT substr(observed_at,1,10) AS dataDate FROM WeatherObservations WHERE substr(observed_at,1,4)=? AND (county=? OR ?='全部') ORDER BY dataDate DESC"
  ).all(String(year), target, target);
  return rows;
}
