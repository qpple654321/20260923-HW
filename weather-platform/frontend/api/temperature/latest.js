export default async function handler(req,res) {
  const key = process.env.CWA_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "CWA_API_KEY is not configured" });
  }

  try {
    const url = new URL("https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0001-001");
    const response = await fetch(url, {
      headers: {
        Authorization: key,
        Accept: "application/json"
      }
    });

    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(502).json({
        error: "CWA returned non-JSON data",
        status: response.status,
        contentType: response.headers.get("content-type") || "",
        preview: raw.slice(0, 200)
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "CWA API request failed"
      });
    }

    const stations = (data?.records?.Station || [])
      .map((station) => {
        const coords = station?.GeoInfo?.Coordinates || [];
        const wgs84 = coords.find((c) => c?.CoordinateName === "WGS84") || coords[0];
        const e = station?.WeatherElement || {};
        const num = (value) => {
          const n = Number(value);
          return Number.isFinite(n) && n !== -99 ? n : null;
        };

        return {
          station_id: station?.StationId || "",
          station_name: station?.StationName || station?.StationId || "",
          county: station?.GeoInfo?.CountyName || "",
          town: station?.GeoInfo?.TownName || "",
          latitude: num(wgs84?.StationLatitude),
          longitude: num(wgs84?.StationLongitude),
          temperature: num(e?.AirTemperature),
          humidity: num(e?.RelativeHumidity),
          wind_speed: num(e?.WindSpeed),
          rain: num(e?.Now?.Precipitation ?? e?.Precipitation),
          weather: e?.Weather || "",
          observed_at: station?.ObsTime?.DateTime || null
        };
      })
      .filter((s) =>
        s.latitude !== null &&
        s.longitude !== null &&
        s.temperature !== null
      );

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");
    return res.status(200).json({
      updated_at: data?.records?.Station?.[0]?.ObsTime?.DateTime || new Date().toISOString(),
      stations
    });
  } catch (error) {
    return res.status(500).json({
      error: "Unable to fetch CWA data",
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}
