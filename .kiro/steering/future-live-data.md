---
inclusion: manual
---

# Future: Live Data Applications

The front-end infrastructure built for TheaterOfWar (globe, Deck.gl layers, KPI cards, data tables, timeline, network graph) is reusable for real-time streaming applications beyond static WWII data.

## Priority Interest: GDELT Project
- **What:** Real-time global events database — conflicts, protests, diplomatic events, all geocoded.
- **URL:** https://www.gdeltproject.org/
- **Why it fits:** The scatterplot layer, data tables, filter sidebars, and KPI cards we're building map directly to GDELT's event data. Minimal adaptation needed.
- **Data format:** CSV/JSON with lat/lng, event type, date, actors, tone scores.
- **Integration path:** Replace static JSON with GDELT API polling or BigQuery exports. Add a "live" mode to the timeline scrubber.

## Other Potential Live Data Sources
- **ADS-B Exchange / OpenSky Network** — live global air traffic (free API, position updates every few seconds)
- **AIS / MarineTraffic** — live ship positions worldwide
- **OpenWeatherMap / NOAA** — weather overlays via hex layers

## Architecture Notes for Streaming
- Add WebSocket or Server-Sent Events connection in the data layer
- Add a "live" mode to the timeline that auto-advances with a lookback buffer
- Zustand handles state updates identically whether data is static or streaming
- The view structure (Logistics, Network Graph, Theater Comparison) all apply to modern real-time scenarios
