---
inclusion: always
---

# Data Contracts

These define the JSON structures the front end expects. Phase 1 uses mock data matching these contracts. Phase 2 Databricks Gold tables must output data conforming to these shapes.

## Unit Position Record
```json
{
  "unit_id": "string",
  "unit_name": "string",
  "faction": "allied | axis",
  "unit_type": "infantry | armor | artillery | airborne | naval | logistics",
  "echelon": "division | regiment | battalion | company",
  "nato_symbol_code": "string (APP-6 SIDC)",
  "parent_unit_id": "string | null",
  "timestamp": "ISO 8601 datetime",
  "h3_index": "string (H3 resolution 5-7)",
  "lat": "number | null",
  "lng": "number | null",
  "troop_count": "number | null",
  "strength_percent": "number (0-100) | null",
  "supply_level": "number (0-100) | null",
  "combat_effectiveness": "number (0-100) | null",
  "morale": "number (0-100) | null",
  "data_confidence": "high | medium | low | estimated",
  "data_source": "string | null"
}
```

## Supply Line Record
```json
{
  "supply_line_id": "string",
  "faction": "allied | axis",
  "source_h3": "string",
  "source_lat": "number",
  "source_lng": "number",
  "target_h3": "string",
  "target_lat": "number",
  "target_lng": "number",
  "tonnage_per_day": "number",
  "supply_type": "ammunition | fuel | food | medical | mixed",
  "status": "active | disrupted | severed",
  "timestamp": "ISO 8601 datetime"
}
```

## Battle/Event Record
```json
{
  "event_id": "string",
  "parent_event_id": "string | null",
  "event_name": "string",
  "event_type": "battle | bombing | naval_engagement | airborne_operation | siege",
  "timestamp_start": "ISO 8601 datetime",
  "timestamp_end": "ISO 8601 datetime",
  "h3_index": "string",
  "lat": "number",
  "lng": "number",
  "factions_involved": ["string"],
  "units_involved": ["string (unit_ids)"],
  "outcome": "allied_victory | axis_victory | inconclusive | ongoing",
  "casualties_allied": "number",
  "casualties_axis": "number",
  "description": "string"
}
```

## Territory Control Record
```json
{
  "region_id": "string (GADM GID_2 code, e.g. 'FRA.4.1_1' for Calvados)",
  "region_name": "string",
  "country_code": "string (ISO 3166-1 alpha-3, e.g. 'FRA')",
  "admin_level": "number (0=country, 1=state/region, 2=department/county)",
  "timestamp": "ISO 8601 datetime",
  "controlling_faction": "allied | axis | contested | neutral",
  "supply_density": "number",
  "terrain_type": "urban | forest | plains | mountain | coastal | river_crossing"
}
```

### Territory Control — Geometry Strategy

**Phase 1 (Current):** Bundle simplified GADM GeoJSON per country at admin level 2 (department/county). Start with France for Normandy. Geometry files are static assets loaded as GeoJSON sources in Mapbox. ~2MB per country simplified.

**Phase 3 (Target):** Upload full GADM dataset to Mapbox as a custom vector tileset. Swap the GeoJSON source to a vector tile source — one-line change from `type: "geojson"` to `type: "vector"` with a tileset URL. Only visible tiles load at the current zoom/viewport. Zero bundle size, scales to the whole world.

**Zoom-based rendering:**
- Zoom < 5: Country-level fills (admin level 0) — entire countries colored by controlling faction
- Zoom 5-9: Department-level fills (admin level 2) — sub-national regions colored by faction, front line implied by color boundaries
- Zoom 9+: Department fills + front line polyline — derived from edges where allied and axis regions meet

**Data model:** The control data (`region_id` + `timestamp` + `faction`) stays the same regardless of geometry source. Components call `getTerritoryControl(beforeDate)`, which returns the latest faction assignment per region. The geometry is joined client-side.

**GADM data source:** https://gadm.org — free, global coverage, stable region IDs, multiple admin levels. GID codes are hierarchical (e.g., `FRA.4_1` = Calvados, France).

## Supply Dependency Node
```json
{
  "node_id": "string",
  "node_type": "port | rail_junction | supply_depot | front_line_unit",
  "name": "string",
  "faction": "allied | axis",
  "h3_index": "string",
  "lat": "number",
  "lng": "number",
  "capacity_tons_per_day": "number",
  "current_throughput_tons_per_day": "number",
  "upstream_node_ids": ["string"],
  "downstream_node_ids": ["string"],
  "timestamp": "ISO 8601 datetime"
}
```

## Theater Summary Record
```json
{
  "theater": "western_europe | eastern_front | pacific | north_africa | atlantic",
  "timestamp": "ISO 8601 datetime",
  "allied_strength": "number",
  "axis_strength": "number",
  "allied_casualties_30d": "number",
  "axis_casualties_30d": "number",
  "supply_throughput_tons": "number",
  "contested_hexes": "number",
  "allied_controlled_hexes": "number",
  "axis_controlled_hexes": "number"
}
```

## Simulation Parameters
```json
{
  "simulation_id": "string",
  "base_timestamp": "ISO 8601 datetime",
  "parameters": {
    "troop_reinforcement_multiplier": { "allied": "number", "axis": "number" },
    "supply_throughput_multiplier": "number",
    "weather_severity": "number (0-100)",
    "air_superiority": { "allied": "number (0-100)", "axis": "number (0-100)" },
    "naval_interdiction_effectiveness": "number (0-100)",
    "industrial_production_rate": { "allied": "number", "axis": "number" },
    "intelligence_accuracy": { "allied": "number (0-100)", "axis": "number (0-100)" }
  }
}
```

## Time Range
All mock data and queries should support filtering by a `[start_timestamp, end_timestamp]` range. The timeline scrubber drives this filter globally.

## Mode Context
All views respect the global mode toggle:
- **Historical Mode:** Data is read-only, sourced from Gold tables or mock JSON.
- **Simulation Mode:** Parameters become editable. Simulation results are computed client-side (Phase 1) or via Databricks Model Serving (Phase 3) and displayed alongside or instead of historical data.
