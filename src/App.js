import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Fix Leaflet icon paths broken by webpack ──────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const makeIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const GREEN_ICON = makeIcon("green");
const RED_ICON = makeIcon("red");
const YELLOW_ICON = makeIcon("yellow");
const ORANGE_ICON = makeIcon("orange");

// ── DATA MODEL ────────────────────────────────────────────────────────────────

class Stop {
  constructor(stop_id, name, lat, lng) {
    this.stop_id = stop_id;
    this.name = name;
    this.lat = lat;
    this.lng = lng;
  }
  distanceTo(other) {
    // Haversine distance in km (used as A* heuristic)
    const R = 6371;
    const dLat = ((other.lat - this.lat) * Math.PI) / 180;
    const dLng = ((other.lng - this.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((this.lat * Math.PI) / 180) *
      Math.cos((other.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

class Graph {
  constructor() {
    this.adj = {};   // stop_id -> [{neighbor: stop_id, dist: number}]
    this.stops = {}; // stop_id -> Stop
  }
  addStop(stop) {
    if (!this.stops[stop.stop_id]) {
      this.adj[stop.stop_id] = [];
      this.stops[stop.stop_id] = stop;
    }
  }
  addEdge(stopA, stopB, dist) {
    this.addStop(stopA); this.addStop(stopB);
    if (!this.adj[stopA.stop_id].some(e => e.neighbor === stopB.stop_id))
      this.adj[stopA.stop_id].push({ neighbor: stopB.stop_id, dist });
    if (!this.adj[stopB.stop_id].some(e => e.neighbor === stopA.stop_id))
      this.adj[stopB.stop_id].push({ neighbor: stopA.stop_id, dist });
  }
  addRoute(stopList, dists) {
    stopList.forEach((s, i) => {
      if (i < stopList.length - 1)
        this.addEdge(s, stopList[i + 1], dists ? dists[i] : s.distanceTo(stopList[i + 1]));
    });
  }
  // A* search — returns array of stop_ids or null
  aStar(startId, goalId) {
    if (!this.stops[startId] || !this.stops[goalId]) return null;
    const goal = this.stops[goalId];
    const g = Object.fromEntries(Object.keys(this.stops).map(k => [k, Infinity]));
    const f = { ...g };
    g[startId] = 0;
    f[startId] = this.stops[startId].distanceTo(goal);
    const open = new Set([startId]);
    const from = {};
    while (open.size) {
      let cur = [...open].reduce((a, b) => (f[a] < f[b] ? a : b));
      if (cur === goalId) {
        const path = []; let c = goalId;
        while (c) { path.unshift(c); c = from[c]; }
        return path;
      }
      open.delete(cur);
      for (const { neighbor, dist } of this.adj[cur]) {
        const tentG = g[cur] + dist;
        if (tentG < g[neighbor]) {
          from[neighbor] = cur;
          g[neighbor] = tentG;
          f[neighbor] = tentG + this.stops[neighbor].distanceTo(goal);
          open.add(neighbor);
        }
      }
    }
    return null;
  }
}

// ── CHENNAI STOPS & ROUTES DATA ───────────────────────────────────────────────

const STOPS_DATA = [
  new Stop("S1", "Chennai Central", 13.0827, 80.2707),
  new Stop("S2", "Egmore", 13.0782, 80.2612),
  new Stop("S3", "Pudupet", 13.0743, 80.2650),
  new Stop("S4", "Mount Road", 13.0604, 80.2618),
  new Stop("S5", "Teynampet", 13.0480, 80.2530),
  new Stop("S6", "Nandanam", 13.0355, 80.2455),
  new Stop("S7", "Saidapet", 13.0200, 80.2300),
  new Stop("S8", "Guindy", 13.0067, 80.2206),
  new Stop("S9", "Chromepet", 12.9516, 80.1440),
  new Stop("S10", "Tambaram", 12.9249, 80.1000),
  new Stop("S11", "T Nagar", 13.0405, 80.2337),
  new Stop("S12", "Velachery", 12.9800, 80.2200),
  new Stop("S13", "Taramani", 12.9851, 80.2477),
  new Stop("S14", "OMR Sholinganallur", 12.8997, 80.2273),
  new Stop("S15", "Koyambedu (CMBT)", 13.0694, 80.2045),
  new Stop("S16", "Vadapalani", 13.0535, 80.2125),
  new Stop("S17", "Ashok Pillar", 13.0440, 80.2070),
  new Stop("S18", "KK Nagar", 13.0360, 80.1995),
  new Stop("S19", "Anna Nagar", 13.0850, 80.2101),
  new Stop("S20", "Kilpauk", 13.0783, 80.2330),
  new Stop("S21", "Chetpet", 13.0720, 80.2430),
  new Stop("S22", "Triplicane", 13.0605, 80.2766),
  new Stop("S23", "Marina Beach", 13.0500, 80.2824),
  new Stop("S24", "Chennai Airport", 12.9716, 80.1636),
  new Stop("S25", "Alandur", 12.9966, 80.2000),
];

const STOP_MAP = Object.fromEntries(STOPS_DATA.map(s => [s.stop_id, s]));

const ROUTES_DATA = [
  {
    route_id: "21G", name: "Central to Tambaram", busNo: "21G", type: "Express",
    stops: ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"],
    status: "congested", congestion: 65,
  },
  {
    route_id: "19B", name: "T Nagar to OMR", busNo: "19B", type: "Express",
    stops: ["S11", "S7", "S8", "S12", "S13", "S14"],
    status: "free", congestion: 15,
  },
  {
    route_id: "70G", name: "CMBT to Velachery", busNo: "70G", type: "Local",
    stops: ["S15", "S16", "S17", "S18", "S8", "S12"],
    status: "moderate", congestion: 40,
  },
  {
    route_id: "27B", name: "Anna Nagar to Marina", busNo: "27B", type: "Local",
    stops: ["S19", "S20", "S21", "S2", "S22", "S23"],
    status: "congested", congestion: 70,
  },
  {
    route_id: "154", name: "T Nagar to Airport", busNo: "154", type: "Express",
    stops: ["S11", "S6", "S7", "S8", "S25", "S24"],
    status: "free", congestion: 10,
  },
];

// Build the global graph from all route data
function buildGraph() {
  const g = new Graph();
  for (const route of ROUTES_DATA) {
    const stopObjs = route.stops.map(id => STOP_MAP[id]);
    g.addRoute(stopObjs);
  }
  return g;
}
const BUS_GRAPH = buildGraph();

// ── MAP HELPERS ───────────────────────────────────────────────────────────────

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 13, { duration: 1.2 }); }, [center, map]);
  return null;
}

// ── NEXT STOP ALERT BANNER ────────────────────────────────────────────────────

function NextStopAlert({ stopName, isArrived }) {
  if (!stopName) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, background: isArrived ? "linear-gradient(135deg,#16a34a,#22c55e)" : "linear-gradient(135deg,#1e3a8a,#0f766e)",
      color: "#fff", borderRadius: 16, padding: "14px 28px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.35)", display: "flex", alignItems: "center", gap: 14,
      animation: "pulse 1.5s infinite", minWidth: 280, maxWidth: "90vw",
    }}>
      <span style={{ fontSize: 28 }}>{isArrived ? "✅" : "🔔"}</span>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", opacity: 0.8, letterSpacing: "0.08em" }}>
          {isArrived ? "Arrived at" : "Next Station"}
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, marginTop: 2 }}>{stopName}</div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{box-shadow:0 8px 32px rgba(0,0,0,0.35)} 50%{box-shadow:0 8px 48px rgba(30,58,138,0.55)} }`}</style>
    </div>
  );
}

// ── MAIN NAVIGATOR SECTION ────────────────────────────────────────────────────

// Distinct colors for each bus route polyline on the map
const ROUTE_COLORS = ["#f59e0b", "#ef4444", "#a855f7", "#ec4899", "#14b8a6", "#f97316"];

function Navigator() {
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [astarPath, setAstarPath] = useState(null);   // array of stop_ids (A* result)
  const [routePath, setRoutePath] = useState(null);   // OSRM polyline for A* path
  const [crossRoutePaths, setCrossRoutePaths] = useState([]); // [{route, polyline, color}]
  const [userPos, setUserPos] = useState(null);        // {lat, lng}
  const [tracking, setTracking] = useState(false);
  const [currentStopIdx, setCurrentStopIdx] = useState(0);
  const [nextStop, setNextStop] = useState(null);
  const [arrived, setArrived] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [totalDistKm, setTotalDistKm] = useState(0);
  const watchRef = useRef(null);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const mapCenter = userPos ? [userPos.lat, userPos.lng]
    : fromId ? [STOP_MAP[fromId].lat, STOP_MAP[fromId].lng] : [13.04, 80.22];

  // Helper: format seconds as "Xh Ym Zs" or "Ym Zs"
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // Compute total route distance (sum of stop-to-stop straight-line km)
  useEffect(() => {
    if (!astarPath || astarPath.length < 2) { setTotalDistKm(0); return; }
    let dist = 0;
    for (let i = 0; i < astarPath.length - 1; i++)
      dist += STOP_MAP[astarPath[i]].distanceTo(STOP_MAP[astarPath[i + 1]]);
    setTotalDistKm(dist);
  }, [astarPath]);

  // Run A* when from/to change
  useEffect(() => {
    if (fromId && toId && fromId !== toId) {
      const path = BUS_GRAPH.aStar(fromId, toId);
      setAstarPath(path);
      setCurrentStopIdx(0);
      setNextStop(null);
      setArrived(false);
    } else {
      setAstarPath(null);
      setRoutePath(null);
    }
  }, [fromId, toId]);

  // Fetch OSRM road polyline for the A* path
  useEffect(() => {
    if (!astarPath || astarPath.length < 2) { setRoutePath(null); return; }
    const coords = astarPath.map(id => `${STOP_MAP[id].lng},${STOP_MAP[id].lat}`).join(";");
    fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`)
      .then(r => r.json())
      .then(data => {
        if (data.routes?.[0]) {
          setRoutePath(data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]));
        } else {
          setRoutePath(astarPath.map(id => [STOP_MAP[id].lat, STOP_MAP[id].lng]));
        }
      })
      .catch(() => setRoutePath(astarPath.map(id => [STOP_MAP[id].lat, STOP_MAP[id].lng])));
  }, [astarPath]);

  // Fetch OSRM polylines for every bus route crossing both selected stops
  useEffect(() => {
    if (!fromId || !toId) { setCrossRoutePaths([]); return; }
    const matching = ROUTES_DATA.flatMap((route, ri) => {
      const fi = route.stops.indexOf(fromId);
      const ti = route.stops.indexOf(toId);
      if (fi === -1 || ti === -1) return [];
      // Slice only the segment between the two stops
      const [lo, hi] = [Math.min(fi, ti), Math.max(fi, ti)];
      const segStops = route.stops.slice(lo, hi + 1);
      return [{ route, segStops, color: ROUTE_COLORS[ri % ROUTE_COLORS.length] }];
    });

    setCrossRoutePaths([]); // clear while loading
    Promise.all(
      matching.map(({ route, segStops, color }) => {
        const coords = segStops.map(id => `${STOP_MAP[id].lng},${STOP_MAP[id].lat}`).join(";");
        return fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`)
          .then(r => r.json())
          .then(data => ({
            route, color,
            polyline: data.routes?.[0]
              ? data.routes[0].geometry.coordinates.map(c => [c[1], c[0]])
              : segStops.map(id => [STOP_MAP[id].lat, STOP_MAP[id].lng]),
          }))
          .catch(() => ({
            route, color,
            polyline: segStops.map(id => [STOP_MAP[id].lat, STOP_MAP[id].lng]),
          }));
      })
    ).then(results => setCrossRoutePaths(results));
  }, [fromId, toId]);

  // Live GPS tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) { alert("Geolocation not supported by your browser."); return; }
    setTracking(true);
    setCurrentStopIdx(0);
    setElapsedSec(0);
    startTimeRef.current = Date.now();
    // Start 1-second elapsed timer
    timerRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    watchRef.current = navigator.geolocation.watchPosition(
      pos => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => console.warn("GPS error:", err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }, []);

  const stopTracking = useCallback(() => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setTracking(false);
    setNextStop(null);
    setElapsedSec(0);
  }, []);

  // Calculate next stop based on user proximity
  useEffect(() => {
    if (!tracking || !userPos || !astarPath) return;
    for (let i = currentStopIdx; i < astarPath.length; i++) {
      const stop = STOP_MAP[astarPath[i]];
      const dist = Math.sqrt((stop.lat - userPos.lat) ** 2 + (stop.lng - userPos.lng) ** 2) * 111; // approx km
      if (dist < 0.3 && i === astarPath.length - 1) { setArrived(true); setNextStop(stop.name); break; }
      if (dist < 0.5) { setCurrentStopIdx(i + 1); break; }
      if (i === currentStopIdx) {
        setNextStop(astarPath[i + 1] ? STOP_MAP[astarPath[i + 1]].name : STOP_MAP[astarPath[astarPath.length - 1]].name);
        break;
      }
    }
  }, [userPos, tracking, astarPath, currentStopIdx]);

  const statusColor = (s) => s === "free" ? { bg: "#dcfce7", text: "#166534", icon: "✅" }
    : s === "moderate" ? { bg: "#fef08a", text: "#854d0e", icon: "⚠️" } : { bg: "#fee2e2", text: "#991b1b", icon: "⛔" };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh", background: "#0f172a", color: "#e2e8f0" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1e3a8a 0%,#0f766e 100%)", padding: "24px 20px 18px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 40 }}>🚌</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>Bus Route Optimizer</div>
            <div style={{ fontSize: 13, color: "#93c5fd", marginTop: 2 }}>A* Pathfinding · Live GPS · Interactive Map</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px" }}>

        {/* Trip Planner */}
        <div style={{ background: "#1e293b", borderRadius: 14, padding: "20px", marginBottom: 18, border: "1px solid #334155" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#93c5fd", marginBottom: 14 }}>📍 Plan Your Trip with A* Algorithm</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 5 }}>Origin</label>
              <select id="from-stop" value={fromId} onChange={e => setFromId(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "2px solid #334155", background: "#0f172a", color: "#e2e8f0", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                <option value="">— Select Origin —</option>
                {STOPS_DATA.map(s => <option key={s.stop_id} value={s.stop_id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
              <button onClick={() => { const t = fromId; setFromId(toId); setToId(t); }}
                style={{ width: 38, height: 38, borderRadius: "50%", border: "2px solid #334155", background: "#1e293b", color: "#93c5fd", fontSize: 18, cursor: "pointer" }}>⇄</button>
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 5 }}>Destination</label>
              <select id="to-stop" value={toId} onChange={e => setToId(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "2px solid #334155", background: "#0f172a", color: "#e2e8f0", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                <option value="">— Select Destination —</option>
                {STOPS_DATA.filter(s => s.stop_id !== fromId).map(s => <option key={s.stop_id} value={s.stop_id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* A* Result */}
          {astarPath && (
            <div style={{ marginTop: 16, padding: "14px 16px", background: "#0f172a", borderRadius: 10, border: "1px solid #334155" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 10 }}>
                🧠 A* Shortest Path ({astarPath.length - 1} hop{astarPath.length > 2 ? "s" : ""})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                {astarPath.map((id, i) => {
                  const isFirst = i === 0, isLast = i === astarPath.length - 1;
                  const isIntermediate = !isFirst && !isLast;
                  return (
                    <div key={id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{
                        padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                        background: isFirst ? "#1e3a8a" : isLast ? "#065f46" : "#292524",
                        color: isFirst ? "#93c5fd" : isLast ? "#6ee7b7" : "#fbbf24",
                        border: isIntermediate ? "1px dashed #fbbf24" : "none",
                      }}>
                        {isFirst && "📍 "}{isLast && "🏁 "}{isIntermediate && "🚏 "}
                        {STOP_MAP[id].name}
                      </div>
                      {i < astarPath.length - 1 && <span style={{ color: "#475569", fontSize: 16 }}>→</span>}
                    </div>
                  );
                })}
              </div>
              {/* Live tracking controls */}
              <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                {!tracking ? (
                  <button id="start-tracking" onClick={startTracking}
                    style={{ padding: "10px 20px", borderRadius: 8, background: "linear-gradient(135deg,#1e3a8a,#0f766e)", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    📡 Start Live Tracking
                  </button>
                ) : (
                  <button id="stop-tracking" onClick={stopTracking}
                    style={{ padding: "10px 20px", borderRadius: 8, background: "#7f1d1d", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    ⏹ Stop Tracking
                  </button>
                )}
                {tracking && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#22c55e", fontWeight: 600 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse 1s infinite" }} />
                    GPS Active
                  </div>
                )}
              </div>

              {/* ── LIVE JOURNEY STATS ──────────────────────────────── */}
              {tracking && (() => {
                const stopsCompleted = currentStopIdx;
                const stopsRemaining = astarPath.length - 1 - currentStopIdx;
                const progress = astarPath.length > 1 ? currentStopIdx / (astarPath.length - 1) : 0;
                // Remaining distance (sum of remaining stops)
                let remDist = 0;
                for (let i = currentStopIdx; i < astarPath.length - 1; i++)
                  remDist += STOP_MAP[astarPath[i]].distanceTo(STOP_MAP[astarPath[i + 1]]);
                const avgSpeedKmH = 30; // average city bus speed
                const etaSec = Math.round((remDist / avgSpeedKmH) * 3600);

                return arrived ? (
                  <div style={{ marginTop: 14, background: "linear-gradient(135deg,#14532d,#166534)", borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#86efac" }}>✅ Arrived at destination!</div>
                    <div style={{ fontSize: 13, color: "#6ee7b7", marginTop: 4 }}>
                      Total journey time: <strong>{formatTime(elapsedSec)}</strong> &nbsp;·&nbsp;
                      Total distance: <strong>{totalDistKm.toFixed(1)} km</strong>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 14, background: "#0f172a", borderRadius: 12, padding: "16px 18px", border: "1px solid #334155" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 12, letterSpacing: "0.06em" }}>
                      🧭 Live Journey Stats
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden", marginBottom: 14 }}>
                      <div style={{ width: `${(progress * 100).toFixed(1)}%`, height: "100%", background: "linear-gradient(90deg,#1e3a8a,#0f766e)", borderRadius: 3, transition: "width 0.8s ease" }} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                      {[
                        { label: "⏱ Time Travelled", value: formatTime(elapsedSec), color: "#93c5fd" },
                        { label: "🏁 ETA to Destination", value: formatTime(etaSec), color: "#fbbf24" },
                        { label: "✅ Stops Passed", value: `${stopsCompleted} / ${astarPath.length - 1}`, color: "#6ee7b7" },
                        { label: "📍 Stops Remaining", value: String(stopsRemaining), color: "#f87171" },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ background: "#1e293b", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                          <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 5, lineHeight: 1.3 }}>{label}</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 10, fontSize: 12, color: "#64748b", textAlign: "center" }}>
                      {Math.round(progress * 100)}% of journey complete &nbsp;·&nbsp; ~{remDist.toFixed(1)} km remaining
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          {fromId && toId && !astarPath && (
            <div style={{ marginTop: 14, padding: "12px 16px", background: "#450a0a", borderRadius: 10, color: "#fca5a5", fontSize: 13, fontWeight: 600 }}>
              😔 No A* path found between these stops. Try different stops.
            </div>
          )}
        </div>

        {/* Map */}
        <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #334155", marginBottom: 18, height: 460 }}>
          <MapContainer center={mapCenter} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            />
            <FlyTo center={mapCenter} />

            {/* All bus stops */}
            {STOPS_DATA.map(stop => {
              const isOrigin = stop.stop_id === fromId;
              const isDestination = stop.stop_id === toId;
              const isOnPath = astarPath?.includes(stop.stop_id) && !isOrigin && !isDestination;
              const icon = isOrigin ? GREEN_ICON : isDestination ? RED_ICON : isOnPath ? YELLOW_ICON : L.icon({
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                iconSize: [18, 30], iconAnchor: [9, 30],
              });
              return (
                <Marker key={stop.stop_id} position={[stop.lat, stop.lng]} icon={icon}>
                  <Popup>
                    <div style={{ textAlign: "center", minWidth: 130 }}>
                      <strong>{stop.name}</strong>
                      {isOrigin && <div style={{ color: "green", fontSize: 11, marginTop: 4 }}>📍 Origin</div>}
                      {isDestination && <div style={{ color: "red", fontSize: 11, marginTop: 4 }}>🏁 Destination</div>}
                      {isOnPath && <div style={{ color: "#b45309", fontSize: 11, marginTop: 4 }}>🚏 Intermediate Stop</div>}
                      <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
                        {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* A* route polyline (Blue) */}
            {routePath && (
              <Polyline positions={routePath}
                pathOptions={{ color: "#3b82f6", weight: 6, opacity: 0.9, dashArray: "0" }} />
            )}

            {/* Cross-Route bus polylines (colored) */}
            {crossRoutePaths.map((cr, idx) => (
              <Polyline key={cr.route.route_id} positions={cr.polyline}
                pathOptions={{ color: cr.color, weight: 4, opacity: 0.8, dashArray: "5, 10" }} />
            ))}

            {/* User live location blue dot */}
            {userPos && (
              <>
                <Circle center={[userPos.lat, userPos.lng]} radius={80}
                  pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.25, weight: 2 }} />
                <Marker position={[userPos.lat, userPos.lng]}
                  icon={new L.DivIcon({ html: `<div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 10px #3b82f6;"></div>`, className: "", iconAnchor: [7, 7] })}>
                  <Popup><strong>📡 You are here</strong><br />{userPos.lat.toFixed(5)}, {userPos.lng.toFixed(5)}</Popup>
                </Marker>
              </>
            )}

            {/* Floating Map Legend for Routes */}
            {fromId && toId && crossRoutePaths.length > 0 && (
              <div dangerouslySetInnerHTML={{ __html: "" }} /> // Leaflet child hack
            )}
          </MapContainer>

          {/* Custom Overlay Legend (outside MapContainer to avoid Leaflet rendering issues, positioned relative) */}
          {fromId && toId && (
            <div style={{ position: "absolute", bottom: 20, right: 20, zIndex: 400, background: "rgba(15, 23, 42, 0.9)", padding: "10px 14px", borderRadius: 8, border: "1px solid #334155", backdropFilter: "blur(4px)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>Map Legend</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ width: 14, height: 4, background: "#3b82f6", borderRadius: 2 }} />
                <span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600 }}>🧠 A* Path</span>
              </div>
              {crossRoutePaths.map(cr => (
                <div key={cr.route.route_id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 14, height: 4, background: cr.color, borderRadius: 2 }} />
                  <span style={{ fontSize: 12, color: "#e2e8f0" }}>Bus {cr.route.busNo}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Intermediate stops panel */}
        {astarPath && astarPath.length > 2 && (
          <div style={{ background: "#1e293b", borderRadius: 14, padding: "18px 20px", marginBottom: 18, border: "1px solid #334155" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#fbbf24", marginBottom: 14 }}>
              🚏 Intermediate Stops ({astarPath.length - 2})
            </div>
            <div style={{ position: "relative", paddingLeft: 20 }}>
              <div style={{ position: "absolute", left: 8, top: 4, bottom: 4, width: 2, background: "#334155" }} />
              {astarPath.map((id, i) => {
                const stop = STOP_MAP[id];
                const isFirst = i === 0, isLast = i === astarPath.length - 1;
                const isPassed = tracking && i < currentStopIdx;
                const isCurrent = tracking && i === currentStopIdx;
                return (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: isLast ? 0 : 14, position: "relative", zIndex: 1 }}>
                    <div style={{
                      width: isFirst || isLast ? 12 : 9, height: isFirst || isLast ? 12 : 9, borderRadius: "50%", flexShrink: 0,
                      background: isFirst ? "#3b82f6" : isLast ? "#22c55e" : isPassed ? "#475569" : isCurrent ? "#fbbf24" : "#1e293b",
                      border: `2px solid ${isFirst ? "#3b82f6" : isLast ? "#22c55e" : isPassed ? "#475569" : isCurrent ? "#fbbf24" : "#64748b"}`,
                      boxShadow: isCurrent ? "0 0 8px #fbbf24" : "none",
                    }} />
                    <div>
                      <div style={{
                        fontSize: 13, fontWeight: isFirst || isLast || isCurrent ? 700 : 500,
                        color: isFirst ? "#93c5fd" : isLast ? "#6ee7b7" : isPassed ? "#475569" : isCurrent ? "#fbbf24" : "#e2e8f0"
                      }}>
                        {isFirst && "📍 "}{isLast && "🏁 "}{isCurrent && "👉 "}{stop.name}
                      </div>
                      <div style={{ fontSize: 11, color: "#475569" }}>{stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}</div>
                    </div>
                    {isPassed && <div style={{ marginLeft: "auto", fontSize: 11, color: "#475569", fontWeight: 600 }}>✓ Passed</div>}
                    {isCurrent && <div style={{ marginLeft: "auto", fontSize: 11, color: "#fbbf24", fontWeight: 700, animation: "pulse 1s infinite" }}>● Current</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CROSS-ROUTE BUSES (filtered by selection) ─────── */}
        {(() => {
          // Compute per-route distance between two stop indices in stopsList
          const routeDistBetween = (route, idxA, idxB) => {
            let d = 0;
            const [lo, hi] = [Math.min(idxA, idxB), Math.max(idxA, idxB)];
            for (let i = lo; i < hi; i++)
              d += STOP_MAP[route.stops[i]].distanceTo(STOP_MAP[route.stops[i + 1]]);
            return d;
          };

          // Cross-route: bus must cover BOTH fromId and toId stops (in order)
          let displayRoutes;
          if (fromId && toId) {
            const scored = ROUTES_DATA.flatMap(route => {
              const fromIdx = route.stops.indexOf(fromId);
              const toIdx = route.stops.indexOf(toId);
              if (fromIdx === -1 || toIdx === -1) return []; // doesn't cover both
              const dist = routeDistBetween(route, fromIdx, toIdx);
              return [{ ...route, _fromIdx: fromIdx, _toIdx: toIdx, _dist: dist }];
            });
            // Sort by minimum distance
            displayRoutes = scored.sort((a, b) => a._dist - b._dist);
          } else {
            displayRoutes = ROUTES_DATA.map(r => ({ ...r, _dist: null }));
          }

          const sectionLabel = fromId && toId
            ? `🚌 Buses Crossing Both Stops${displayRoutes.length ? ` — ${displayRoutes.length} found, sorted by distance` : ""}`
            : "🚌 All Available Bus Routes";

          return (
            <div style={{ background: "#1e293b", borderRadius: 14, padding: "18px 20px", border: "1px solid #334155" }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#93c5fd", marginBottom: 14 }}>{sectionLabel}</div>

              {fromId && toId && displayRoutes.length === 0 && (
                <div style={{ padding: "16px", background: "#1c1917", borderRadius: 10, color: "#fbbf24", fontSize: 13, fontWeight: 600, textAlign: "center" }}>
                  😔 No single bus covers both <strong>{STOP_MAP[fromId]?.name}</strong> and <strong>{STOP_MAP[toId]?.name}</strong>.<br />
                  <span style={{ color: "#94a3b8", fontWeight: 400 }}>Try the A* path above for a connected multi-bus route.</span>
                </div>
              )}

              {(fromId && toId ? displayRoutes : ROUTES_DATA.map(r => ({ ...r, _dist: null }))).map((route, rank) => {
                const st = statusColor(route.status);
                const stops_names = route.stops.map(id => STOP_MAP[id]?.name || id);
                const fromIdx = route._fromIdx ?? -1;
                const toIdx = route._toIdx ?? -1;
                const [segLo, segHi] = fromIdx !== -1 ? [Math.min(fromIdx, toIdx), Math.max(fromIdx, toIdx)] : [-1, -1];
                return (
                  <div key={route.route_id} style={{ borderLeft: `4px solid ${rank === 0 && route._dist !== null ? "#22c55e" : st.text}`, background: "#0f172a", borderRadius: 10, padding: "14px 16px", marginBottom: 12, position: "relative" }}>
                    {rank === 0 && route._dist !== null && (
                      <div style={{ position: "absolute", top: 10, right: 12, background: "#14532d", color: "#86efac", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 800 }}>
                        🏆 Shortest Route
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, paddingRight: route._dist !== null ? 110 : 0 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0" }}>{st.icon} {route.name}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                          Bus {route.busNo} · {route.type} · {route.stops.length} stops
                          {route._dist !== null && (
                            <span style={{ marginLeft: 8, color: "#fbbf24", fontWeight: 700 }}>
                              📏 {route._dist.toFixed(1)} km between your stops
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ background: st.bg, color: st.text, borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>
                        {route.status.toUpperCase()} {route.congestion}%
                      </div>
                    </div>

                    {/* Stop list — highlight the segment between from/to */}
                    <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
                      {stops_names.map((name, i) => {
                        const inSegment = segLo !== -1 && i >= segLo && i <= segHi;
                        const isEndpoint = i === fromIdx || i === toIdx;
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{
                              fontSize: 12,
                              fontWeight: isEndpoint ? 800 : inSegment ? 600 : 400,
                              color: isEndpoint ? "#fbbf24" : inSegment ? "#e2e8f0" : "#475569",
                              background: isEndpoint ? "#422006" : inSegment ? "#1e293b" : "transparent",
                              borderRadius: 4, padding: isEndpoint ? "1px 6px" : "0",
                            }}>
                              {i === fromIdx && "📍 "}{i === toIdx && "🏁 "}{name}
                            </span>
                            {i < stops_names.length - 1 && (
                              <span style={{ color: inSegment ? "#3b82f6" : "#334155", fontSize: 12 }}>›</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Congestion bar */}
                    <div style={{ marginTop: 10, height: 5, background: "#1e293b", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        width: `${route.congestion}%`, height: "100%",
                        background: route.congestion < 20 ? "#22c55e" : route.congestion < 50 ? "#eab308" : "#ef4444",
                        borderRadius: 3, transition: "width 0.5s"
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Next stop floating alert */}
      {nextStop && <NextStopAlert stopName={nextStop} isArrived={arrived} />}
    </div>
  );
}

export default function App() {
  return <Navigator />;
}
