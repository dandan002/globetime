/* GLOBETIME — time zone console. React UI over the Three.js globe. */
const { useState, useEffect, useRef, useCallback } = React;
const T = window.TimeUtil;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#5ad1e6",
  "globeStyle": "dots",
  "fontPair": "plex",
  "grid": 0.55
}/*EDITMODE-END*/;

const ACCENTS = ["#5ad1e6", "#4ea8ff", "#f5a64e", "#9ae65a", "#e0e6ec"];
const FONTS = {
  plex: { ui: '"IBM Plex Sans", system-ui, sans-serif', mono: '"IBM Plex Mono", monospace' },
  grotesk: { ui: '"Space Grotesk", system-ui, sans-serif', mono: '"JetBrains Mono", monospace' },
};

/* ---------- helpers ---------- */
function findCity(name) { return window.CITIES.find((c) => c.name === name); }
function loadInitial() {
  try {
    const raw = localStorage.getItem("gt_cities");
    if (raw) {
      const ids = JSON.parse(raw);
      const list = ids.map((id) => window.CITIES.find((c) => c.id === id)).filter(Boolean);
      if (list.length) return list;
    }
  } catch (e) {}
  return ["New York", "London", "Tokyo"].map(findCity).filter(Boolean);
}
function parseTimeInput(str) {
  const m = String(str).trim().match(/^(\d{1,2})[:.\s]?(\d{2})?\s*(am|pm|a|p)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  let mi = m[2] ? parseInt(m[2], 10) : 0;
  const ap = m[3] ? m[3][0].toLowerCase() : null;
  if (h > 23 || mi > 59) return null;
  if (ap === "p" && h < 12) h += 12;
  if (ap === "a" && h === 12) h = 0;
  return { h, mi };
}
function isDaylight(city, instant) {
  const s = T.subsolarPoint(instant);
  const toVec = (lat, lon) => {
    const la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
    return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
  };
  const a = toVec(city.lat, city.lon), b = toVec(s.lat, s.lon);
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] > -0.045;
}

/* ---------- small UI atoms ---------- */
function Flag({ cc }) {
  // ISO2 -> regional indicator emoji-free monogram chip
  return <span className="flag">{cc}</span>;
}

/* ---------- City row ---------- */
function CityRow({ city, instant, hour12, active, refTz, onSelect, onRemove, onEditTime, index }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const inputRef = useRef(null);
  const tm = T.formatTime(city.tz, instant, hour12);
  const dt = T.formatDateShort(city.tz, instant);
  const delta = T.dayDelta(city.tz, instant, refTz);
  const day = isDaylight(city, instant);

  useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [editing]);

  function startEdit(e) {
    e.stopPropagation();
    setVal(tm.main + (tm.suffix ? " " + tm.suffix : ""));
    setEditing(true);
  }
  function commit() {
    const p = parseTimeInput(val);
    if (p) onEditTime(city, p.h, p.mi);
    setEditing(false);
  }

  return (
    <div className={"row" + (active ? " row-active" : "")} onClick={() => onSelect(city.id)}>
      <div className="row-rail" style={{ background: active ? "var(--accent)" : "transparent" }}></div>
      <div className="row-idx">{String(index + 1).padStart(2, "0")}</div>
      <div className="row-main">
        <div className="row-top">
          <span className="row-name">{city.name}</span>
          <span className={"daynight " + (day ? "is-day" : "is-night")}>
            <span className="dn-dot"></span>{day ? "DAY" : "NIGHT"}
          </span>
        </div>
        <div className="row-meta lbl">
          <span>{city.country}</span>
          <span className="dotsep">·</span>
          <span>{T.abbrev(city.tz, instant)}</span>
          <span className="dotsep">·</span>
          <span>{T.offsetLabel(city.tz, instant)}</span>
        </div>
      </div>
      <div className="row-time">
        {editing ? (
          <input ref={inputRef} className="time-input" value={val}
            onChange={(e) => setVal(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }} />
        ) : (
          <div className="time-disp" onClick={startEdit} title="Click to edit">
            <span className="time-main">{tm.main}</span>
            {tm.suffix && <span className="time-suf">{tm.suffix}</span>}
          </div>
        )}
        <div className="row-date lbl">
          {dt.weekday} {dt.month} {dt.day}
          {delta !== 0 && <span className="delta">{delta > 0 ? "+" + delta : delta}d</span>}
        </div>
      </div>
      <button className="row-x" onClick={(e) => { e.stopPropagation(); onRemove(city.id); }} title="Remove">×</button>
    </div>
  );
}

