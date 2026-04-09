/**
 * Data Service Layer
 *
 * Thin abstraction between UI components and data sources.
 * Phase 1: Returns mock JSON data.
 * Phase 3: Will call Databricks SQL Statement Execution API.
 *
 * Components should NEVER import data files directly — always use these functions.
 */

import alliedUnitsRaw from "@/data/mock-units.json";
import axisUnitsRaw from "@/data/mock-units-axis.json";
import hierarchicalUnitsRaw from "@/data/mock-units-hierarchical.json";
import axisHierarchicalUnitsRaw from "@/data/mock-units-axis-hierarchical.json";
import equipmentDataRaw from "@/data/mock-equipment.json";
import supplyLinesRaw from "@/data/mock-supply-lines.json";
import timelineUnitsRaw from "@/data/mock-units-timeline.json";
import eventsRaw from "@/data/mock-events.json";
import battlePhasesRaw from "@/data/mock-battle-phases.json";

// ─── Types ───────────────────────────────────────────────────────────

export interface Unit {
  unit_id: string;
  unit_name: string;
  faction: "allied" | "axis";
  unit_type: string;
  echelon: string;
  parent_unit_id: string | null;
  timestamp: string;
  lat: number;
  lng: number;
  troop_count: number;
  strength_percent: number;
  supply_level: number;
  combat_effectiveness: number;
  morale: number;
  data_confidence?: "high" | "medium" | "low" | "estimated";
}

export interface EquipmentEntry {
  personnel: { authorized: number; current: number };
  equipment: Record<string, { authorized: number; operational: number }>;
  supply_breakdown: Record<string, number>;
  recent_engagements: string[];
  command_chain: { parent: string; subordinates: string[] };
}

export interface UnitNode extends Unit {
  children: UnitNode[];
}

// ─── Internal Data Assembly ──────────────────────────────────────────

const hierarchicalIds = new Set([
  ...hierarchicalUnitsRaw.map((u) => u.unit_id),
  ...axisHierarchicalUnitsRaw.map((u) => u.unit_id),
]);

// Build all unit records — hierarchical first, then base, then timeline
const allUnits: Unit[] = [
  ...hierarchicalUnitsRaw.map((u) => ({ ...u, echelon: u.echelon || "division", faction: u.faction as "allied" | "axis", parent_unit_id: u.parent_unit_id ?? null })),
  ...axisHierarchicalUnitsRaw.map((u) => ({ ...u, echelon: u.echelon || "division", faction: u.faction as "allied" | "axis", parent_unit_id: u.parent_unit_id ?? null })),
  ...alliedUnitsRaw.filter((u) => !hierarchicalIds.has(u.unit_id)).map((u) => ({ ...u, echelon: "division", faction: u.faction as "allied" | "axis", parent_unit_id: null })),
  ...axisUnitsRaw.filter((u) => !hierarchicalIds.has(u.unit_id)).map((u) => ({ ...u, echelon: "division", faction: u.faction as "allied" | "axis", parent_unit_id: null })),
  ...timelineUnitsRaw.map((u) => ({ ...u, echelon: "division", faction: u.faction as "allied" | "axis", parent_unit_id: null })),
];

// ─── Timeline Index for Interpolation ────────────────────────────────
// Group timeline snapshots by unit_id, sorted by timestamp
const timelineIndex = new Map<string, Unit[]>();
timelineUnitsRaw.forEach((raw) => {
  const u: Unit = { ...raw, echelon: "division", faction: raw.faction as "allied" | "axis", parent_unit_id: null };
  if (!timelineIndex.has(u.unit_id)) timelineIndex.set(u.unit_id, []);
  timelineIndex.get(u.unit_id)!.push(u);
});
timelineIndex.forEach((snapshots) => {
  snapshots.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
});

