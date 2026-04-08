"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/useAppStore";
import KpiCard from "@/components/KpiCard";
import alliedUnits from "@/data/mock-units.json";
import axisUnits from "@/data/mock-units-axis.json";
import hierarchicalUnits from "@/data/mock-units-hierarchical.json";
import axisHierarchicalUnits from "@/data/mock-units-axis-hierarchical.json";

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

const allUnits: Unit[] = [
  ...hierarchicalUnits as Unit[],
  ...axisHierarchicalUnits as Unit[],
  ...alliedUnits.filter((u) => !hierarchicalUnits.some((h) => h.unit_id === u.unit_id)) as Unit[],
  ...axisUnits.filter((u) => !axisHierarchicalUnits.some((h) => h.unit_id === u.unit_id)) as Unit[],
];

export default function StrategicCommandOverlay() {
  const mode = useAppStore((s) => s.mode);
  const currentDate = useAppStore((s) => s.currentDate);

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

  return (
    <>
      {/* KPI bar — top center */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        <KpiCard label="Allied Forces" value={stats.alliedTroops.toLocaleString()} valueColor="#00d4ff" subtext={`${stats.allied} units`} />
        <KpiCard label="Axis Forces" value={stats.axisTroops.toLocaleString()} valueColor="#ff3344" subtext={`${stats.axis} units`} />
        <KpiCard label="Allied Supply" value={`${stats.avgAlliedSupply}%`} valueColor="#00d4ff" subtext="Avg level" />
        <KpiCard label="Axis Supply" value={`${stats.avgAxisSupply}%`} valueColor="#ff3344" subtext="Avg level" />
      </div>
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
