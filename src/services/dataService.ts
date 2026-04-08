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

const allUnits: Unit[] = [
  ...hierarchicalUnitsRaw.map((u) => ({ ...u, echelon: u.echelon || "division", faction: u.faction as "allied" | "axis", parent_unit_id: u.parent_unit_id ?? null })),
  ...axisHierarchicalUnitsRaw.map((u) => ({ ...u, echelon: u.echelon || "division", faction: u.faction as "allied" | "axis", parent_unit_id: u.parent_unit_id ?? null })),
  ...alliedUnitsRaw.filter((u) => !hierarchicalIds.has(u.unit_id)).map((u) => ({ ...u, echelon: "division", faction: u.faction as "allied" | "axis", parent_unit_id: null })),
  ...axisUnitsRaw.filter((u) => !hierarchicalIds.has(u.unit_id)).map((u) => ({ ...u, echelon: "division", faction: u.faction as "allied" | "axis", parent_unit_id: null })),
];

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
  return allUnits.filter((u) => new Date(u.timestamp).getTime() <= ms);
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

    for (let i = 0; i < pointCount; i++) {
      const angle = (i / pointCount) * Math.PI * 2 + (Math.random() * 0.3);
      const dist = spread * Math.sqrt(Math.random());
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
