"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/useAppStore";
import KpiCard from "@/components/KpiCard";
import { getFactionStats } from "@/services/dataService";

export default function StrategicCommandOverlay() {
  const mode = useAppStore((s) => s.mode);
  const currentDate = useAppStore((s) => s.currentDate);

  const stats = useMemo(() => {
    const allied = getFactionStats("allied", currentDate);
    const axis = getFactionStats("axis", currentDate);
    return { allied, axis };
  }, [currentDate]);

  return (
    <>
      {/* KPI bar — top center */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        <KpiCard label="Allied Forces" value={stats.allied.troopCount.toLocaleString()} valueColor="#00d4ff" subtext={`${stats.allied.unitCount} units`} />
        <KpiCard label="Axis Forces" value={stats.axis.troopCount.toLocaleString()} valueColor="#ff3344" subtext={`${stats.axis.unitCount} units`} />
        <KpiCard label="Allied Supply" value={`${stats.allied.avgSupply}%`} valueColor="#00d4ff" subtext="Avg level" />
        <KpiCard label="Axis Supply" value={`${stats.axis.avgSupply}%`} valueColor="#ff3344" subtext="Avg level" />
      </div>
    </>
  );
}
