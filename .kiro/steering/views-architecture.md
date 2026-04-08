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
The main view. Full-screen globe/map with the timeline scrubber at the bottom.

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
- Left: Order of Battle tree (collapsible)
- Right: Detail panel (selected unit/event info)
- Bottom: Timeline scrubber (play/pause, speed, date range)

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
Hierarchical view of military organization and unit readiness.

### Layout
- **Left:** Interactive tree — Army Group → Army → Corps → Division → Regiment
  - Each node shows: unit name, strength %, supply level, combat effectiveness
  - Color-coded health indicators (green/amber/red)
  - Click to select, double-click to expand
- **Center:** Map zoomed to selected unit's location with subordinate units visible
- **Right:** Detail panel for selected unit
  - Personnel strength (current vs authorized)
  - Equipment status (tanks, artillery, vehicles)
  - Supply levels by type
  - Morale score
  - Recent engagements
  - Command chain (parent + subordinate units)

### Simulation Mode Additions
- Drag-and-drop unit reassignment between commands
- Troop reinforcement sliders (adjust division strength)
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
