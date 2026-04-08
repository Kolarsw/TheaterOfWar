---
inclusion: always
---

# Data Service Layer

## Purpose
A thin abstraction between UI components and data sources. In Phase 1, functions return mock JSON. In Phase 3, they become Databricks SQL API calls. Components never import data files directly — they call service functions.

## Architecture
```
UI Components
    ↓ call
Data Service (src/services/dataService.ts)
    ↓ returns
    Phase 1: static JSON imports
    Phase 3: Databricks SQL API responses
```

## Service Functions

### Unit Data (Gold table: `units`)
- `getUnits(beforeDate?)` — All units visible at a given timestamp
- `getUnitById(unitId)` — Single unit record with full details
- `getUnitsByFaction(faction, beforeDate?)` — Filtered by allied/axis
- `getUnitHierarchy()` — Full OOB tree structure
- `getEquipment(unitId)` — Equipment breakdown (walks up hierarchy if needed)

### Map Visualization (Gold table: `troop_distribution`)
- `getTroopPoints(beforeDate?)` — GeoJSON FeatureCollection for map rendering
  - Phase 1: Client-side synthetic point generation (1:500 scale)
  - Phase 3: H3 hex cell data from Databricks, converted to points client-side OR rendered as hex layer

### Supply Data (Gold table: `supply_lines`)
- `getSupplyLines(beforeDate?)` — Supply route records
- `getSupplyStats(beforeDate?)` — Aggregated supply KPIs

### Battle/Event Data (Gold table: `events`)
- `getEvents(beforeDate?)` — Battle and event records
- `getEventById(eventId)` — Single event detail

### Theater Data (Gold table: `theater_summary`)
- `getTheaterStats(beforeDate?)` — Per-theater aggregated stats

## Phase 3 Swap Pattern
Each function has a `USE_LIVE_DATA` flag (or env var). When false, returns mock data. When true, calls the Databricks SQL Statement Execution API. The response shape is identical either way — components don't know or care where the data came from.

## Scaling Strategy: Map Visualization

### Phase 1 (Current): Client-Side Point Generation
- `getTroopPoints()` generates synthetic points at 1:500 scale
- Points spread randomly around unit center coordinates
- Mapbox clustering merges points at low zoom → circles with troop counts
- Unclustered points at high zoom → triangles
- Works great for ~20 units, won't scale to thousands

### Phase 3 (Target): H3 Hex-Based Distribution (Option C)
- Databricks Gold table `troop_distribution` contains H3 hex cells
- Each row: `{ h3_index, timestamp, faction, unit_id, troop_count, lat, lng }`
- Pipeline uses Mosaic library to distribute unit troops across H3 cells based on unit position and area of operations
- Front end receives hex cells as points → same clustering/triangle rendering works
- Benefits: geospatially accurate, scales to any number of units, same data powers Hex Control layer

### Fallback (Option B): Data-Driven Rendering
- If H3 pipeline isn't ready, use Deck.gl ScatterplotLayer
- One point per unit, radius proportional to troop count
- Simpler but loses the break-apart-into-triangles effect
- Can coexist with Option C — use B for units without H3 data

### Visual Continuity
- Circles at strategic zoom (clustered) — unchanged
- Triangles at tactical zoom (unclustered) — unchanged
- The data source changes, not the rendering approach
- `getTroopPoints()` abstracts this: returns GeoJSON regardless of source
