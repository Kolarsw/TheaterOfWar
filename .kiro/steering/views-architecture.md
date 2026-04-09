---
inclusion: always
---

# Views & Page Architecture

The app is structured around distinct views, each providing a different lens on the war. All views share a global top nav with: view switcher, mode toggle (Historical/Simulation), active date/time display, and global search.

## Mode Toggle
- **Historical Mode** (cyan accent border): Locked to real data. No editable parameters. This is the ground truth.
- **Simulation Mode** (amber accent border): Unlocks sliders and editable parameters. Users can adjust variables and see divergent outcomes. Always visually distinct from historical mode so there's no confusion.

---

## View 1: Strategic Command (Default — Globe Map)
The operational overview. You're a general looking at the big picture — where are the forces, what's the supply situation, what's contested.

### Top KPI Bar
Horizontal row of stat cards that update as the timeline scrubs:
- Total Allied Forces (personnel count)
- Total Axis Forces (personnel count)
- Active Supply Lines (count + total tonnage)
- Contested Territories (H3 hex count)
- Days Since [Key Event] (contextual — e.g., "Days Since D-Day")
- Allied vs Axis Casualty Rate (rolling 30-day)

### Map Layers (togglable)
- Hex Layer: territorial control + supply density
- Icon Layer: unit positions (NATO symbology)
- Arc Layer: supply routes (animated flow)
- Scatterplot Layer: battles/events

### Panels
- Left: OOB tree — **defaults to collapsed** on Command. Expandable for quick unit lookup and map navigation. Minimal footprint to leave room for future panels (event feed, alerts, etc.)
- Right: Layer toggles + detail panel (selected unit/event info)
- Bottom: Timeline scrubber (play/pause, speed, date range)

### Key Behavior
- OOB tree on Command is a lightweight navigation aid, not a management tool
- Clicking a unit in the tree selects it on the map and shows the detail panel
- Double-clicking flies to the unit's location
- Troop numbers in the tree update live as the timeline progresses

---

## View 2: Logistics Dashboard
Dedicated supply chain health view. Inspired by the Palantir "Common Operating Picture" layout.

### Layout
- **Top:** KPI cards — Total Tonnage Moving, Routes Disrupted, Fuel Reserves (%), Ammo Reserves (%), Food Reserves (%), Medical Supplies (%)
- **Center:** Map (half-height) showing supply arcs only, color-coded by status (active=cyan, disrupted=amber, severed=red)
- **Bottom:** Sortable, filterable data table of all supply routes
  - Columns: Route ID, Origin, Destination, Tonnage/Day, Supply Type, Status, Disruption Risk, Faction
- **Left Sidebar:** Filter panel — faction, supply type, theater, status, date range

### Simulation Mode Additions
- Sliders to adjust supply throughput multipliers per route
- "Disrupt Route" button to simulate bombing a supply line and see downstream effects
- Projected reserves chart showing burn rate vs resupply rate

---

## View 3: Order of Battle / Force Composition
The force management view. Granular organizational structure, unit readiness, equipment breakdowns, and command chain management. Less map-centric, more data-dense.

