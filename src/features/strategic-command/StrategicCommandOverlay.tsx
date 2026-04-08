"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/useAppStore";
import KpiCard from "@/components/KpiCard";
import alliedUnits from "@/data/mock-units.json";
import axisUnits from "@/data/mock-units-axis.json";

const CYAN = "#00d4ff";
const AMBER = "#ffaa00";

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

const allUnits: Unit[] = [...alliedUnits, ...axisUnits];

export default function StrategicCommandOverlay() {
  const mode = useAppStore((s) => s.mode);
  const selectedUnitId = useAppStore((s) => s.selectedUnitId);
  const currentDate = useAppStore((s) => s.currentDate);
  const accent = mode === "historical" ? CYAN : AMBER;
  const borderColor = mode === "historical"
    ? "rgba(0, 212, 255, 0.35)"
    : "rgba(255, 170, 0, 0.35)";

  const currentMs = new Date(currentDate).getTime();

  const stats = useMemo(() => {
    const visibleAllied = alliedUnits.filter((u) => new Date(u.timestamp).getTime() <= currentMs);
    const visibleAxis = axisUnits.filter((u) => new Date(u.timestamp).getTime() <= currentMs);
    const allied = visibleAllied.length;
    const axis = visibleAxis.length;
    const alliedTroops = visibleAllied.reduce((s, u) => s + u.troop_count, 0);
    const axisTroops = visibleAxis.reduce((s, u) => s + u.troop_count, 0);
    const avgAlliedSupply = allied > 0 ? Math.round(
      visibleAllied.reduce((s, u) => s + u.supply_level, 0) / allied
    ) : 0;
    const avgAxisSupply = axis > 0 ? Math.round(
      visibleAxis.reduce((s, u) => s + u.supply_level, 0) / axis
    ) : 0;
    return { allied, axis, alliedTroops, axisTroops, avgAlliedSupply, avgAxisSupply };
  }, [currentMs]);

  const selectedUnit = selectedUnitId
    ? allUnits.find((u) => u.unit_id === selectedUnitId)
    : null;

  return (
    <>
      {/* KPI bar — top center */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        <KpiCard label="Allied Forces" value={stats.alliedTroops.toLocaleString()} subtext={`${stats.allied} units`} />
        <KpiCard label="Axis Forces" value={stats.axisTroops.toLocaleString()} subtext={`${stats.axis} units`} />
        <KpiCard label="Allied Supply" value={`${stats.avgAlliedSupply}%`} subtext="Avg level" />
        <KpiCard label="Axis Supply" value={`${stats.avgAxisSupply}%`} subtext="Avg level" />
      </div>

      {/* Unit detail panel — right side */}
      {selectedUnit && (
        <div className="absolute top-4 right-14 z-10 w-72">
          <div
            className="bg-panel/35 backdrop-blur-sm rounded-lg p-4"
            style={{ border: `2px solid ${borderColor}` }}
          >
            <h2
              className="text-xs font-mono tracking-widest uppercase mb-3"
              style={{ color: accent }}
            >
              {selectedUnit.unit_name}
            </h2>
            <div className="space-y-2">
              <StatRow label="Faction" value={selectedUnit.faction.toUpperCase()} accent={accent} />
              <StatRow label="Type" value={selectedUnit.unit_type.toUpperCase()} accent={accent} />
              <StatRow label="Troops" value={selectedUnit.troop_count.toLocaleString()} accent={accent} />
              <StatRow label="Strength" value={`${selectedUnit.strength_percent}%`} accent={accent} />
              <StatRow label="Supply" value={`${selectedUnit.supply_level}%`} accent={accent} />
              <StatRow label="Combat Eff." value={`${selectedUnit.combat_effectiveness}%`} accent={accent} />
              <StatRow label="Morale" value={`${selectedUnit.morale}%`} accent={accent} />
              <StatRow label="Position" value={`${selectedUnit.lat.toFixed(2)}°N, ${Math.abs(selectedUnit.lng).toFixed(2)}°W`} accent={accent} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatRow({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[10px] font-mono text-foreground/40 uppercase tracking-wide">{label}</span>
      <span className="text-xs font-mono" style={{ color: accent }}>{value}</span>
    </div>
  );
}
