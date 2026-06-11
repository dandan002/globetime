import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Globe2,
  RotateCcw,
  Search,
  Settings,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CITIES } from "./data/cities.js";
import * as T from "./data/timeutil.js";
import { GlobeController } from "./globe.js";
import { resolveDisplayInstant } from "./liveTime.js";
import { countryCodeLabel } from "./locationLabels.js";
import { DEFAULT_SIDEBAR_WIDTH, clampSidebarWidth, parseStoredSidebarWidth } from "./sidebarSize.js";

const ACCENTS = ["#c8cdd3", "#4ea8ff", "#f5a64e", "#9ae65a", "#5ad1e6"];
const FONTS = {
  plex: {
    ui: '"IBM Plex Sans", system-ui, sans-serif',
    mono: '"IBM Plex Mono", ui-monospace, monospace',
  },
  grotesk: {
    ui: '"Space Grotesk", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
};
const DEFAULT_SETTINGS = {
  accent: "#c8cdd3",
  globeStyle: "borders",
  fontPair: "plex",
  grid: 0.55,
};

function findCity(name) {
  return CITIES.find((city) => city.name === name);
}

function safeLoad(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function loadInitialCities() {
  const savedIds = safeLoad("gt_cities", null);
  if (Array.isArray(savedIds)) {
    const saved = savedIds
      .map((id) => CITIES.find((city) => city.id === id))
      .filter(Boolean);
    if (saved.length) return saved;
  }

  return ["New York", "London", "Tokyo"].map(findCity).filter(Boolean);
}

function loadInitialSettings() {
  const saved = safeLoad("gt_settings", {});
  const settings = { ...DEFAULT_SETTINGS, ...saved };

  if (settings.globeStyle === "dots") settings.globeStyle = "borders";

  return settings;
}

function parseTimeInput(value) {
  const match = String(value)
    .trim()
    .match(/^(\d{1,2})[:.\s]?(\d{2})?\s*(am|pm|a|p)?$/i);
  if (!match) return null;

  let hour = Number.parseInt(match[1], 10);
  const minute = match[2] ? Number.parseInt(match[2], 10) : 0;
  const meridiem = match[3]?.[0].toLowerCase();

  if (hour > 23 || minute > 59) return null;
  if (meridiem === "p" && hour < 12) hour += 12;
  if (meridiem === "a" && hour === 12) hour = 0;

  return { hour, minute };
}

function isDaylight(city, instant) {
  const sun = T.subsolarPoint(instant);
  const toVector = (lat, lon) => {
    const la = (lat * Math.PI) / 180;
    const lo = (lon * Math.PI) / 180;
    return [
      Math.cos(la) * Math.cos(lo),
      Math.cos(la) * Math.sin(lo),
      Math.sin(la),
    ];
  };
  const cityVector = toVector(city.lat, city.lon);
  const sunVector = toVector(sun.lat, sun.lon);
  const dot =
    cityVector[0] * sunVector[0] +
    cityVector[1] * sunVector[1] +
    cityVector[2] * sunVector[2];
  return dot > -0.045;
}

function hexA(hex, alpha) {
  const h = hex.replace("#", "");
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function CityRow({
  active,
  city,
  hour12,
  index,
  instant,
  onEditTime,
  onRemove,
  onSelect,
  referenceTimeZone,
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef(null);
  const time = T.formatTime(city.tz, instant, hour12);
  const date = T.formatDateShort(city.tz, instant);
  const delta = T.dayDelta(city.tz, instant, referenceTimeZone);
  const daylight = isDaylight(city, instant);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEdit = (event) => {
    event.stopPropagation();
    setValue(`${time.main}${time.suffix ? ` ${time.suffix}` : ""}`);
    setEditing(true);
  };

  const commit = () => {
    const parsed = parseTimeInput(value);
    if (parsed) onEditTime(city, parsed.hour, parsed.minute);
    setEditing(false);
  };

  return (
    <div
      className={`row${active ? " row-active" : ""}`}
      onClick={() => onSelect(city.id)}
    >
      <div
        className="row-rail"
        style={{ background: active ? "var(--accent)" : "transparent" }}
      />
      <div className="row-idx">{String(index + 1).padStart(2, "0")}</div>
      <div className="row-main">
        <div className="row-top">
          <span className="row-name">{city.name}</span>
          <span className={`daynight ${daylight ? "is-day" : "is-night"}`}>
            <span className="dn-dot" />
            {daylight ? "DAY" : "NIGHT"}
          </span>
        </div>
        <div className="row-meta lbl">
          <span title={city.country}>{countryCodeLabel(city)}</span>
          <span className="dotsep">/</span>
          <span>{T.abbrev(city.tz, instant)}</span>
          <span className="dotsep">/</span>
          <span>{T.offsetLabel(city.tz, instant)}</span>
        </div>
      </div>
      <div className="row-time">
        {editing ? (
          <input
            ref={inputRef}
            className="time-input"
            value={value}
            onBlur={commit}
            onChange={(event) => setValue(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit();
              if (event.key === "Escape") setEditing(false);
            }}
          />
        ) : (
          <button className="time-disp" onClick={startEdit} title="Edit time">
            <span className="time-main">{time.main}</span>
            {time.suffix && <span className="time-suf">{time.suffix}</span>}
          </button>
        )}
        <div className="row-date lbl">
          {date.weekday} {date.month} {date.day}
          {delta !== 0 && (
            <span className="delta">{delta > 0 ? `+${delta}` : delta}d</span>
          )}
        </div>
      </div>
      <button
        className="row-x"
        onClick={(event) => {
          event.stopPropagation();
          onRemove(city.id);
        }}
        title={`Remove ${city.name}`}
      >
        <X size={14} />
      </button>
    </div>
  );
}

function AddCity({ existing, onAdd }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapRef = useRef(null);
  const existingIds = useMemo(
    () => new Set(existing.map((city) => city.id)),
    [existing],
  );
  const results = query.trim()
    ? (() => {
        const q = query.toLowerCase();
        const now = new Date();
        return CITIES.filter((city) => {
          if (existingIds.has(city.id)) return false;
          const haystack = `${city.name} ${city.country} ${city.tz} ${T.abbrev(city.tz, now)} ${T.offsetLabel(city.tz, now)}`.toLowerCase();
          return haystack.includes(q);
        }).slice(0, 7);
      })()
    : [];

  useEffect(() => {
    function handleDocumentMouseDown(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () =>
      document.removeEventListener("mousedown", handleDocumentMouseDown);
  }, []);

  const pick = (city) => {
    onAdd(city);
    setQuery("");
    setOpen(false);
    setHighlighted(0);
  };

  return (
    <div className="addcity" ref={wrapRef}>
      <div className="add-field">
        <Search size={14} />
        <input
          value={query}
          placeholder="Add a location..."
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setHighlighted(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              setHighlighted((index) => Math.min(results.length - 1, index + 1));
              event.preventDefault();
            } else if (event.key === "ArrowUp") {
              setHighlighted((index) => Math.max(0, index - 1));
              event.preventDefault();
            } else if (event.key === "Enter" && results[highlighted]) {
              pick(results[highlighted]);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </div>
      {open && results.length > 0 && (
        <div className="add-drop">
          {results.map((city, index) => (
            <button
              key={city.id}
              className={`add-opt${index === highlighted ? " add-hi" : ""}`}
              onMouseDown={(event) => {
                event.preventDefault();
                pick(city);
              }}
              onMouseEnter={() => setHighlighted(index)}
            >
              <span className="add-opt-name">{city.name}</span>
              <span className="add-opt-meta lbl">
                <span title={city.country}>{countryCodeLabel(city)}</span> / {T.abbrev(city.tz, new Date())}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TimeSlider({ anchor, hour12, instant, onScrub }) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);
  const minutes = T.minutesOfDay(anchor.tz, instant);
  const pct = minutes / 1440;
  const time = T.formatTime(anchor.tz, instant, hour12);
  const ticks = [0, 6, 12, 18, 24];

  const setFromClientX = useCallback(
    (clientX) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const rawPct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const rounded = Math.max(
        0,
        Math.min(1435, Math.round((rawPct * 1440) / 5) * 5),
      );
      onScrub(Math.floor(rounded / 60), rounded % 60);
    },
    [onScrub],
  );

  useEffect(() => {
    if (!dragging) return undefined;
    const move = (event) => {
      const source = event.touches ? event.touches[0] : event;
      setFromClientX(source.clientX);
    };
    const up = () => setDragging(false);

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
  }, [dragging, setFromClientX]);

  return (
    <div
      className={`time-slider${dragging ? " is-dragging" : ""}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div
        className="ts-track"
        ref={trackRef}
        onMouseDown={(event) => {
          setDragging(true);
          setFromClientX(event.clientX);
        }}
        onTouchStart={(event) => {
          setDragging(true);
          setFromClientX(event.touches[0].clientX);
        }}
      >
        <div className="ts-line" />
        <div className="ts-fill" style={{ width: `${pct * 100}%` }} />
        {ticks.map((hour) => (
          <div key={hour} className="ts-tick" style={{ left: `${(hour / 24) * 100}%` }}>
            <span className="ts-ticklbl">{String(hour % 24).padStart(2, "0")}</span>
          </div>
        ))}
        <div className="ts-handle" style={{ left: `${pct * 100}%` }} />
      </div>
      <div className={`ts-readout${hovering || dragging ? " is-visible" : ""}`}>
        {time.main}
        {time.suffix && <span className="time-suf">{time.suffix}</span>}
      </div>
    </div>
  );
}

function SettingsPanel({ settings, setSetting }) {
  return (
    <div className="settings-panel">
      <div className="settings-section">
        <div className="lbl">Accent</div>
        <div className="swatches">
          {ACCENTS.map((accent) => (
            <button
              key={accent}
              className="swatch"
              data-on={settings.accent === accent ? "1" : "0"}
              onClick={() => setSetting("accent", accent)}
              style={{ background: accent }}
              title={accent}
            >
              {settings.accent === accent && <Check size={13} />}
            </button>
          ))}
        </div>
      </div>
      <div className="settings-section">
        <div className="lbl">Render</div>
        <div className="seg settings-seg">
          {["borders", "wire", "solid"].map((style) => (
            <button
              key={style}
              className={settings.globeStyle === style ? "seg-on" : ""}
              onClick={() => setSetting("globeStyle", style)}
            >
              {style}
            </button>
          ))}
        </div>
      </div>
      <div className="settings-section">
        <div className="lbl">Typeface</div>
        <div className="seg settings-seg">
          {["plex", "grotesk"].map((font) => (
            <button
              key={font}
              className={settings.fontPair === font ? "seg-on" : ""}
              onClick={() => setSetting("fontPair", font)}
            >
              {font}
            </button>
          ))}
        </div>
      </div>
      <label className="settings-section range-row">
        <span className="lbl">Texture</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={settings.grid}
          onChange={(event) => setSetting("grid", Number(event.target.value))}
        />
      </label>
    </div>
  );
}

function Header({
  anchor,
  copied,
  hour12,
  instant,
  live,
  onCopy,
  onDate,
  onNow,
  onToggleSettings,
  settingsOpen,
  setHour12,
}) {
  const date = T.formatDateShort(anchor.tz, instant);
  const parts = T.localParts(anchor.tz, instant);
  const dateValue = `${parts.year}-${T.pad2(parts.month)}-${T.pad2(parts.day)}`;

  return (
    <header className="header">
      <div className="brand">
        <div className="brand-mark">
          <Globe2 size={21} />
        </div>
        <div className="brand-txt">
          <div className="brand-name">GLOBETIME</div>
          <div className="brand-sub lbl">TIME ZONE CONSOLE</div>
        </div>
      </div>

      <div className="header-ctrls">
        <div className="ctrl date-ctrl">
          <button className="step" onClick={() => onDate(-1)} title="Previous day">
            <ChevronLeft size={17} />
          </button>
          <div className="date-disp">
            <span className="date-wd lbl">{date.weekday}</span>
            <span className="date-md">
              {date.month} {date.day}
            </span>
            <span className="date-yr lbl">{date.year}</span>
            <input
              type="date"
              className="date-native"
              value={dateValue}
              onChange={(event) => onDate(0, event.target.value)}
            />
          </div>
          <button className="step" onClick={() => onDate(1)} title="Next day">
            <ChevronRight size={17} />
          </button>
        </div>

        <div className="seg">
          <button
            type="button"
            aria-pressed={hour12}
            className={hour12 ? "seg-on" : ""}
            onClick={() => setHour12(true)}
            title="Show times in 12-hour format"
          >
            12H
          </button>
          <button
            type="button"
            aria-pressed={!hour12}
            className={!hour12 ? "seg-on" : ""}
            onClick={() => setHour12(false)}
            title="Show times in 24-hour format"
          >
            24H
          </button>
        </div>

        <button className="btn icon-btn" onClick={onNow}>
          <RotateCcw size={13} />
          NOW
        </button>
        <div className={`mode-indicator ${live ? "is-live" : "is-manual"}`}>
          <span className="dn-dot" />
          <span>{live ? "LIVE" : "MANUAL"}</span>
        </div>
        <button className="btn btn-primary icon-btn" onClick={onCopy}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "COPIED" : "COPY"}
        </button>
        <button
          className={`step settings-toggle${settingsOpen ? " is-open" : ""}`}
          onClick={onToggleSettings}
          title="Display settings"
        >
          <Settings size={15} />
        </button>
      </div>
    </header>
  );
}

export function App() {
  const [cities, setCities] = useState(loadInitialCities);
  const [instant, setInstant] = useState(() => new Date());
  const [live, setLive] = useState(true);
  const [activeId, setActiveId] = useState(() => loadInitialCities()[0]?.id);
  const [hour12, setHour12] = useState(
    () => localStorage.getItem("gt_h12") !== "0",
  );
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(loadInitialSettings);
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    typeof window === "undefined"
      ? DEFAULT_SIDEBAR_WIDTH
      : parseStoredSidebarWidth(localStorage.getItem("gt_sidebar_w"), window.innerWidth),
  );
  const [resizingSidebar, setResizingSidebar] = useState(false);
  const globeRef = useRef(null);
  const firstPush = useRef(true);
  const anchor = cities.find((city) => city.id === activeId) || cities[0] || findCity("New York");

  const setSetting = useCallback((key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
  }, []);

  useEffect(() => {
    if (!live) return undefined;
    const tick = () => {
      setInstant((current) =>
        resolveDisplayInstant({ live: true, instant: current }),
      );
    };
    tick();
    const interval = window.setInterval(tick, 100);
    return () => window.clearInterval(interval);
  }, [live]);

  useEffect(() => {
    const canvas = document.getElementById("globe");
    if (canvas && !globeRef.current && !canvas.dataset.gtInit) {
      canvas.dataset.gtInit = "true";
      globeRef.current = new GlobeController(canvas);
      globeRef.current.setAccent(settings.accent);
      globeRef.current.applyStyle(settings.globeStyle);
    }
  }, [settings.accent, settings.globeStyle]);

  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.setCities(cities, activeId, firstPush.current);
      firstPush.current = false;
    }
    localStorage.setItem("gt_cities", JSON.stringify(cities.map((city) => city.id)));
  }, [cities, activeId]);

  useEffect(() => {
    if (globeRef.current) {
      const sun = T.subsolarPoint(instant);
      globeRef.current.setSun(sun.lat, sun.lon);
    }
  }, [instant]);

  useEffect(() => {
    const root = document.documentElement;
    const font = FONTS[settings.fontPair] || FONTS.plex;
    root.style.setProperty("--accent", settings.accent);
    root.style.setProperty("--accent-dim", hexA(settings.accent, 0.18));
    root.style.setProperty("--grid", String(settings.grid));
    root.style.setProperty("--font-ui", font.ui);
    root.style.setProperty("--font-mono", font.mono);
    localStorage.setItem("gt_settings", JSON.stringify(settings));
    if (globeRef.current) {
      globeRef.current.setAccent(settings.accent);
      globeRef.current.applyStyle(settings.globeStyle);
    }
  }, [settings]);

  useEffect(() => {
    localStorage.setItem("gt_h12", hour12 ? "1" : "0");
  }, [hour12]);

  useEffect(() => {
    localStorage.setItem("gt_sidebar_w", String(sidebarWidth));
    document.documentElement.style.setProperty("--sidebar-w", `${sidebarWidth}px`);
  }, [sidebarWidth]);

  useEffect(() => {
    const handleResize = () => {
      setSidebarWidth((width) => clampSidebarWidth(width, window.innerWidth));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!resizingSidebar) return undefined;

    const handlePointerMove = (event) => {
      setSidebarWidth(clampSidebarWidth(window.innerWidth - event.clientX, window.innerWidth));
    };
    const handlePointerUp = () => setResizingSidebar(false);

    document.body.classList.add("is-sidebar-resizing");
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      document.body.classList.remove("is-sidebar-resizing");
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [resizingSidebar]);

  useEffect(() => {
    if (!cities.find((city) => city.id === activeId)) {
      setActiveId(cities[0]?.id || anchor?.id);
    }
  }, [cities, activeId, anchor?.id]);

  const addCity = (city) => {
    setCities((current) =>
      current.find((item) => item.id === city.id) ? current : [...current, city],
    );
    setActiveId(city.id);
  };

  const removeCity = (id) => {
    setCities((current) => current.filter((city) => city.id !== id));
  };

  const editTime = (city, hour, minute) => {
    const parts = T.localParts(city.tz, instant);
    setLive(false);
    setInstant(T.wallToInstant(city.tz, parts.year, parts.month, parts.day, hour, minute));
  };

  const scrub = (hour, minute) => {
    const parts = T.localParts(anchor.tz, instant);
    setLive(false);
    setInstant(T.wallToInstant(anchor.tz, parts.year, parts.month, parts.day, hour, minute));
  };

  const changeDate = (direction, isoString) => {
    const parts = T.localParts(anchor.tz, instant);
    setLive(false);
    if (isoString) {
      const [year, month, day] = isoString.split("-").map(Number);
      setInstant(T.wallToInstant(anchor.tz, year, month, day, parts.hour, parts.minute));
      return;
    }

    const base = T.wallToInstant(
      anchor.tz,
      parts.year,
      parts.month,
      parts.day,
      parts.hour,
      parts.minute,
    );
    setInstant(new Date(base.getTime() + direction * 86400000));
  };

  const copyTimes = () => {
    const lines = cities.map((city) => {
      const time = T.formatTime(city.tz, instant, hour12);
      const date = T.formatDateShort(city.tz, instant);
      const timeText = `${time.main}${time.suffix ? ` ${time.suffix}` : ""}`;
      return `${city.name.padEnd(16)} ${date.weekday} ${date.month} ${date.day}   ${timeText.padStart(8)}  ${T.abbrev(city.tz, instant)} (${T.offsetLabel(city.tz, instant)})`;
    });
    const text = `MEETING TIME\n${lines.join("\n")}`;

    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="app" style={{ "--sidebar-w": `${sidebarWidth}px` }}>
      <Header
        anchor={anchor}
        copied={copied}
        hour12={hour12}
        instant={instant}
        live={live}
        onCopy={copyTimes}
        onDate={changeDate}
        onNow={() => {
          setLive(true);
          setInstant(new Date());
        }}
        onToggleSettings={() => setSettingsOpen((open) => !open)}
        settingsOpen={settingsOpen}
        setHour12={setHour12}
      />

      <div className="corner-mark" style={{ left: 24, bottom: 150 }}>
        LAT/LON - IANA TZDB
      </div>
      <div className="corner-mark" style={{ left: 24, bottom: 134 }}>
        {cities.length} NODES ACTIVE
      </div>

      <aside className="sidebar">
        <button
          type="button"
          className="sidebar-resizer"
          aria-label="Resize sidebar"
          title="Resize sidebar"
          onPointerDown={(event) => {
            event.preventDefault();
            setResizingSidebar(true);
          }}
        />
        <div className="side-head">
          <span className="lbl">Locations</span>
          <span className="lbl side-count">{String(cities.length).padStart(2, "0")}</span>
        </div>
        {settingsOpen && (
          <SettingsPanel settings={settings} setSetting={setSetting} />
        )}
        <AddCity existing={cities} onAdd={addCity} />
        <div className="side-list">
          {cities.map((city, index) => (
            <CityRow
              key={city.id}
              active={city.id === activeId}
              city={city}
              hour12={hour12}
              index={index}
              instant={instant}
              onEditTime={editTime}
              onRemove={removeCity}
              onSelect={setActiveId}
              referenceTimeZone={anchor.tz}
            />
          ))}
          {cities.length === 0 && <div className="empty lbl">No locations</div>}
        </div>
        <TimeSlider anchor={anchor} hour12={hour12} instant={instant} onScrub={scrub} />
        <div className="side-foot lbl">
          Drag globe to rotate / click a row to anchor / click a time to edit
        </div>
      </aside>
    </div>
  );
}
