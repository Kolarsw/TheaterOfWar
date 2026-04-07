---
inclusion: always
---

# UI/UX Design Language

## Aesthetic: Military Intelligence / Palantir Gotham
Every UI decision should reinforce the feel of a high-end intelligence analysis tool.

## Visual Principles
- **Dark mode only.** Deep charcoal/near-black backgrounds (#0a0a0f to #12121a range).
- **Desaturated base map.** Satellite or terrain imagery with reduced saturation so data layers pop.
- **High-contrast neon accents.** Primary: cyan (#00d4ff). Secondary: amber (#ffaa00). Alert: red (#ff3344).
- **Data density over whitespace.** Panels should feel information-rich. Think Bloomberg terminal, not Apple marketing.
- **Collapsible side panels** for entity details, OOB trees, and logistics breakdowns.
- **Minimal chrome.** Borders are subtle or absent. Separation comes from background shade differences and glow effects.

## Typography
- Monospace or semi-monospace for data readouts (e.g., JetBrains Mono, IBM Plex Mono).
- Sans-serif for labels and headings (e.g., Inter, DM Sans).
- Small font sizes are fine — this is a power-user tool, not a consumer app.

## Map Layers (Deck.gl)
- **HexagonLayer:** Terrain control, supply density. Use color ramps from dark blue (low) to cyan/amber (high).
- **IconLayer:** Troop positions using NATO APP-6 military symbology.
- **ArcLayer:** Supply lines between depots and front-line units. Animated flow direction.
- **ScatterplotLayer:** Point events (battles, airstrikes, key engagements).

## Key UI Components
- **Timeline Scrubber:** Full-width bar at bottom. Play/pause, speed control, date range display. Inspired by Kepler.gl.
- **Order of Battle Panel:** Collapsible left sidebar. Hierarchical tree of military units.
- **Detail Panel:** Right sidebar. Shows selected unit/event details, supply levels, combat effectiveness.
- **Legend/Filter Bar:** Top bar or floating panel for toggling layers and filtering by faction, unit type, date range.

## Interaction Patterns
- Click a unit on the map → Detail panel opens with full info.
- Hover over a supply arc → Tooltip shows tonnage, route, and status.
- Drag the timeline → All map layers filter to that date.
- Scroll to zoom, right-drag to tilt/rotate (3D perspective).

## Reference Inspirations
- Palantir Gotham/Foundry geospatial views
- Deck.gl gallery (Hexagon, Arc, Icon layers)
- Kepler.gl timeline scrubber
- Hearts of Iron IV / Command: Modern Operations (NATO symbology, OOB management)