// IDs that have timeline data — these get interpolated instead of simple filtering
const timelineUnitIds = new Set(timelineIndex.keys());

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateUnit(snapshots: Unit[], dateMs: number): Unit | null {
  if (snapshots.length === 0) return null;
  const firstMs = new Date(snapshots[0].timestamp).getTime();
  if (dateMs < firstMs) return null; // unit hasn't appeared yet

  // Find the two surrounding snapshots
  let before = snapshots[0];
  let after: Unit | null = null;
  for (let i = 0; i < snapshots.length; i++) {
    const ms = new Date(snapshots[i].timestamp).getTime();
    if (ms <= dateMs) {
      before = snapshots[i];
      after = snapshots[i + 1] || null;
    } else {
      break;
    }
  }

  if (!after) return { ...before }; // past the last snapshot, use latest

  const beforeMs = new Date(before.timestamp).getTime();
  const afterMs = new Date(after.timestamp).getTime();
  const t = (dateMs - beforeMs) / (afterMs - beforeMs);

  return {
    ...before,
    timestamp: new Date(dateMs).toISOString(),
    lat: lerp(before.lat, after.lat, t),
    lng: lerp(before.lng, after.lng, t),
    troop_count: Math.round(lerp(before.troop_count, after.troop_count, t)),
    strength_percent: Math.round(lerp(before.strength_percent, after.strength_percent, t)),
    supply_level: Math.round(lerp(before.supply_level, after.supply_level, t)),
    combat_effectiveness: Math.round(lerp(before.combat_effectiveness, after.combat_effectiveness, t)),
    morale: Math.round(lerp(before.morale, after.morale, t)),
  };
}

const equipmentData = equipmentDataRaw as Record<string, EquipmentEntry>;

// Parent lookup for hierarchy traversal
const parentMap = new Map<string, string | null>();
[...hierarchicalUnitsRaw, ...axisHierarchicalUnitsRaw].forEach((u) => {
  parentMap.set(u.unit_id, u.parent_unit_id ?? null);
});

// Equipment IDs for quick lookup
const equipmentUnitIds = new Set(Object.keys(equipmentData));

// ─── Unit Data Functions ─────────────────────────────────────────────

export function getUnits(beforeDate?: string): Unit[] {
  if (!beforeDate) return allUnits;
  const ms = new Date(beforeDate).getTime();

  // Get non-timeline units that are before the date
  const staticUnits = allUnits
    .filter((u) => !timelineUnitIds.has(u.unit_id) && new Date(u.timestamp).getTime() <= ms);

  // Get interpolated timeline units
  const interpolated: Unit[] = [];
  timelineIndex.forEach((snapshots) => {
    const unit = interpolateUnit(snapshots, ms);
    if (unit) interpolated.push(unit);
  });

  // Deduplicate: timeline units override static units with the same unit_id
  const interpolatedIds = new Set(interpolated.map((u) => u.unit_id));
  const deduped = staticUnits.filter((u) => !interpolatedIds.has(u.unit_id));

  return [...deduped, ...interpolated];
}

export function getUnitById(unitId: string): Unit | undefined {
  return allUnits.find((u) => u.unit_id === unitId);
}

export function getUnitsByFaction(faction: "allied" | "axis", beforeDate?: string): Unit[] {
  return getUnits(beforeDate).filter((u) => u.faction === faction);
}

export function getRootDivisionId(unitId: string): string {
  let current = unitId;
  let parent = parentMap.get(current);
  while (parent) {
    current = parent;
    parent = parentMap.get(current);
  }
  return current;
}

export function hasEquipmentData(unitId: string): boolean {
  if (equipmentUnitIds.has(unitId)) return true;
  // Walk up hierarchy
  let current = unitId;
  let parent = parentMap.get(current);
  while (parent) {
    if (equipmentUnitIds.has(parent)) return true;
    current = parent;
    parent = parentMap.get(current);
  }
  return false;
}

// ─── Equipment Functions ─────────────────────────────────────────────

export function getEquipment(unitId: string): EquipmentEntry | undefined {
  // Direct match
  if (equipmentData[unitId]) return equipmentData[unitId];
  // Walk up hierarchy
  let current = unitId;
  let parent = parentMap.get(current);
  while (parent) {
    if (equipmentData[parent]) return equipmentData[parent];
    current = parent;
    parent = parentMap.get(current);
  }
  return undefined;
}

// ─── Hierarchy Functions ─────────────────────────────────────────────

