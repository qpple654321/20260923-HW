import React,{useEffect,useMemo,useState}from"react";
import{createRoot}from"react-dom/client";
import{MapContainer,TileLayer,CircleMarker,Popup,GeoJSON,useMap}from"react-leaflet";
import{feature}from"topojson-client";
import"leaflet/dist/leaflet.css";
import"./style.css";

const API="";
const BOUNDARY="https://taiwan.md/assets/geo/taiwan-country.topo.json";
const tempColor=t=>t<15?"#60a5fa":t<20?"#34d399":t<25?"#a3e635":t<30?"#fbbf24":t<35?"#fb7185":"#c084fc";
const level=t=>t<20?"清涼":t<25?"舒適":t<30?"偏暖":t<35?"高溫":"炎熱";
const num=v=>Number.isFinite(Number(v))?Number(v):null;
const fmt=(v,d=1)=>num(v)==null?"--":num(v).toFixed(d);

function localDateISO(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function CountyLayer({geo,stations,selected,onSelect}){
  const map=useMap();
  if(!geo)return null;
  const style=f=>{
    const n=f.properties?.name||"";
    const values=stations.filter(x=>x.county===n).map(x=>num(x.temperature)).filter(v=>v!=null);
    const avg=values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
    return{color:n===selected?"#67e8f9":"#50708d",weight:n===selected?2.8:1.15,fillColor:avg==null?"#112b43":tempColor(avg),fillOpacity:n===selected?.45:.18};
  };
  return <GeoJSON data={geo} style={style} onEachFeature={(f,l)=>{
    const n=f.properties?.name||"";
    const rows=stations.filter(x=>x.county===n);
    const temps=rows.map(x=>num(x.temperature)).filter(v=>v!=null);
    const avg=temps.length?temps.reduce((a,b)=>a+b,0)/temps.length:null;
    l.bindTooltip(`<div class="map-tooltip"><b>${n}</b><span>${rows.length} 個測站</span><strong>${avg==null?"--":avg.toFixed(1)}°C</strong><small>點擊查看詳細資料</small></div>`,{sticky:true,direction:"top",opacity:.98});
    l.on({mouseover:()=>l.setStyle({weight:2,fillOpacity:.32}),mouseout:()=>l.setStyle(style(f)),click:()=>{onSelect(n);try{map.fitBounds(l.getBounds(),{padding:[38,38]})}catch{}}});
  }}/>;
}

function LineChart({points}){
  if(!points.length)return <div className="empty-state"><div className="empty-icon">⌁</div><b>尚無歷史資料</b><span>目前日期還沒有足夠的 SQLite 觀測紀錄，資料會隨 API 更新逐步累積。</span></div>;
  const w=720,h=245,p=38;
  const values=points.map(x=>num(x.avgTemp)).filter(v=>v!=null);
  const min=Math.min(...values)-1,max=Math.max(...values)+1,range=Math.max(1,max-min);
  const x=i=>p+(points.length===1?(w-2*p)/2:i*(w-2*p)/(points.length-1));
  const y=v=>h-p-(v-min)*(h-2*p)/range;
  const path=points.map((q,i)=>(i?"L":"M")+x(i).toFixed(1)+" "+y(num(q.avgTemp)).toFixed(1)).join(" ");
  return <svg className="line-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="歷史平均溫度折線圖">
    {[0,.25,.5,.75,1].map((r,i)=><line key={i} x1={p} y1={p+r*(h-2*p)} x2={w-p} y2={p+r*(h-2*p)} className="chart-grid"/>)}
    <path d={path} className="chart-path"/>
    {points.map((q,i)=><g key={q.hour||i}><circle cx={x(i)} cy={y(num(q.avgTemp))} r="4.5" className="chart-dot"/><text x={x(i)} y={y(num(q.avgTemp))-11} textAnchor="middle" className="chart-value">{q.avgTemp}°</text><text x={x(i)} y={h-12} textAnchor="middle" className="chart-time">{String(q.hour||"").slice(11,13)}時</text></g>)}
  </svg>;
}

function MetricCard({label,value,unit,meta,accent}){
  return <div className="kpi-card"><div className="kpi-top"><span>{label}</span><i style={{background:accent}}/></div><strong>{value}<small>{unit}</small></strong><p>{meta}</p></div>;
}

function App(){
  const[stations,setStations]=useState([]);
  const[selected,setSelected]=useState(null);
  const[county,setCounty]=useState("全部");
  const[mode,setMode]=useState("temperature");
  const[geo,setGeo]=useState(null);
  const[loading,setLoading]=useState(true);
  const[lastUpdated,setLastUpdated]=useState(new Date());
  const[history,setHistory]=useState([]);
  const[historyDate,setHistoryDate]=useState(localDateISO());
  const[forecast,setForecast]=useState([]);
  const[forecastLoading,setForecastLoading]=useState(false);
  const[error,setError]=useState("");

  const load=()=>{
    setLoading(true);setError("");
    fetch(API+"/api/temperature/latest").then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()}).then(x=>{setStations(x.stations||[]);setLastUpdated(new Date())}).catch(()=>setError("即時觀測資料暫時無法更新，請稍後再試。" )).finally(()=>setLoading(false));
  };
  const loadForecast=(c=county)=>{
    setForecastLoading(true);
    fetch(API+"/api/temperature/forecast?"+new URLSearchParams({county:c||"全部"})).then(r=>r.json()).then(x=>setForecast(x.forecasts?.[0]?.days||[])).catch(()=>setForecast([])).finally(()=>setForecastLoading(false));
  };
  const loadHistory=(c=county,d=historyDate)=>{
    const q=new URLSearchParams({county:c||"全部"});if(d)q.set("date",d);
    fetch(API+"/api/temperature/history?"+q).then(r=>r.json()).then(x=>setHistory(x.points||[])).catch(()=>setHistory([]));
  };

  useEffect(()=>{
    load();
    fetch(BOUNDARY).then(r=>r.json()).then(t=>setGeo(feature(t,t.objects.map))).catch(()=>{});
    const id=setInterval(load,300000);return()=>clearInterval(id);
  },[]);
  useEffect(()=>{loadHistory(county,historyDate);loadForecast(county)},[county,historyDate]);

  const counties=useMemo(()=>["全部",...new Set(stations.map(x=>x.county).filter(Boolean))],[stations]);
  const area=selected||(county!=="全部"?county:null);
  const shown=area?stations.filter(x=>x.county===area):[];
  const areaStations=area?stations.filter(x=>x.county===area):stations;
  const temps=areaStations.map(x=>num(x.temperature)).filter(v=>v!=null);
  const humidities=areaStations.map(x=>num(x.humidity)).filter(v=>v!=null);
  const winds=areaStations.map(x=>num(x.wind_speed)).filter(v=>v!=null);
  const rains=areaStations.map(x=>num(x.rain)).filter(v=>v!=null);
  const avg=temps.length?temps.reduce((a,b)=>a+b,0)/temps.length:0;
  const max=temps.length?Math.max(...temps):0;
  const min=temps.length?Math.min(...temps):0;
  const humidity=humidities.length?humidities.reduce((a,b)=>a+b,0)/humidities.length:0;
  const wind=winds.length?winds.reduce((a,b)=>a+b,0)/winds.length:0;
  const rain=rains.length?rains.reduce((a,b)=>a+b,0)/rains.length:0;
  const choose=c=>{setCounty(c);setSelected(c==="全部"?null:c);setHistoryDate(localDateISO())};
  const displayedStations=areaStations.slice(0,12);

  return <div className="app">
    <header className="top">
      <div className="brand"><div className="brand-mark">WX</div><div><b>Taiwan Weather Intelligence</b><span>CWA OPEN DATA / REAL-TIME OBSERVATION</span></div></div>
      <nav className="topnav" aria-label="主要導覽"><span className="active">Overview</span><span>Observations</span><span>History</span></nav>
      <div className="topinfo"><span className="live-dot"/>資料更新 {lastUpdated.toLocaleTimeString("zh-TW",{hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit"})}<button onClick={load} disabled={loading}>{loading?"更新中…":"↻ 立即更新"}</button></div>
    </header>

    <main className="layout"><section className="content">
      <div className="title">
        <div><div className="breadcrumb">WEATHER / OBSERVATION DASHBOARD</div><h1>臺灣地面氣象觀測</h1><p>整合中央氣象署即時觀測、三日預報與 SQLite 歷史資料，快速掌握各縣市氣象變化。</p></div>
        <div className="data-source"><span>DATA SOURCE</span><b>CWA Open Data</b><small>Auto refresh · 5 min</small></div>
      </div>

      {error&&<div className="alert"><b>資料更新異常</b><span>{error}</span><button onClick={load}>重新載入</button></div>}

      <div className="kpi-grid">
        <MetricCard label="平均溫度" value={fmt(avg)} unit="°C" meta={`${area||"全台"} · ${level(avg)}`} accent={tempColor(avg)}/>
        <MetricCard label="平均濕度" value={fmt(humidity,0)} unit="%" meta={`${humidities.length} 個有效測站`} accent="#38bdf8"/>
        <MetricCard label="平均風速" value={fmt(wind)} unit="m/s" meta={`${winds.length} 個有效測站`} accent="#a78bfa"/>
        <MetricCard label="觀測測站" value={areaStations.length} unit="站" meta={area||"全台即時觀測"} accent="#34d399"/>
      </div>

      <div className="grid">
        <div className="map-panel">
          <div className="section-head"><div><span>LIVE MAP</span><h2>{area||"全台"}即時觀測地圖</h2></div><select value={county} onChange={e=>choose(e.target.value)}>{counties.map(x=><option key={x}>{x}</option>)}</select></div>
          <div className="mapcard">
            <MapContainer center={[23.7,120.95]} zoom={7} scrollWheelZoom><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><CountyLayer geo={geo} stations={stations} selected={area} onSelect={choose}/>{shown.map(x=><CircleMarker key={x.station_id} center={[x.latitude,x.longitude]} radius={5} pathOptions={{color:"#071526",weight:1.5,fillColor:tempColor(num(x.temperature)||0),fillOpacity:.98}}><Popup><div className="popup"><b>{x.station_name||x.station_id}</b><span>{x.county||""} {x.town||""}</span><strong>{fmt(x.temperature)}°C</strong><small>濕度 {fmt(x.humidity,0)}% · 風速 {fmt(x.wind_speed)} m/s</small></div></Popup></CircleMarker>)}</MapContainer>
            <div className="map-badge"><span className="live-dot"/>LIVE OBSERVATION</div>
            <div className="legend"><span><i style={{background:"#34d399"}}/>20°C 以下</span><span><i style={{background:"#a3e635"}}/>20–25°C</span><span><i style={{background:"#fbbf24"}}/>25–30°C</span><span><i style={{background:"#fb7185"}}/>30°C 以上</span></div>
          </div>
        </div>

        <aside className="side">
          <div className="card weather-summary">
            <div className="summary-top"><div><span className="eyebrow">CURRENT SNAPSHOT</span><h2>{area||"全台"}</h2><p>{areaStations.length} 個測站即時摘要</p></div><div className="hero-temp"><strong>{fmt(avg)}</strong><span>°C</span><em>{level(avg)}</em></div></div>
            <div className="summary-metrics"><div><span>最低</span><b>{fmt(min)}°</b></div><div><span>最高</span><b>{fmt(max)}°</b></div><div><span>平均濕度</span><b>{fmt(humidity,0)}%</b></div><div><span>平均風速</span><b>{fmt(wind)} m/s</b></div><div><span>平均雨量</span><b>{fmt(rain)} mm</b></div><div><span>更新頻率</span><b>5 min</b></div></div>
          </div>

          <div className="card"><div className="cardtitle"><div><span className="eyebrow">COUNTY OVERVIEW</span><b>縣市快速瀏覽</b></div><small>點擊切換</small></div><div className="countygrid">{counties.filter(x=>x!=="全部").map(c=>{const rows=stations.filter(x=>x.county===c),values=rows.map(x=>num(x.temperature)).filter(v=>v!=null),av=values.length?values.reduce((a,b)=>a+b,0)/values.length:null;return <button className={area===c?"countybtn selected":"countybtn"} key={c} onClick={()=>choose(c)}><span>{c}</span><b>{av==null?"--":av.toFixed(1)}°</b><small>{rows.length} stations</small></button>})}</div></div>
        </aside>
      </div>

      <section className="dashboard-grid">
        <div className="card chart-card"><div className="cardtitle"><div><span className="eyebrow">STATION DISTRIBUTION</span><b>測站即時數值</b></div><small>{area||"全台"} · 前 {displayedStations.length} 站</small></div><div className="metric-tabs">{[["temperature","溫度"],["wind","風速"],["rain","雨量"]].map(([key,label])=><button key={key} className={mode===key?"on":""} onClick={()=>setMode(key)}>{label}</button>)}</div><div className="bar-list">{displayedStations.map(x=>{const value=mode==="temperature"?num(x.temperature):mode==="wind"?num(x.wind_speed):num(x.rain);const width=mode==="temperature"?Math.min(100,Math.max(0,((value||0)+5)/45*100)):mode==="wind"?Math.min(100,(value||0)/15*100):Math.min(100,(value||0)/50*100);return <div className="bar-row" key={x.station_id}><span>{x.station_name||x.station_id}<small>{x.town||x.county}</small></span><div className="bar-track"><i style={{width:`${width}%`,background:mode==="temperature"?tempColor(value||0):mode==="wind"?"#a78bfa":"#38bdf8"}}/></div><b>{value==null?"--":mode==="temperature"?`${value.toFixed(1)}°`:mode==="wind"?`${value.toFixed(1)} m/s`:`${value.toFixed(1)} mm`}</b></div>})}</div></div>

        <div className="card forecast-card"><div className="cardtitle"><div><span className="eyebrow">FORECAST</span><b>未來三天天氣</b></div><small>{area||"全台"}</small></div>{forecastLoading?<div className="skeleton-grid">{[1,2,3].map(x=><i key={x}/>)}</div>:<div className="forecast-grid">{forecast.length?forecast.map((d,i)=><div className="forecast-day" key={d.date||i}><div><b>{i===0?"今天":i===1?"明天":"後天"}</b><small>{d.date}</small></div><span>☁</span><strong>{d.max_temp||"--"}° <em>/ {d.min_temp||"--"}°</em></strong><p>{d.weather||"預報資料"}</p><small>降雨機率 {d.rain_probability||"--"}%</small></div>):<div className="empty-state compact"><b>暫無預報資料</b><span>請稍後重新整理。</span></div>}</div>}</div>
      </section>

      <section className="card history-card"><div className="cardtitle"><div><span className="eyebrow">SQLITE HISTORY</span><b>歷史溫度趨勢</b></div><div className="history-controls"><span>{area||"全台"}</span><input type="date" min="2020-01-01" max={localDateISO()} value={historyDate} onChange={e=>setHistoryDate(e.target.value)}/></div></div><LineChart points={history}/><div className="history-foot"><span>Pipeline</span><b>CWA Observation → SQLite WeatherObservations → SQL GROUP BY hour → Trend</b></div></section>

      <section className="card station-card"><div className="cardtitle"><div><span className="eyebrow">OBSERVATION TABLE</span><b>測站明細</b></div><small>{areaStations.length} records</small></div><div className="tablehead"><span>測站</span><span>溫度</span><span>濕度</span><span>風速</span><span>雨量</span><span>狀態</span></div><div className="rows">{areaStations.map(x=><button className="row" key={x.station_id} onClick={()=>choose(x.county)}><span><i style={{background:tempColor(num(x.temperature)||0)}}/><b>{x.station_name||x.station_id}</b><small>{x.county||""} {x.town||""}</small></span><span>{fmt(x.temperature)}°C</span><span>{fmt(x.humidity,0)}%</span><span>{fmt(x.wind_speed)} m/s</span><span>{fmt(x.rain)} mm</span><em>{level(num(x.temperature)||0)}</em></button>)}</div></section>
    </section></main>

    <footer><span>AIoT & Data Analytics · NCHU</span><span>CWA Open Data · SQLite · React · Leaflet</span></footer>
  </div>;
}

createRoot(document.getElementById("root")).render(<App/>);