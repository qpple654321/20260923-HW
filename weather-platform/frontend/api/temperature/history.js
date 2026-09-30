import { queryHistory } from "./db.js";

export default function handler(req, res) {
  try {
    const url = new URL(req.url, "http://localhost");
    const county = url.searchParams.get("county") || "全部";
    const date = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const result = await queryHistory(county, date);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      county,
      date,
      points: result.rows,
      available_dates: result.dates.map(x => x.dataDate),
      sql: result.sql
    });
  } catch (error) {
    return res.status(500).json({
      error: "Unable to query SQLite history",
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}
