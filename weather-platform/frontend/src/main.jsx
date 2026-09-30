import React,{useEffect,useMemo,useState}from"react";
import{createRoot}from"react-dom/client";
import{MapContainer,TileLayer,CircleMarker,Popup,GeoJSON,useMap}from"react-leaflet";
import{feature}from"topojson-client";
import"leaflet/dist/leaflet.css";
import"./style.css";

const API="",BOUNDARY="https://taiwan.md/assets/geo/taiwan-country.topo.json";
const tempColor=t=>t<15?"#3b82f6":t<20?"#22c55e":t<25?"#eab308":t<30?"#f97316":t<35?"#ef4444":"#7c3aed";
const level=t=>t<20?"良好":t<25?"舒適":t<30?"偏熱":t<35?"高溫":"極高";

function CountyLayer({geo,stations,selected,onSelect}){
  const map=useMap();
  if(!geo)return null;
  const style=f=>{
    const n=f.properties?.name||"",v=stations.filter(x=>x.county===n).map(x=>x.temperature);
    const a=v.length?v.reduce((p,q)=>p+q,0)/v.length:null;
    return{color:n===selected?"#67e8f9":"#6b88a8",weight:n===selected?3:1.2,fillColor:a==null?"#17304d":tempColor(a),fillOpacity:n===selected?.42:.17};
  };
  return <GeoJSON data={geo} style={style} onEachFeature={(f,l)=>{
    const n=f.properties?.name||"",rows=stations.filter(x=>x.county===n);
    const temps=rows.map(x=>Number(x.temperature)).filter(Number.isFinite);
    const av=temps.length?temps.reduce((a,b)=>a+b,0)/temps.length:null;
    const mi=temps.length?Math.min(...temps):null,ma=temps.length?Math.max(...temps):null;
    l.bindTooltip("<div style='min-width:150px'><strong style='font-size:16px'>"+n+"</strong><br/>測站："+rows.length+" 個<br/>🌡 平均："+(av==null?"--":av.toFixed(1)+" °C")+"<br/>↕ "+(mi==null?"--":mi.toFixed(1)+"°")+" / "+(ma==null?"--":ma.toFixed(1)+"°")+"<br/><small>點擊查看完整資訊</small></div>",{sticky:true,direction:"top",opacity:.96});
    l.on({mouseover:()=>l.setStyle({weight:1.2,fillOpacity:.28}),mouseout:()=>l.setStyle(style(f)),click:()=>{onSelect(n);try{map.fitBounds(l.getBounds(),{padding:[35,35]})}catch{}}});
  }}/>;
}

function LineChart({points}){
  if(!points.length)return <div className="history-empty">目前這個日期還沒有累積到足夠的 SQLite 歷史資料。<br/>網站每次更新時會把 CWA 觀測時間寫入資料庫。</div>;
  const w=620,h=220,p=34,vals=points.map(x=>Number(x.avgTemp)).filter(Number.isFinite);
  const min=Math.min(...vals)-1,max=Math.max(...vals)+1,range=Math.max(1,max-min);
  const x=i=>p+(points.length===1?(w-2*p)/2:i*(w-2*p)/(points.length-1));
  const y=v=>h-p-(v-min)*(h-2*p)/range;
  const path=points.map((q,i)=>(i?"L":"M")+x(i).toFixed(1)+" "+y(Number(q.avgTemp)).toFixed(1)).join(" ");
  return <svg className="line-chart" viewBox={"0 0 "+w+" "+h} role="img" aria-label="歷史溫度折線圖">
    <line x1={p} y1={h-p} x2={w-p} y2={h-p} stroke="#2a4560"/>
    <line x1={p} y1={p} x2={p} y2={h-p} stroke="#2a4560"/>
    <path d={path} fill="none" stroke="#39bdf8" strokeWidth="3"/>
    {points.map((q,i)=><g key={q.hour}><circle cx={x(i)} cy={y(Number(q.avgTemp))} r="4" fill="#39bdf8"/><text x={x(i)} y={y(Number(q.avgTemp))-9} textAnchor="middle" className="chart-value">{q.avgTemp}°</text><text x={x(i)} y={h-10} textAnchor="middle" className="chart-time">{q.hour.slice(11,13)}時</text></g>)}
  </svg>;
}

