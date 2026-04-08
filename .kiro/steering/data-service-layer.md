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


### Planned Enhancement: Supply Line Clustering
- Nearby parallel supply/troop arcs of the same transport mode should merge into a single thicker arc when zoomed out, then split apart as you zoom in
- Mapbox doesn't support native line clustering — this needs a custom aggregation approach
- Options: pre-aggregate in the data service by grouping lines with similar source/target regions, or use Deck.gl's ArcLayer with built-in aggregation
- Priority: after core views are complete, before Phase 2


### Mock Data → Gold Table Mapping

| Mock JSON Files | Gold Table | Notes |
|---|---|---|
| `mock-units.json`, `mock-units-axis.json`, `mock-units-hierarchical.json`, `mock-units-axis-hierarchical.json`, `mock-units-timeline.json` | `gold_units` | Single table, all factions/echelons/timestamps as rows |
| `mock-supply-lines.json` | `gold_supply_lines` | Includes both supply and troop movement arcs |
| `mock-equipment.json` | `gold_equipment` | Joinable to `gold_units` via `unit_id` |

### Phase 3 Data Service Adjustments

1. **Unit ID consistency:** Mock data uses different `unit_id`s for the same unit at different timestamps (e.g., `us-1id-staging` vs `us-1id`). In the real `gold_units` table, the same `unit_id` will have multiple rows with different `timestamp` values. The `getUnits(beforeDate)` function will need to return the most recent row per `unit_id` before the given date (a `ROW_NUMBER() OVER (PARTITION BY unit_id ORDER BY timestamp DESC)` pattern in SQL).

2. **Equipment table structure:** Mock data stores equipment as a flat JSON object keyed by `unit_id`. In Databricks, `gold_equipment` will be a proper table with `unit_id` as a column, joinable to `gold_units`. The `getEquipment(unitId)` function swap is straightforward — just a `SELECT * FROM gold_equipment WHERE unit_id = ?` query. The hierarchy walk-up logic (checking parent units for equipment data) can either stay client-side or move to a SQL CTE.
