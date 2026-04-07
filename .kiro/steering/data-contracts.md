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

## Time Range
All mock data and queries should support filtering by a `[start_timestamp, end_timestamp]` range. The timeline scrubber drives this filter globally.
