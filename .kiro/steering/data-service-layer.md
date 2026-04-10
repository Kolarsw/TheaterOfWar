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

### Territory Control Data (Gold table: `territory_control`)
- `getTerritoryControl(beforeDate?)` — Latest faction assignment per region
- `getTerritoryGeoJSON(beforeDate?)` — GeoJSON FeatureCollection with region polygons colored by faction
- Phase 1: GADM GeoJSON bundled per country, control data from mock JSON
- Phase 3: GADM vector tileset on Mapbox, control data from Databricks SQL API

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
| `mock-territory-control.json` | `gold_territory_control` | `region_id` (GADM GID) + `timestamp` + `controlling_faction`. Geometry comes from GADM tileset, not the data table |

### Phase 3 Data Service Adjustments

1. **Unit ID consistency:** ~~Mock data uses different `unit_id`s for the same unit at different timestamps.~~ **RESOLVED:** Mock timeline data now uses consistent `unit_id`s with multiple timestamped rows per unit, matching the Phase 3 `gold_units` pattern. The `getUnits(beforeDate)` function already deduplicates and returns one interpolated record per unit.

2. **Equipment table structure:** Mock data stores equipment as a flat JSON object keyed by `unit_id`. In Databricks, `gold_equipment` will be a proper table with `unit_id` as a column, joinable to `gold_units`. The `getEquipment(unitId)` function swap is straightforward — just a `SELECT * FROM gold_equipment WHERE unit_id = ?` query. The hierarchy walk-up logic (checking parent units for equipment data) can either stay client-side or move to a SQL CTE.

### Client-Side Interpolation (Phase 1, carries to Phase 3)

The data service includes linear interpolation logic for smooth unit movement between position snapshots. This is critical because historical data has gaps — even well-documented divisions only have daily or weekly position records.

#### How It Works
- `getUnits(beforeDate)` groups all timeline snapshots by `unit_id`, sorted by timestamp
- For a given date, it finds the two surrounding snapshots (before and after)
- Linearly interpolates: `lat`, `lng`, `troop_count`, `strength_percent`, `supply_level`, `combat_effectiveness`, `morale`
- If the date is before the unit's first snapshot, the unit doesn't appear (hasn't entered the theater yet)
- If the date is past the last snapshot, the latest known position is used

#### Anchor Snapshots
To prevent units from interpolating movement before they should (e.g., troops sliding across the Channel before embarkation), add "anchor" snapshots at the departure time with the same coordinates as the staging position. This holds the unit in place until the departure timestamp, then interpolation kicks in for the transit.

**Pattern:** If a unit departs at T, add a snapshot at T with the origin coordinates, and the next snapshot at T+N with the transit/destination coordinates. The unit stays put until T, then moves.

#### Phase 3 Considerations
- The interpolation logic stays client-side — Databricks provides the anchor points (Gold table rows), the front end fills gaps
- For units with sparse data (weekly positions), interpolation produces smooth movement on the timeline
- The `data_confidence` field should be set to `"estimated"` for interpolated positions if surfaced to the user
- Consider adding a server-side interpolation option via Databricks SQL if client-side performance degrades with thousands of units

#### Seeded Random Point Generation
`getTroopPoints()` uses a seeded pseudo-random number generator (based on unit ID hash) to scatter synthetic troop points around a unit's center coordinate. This ensures:
- Points are stable across re-renders (no jitter when timeline scrubs)
- Same unit always gets the same scatter pattern
- Points move smoothly with the interpolated center position
