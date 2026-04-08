"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/stores/useAppStore";
import KpiCard from "@/components/KpiCard";
import { getSupplyLines, getSupplyStats, SupplyLine } from "@/services/dataService";

const CYAN = "#00d4ff";
const AMBER = "#ffaa00";
const RED = "#ff3344";

type FilterFaction = "all" | "allied" | "axis";
type FilterStatus = "all" | "active" | "disrupted" | "severed";
type FilterType = "all" | "ammunition" | "fuel" | "food" | "medical" | "mixed" | "troops";

export default function LogisticsOverlay() {
  const mode = useAppStore((s) => s.mode);
  const currentDate = useAppStore((s) => s.currentDate);
  const accent = mode === "historical" ? CYAN : AMBER;
  const borderColor = mode === "historical"
    ? "rgba(0, 212, 255, 0.35)"
    : "rgba(255, 170, 0, 0.35)";

  const [filterFaction, setFilterFaction] = useState<FilterFaction>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterType, setFilterType] = useState<FilterType>("all");

  const stats = useMemo(() => getSupplyStats(currentDate), [currentDate]);

  const filteredLines = useMemo(() => {
    let lines = getSupplyLines(currentDate);
    if (filterFaction !== "all") lines = lines.filter((l) => l.faction === filterFaction);
    if (filterStatus !== "all") lines = lines.filter((l) => l.status === filterStatus);
    if (filterType !== "all") lines = lines.filter((l) => l.supply_type === filterType);
    return lines;
  }, [currentDate, filterFaction, filterStatus, filterType]);

  const statusColor = (status: string) =>
    status === "severed" ? RED : status === "disrupted" ? AMBER : CYAN;

  return (
    <>
      {/* KPI bar */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        <KpiCard label="Total Routes" value={stats.totalRoutes} valueColor={accent} />
        <KpiCard label="Active" value={stats.activeRoutes} valueColor={CYAN} />
        <KpiCard label="Disrupted" value={stats.disruptedRoutes} valueColor={AMBER} />
        <KpiCard label="Severed" value={stats.severedRoutes} valueColor={RED} />
        <KpiCard label="Tonnage/Day" value={stats.totalTonnage.toLocaleString()} valueColor={accent} subtext="Active routes" />
      </div>

      {/* Filter sidebar — left */}
      <div className="absolute top-4 left-4 z-10 mt-14 w-56">
        <div
          className="bg-panel/35 backdrop-blur-sm rounded-lg p-3 space-y-3"
          style={{ border: `2px solid ${borderColor}` }}
        >
          <h3 className="text-[9px] font-mono tracking-widest uppercase" style={{ color: accent, opacity: 0.5 }}>
            Filters
          </h3>

          <FilterSelect
            label="Faction"
            value={filterFaction}
            onChange={(v) => setFilterFaction(v as FilterFaction)}
            options={[["all", "All"], ["allied", "Allied"], ["axis", "Axis"]]}
            accent={accent}
          />
          <FilterSelect
            label="Status"
            value={filterStatus}
            onChange={(v) => setFilterStatus(v as FilterStatus)}
            options={[["all", "All"], ["active", "Active"], ["disrupted", "Disrupted"], ["severed", "Severed"]]}
            accent={accent}
          />
          <FilterSelect
            label="Supply Type"
            value={filterType}
            onChange={(v) => setFilterType(v as FilterType)}
            options={[["all", "All"], ["troops", "Troops"], ["ammunition", "Ammo"], ["fuel", "Fuel"], ["food", "Food"], ["medical", "Medical"], ["mixed", "Mixed"]]}
            accent={accent}
          />

          <p className="text-[9px] font-mono text-foreground/20">
            {filteredLines.length} routes shown
          </p>
        </div>
      </div>

      {/* Route table — bottom, sits below timeline */}
      <div className="absolute bottom-2 left-4 right-4 z-10">
        <div
          className="bg-panel/35 backdrop-blur-sm rounded-lg p-3 max-h-52 overflow-y-auto"
          style={{ border: `2px solid ${borderColor}` }}
        >
          <h3 className="text-[9px] font-mono tracking-widest uppercase mb-2" style={{ color: accent, opacity: 0.5 }}>
            Supply Routes
          </h3>
          <table className="w-full text-[10px] font-mono">
            <thead>
              <tr className="text-foreground/30 uppercase">
                <th className="text-left pb-1">Origin</th>
                <th className="text-left pb-1">Destination</th>
                <th className="text-left pb-1">Type</th>
                <th className="text-right pb-1">Tons/Day</th>
                <th className="text-right pb-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLines.map((line) => (
                <tr key={line.supply_line_id} className="border-t border-panel-border">
                  <td className="py-1 text-foreground/50">{line.source_name}</td>
                  <td className="py-1 text-foreground/50">{line.target_name}</td>
                  <td className="py-1 text-foreground/40 uppercase">{line.supply_type}</td>
                  <td className="py-1 text-right" style={{ color: line.faction === "allied" ? CYAN : RED }}>
                    {line.tonnage_per_day.toLocaleString()}
                  </td>
                  <td className="py-1 text-right uppercase" style={{ color: statusColor(line.status) }}>
                    {line.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function FilterSelect({ label, value, onChange, options, accent }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  accent: string;
}) {
  return (
    <div>
      <label className="text-[9px] font-mono text-foreground/30 uppercase tracking-wide block mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-panel/50 text-foreground/70 text-[10px] font-mono rounded px-2 py-1 border border-panel-border focus:outline-none"
        style={{ borderColor: `${accent}30` }}
      >
        {options.map(([val, label]) => (
          <option key={val} value={val}>{label}</option>
        ))}
      </select>
    </div>
  );
}
