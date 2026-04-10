---
inclusion: always
---

# TheaterOfWar — Project Overview

## Vision
A Palantir Gotham/Foundry-style interactive geospatial application that visualizes WWII logistics, troop movements, and battles. The app combines a dark-mode, data-dense military intelligence aesthetic with real historical data powered by Databricks.

## Tech Stack
- **Frontend:** Next.js, Mapbox GL JS, Deck.gl, Zustand (state management)
- **Backend:** Databricks (free tier), PySpark, Delta Live Tables
- **Data Storage:** AWS S3 (raw ingestion), Delta Lake (Bronze/Silver/Gold)
- **Scrapers:** Python-based, targeting historical OOBs, weather reports, logistics data
- **Geospatial:** H3 hexagonal indexing, Mosaic library, NATO military symbology

## Phased Build Plan

### Phase 1 — The Front-End Shell ("The Glass")
Build a static, highly interactive Next.js app using mock data. Nail the UX before touching Databricks.
- Scaffold Next.js + Mapbox GL JS + Deck.gl
- Define mock JSON data contracts (units, supply lines, battles)
- Build core visual layers: Hex Layer, Icon Layer, Arc Layer
- Implement a Kepler.gl-inspired time scrubber for temporal navigation

### Phase 2 — The Databricks Back-End ("The Brain")
Data pipelines that feed the front end with real historical data.
- Python scrapers → S3
- Bronze/Silver pipelines via Delta Live Tables + Auto Loader
- Silver layer: geospatial standardization, H3 indexing via Mosaic
- Gold layer: materialized views matching front-end JSON contracts
- Optional: LLM parsing of After Action Reports for morale/weather scores

### Phase 3 — The Integration ("The Nervous System")
Replace mock data with live Databricks queries.
- Data Service Layer abstracts the swap — components call service functions, not data files
- Databricks SQL Statement Execution API for analytical queries
- Databricks Model Serving for predictive endpoints (optional)
- H3 hex-based troop distribution replaces client-side point generation
- Zustand-based async state management for smooth timeline scrubbing

#### ⚠️ REQUIRED: GADM Tileset Upload (do this BEFORE wiring territory control to live data)
The territory control layer currently uses a bundled France GeoJSON (~362KB) as a proof of concept. Before connecting to Databricks for live territory data, you MUST:
1. Download the full GADM world dataset from https://gadm.org/download_world.html (~200MB zip, admin level 2)
2. Run a simplification script (like `scripts/simplify-gadm.js`) to merge all countries into one GeoJSON and reduce geometry complexity
3. Upload the result to Mapbox Studio as a custom vector tileset (drag-and-drop or `mapbox upload` CLI)
4. In GlobeMap.tsx, swap the territory source from `type: "geojson"` to `type: "vector"` with the new tileset URL
5. Delete the bundled `gadm-france-departments.json` — geometry now lives on Mapbox's tile servers
6. The control data (`region_id` + `timestamp` + `faction`) comes from Databricks Gold table `gold_territory_control` — the join logic in `getTerritoryGeoJSON` stays the same
7. Consider using Mapbox `feature-state` for dynamic coloring instead of rebuilding GeoJSON on every timeline tick (better performance at scale)

## Current Phase: Phase 1

## TODO: Developer Setup
- Create a `.env.example` with `NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here` so collaborators know what's needed
- Consider adding URL domain restrictions on the Mapbox token via the Mapbox dashboard for production
- Optionally document the setup steps in README.md