### Layout
- **Left:** Full interactive tree — Army Group → Army → Corps → Division → Regiment → Battalion → Company
  - Each node shows: unit name, strength %, supply level, combat effectiveness
  - Color-coded health indicators (green/amber/red)
  - Click to select, double-click to fly to on map
  - **Defaults to expanded** (unlike Command where it's collapsed)
- **Center:** Map zoomed to selected unit's location with subordinate units visible
- **Right:** Rich detail panel for selected unit
  - Personnel strength (current vs authorized)
  - Equipment status (tanks, artillery, vehicles — table format)
  - Supply levels by type (ammo, fuel, food, medical — bar charts)
  - Morale score
  - Recent engagements list
  - Command chain (parent + subordinate units, clickable)
  - Readiness comparison vs sibling units

### Simulation Mode Additions
- Drag-and-drop unit reassignment between commands
- Troop reinforcement sliders (adjust division strength)
- Equipment reallocation between units
- "What if this unit wasn't here?" toggle to remove units and see front-line impact

---

## View 4: Supply Dependency Network Graph
Visualizes the supply chain as a directed graph. Inspired by the Palantir Foundry ontology/network view.

### Layout
- **Full-screen node graph** showing the dependency chain:
  - Ports → Rail Junctions → Supply Depots → Front-line Units
  - Nodes sized by throughput volume
  - Edges show flow direction and volume
  - Color-coded by faction
- **Right Panel:** Selected node details (capacity, current throughput, dependent units)
- **Legend:** Node types, color coding, flow indicators

### Interactions
- Click a node to highlight all upstream and downstream dependencies
- "Sever Node" simulation: remove a rail junction or depot and see which front-line units lose supply (cascading failure visualization)
- Filter by supply type (ammo, fuel, food, medical)
- Time-animate to see how the network evolved over the war

---

## View 5: Theater Comparison Dashboard
Side-by-side analytics across theaters of war.

### Theaters
- Western Europe
- Eastern Front
- Pacific
- North Africa / Mediterranean
- Atlantic (naval/convoy)

### Visualizations
- Bar charts: troop strength by theater over time
- Line charts: casualty rates, supply throughput, territory controlled
- Stacked area charts: force composition (infantry, armor, air, naval) per theater
- Comparative KPI cards: each theater's current stats side by side

### Layout
- **Top:** Theater selector (tabs or cards)
- **Center:** Chart grid (2x2 or 3x2) with the selected comparison metrics
- **Bottom:** Summary table with all theaters' key stats

---

## View 6: Battle Detail View
Deep-dive into a specific battle or operation.

### Entry
- Click a battle event on the Strategic Command map, or select from a battle index

### Layout
- **Top:** Battle header — name, dates, factions, outcome, total casualties
- **Center:** Zoomed map of the engagement area with phase-by-phase unit positions
- **Right Panel:** Battle timeline (vertical) showing phases/events
  - Click a phase to update the map to that moment
- **Bottom:** Charts
  - Force strength over the battle's duration (both sides)
  - Casualty curve
  - Supply situation leading into and during the battle

### Data
- Links to involved units (click to jump to OOB view)
- Links to supply routes feeding the battle (click to jump to Logistics view)

### Planned Enhancement: Hierarchical Battle Drill-Down

Add nested battle scopes — Operation → Battle → Phase — so users can view an entire operation at the macro level before drilling into individual engagements.

#### Three Zoom Tiers

**Operation level** (e.g., "Operation Overlord"):
- Map shows the full operation area (entire Normandy coast)
- Phase timeline shows macro phases: airborne drops, naval bombardment, beach landings, counterattacks, beachhead consolidation
- Charts show aggregate force strength and casualties across all child battles combined
- Battle index lists child battles (Omaha, Utah, Sword, etc.) as clickable drill-down entries

**Battle level** (current implementation):
- Zoomed to one engagement area
- Phase timeline shows that battle's phases
- Charts show that battle's data
- "← Back to Operation" button returns to the parent operation view

**Phase level** (future, optional):
- Zoomed into a single phase showing individual unit movements
- Where H3 hex layer and sub-unit data would add the most value

#### Data Model Changes
- Add `parent_event_id` field to the Battle/Event Record contract (null for top-level operations, operation's event_id for child battles)
- Add operation-level phase data (macro phases spanning hours/days instead of minutes/hours)
- Aggregate strength/casualties computed from child battles' data

#### UI Changes
- Breadcrumb navigation at top of battle index: `Overlord > Omaha Beach > Pinned on Beach` — click any level to zoom out
- Battle index becomes hierarchical: operations at top level, expand to see child battles
- Phase panel, charts, and map zoom all respond to the current scope level
- Existing interpolation and chart logic carries over unchanged

#### Priority
After remaining Phase 1 views are complete. Becomes more valuable with multiple operations (Market Garden, Bulge, Barbarossa) where the drill-down hierarchy has real depth.

---

## View 7: Simulation Control Panel
The "what-if" cockpit. Only active in Simulation Mode.

### Global Simulation Parameters (sliders/inputs)
- Troop reinforcement rate multiplier (by faction)
- Supply throughput multiplier (global or per-route)
- Weather severity (affects movement speed, air operations)
- Air superiority percentage (by faction, by theater)
- Naval interdiction effectiveness
- Industrial production rate (affects long-term supply)
- Intelligence accuracy (affects fog of war in simulation)

### Controls
- "Run Forward" — simulate from current timeline position with adjusted parameters
- "Compare to Historical" — split-screen showing simulation vs actual outcome
- "Reset to Historical" — clear all simulation adjustments
- Snapshot/save simulation configurations for comparison

### Output
- Divergence indicators on the map (where simulation differs from history)
- Projected outcome probabilities
- "Critical Decision Points" — moments where small parameter changes produce large outcome shifts

---

## Navigation Structure
```
Top Nav Bar
├── [View Switcher] Strategic Command | Logistics | OOB | Network | Theaters | Battles | Simulation
├── [Mode Toggle] Historical (cyan) ←→ Simulation (amber)
├── [Date Display] Current timeline position
└── [Global Search] Search units, battles, locations
```

## Shared Components Across Views
- Timeline Scrubber (bottom bar, present in all map-containing views)
- KPI Card component (reusable, different data per view)
- Filter Sidebar component (reusable, different filter options per view)
- Data Table component (sortable, filterable, reusable)
- Detail Panel component (right sidebar, context-dependent content)