export function getUnitHierarchy(): { allied: UnitNode[]; axis: UnitNode[] } {
  const map = new Map<string, UnitNode>();
  const roots: UnitNode[] = [];

  allUnits.forEach((u) => {
    map.set(u.unit_id, { ...u, children: [] });
  });

  allUnits.forEach((u) => {
    const node = map.get(u.unit_id)!;
    if (u.parent_unit_id && map.has(u.parent_unit_id)) {
      map.get(u.parent_unit_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return {
    allied: roots.filter((r) => r.faction === "allied"),
    axis: roots.filter((r) => r.faction === "axis"),
  };
}

// ─── Map Visualization Functions ─────────────────────────────────────

/**
 * Simple seeded random number generator for stable point positions.
 * Same seed always produces the same sequence.
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Generate GeoJSON points for map rendering.
 *
 * Phase 1: Client-side synthetic point generation at 1:500 scale.
 * Phase 3: Will be replaced with H3 hex cell data from Databricks.
 *
 * The return shape (GeoJSON FeatureCollection) stays the same either way.
 */
export function getTroopPoints(beforeDate?: string): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const filtered = getUnits(beforeDate);

  filtered.forEach((u) => {
    const pointCount = Math.max(1, Math.round(u.troop_count / 500));
    const spread = Math.min(0.02, 0.002 + (u.troop_count / 500000));
    // Seed based on unit_id hash for stable positions per unit
    let hash = 0;
    for (let c = 0; c < u.unit_id.length; c++) {
      hash = ((hash << 5) - hash + u.unit_id.charCodeAt(c)) | 0;
    }
    const rng = seededRandom(Math.abs(hash) + 1);

    for (let i = 0; i < pointCount; i++) {
      const angle = (i / pointCount) * Math.PI * 2 + (rng() * 0.3);
      const dist = spread * Math.sqrt(rng());
      const lng = u.lng + Math.cos(angle) * dist;
      const lat = u.lat + Math.sin(angle) * dist;

      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, lat] },
        properties: {
          unit_id: u.unit_id,
          unit_name: u.unit_name,
          faction: u.faction,
          unit_type: u.unit_type,
          troop_count: u.troop_count,
          strength_percent: u.strength_percent,
          point_troops: Math.round(u.troop_count / pointCount),
          root_division_id: getRootDivisionId(u.unit_id),
        },
      });
    }
  });

  return { type: "FeatureCollection", features };
}

// ─── KPI Functions ───────────────────────────────────────────────────

export interface FactionStats {
  unitCount: number;
  troopCount: number;
  avgSupply: number;
}

export function getFactionStats(faction: "allied" | "axis", beforeDate?: string): FactionStats {
  const units = getUnitsByFaction(faction, beforeDate)
    .filter((u) => u.echelon === "division"); // Only count division-level to avoid double-counting
  const count = units.length;
  return {
    unitCount: count,
    troopCount: units.reduce((s, u) => s + u.troop_count, 0),
    avgSupply: count > 0 ? Math.round(units.reduce((s, u) => s + u.supply_level, 0) / count) : 0,
  };
}


// ─── Supply Line Types & Functions ───────────────────────────────────

export interface SupplyLine {
  supply_line_id: string;
  faction: "allied" | "axis";
  source_name: string;
  source_lat: number;
  source_lng: number;
  target_name: string;
  target_lat: number;
  target_lng: number;
  tonnage_per_day: number;
  supply_type: "ammunition" | "fuel" | "food" | "medical" | "mixed" | "troops";
  transport_mode?: "air" | "sea" | "land";
  status: "active" | "disrupted" | "severed";
  timestamp: string;
}

const allSupplyLines: SupplyLine[] = supplyLinesRaw as SupplyLine[];

export function getSupplyLines(beforeDate?: string): SupplyLine[] {
  if (!beforeDate) return allSupplyLines;
  const ms = new Date(beforeDate).getTime();
  return allSupplyLines.filter((sl) => new Date(sl.timestamp).getTime() <= ms);
}

export function getSupplyLinesByFaction(faction: "allied" | "axis", beforeDate?: string): SupplyLine[] {
  return getSupplyLines(beforeDate).filter((sl) => sl.faction === faction);
}