function App(){
  const[s,setS]=useState([]),[selected,setSelected]=useState(null),[county,setCounty]=useState("全部");
  const[mode,setMode]=useState("temperature"),[geo,setGeo]=useState(null),[loading,setLoading]=useState(true),[time,setTime]=useState(new Date());
  const[history,setHistory]=useState([]),[historyDate,setHistoryDate]=useState(new Date().toISOString().slice(0,10));
  const[forecast,setForecast]=useState([]),[forecastLoading,setForecastLoading]=useState(false);

  const load=()=>{
    setLoading(true);
    fetch(API+"/api/temperature/latest").then(r=>r.json()).then(x=>{setS(x.stations||[]);setTime(new Date())}).catch(()=>{}).finally(()=>setLoading(false));
  };
  const loadForecast=(c=county)=>{
    setForecastLoading(true);
    fetch(API+"/api/temperature/forecast?"+new URLSearchParams({county:c||"全部"}))
      .then(r=>r.json()).then(x=>{
        const first=x.forecasts?.[0];
        setForecast(first?.days||[]);
      }).catch(()=>setForecast([])).finally(()=>setForecastLoading(false));
  };
  const loadHistory=(c=county,d=historyDate)=>{
    const q=new URLSearchParams({county:c||"全部"});
    if(d)q.set("date",d);
    fetch(API+"/api/temperature/history?"+q).then(r=>r.json()).then(x=>{
      setHistory(x.points||[]);
    }).catch(()=>{setHistory([])});
  };

  useEffect(()=>{
    load();
    fetch(BOUNDARY).then(r=>r.json()).then(t=>setGeo(feature(t,t.objects.map))).catch(()=>{});
    const id=setInterval(load,300000);return()=>clearInterval(id);
  },[]);
  useEffect(()=>{loadHistory(county,historyDate);loadForecast(county)},[county,historyDate]);

  const counties=useMemo(()=>["全部",...new Set(s.map(x=>x.county).filter(Boolean))],[s]);
  const area=selected||county!=="全部"?selected:null;
  const shown=s.filter(x=>county==="全部"||x.county===county);
  const areaStations=area?s.filter(x=>x.county===area):s;
  const avg=areaStations.length?areaStations.reduce((a,x)=>a+x.temperature,0)/areaStations.length:0;
  const max=areaStations.length?Math.max(...areaStations.map(x=>x.temperature)):0;
  const min=areaStations.length?Math.min(...areaStations.map(x=>x.temperature)):0;
  const hs=areaStations.filter(x=>x.humidity!=null),ws=areaStations.filter(x=>x.wind_speed!=null);
  const humidity=hs.length?hs.reduce((a,x)=>a+x.humidity,0)/hs.length:0;
  const wind=ws.length?ws.reduce((a,x)=>a+x.wind_speed,0)/ws.length:0;
  const choose=c=>{setCounty(c);setSelected(c==="全部"?null:c);setHistoryDate("")};

  return <div className="app">
    <header className="top">
  <div className="brand">
    <div className="brand-mark">☁</div>
    <div><b>臺灣氣象觀測</b><span>TAIWAN WEATHER OBSERVATION</span></div>
  </div>
  <nav className="topnav" aria-label="主要導覽">
    <span className="active">地圖</span><span>觀測</span><span>歷史資料</span>
  </nav>
  <div className="topinfo">{time.toLocaleString("zh-TW",{hour12:false})}　|　自動更新 5 分鐘　<button onClick={load}>{loading?"更新中…":"↻ 更新"}</button></div>
</header>
    <div className="layout"><section className="content">
      <div className="title"><div><div className="breadcrumb">地圖　›　地面觀測</div><h1>臺灣地面氣象觀測</h1><p>選擇縣市或測站，即時查看溫度、相對濕度、風速與降雨資料</p></div></div>
      <div className="grid">
        <div className="mapcard"><MapContainer center={[23.7,120.95]}zoom={7}scrollWheelZoom><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><CountyLayer geo={geo} stations={s} selected={area} onSelect={choose}/>{shown.map(x=><CircleMarker key={x.station_id} center={[x.latitude,x.longitude]} radius={4} pathOptions={{color:tempColor(x.temperature),fillColor:tempColor(x.temperature),fillOpacity:.95}} eventHandlers={{click:()=>choose(x.county)}}><Popup><strong>{x.station_name||x.station_id}</strong><br/>🌡 {x.temperature.toFixed(1)} °C<br/>{x.county||"未知地區"} {x.town||""}<br/>💧 {x.humidity??"--"}%　💨 {x.wind_speed??"--"} m/s</Popup></CircleMarker>)}</MapContainer><div className="legend"><span><i style={{background:"#22c55e"}}/>低溫</span><span><i style={{background:"#eab308"}}/>舒適</span><span><i style={{background:"#f97316"}}/>偏熱</span><span><i style={{background:"#ef4444"}}/>高溫</span></div></div>
        <div className="side">
          <div className="weather card"><div className="weatherhead"><div><div className="cloud">☁️</div><h2>{area||"全台"}</h2><small>{area?"縣市即時氣象":"全台測站即時觀測"}　{areaStations.length} 個測站</small></div><div className="bigtemp">{avg.toFixed(1)}°C<div>{level(avg)}</div></div></div><div className="stats"><div>🌡<b>{min.toFixed(1)}° / {max.toFixed(1)}°</b><small>最低 / 最高</small></div><div>💧<b>{humidity.toFixed(0)}%</b><small>平均濕度</small></div><div>💨<b>{wind.toFixed(1)} m/s</b><small>平均風速</small></div></div></div>
          <div className="card chart-card"><div className="cardtitle">氣象資料圖表 <small className="chart-subtitle">{area||"全台"}　{areaStations.length} 個測站</small></div><div className="metric-charts">
            <div className="metric-chart"><div className="metric-label">🌡 溫度 <b>{avg.toFixed(1)}°C</b></div><div className="bar-list">{areaStations.map(x=><div className="bar-row" key={x.station_id}><span>{x.station_name||x.station_id}</span><div className="bar-track"><i style={{width:(Math.min(100,Math.max(0,(x.temperature+10)/50*100)))+"%",background:tempColor(x.temperature)}}/></div><b>{x.temperature.toFixed(1)}°</b></div>)}</div></div>
            <div className="metric-chart"><div className="metric-label">💧 水氣 / 濕度 <b>{humidity.toFixed(0)}%</b></div><div className="bar-list">{areaStations.map(x=><div className="bar-row" key={x.station_id}><span>{x.station_name||x.station_id}</span><div className="bar-track"><i style={{width:((Number(x.humidity)||0))+"%"}}/></div><b>{x.humidity==null?"--":Number(x.humidity).toFixed(0)+"%"}</b></div>)}</div></div>
            <div className="metric-chart"><div className="metric-label">💨 風速 <b>{wind.toFixed(1)} m/s</b></div><div className="bar-list">{areaStations.slice(0,8).map(x=><div className="bar-row" key={x.station_id}><span>{x.station_name||x.station_id}</span><div className="bar-track"><i style={{width:(Math.min(100,(Number(x.wind_speed)||0)/15*100))+"%"}}/></div><b>{x.wind_speed==null?"--":Number(x.wind_speed).toFixed(1)+" m/s"}</b></div>)}</div></div>
          </div></div>
          <div className="card"><div className="cardtitle">縣市氣象觀測<select value={county}onChange={e=>choose(e.target.value)}>{counties.map(x=><option key={x}>{x}</option>)}</select></div><div className="countygrid">{counties.filter(x=>x!=="全部").map(c=>{const a=s.filter(x=>x.county===c),av=a.length?a.reduce((z,x)=>z+x.temperature,0)/a.length:null;return <button className={area===c?"countybtn selected":"countybtn"} key={c} onClick={()=>choose(c)}><span>{c}</span><b>{av==null?"--":av.toFixed(1)}°</b><small>{a.length} 測站</small></button>})}</div></div>
          <div className="card forecast-card"><div className="cardtitle">未來三天天氣預測 <small className="chart-subtitle">{area||"全台"}</small></div><div className="forecast-grid">{forecast.map((d,i)=><div className="forecast-day" key={d.date||i}><b>{i===0?"今天":i===1?"明天":"後天"}</b><small>{d.date}</small><span>☁️</span><strong>{d.max_temp||"--"}° / {d.min_temp||"--"}°</strong><em>{d.weather||"資料讀取中"}</em><small>降雨機率 {d.rain_probability||"--"}%</small></div>)}</div>{forecastLoading&&<small className="sql-note">預報資料更新中…</small>}</div><div className="card history-card"><div className="cardtitle">歷史溫度（SQLite + SQL）<div className="history-controls"><input type="date" min="2020-01-01" max={new Date().toISOString().slice(0,10)} value={historyDate} onChange={e=>setHistoryDate(e.target.value)}/></div></div><LineChart points={history}/><small className="sql-note">資料來源：CWA 觀測時間 → SQLite WeatherObservations → SQL GROUP BY 日期/時段</small></div>
          <div className="card"><div className="cardtitle">測站資訊 <div className="tabs">{["temperature","wind","rain"].map(x=><button className={mode===x?"on":""}onClick={()=>setMode(x)}key={x}>{x==="temperature"?"溫度":x==="wind"?"風速":"降雨"}</button>)}</div></div><div className="tablehead"><span>測站</span><span>{mode==="temperature"?"溫度":mode==="wind"?"風速":"雨量"}</span><span>狀態</span></div><div className="rows">{areaStations.map(x=><button className="row" key={x.station_id} onClick={()=>choose(x.county)}><span><i style={{background:tempColor(x.temperature)}}/>{x.station_name||x.station_id}</span><b>{mode==="temperature"?x.temperature.toFixed(1)+"°":mode==="wind"?(x.wind_speed??"--")+" m/s":(x.rain??"--")+" mm"}</b><em>{level(x.temperature)}</em></button>)}</div></div>
        </div>
      </div>
    </section></div>
  </div>
}
createRoot(document.getElementById("root")).render(<App/>);
