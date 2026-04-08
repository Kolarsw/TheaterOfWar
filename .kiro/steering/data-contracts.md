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
  "nato_symbol_code": "string (APP-6 SIDC)",
  "parent_unit_id": "string | null",
  "timestamp": "ISO 8601 datetime",
  "h3_index": "string (H3 resolution 5-7)",
  "lat": "number",
  "lng": "number",
  "strength_percent": "number (0-100)",
  "supply_level": "number (0-100)",
  "combat_effectiveness": "number (0-100)",
  "morale": "number (0-100)"
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

## Terrain/Control Record
```json
{
  "h3_index": "string",
  "timestamp": "ISO 8601 datetime",
  "controlling_faction": "allied | axis | contested | neutral",
  "supply_density": "number",
  "terrain_type": "urban | forest | plains | mountain | coastal | river_crossing"
}
```

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
