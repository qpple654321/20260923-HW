import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";

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

export function queryHistory(county, date) {
  const database = getDb();
  const target = county && county !== "全部" ? county : null;
  const sql = target
    ? `
      SELECT substr(observed_at,1,13) AS hour,
             ROUND(AVG(temperature),1) AS avgTemp,
             ROUND(MIN(temperature),1) AS minTemp,
             ROUND(MAX(temperature),1) AS maxTemp
      FROM WeatherObservations
      WHERE county = ? AND substr(observed_at,1,10) = ?
      GROUP BY substr(observed_at,1,13)
      ORDER BY hour
    `
    : `
      SELECT substr(observed_at,1,13) AS hour,
             ROUND(AVG(temperature),1) AS avgTemp,
             ROUND(MIN(temperature),1) AS minTemp,
             ROUND(MAX(temperature),1) AS maxTemp
      FROM WeatherObservations
      WHERE substr(observed_at,1,10) = ?
      GROUP BY substr(observed_at,1,13)
      ORDER BY hour
    `;
  const rows = target
    ? database.prepare(sql).all(target, date)
    : database.prepare(sql).all(date);

  const datesSql = target
    ? "SELECT DISTINCT substr(observed_at,1,10) AS dataDate FROM WeatherObservations WHERE county=? ORDER BY dataDate DESC LIMIT 30"
    : "SELECT DISTINCT substr(observed_at,1,10) AS dataDate FROM WeatherObservations ORDER BY dataDate DESC LIMIT 3650";
  const dates = target
    ? database.prepare(datesSql).all(target)
    : database.prepare(datesSql).all();

  return { rows, dates, sql: sql.trim() };
}
