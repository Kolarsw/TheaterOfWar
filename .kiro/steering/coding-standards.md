---
inclusion: always
---

# Coding Standards

## General
- TypeScript strict mode for all frontend code.
- Python 3.11+ for all backend/scraper code.
- Prefer functional components and hooks in React.
- No class components.

## Frontend (Next.js)
- App Router (not Pages Router).
- CSS: Tailwind CSS with custom dark theme tokens matching the design language.
- State: Zustand for global state (timeline position, selected unit, active filters).
- Map: Mapbox GL JS as the base map, Deck.gl overlay layers rendered via @deck.gl/mapbox integration.
- Data fetching: React Query (TanStack Query) for async data in Phase 3. Direct JSON imports for Phase 1 mock data.
- File structure: feature-based organization (e.g., `features/map/`, `features/timeline/`, `features/oob-panel/`).

## Naming Conventions
- Components: PascalCase (`TimelineScrubber.tsx`)
- Utilities/hooks: camelCase (`useTimelineState.ts`)
- Data files: kebab-case (`mock-units.json`)
- Constants: UPPER_SNAKE_CASE

## Performance
- Deck.gl layers should use data accessors, not inline functions in render.
- Memoize expensive computations (H3 lookups, filtered datasets).
- Debounce timeline scrubber updates to avoid excessive re-renders.

## Accessibility Notes
- While this is a power-user tool, maintain keyboard navigability for panels and controls.
- Provide aria-labels on interactive map controls.
- Timeline scrubber should be operable via keyboard.
