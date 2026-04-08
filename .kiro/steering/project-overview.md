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

## Current Phase: Phase 1