export function getSupplyLinesByStatus(status: "active" | "disrupted" | "severed", beforeDate?: string): SupplyLine[] {
  return getSupplyLines(beforeDate).filter((sl) => sl.status === status);
}

export interface SupplyStats {
  totalRoutes: number;
  activeRoutes: number;
  disruptedRoutes: number;
  severedRoutes: number;
  totalTonnage: number;
  tonnageByType: Record<string, number>;
}

export function getSupplyStats(beforeDate?: string): SupplyStats {
  const lines = getSupplyLines(beforeDate);
  const active = lines.filter((l) => l.status === "active");
  const tonnageByType: Record<string, number> = {};
  active.forEach((l) => {
    tonnageByType[l.supply_type] = (tonnageByType[l.supply_type] || 0) + l.tonnage_per_day;
  });

  return {
    totalRoutes: lines.length,
    activeRoutes: active.length,
    disruptedRoutes: lines.filter((l) => l.status === "disrupted").length,
    severedRoutes: lines.filter((l) => l.status === "severed").length,
    totalTonnage: active.reduce((s, l) => s + l.tonnage_per_day, 0),
    tonnageByType,
  };
}

/**
 * Interpolate points along a great circle between two coordinates.
 * For air routes, adds vertical bow to exaggerate the arc.
 */
function interpolateGreatCircle(
  start: [number, number],
  end: [number, number],
  steps: number = 30,
  bowFactor: number = 0
): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const [lng1, lat1] = start;
  const [lng2, lat2] = end;
  const φ1 = toRad(lat1), λ1 = toRad(lng1);
  const φ2 = toRad(lat2), λ2 = toRad(lng2);
  const d = 2 * Math.asin(Math.sqrt(
    Math.sin((φ2 - φ1) / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2
  ));
  if (d < 0.0001) return [start, end];

  // Calculate perpendicular offset direction for bowing
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;
  const dx = lng2 - lng1;
  const dy = lat2 - lat1;
  // Perpendicular direction (rotated 90 degrees)
  const perpLng = -dy;
  const perpLat = dx;
  const perpLen = Math.sqrt(perpLng * perpLng + perpLat * perpLat);

  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const a = Math.sin((1 - f) * d) / Math.sin(d);
    const b = Math.sin(f * d) / Math.sin(d);
    const x = a * Math.cos(φ1) * Math.cos(λ1) + b * Math.cos(φ2) * Math.cos(λ2);
    const y = a * Math.cos(φ1) * Math.sin(λ1) + b * Math.cos(φ2) * Math.sin(λ2);
    const z = a * Math.sin(φ1) + b * Math.sin(φ2);
    let ptLng = toDeg(Math.atan2(y, x));
    let ptLat = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)));

    // Add bow offset (parabolic — max at midpoint)
    if (bowFactor > 0 && perpLen > 0) {
      const bowAmount = bowFactor * 4 * f * (1 - f); // parabola peaking at 0.5
      ptLng += (perpLng / perpLen) * bowAmount;
      ptLat += (perpLat / perpLen) * bowAmount;
    }

    points.push([ptLng, ptLat]);
  }
  return points;
}

/**
 * Generate GeoJSON for supply line arcs with great circle interpolation.
 */
export function getSupplyLineGeoJSON(beforeDate?: string): GeoJSON.FeatureCollection {
  const lines = getSupplyLines(beforeDate);
  return {
    type: "FeatureCollection",
    features: lines.map((sl) => {
      // Air routes get subtle arc, sea gets slight, land stays flat
      const bowFactor = sl.transport_mode === "air" ? 0.6
        : sl.transport_mode === "sea" ? 0.15
        : 0;
      return {
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: interpolateGreatCircle(
            [sl.source_lng, sl.source_lat],
            [sl.target_lng, sl.target_lat],
            30,
            bowFactor
          ),
        },
      properties: {
        supply_line_id: sl.supply_line_id,
        faction: sl.faction,
        source_name: sl.source_name,
        target_name: sl.target_name,
        tonnage_per_day: sl.tonnage_per_day,
        supply_type: sl.supply_type,
        transport_mode: sl.transport_mode || "land",
        status: sl.status,
      },
    };
    }),
  };
}


