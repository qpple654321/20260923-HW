-- SQLite schema used by the Vercel Function
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

-- Example SQL query used by the history API:
-- SELECT substr(observed_at,1,13) AS hour,
--        ROUND(AVG(temperature),1) AS avgTemp,
--        ROUND(MIN(temperature),1) AS minTemp,
--        ROUND(MAX(temperature),1) AS maxTemp
-- FROM WeatherObservations
-- WHERE county = ? AND substr(observed_at,1,10) = ?
-- GROUP BY substr(observed_at,1,13)
-- ORDER BY hour;
