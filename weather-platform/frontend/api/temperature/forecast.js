export default async function handler(req, res) {
  const key = process.env.CWA_API_KEY;
  if (!key) return res.status(500).json({ error: "CWA_API_KEY is not configured" });

  try {
    const requestUrl = new URL(req.url, "http://localhost");
    const county = requestUrl.searchParams.get("county");
    const url = new URL("https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-005");
    url.searchParams.set("Authorization", key);
    url.searchParams.set("format", "JSON");
    if (county && county !== "全部") url.searchParams.set("locationName", county);

    const response = await fetch(url, { headers: { Accept: "application/json" } });
    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); }
    catch { return res.status(502).json({ error: "CWA returned non-JSON data" }); }

    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || "CWA forecast request failed" });
    }

    const locations = data?.records?.location || [];
    const forecasts = locations.map(location => {
      const elements = Object.fromEntries((location.weatherElement || []).map(e => [e.elementName, e]));
      const values = name => (elements[name]?.time || []).slice(0, 3).map(t => ({
        start: t.startTime,
        value: t.parameter?.[0]?.parameterName ?? t.parameter?.[0]?.parameterValue ?? ""
      }));
      const wx = values("Wx");
      const maxT = values("MaxT");
      const minT = values("MinT");
      const pop = values("PoP");
      return {
        county: location.locationName || "",
        days: [0,1,2].map(i => ({
          date: (wx[i]?.start || maxT[i]?.start || "").slice(0,10),
          weather: wx[i]?.value || "",
          max_temp: maxT[i]?.value || "",
          min_temp: minT[i]?.value || "",
          rain_probability: pop[i]?.value || ""
        }))
      };
    });

    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=300");
    return res.status(200).json({ county: county || "全部", forecasts });
  } catch (error) {
    return res.status(500).json({ error: "Unable to fetch CWA forecast", detail: error instanceof Error ? error.message : String(error) });
  }
}