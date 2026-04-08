---
inclusion: always
---

# Data Confidence & Graceful Handling

## Reality of WWII Data Availability

### Well-Documented (high confidence)
- Division-level OOB: which divisions were where, when
- Major battle dates, locations, outcomes, casualty figures
- Equipment tables of organization (authorized strength)
- Strategic supply tonnage (army/theater level)

### Partially Available (medium confidence)
- Regiment/battalion positions and movements (patchy, especially Axis late-war)
- Actual equipment counts at specific dates (from after-action reports, not continuous)
- Supply levels by type at army/corps level (rarely division-level daily)
- Morale indicators (subjective, from unit histories and intelligence reports)

### Hard to Source (low confidence / estimated)
- Company-level positions on specific dates (rare outside well-studied battles)
- Real-time supply levels per unit per day
- Combat effectiveness as a numeric score (modern analytical concept, not tracked in WWII)
- Hourly/daily position updates for most units (weekly is realistic for many)

### General Rule
- Division-level, weekly granularity = solid data
- Regiment-level for major operations = doable
- Below regiment = increasingly interpolated/estimated
- Fields like `combat_effectiveness` and `morale` = modeled, not sourced directly

## Data Confidence Field

Every record should include:
```json
{
  "data_confidence": "high | medium | low | estimated"
}
```

- `high`: Sourced directly from primary/secondary historical records
- `medium`: Derived from partial records with reasonable inference
- `low`: Interpolated from sparse data points
- `estimated`: AI-generated or modeled (e.g., LLM extraction from narrative sources)

## Graceful Null Handling

### UI Rules
- Any field with a `null` or missing value renders as "—" in muted foreground/20 style
- Detail panel sections with ALL null fields in a group should not render that group at all
- KPI cards with null values show "—" instead of 0
- Equipment tables skip rows where both authorized and operational are null
- Supply breakdown bars don't render for null supply types
- Tooltips omit null fields rather than showing "null" or "0"

### Validation (Phase 2/3)
- When live data is connected, add a `data_source` field to each record tracking provenance
- Build a data quality dashboard (could be a view or a panel) showing:
  - % of records at each confidence level
  - Fields with highest null rates
  - Units/time periods with sparse coverage
- Flag records where confidence changed between pipeline runs

## User-Facing Disclaimer

### Zoom-Level Disclaimer
Rather than badging every icon, use a contextual disclaimer approach:
- At strategic zoom (zoom < 6): No disclaimer needed — data is solid at this level
- At operational zoom (zoom 6-9): Subtle one-line disclaimer in the bottom-left corner: "Operational-level data. Some positions interpolated."
- At tactical zoom (zoom 10+): Disclaimer updates to: "Tactical-level data. Positions and unit details are estimated where primary sources are unavailable."

### Legend Entry
The Layer Toggles panel should include a small "Data Quality" section (collapsible) explaining:
- What "estimated" means in this context
- That division-level data is well-sourced
- That sub-unit positions are approximated
- Link to methodology (future: a docs page)

### Detail Panel
- When showing a unit with `data_confidence: "low"` or `"estimated"`, add a small muted line at the bottom: "Some fields estimated from available records"
- Do NOT show this for high/medium confidence units
