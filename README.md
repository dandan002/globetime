# GlobeTime

A time zone console with an interactive 3D globe. Track multiple cities, scrub through time, and find meeting times across time zones — all synchronized to NIST atomic time.

## Features

- **3D Globe** — Three.js-rendered Earth with day/night shading, city markers, and great-circle arcs
- **Multi-city tracking** — Add, remove, and reorder locations with live local times
- **Time scrubbing** — Drag the timeline or click a time to manually set any moment
- **NIST time sync** — Server-side NTP sync with `time.nist.gov` for accurate wall-clock time
- **Day/night detection** — Solar position calculated from subsolar point for each city
- **Copy to clipboard** — Export all city times in a formatted meeting-time block
- **Customizable display** — Accent colors, globe render styles (borders/wire/solid), font pairs, and texture intensity
- **Responsive sidebar** — Resizable panel with persistent width via localStorage

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 6 |
| 3D rendering | Three.js (custom shaders) |
| Server | Node.js (native `http`) |
| Time data | IANA TZDB via `Intl.DateTimeFormat`, NIST NTP |
| Testing | Vitest + jsdom |
| Icons | Lucide React |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with Vite HMR |
| `npm run build` | Production build to `dist/` |
| `npm start` | Serve production build |
| `npm test` | Run test suite with Vitest |

## Project Structure

```
globetime/
├── server/
│   ├── index.js          # HTTP server, Vite dev middleware, API routes
│   └── nistTime.js       # NTP client for time.nist.gov
├── src/
│   ├── data/
│   │   ├── cities.js     # City database (name, lat/lon, tz, country)
│   │   └── timeutil.js   # Time formatting, solar position, date math
│   ├── App.jsx           # Main UI: header, sidebar, timeline, settings
│   ├── globe.js          # Three.js globe controller (shaders, markers, arcs)
│   ├── liveTime.js       # Display instant resolver (live vs manual)
│   ├── locationLabels.js # Country code display helpers
│   ├── nistTime.js       # Client-side NIST sync with offset calculation
│   ├── sidebarSize.js    # Sidebar width persistence and clamping
│   ├── styles.css        # All application styles
│   └── main.jsx          # React entry point
├── test/                 # Vitest test files
├── index.html            # HTML shell
├── vite.config.js        # Vite + Vitest configuration
└── package.json
```

## Usage

- **Drag the globe** to rotate; it auto-rotates when idle
- **Click a city row** to anchor the timeline to that location
- **Click a time value** to edit it manually (switches to manual mode)
- **Drag the timeline** to scrub through the day in 5-minute increments
- **Use the date controls** to jump forward/backward by day or pick a specific date
- **Press NOW** to return to live NIST-synced time
- **Press COPY** to copy all city times to clipboard
