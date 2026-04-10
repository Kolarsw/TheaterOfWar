# TheaterOfWar

A Palantir Gotham/Foundry-style interactive geospatial web app visualizing WWII logistics, troop movements, and battles. Built with a dark-mode, data-dense military intelligence aesthetic. Globe projection at strategic zoom, Mercator at tactical zoom. All accent colors shift between cyan (Historical mode) and amber (Simulation mode).

## Tech Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS
- Mapbox GL JS (globe projection, vector layers)
- Recharts (battle and theater analytics)
- Zustand (global state management)
- GADM administrative boundaries (territory control layer)
- Databricks (Phase 2/3 — not yet connected)

## Getting Started

### Prerequisites
- Node.js 18+
- A Mapbox access token (free at [mapbox.com](https://account.mapbox.com/access-tokens/))

### Setup
```bash
git clone https://github.com/Kolarsw/TheaterOfWar.git
cd TheaterOfWar
npm install
```

Create a `.env` file in the project root:
```
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

### Run
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

## What's Built (Phase 1)

All views use mock data. The data service layer abstracts the source — components call service functions, not data files. Phase 3 swaps these to Databricks SQL API calls with no component changes.

### Views
- **Strategic Command** — Globe map with clustered unit markers (1:500 scale), supply arcs, battle event scatterplot, territory control layer, KPI cards, OOB tree navigation
- **Logistics Dashboard** — Supply chain KPIs, filter sidebar, color-coded route table, supply arc visualization with transport mode styling (solid=air, dashed=sea, dotted=land)
- **Order of Battle** — Hierarchical unit tree (Division → Regiment → Battalion → Company), rich detail panel with equipment tables, supply bars, command chain
- **Battle Detail** — Battle index, phase timeline with auto-advance, live Recharts (effective strength + cumulative casualties), cross-links to OOB, fly-to on select
- **Theater Comparison** — 5 theater tabs with fly-to, KPI cards, 4-chart analytics row (troop strength, casualties, supply throughput, territory control)

### Map Layers (togglable)
- **Units** — Mapbox clustering with faction-colored circles (clustered) and triangles (unclustered)
- **Supply Arcs** — Great circle arcs with arrowheads, color-coded by faction/status/type
- **Events** — Battle scatterplot sized by significance (troop strength + casualties blend)
- **Territory** — GADM département-level boundaries colored by controlling faction, updates with timeline

### Key Features
- Timeline scrubber with play/pause, speed (1x-16x), scale (hours→years), hold-to-step buttons
- Spacebar toggles play/pause globally
- Linear interpolation between unit position snapshots for smooth troop movement
- Seeded random point generation for stable map rendering
- Anchor snapshots sync troop movement with supply arc appearance
- Mode toggle: Historical (cyan) / Simulation (amber) — all UI chrome shifts color
- Battle charts populate in real-time during timeline playback

## Project Structure

```
src/
├── app/                    # Next.js App Router
├── components/             # Shared components (KPI cards, timeline, layer toggles, etc.)
├── features/
│   ├── map/                # GlobeMap with all Mapbox layers
│   ├── strategic-command/  # Command view overlay
│   ├── logistics/          # Logistics dashboard
│   ├── oob/                # Order of Battle panels
│   ├── battles/            # Battle Detail view
│   └── theaters/           # Theater Comparison view
├── services/
│   └── dataService.ts      # Data abstraction layer (mock → Databricks swap point)
├── stores/
│   └── useAppStore.ts      # Zustand global state
└── data/                   # Mock JSON data files
```

## Phased Build Plan

### Phase 1 — The Front-End Shell (current)
Static, interactive Next.js app using mock data. All views, layers, and interactions built against mock JSON.

### Phase 2 — The Databricks Back-End
Python scrapers → S3 → Bronze/Silver/Gold pipelines via Delta Live Tables. Gold tables match the front-end data contracts.

### Phase 3 — The Integration
Swap `dataService.ts` functions from static JSON to Databricks SQL API calls. Upload GADM world dataset to Mapbox as a vector tileset. Connect territory control to live data.