/* ---------- Add city ---------- */
function AddCity({ existing, onAdd }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const wrapRef = useRef(null);
  const exIds = new Set(existing.map((c) => c.id));
  const results = q.trim()
    ? window.CITIES.filter((c) => !exIds.has(c.id) &&
        (c.name.toLowerCase().includes(q.toLowerCase()) || c.country.toLowerCase().includes(q.toLowerCase())))
        .slice(0, 7)
    : [];

  useEffect(() => {
    function onDoc(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(c) { onAdd(c); setQ(""); setOpen(false); setHi(0); }

  return (
    <div className="addcity" ref={wrapRef}>
      <div className="add-field">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>
        <input value={q} placeholder="Add a location…"
          onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { setHi((h) => Math.min(results.length - 1, h + 1)); e.preventDefault(); }
            else if (e.key === "ArrowUp") { setHi((h) => Math.max(0, h - 1)); e.preventDefault(); }
            else if (e.key === "Enter" && results[hi]) pick(results[hi]);
            else if (e.key === "Escape") setOpen(false);
          }} />
      </div>
      {open && results.length > 0 && (
        <div className="add-drop">
          {results.map((c, i) => (
            <div key={c.id} className={"add-opt" + (i === hi ? " add-hi" : "")}
              onMouseEnter={() => setHi(i)} onMouseDown={(e) => { e.preventDefault(); pick(c); }}>
              <span className="add-opt-name">{c.name}</span>
              <span className="add-opt-meta lbl">{c.country} · {T.abbrev(c.tz, new Date())}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Timeline scrubber ---------- */
function Timeline({ anchor, instant, hour12, onScrub }) {
  const trackRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const mins = T.minutesOfDay(anchor.tz, instant);
  const pct = mins / 1440;

  const setFromClientX = useCallback((clientX) => {
    const el = trackRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    let p = (clientX - r.left) / r.width;
    p = Math.max(0, Math.min(1, p));
    let m = Math.round((p * 1440) / 5) * 5;
    m = Math.max(0, Math.min(1435, m));
    onScrub(Math.floor(m / 60), m % 60);
  }, [onScrub]);

  useEffect(() => {
    if (!drag) return;
    const mv = (e) => setFromClientX((e.touches ? e.touches[0] : e).clientX);
    const up = () => setDrag(false);
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", mv, { passive: false });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", mv);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", mv);
      window.removeEventListener("touchend", up);
    };
  }, [drag, setFromClientX]);

  const tm = T.formatTime(anchor.tz, instant, hour12);
  const ticks = [0, 3, 6, 9, 12, 15, 18, 21, 24];

  return (
    <div className="timeline">
      <div className="tl-head">
        <span className="lbl">Timeline</span>
        <span className="tl-anchor lbl"><span className="dn-dot tl-anchordot"></span>{anchor.name}</span>
        <span className="tl-read">{tm.main}<span className="time-suf">{tm.suffix}</span></span>
      </div>
      <div className="tl-track" ref={trackRef}
        onMouseDown={(e) => { setDrag(true); setFromClientX(e.clientX); }}
        onTouchStart={(e) => { setDrag(true); setFromClientX(e.touches[0].clientX); }}>
        <div className="tl-daynight"></div>
        <div className="tl-fill" style={{ width: (pct * 100) + "%" }}></div>
        {ticks.map((h) => (
          <div key={h} className="tl-tick" style={{ left: (h / 24 * 100) + "%" }}>
            <span className="tl-ticklbl">{String(h).padStart(2, "0")}</span>
          </div>
        ))}
        <div className="tl-handle" style={{ left: (pct * 100) + "%" }}>
          <div className="tl-handle-line"></div>
          <div className="tl-handle-grip"></div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Header ---------- */
function Header({ anchor, instant, hour12, setHour12, onDate, onNow, onCopy, copied }) {
  const dt = T.formatDateShort(anchor.tz, instant);
  const lp = T.localParts(anchor.tz, instant);
  const dateVal = `${lp.year}-${T.pad2(lp.month)}-${T.pad2(lp.day)}`;
  return (
    <header className="header">
      <div className="brand">
        <div className="brand-mark">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.4">
            <circle cx="12" cy="12" r="9"/>
            <ellipse cx="12" cy="12" rx="4" ry="9"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="12" x2="21" y2="12" transform="rotate(35 12 12)" strokeOpacity="0.5"/>
          </svg>
        </div>
        <div className="brand-txt">
          <div className="brand-name">GLOBETIME</div>
          <div className="brand-sub lbl">TIME ZONE CONSOLE</div>
        </div>
      </div>

      <div className="header-ctrls">
        <div className="ctrl date-ctrl">
          <button className="step" onClick={() => onDate(-1)} title="Previous day">‹</button>
          <div className="date-disp">
            <span className="date-wd lbl">{dt.weekday}</span>
            <span className="date-md">{dt.month} {dt.day}</span>
            <span className="date-yr lbl">{dt.year}</span>
            <input type="date" className="date-native" value={dateVal} onChange={(e) => onDate(0, e.target.value)} />
          </div>
          <button className="step" onClick={() => onDate(1)} title="Next day">›</button>
        </div>

        <div className="seg">
          <button className={hour12 ? "seg-on" : ""} onClick={() => setHour12(true)}>12H</button>
          <button className={!hour12 ? "seg-on" : ""} onClick={() => setHour12(false)}>24H</button>
        </div>

        <button className="btn" onClick={onNow}>NOW</button>
        <button className="btn btn-primary" onClick={onCopy}>{copied ? "COPIED ✓" : "COPY"}</button>
      </div>
    </header>
  );
}

/* ---------- App ---------- */
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [cities, setCities] = useState(loadInitial);
  const [instant, setInstant] = useState(() => new Date());
  const [activeId, setActiveId] = useState(() => loadInitial()[0]?.id);
  const [hour12, setHour12] = useState(() => localStorage.getItem("gt_h12") !== "0");
  const [copied, setCopied] = useState(false);
  const globeRef = useRef(null);
  const firstPush = useRef(true);

  const anchor = cities.find((c) => c.id === activeId) || cities[0];

  /* init globe once */
  useEffect(() => {
    const canvas = document.getElementById("globe");
    if (canvas && window.GlobeController && !globeRef.current && !canvas.__gtInit) {
      canvas.__gtInit = true;
      globeRef.current = new window.GlobeController(canvas);
      window.__g = globeRef.current;
      globeRef.current.setAccent(t.accent);
      globeRef.current.applyStyle(t.globeStyle);
    }
  }, []);

  /* push cities + active to globe */
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.setCities(cities, activeId, firstPush.current);
      firstPush.current = false;
    }
    try { localStorage.setItem("gt_cities", JSON.stringify(cities.map((c) => c.id))); } catch (e) {}
  }, [cities, activeId]);

  /* push sun on time change */
  useEffect(() => {
    if (globeRef.current) {
      const s = T.subsolarPoint(instant);
      globeRef.current.setSun(s.lat, s.lon);
    }
  }, [instant]);

  /* tweaks -> css + globe */
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", t.accent);
    const c = t.accent;
    root.style.setProperty("--accent-dim", hexA(c, 0.18));
    root.style.setProperty("--grid", String(t.grid));
    const f = FONTS[t.fontPair] || FONTS.plex;
    root.style.setProperty("--font-ui", f.ui);
    root.style.setProperty("--font-mono", f.mono);
    if (globeRef.current) { globeRef.current.setAccent(t.accent); globeRef.current.applyStyle(t.globeStyle); }
  }, [t.accent, t.grid, t.fontPair, t.globeStyle, hour12]);

  useEffect(() => { localStorage.setItem("gt_h12", hour12 ? "1" : "0"); }, [hour12]);

  /* keep active valid */
  useEffect(() => {
    if (!cities.find((c) => c.id === activeId) && cities[0]) setActiveId(cities[0].id);
  }, [cities, activeId]);

  /* actions */
  const addCity = (c) => setCities((prev) => prev.find((x) => x.id === c.id) ? prev : [...prev, c]);
  const removeCity = (id) => setCities((prev) => prev.filter((c) => c.id !== id));
  const editTime = (city, h, mi) => {
    const lp = T.localParts(city.tz, instant);
    setInstant(T.wallToInstant(city.tz, lp.year, lp.month, lp.day, h, mi));
  };
  const scrub = (h, mi) => {
    const lp = T.localParts(anchor.tz, instant);
    setInstant(T.wallToInstant(anchor.tz, lp.year, lp.month, lp.day, h, mi));
  };
  const changeDate = (dir, isoStr) => {
    const lp = T.localParts(anchor.tz, instant);
    if (isoStr) {
      const [y, mo, d] = isoStr.split("-").map(Number);
      setInstant(T.wallToInstant(anchor.tz, y, mo, d, lp.hour, lp.minute));
    } else {
      const base = T.wallToInstant(anchor.tz, lp.year, lp.month, lp.day, lp.hour, lp.minute);
      setInstant(new Date(base.getTime() + dir * 86400000));
    }
  };
  const now = () => setInstant(new Date());
  const copy = () => {
    const lines = cities.map((c) => {
      const tm = T.formatTime(c.tz, instant, hour12);
      const dt = T.formatDateShort(c.tz, instant);
      const time = tm.main + (tm.suffix ? " " + tm.suffix : "");
      return `${c.name.padEnd(16)} ${dt.weekday} ${dt.month} ${dt.day}   ${time.padStart(8)}  ${T.abbrev(c.tz, instant)} (${T.offsetLabel(c.tz, instant)})`;
    });
    const txt = "MEETING TIME\n" + lines.join("\n");
    if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  };

  if (!anchor) return null;

  return (
    <div className="app">
      <Header anchor={anchor} instant={instant} hour12={hour12} setHour12={setHour12}
        onDate={changeDate} onNow={now} onCopy={copy} copied={copied} />

      <div className="corner-mark" style={{ left: 24, bottom: 150 }}>LAT/LON · IANA TZDB</div>
      <div className="corner-mark" style={{ left: 24, bottom: 134 }}>{cities.length} NODES ACTIVE</div>

      <aside className="sidebar">
        <div className="side-head">
          <span className="lbl">Locations</span>
          <span className="lbl side-count">{String(cities.length).padStart(2, "0")}</span>
        </div>
        <AddCity existing={cities} onAdd={addCity} />
        <div className="side-list">
          {cities.map((c, i) => (
            <CityRow key={c.id} city={c} index={i} instant={instant} hour12={hour12}
              active={c.id === activeId} refTz={anchor.tz}
              onSelect={setActiveId} onRemove={removeCity} onEditTime={editTime} />
          ))}
          {cities.length === 0 && <div className="empty lbl">No locations — add one above</div>}
        </div>
        <div className="side-foot lbl">
          Drag globe to rotate · click a row to anchor · click a time to edit
        </div>
      </aside>

      <Timeline anchor={anchor} instant={instant} hour12={hour12} onScrub={scrub} />

      <TweaksPanel>
        <TweakSection label="Identity" />
        <TweakColor label="Accent" value={t.accent} options={ACCENTS} onChange={(v) => setTweak("accent", v)} />
        <TweakRadio label="Typeface" value={t.fontPair} options={["plex", "grotesk"]} onChange={(v) => setTweak("fontPair", v)} />
        <TweakSection label="Globe" />
        <TweakRadio label="Render" value={t.globeStyle} options={["dots", "wire", "solid"]} onChange={(v) => setTweak("globeStyle", v)} />
        <TweakSlider label="Texture" value={t.grid} min={0} max={1} step={0.05} onChange={(v) => setTweak("grid", v)} />
      </TweaksPanel>
    </div>
  );
}

function hexA(hex, a) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
