"use client";

import { useAppStore } from "@/stores/useAppStore";
import alliedUnits from "@/data/mock-units.json";
import axisUnits from "@/data/mock-units-axis.json";
import hierarchicalUnits from "@/data/mock-units-hierarchical.json";
import axisHierarchicalUnits from "@/data/mock-units-axis-hierarchical.json";

const CYAN = "#00d4ff";
const AMBER = "#ffaa00";
const RED = "#ff3344";

interface Unit {
  unit_id: string;
  unit_name: string;
  faction: string;
  unit_type: string;
  troop_count: number;
  strength_percent: number;
  supply_level: number;
  combat_effectiveness: number;
  morale: number;
  lat: number;
  lng: number;
}

const hierarchicalIds = new Set([...hierarchicalUnits, ...axisHierarchicalUnits].map((u) => u.unit_id));
const allUnits: Unit[] = [
  ...hierarchicalUnits as Unit[],
  ...axisHierarchicalUnits as Unit[],
  ...alliedUnits.filter((u) => !hierarchicalIds.has(u.unit_id)) as Unit[],
  ...axisUnits.filter((u) => !hierarchicalIds.has(u.unit_id)) as Unit[],
];

function StatRow({ label, value, accent }: { label: string; value: string | null | undefined; accent: string }) {
  const isNullValue = value === null || value === undefined || value === "—";
  return (
    <div className="flex justify-between items-center">
      <span className="text-[10px] font-mono text-foreground/40 uppercase tracking-wide">{label}</span>
      <span
        className="text-xs font-mono"
        style={{ color: isNullValue ? "rgba(224,224,224,0.2)" : accent }}
      >
        {isNullValue ? "—" : value}
      </span>
    </div>
  );
}

export default function UnitDetailPanel() {
  const mode = useAppStore((s) => s.mode);
  const selectedUnitId = useAppStore((s) => s.selectedUnitId);
  const accent = mode === "historical" ? CYAN : AMBER;
  const borderColor = mode === "historical"
    ? "rgba(0, 212, 255, 0.35)"
    : "rgba(255, 170, 0, 0.35)";

  const selectedUnit = selectedUnitId
    ? allUnits.find((u) => u.unit_id === selectedUnitId)
    : null;

  if (!selectedUnit) return null;

  const factionColor = selectedUnit.faction === "allied" ? CYAN : RED;

  return (
    <div className="absolute top-2 right-4 z-10 w-72 mt-40">
      <div
        className="bg-panel/35 backdrop-blur-sm rounded-lg p-4"
        style={{ border: `2px solid ${borderColor}` }}
      >
        <h2
          className="text-xs font-mono tracking-widest uppercase mb-3"
          style={{ color: factionColor }}
        >
          {selectedUnit.unit_name}
        </h2>
        <div className="space-y-2">
          <StatRow label="Faction" value={selectedUnit.faction.toUpperCase()} accent={factionColor} />
          <StatRow label="Type" value={selectedUnit.unit_type.toUpperCase()} accent={factionColor} />
          <StatRow label="Troops" value={selectedUnit.troop_count.toLocaleString()} accent={factionColor} />
          <StatRow label="Strength" value={`${selectedUnit.strength_percent}%`} accent={factionColor} />
          <StatRow label="Supply" value={`${selectedUnit.supply_level}%`} accent={factionColor} />
          <StatRow label="Combat Eff." value={`${selectedUnit.combat_effectiveness}%`} accent={factionColor} />
          <StatRow label="Morale" value={`${selectedUnit.morale}%`} accent={factionColor} />
          <StatRow label="Position" value={`${selectedUnit.lat.toFixed(2)}°N, ${Math.abs(selectedUnit.lng).toFixed(2)}°W`} accent={factionColor} />
        </div>
      </div>
    </div>
  );
}
