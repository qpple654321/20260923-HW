const ARCHIVE_BASE = "https://raw.githubusercontent.com/Raingel/historical_weather/main/data";

const STATIONS = {
  "新北市": { ids: ["466881","466880"] },
  "臺北市": { ids: ["466920"] },
  "基隆市": { ids: ["466940"] },
  "桃園市": { ids: ["467050"] },
  "新竹縣": { ids: ["467571"] },
  "新竹市": { ids: ["C0D660"] },
  "苗栗縣": { ids: ["C0E550"] },
  "臺中市": { ids: ["467490"] },
  "彰化縣": { ids: ["467270"] },
  "南投縣": { ids: ["467650"] },
  "雲林縣": { ids: ["C0K330"] },
  "嘉義市": { ids: ["467480"] },
  "嘉義縣": { ids: ["467530"] },
  "臺南市": { ids: ["467410"] },
  "高雄市": { ids: ["467441","467440"] },
  "屏東縣": { ids: ["467590"] },
  "宜蘭縣": { ids: ["467080"] },
  "花蓮縣": { ids: ["466990"] },
  "臺東縣": { ids: ["467660"] },
  "澎湖縣": { ids: ["467350"] },
  "金門縣": { ids: ["467110"] },
  "連江縣": { ids: ["467990"] }
};

const ALL_COUNTIES = Object.keys(STATIONS);

function num(v) {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : null;
}

function parseDailyCsv(csv, stationId, county) {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(",");
  const index = Object.fromEntries(header.map((x, i) => [x.trim(), i]));
  const dateIndex = 0;
  const tempIndex = index.Tx;
  const humidityIndex = index.RH;
  const windIndex = index.WS;
  const rainIndex = index.Precp;
  if (tempIndex == null) return [];

  const out = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(",");
    const date = (cells[dateIndex] || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const temperature = num(cells[tempIndex]);
    if (temperature == null) continue;
    out.push({
      station_id: stationId,
      station_name: stationId,
      county,
      town: "",
      observed_at: date + "T12:00:00+08:00",
      temperature,
      humidity: num(cells[humidityIndex]),
      wind_speed: num(cells[windIndex]),
      rain: num(cells[rainIndex])
    });
  }
  return out;
}

async function fetchStationYear(stationId, year) {
  const url = `${ARCHIVE_BASE}/${stationId}/${stationId}_${year}_daily.csv`;
  const response = await fetch(url, { headers: { Accept: "text/plain" } });
  if (!response.ok) throw new Error(`archive ${stationId}/${year}: HTTP ${response.status}`);
  return response.text();
}

export function countyNames() {
  return ALL_COUNTIES;
}

export async function importHistoricalYear(database, county, year, insertObservation) {
  const targets = county === "全部"
    ? ALL_COUNTIES.map(c => [c, STATIONS[c].ids])
    : [[county, STATIONS[county]?.ids || []]];

  const imported = [];
  await Promise.all(targets.map(async ([name, ids]) => {
    let lastError = null;
    for (const stationId of ids) {
      try {
        const csv = await fetchStationYear(stationId, year);
        const rows = parseDailyCsv(csv, stationId, name);
        if (rows.length) {
          for (const row of rows) insertObservation(row);
          imported.push({ county: name, stationId, rows: rows.length });
        }
        return;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError) console.warn("Historical import skipped:", name, lastError.message);
  }));

  return imported;
}

export function availableHistoricalDates() {
  const start = new Date("2020-01-01T00:00:00+08:00");
  const end = new Date();
  const dates = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates.reverse();
}