/**
 * Generate GeoJSON points at the destination of each supply line for arrowheads.
 * Includes bearing from second-to-last point to last point for rotation.
 */
export function getSupplyLineArrowheads(beforeDate?: string): GeoJSON.FeatureCollection {
  const lines = getSupplyLines(beforeDate);
  return {
    type: "FeatureCollection",
    features: lines.map((sl) => {
      const bowFactor = sl.transport_mode === "air" ? 0.6
        : sl.transport_mode === "sea" ? 0.15
        : 0;
      const coords = interpolateGreatCircle(
        [sl.source_lng, sl.source_lat],
        [sl.target_lng, sl.target_lat],
        30,
        bowFactor
      );
      // Calculate bearing from second-to-last to last point
      // Place arrowhead at the very end of the arc
      const arrowPoint = coords[coords.length - 1];
      const prev = coords[coords.length - 2] || coords[0];
      // Bearing in degrees clockwise from north, offset -90 because arrow image points east
      const bearing = Math.atan2(arrowPoint[0] - prev[0], arrowPoint[1] - prev[1]) * (180 / Math.PI) - 90;

      return {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: arrowPoint },
        properties: {
          faction: sl.faction,
          supply_type: sl.supply_type,
          status: sl.status,
          bearing,
        },
      };
    }),
  };
}

// ─── Event/Battle Types & Functions ──────────────────────────────────

export interface BattleEvent {
  event_id: string;
  event_name: string;
  event_type: "battle" | "bombing" | "naval_engagement" | "airborne_operation" | "siege";
  timestamp_start: string;
  timestamp_end: string;
  h3_index: string;
  lat: number;
  lng: number;
  factions_involved: string[];
  units_involved: string[];
  outcome: "allied_victory" | "axis_victory" | "inconclusive" | "ongoing";
  casualties_allied: number | null;
  casualties_axis: number | null;
  description: string;
  data_confidence: "high" | "medium" | "low" | "estimated";
}

const allEvents: BattleEvent[] = eventsRaw as BattleEvent[];

export function getEvents(beforeDate?: string): BattleEvent[] {
  if (!beforeDate) return allEvents;
  const ms = new Date(beforeDate).getTime();
  return allEvents.filter((e) => new Date(e.timestamp_start).getTime() <= ms);
}

export function getEventById(eventId: string): BattleEvent | undefined {
  return allEvents.find((e) => e.event_id === eventId);
}

export function getEventGeoJSON(beforeDate?: string): GeoJSON.FeatureCollection {
  const events = getEvents(beforeDate);
  return {
    type: "FeatureCollection",
    features: events.map((e) => {
      // Sum troop counts of all involved units
      const totalTroops = e.units_involved.reduce((sum, uid) => {
        const unit = getUnitById(uid);
        return sum + (unit?.troop_count || 0);
      }, 0);
      const totalCasualties = (e.casualties_allied || 0) + (e.casualties_axis || 0);
      const significance = totalTroops + totalCasualties * 8;

      return {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [e.lng, e.lat] },
        properties: {
          event_id: e.event_id,
          event_name: e.event_name,
          event_type: e.event_type,
          outcome: e.outcome,
          casualties_allied: e.casualties_allied,
          casualties_axis: e.casualties_axis,
          factions: e.factions_involved.join(","),
          timestamp_start: e.timestamp_start,
          timestamp_end: e.timestamp_end,
          total_troops: totalTroops,
          significance,
        },
      };
    }),
  };
}

// ─── Battle Phase Types & Functions ──────────────────────────────────

export interface BattlePhase {
  phase_id: string;
  phase_name: string;
  timestamp: string;
  description: string;
  allied_strength: number;
  axis_strength: number;
  allied_casualties_cumulative: number;
  axis_casualties_cumulative: number;
}

const allBattlePhases: Record<string, BattlePhase[]> = battlePhasesRaw as Record<string, BattlePhase[]>;

export function getBattlePhases(eventId: string): BattlePhase[] {
  return allBattlePhases[eventId] || [];
}
