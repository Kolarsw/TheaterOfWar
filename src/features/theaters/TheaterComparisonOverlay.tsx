"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/stores/useAppStore";
import {
  getTheaterTimeline, getTheaterLatest, TheaterName,
} from "@/services/dataService";
import KpiCard from "@/components/KpiCard";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from "recharts";

const CYAN = "#00d4ff";
const AMBER = "#ffaa00";
const RED = "#ff3344";

const THEATERS: { id: TheaterName; label: string; lat: number; lng: number; zoom: number }[] = [
  { id: "western_europe", label: "Western Europe", lat: 48.5, lng: 2.0, zoom: 4 },
  { id: "eastern_front", label: "Eastern Front", lat: 52.0, lng: 30.0, zoom: 3.5 },
  { id: "pacific", label: "Pacific", lat: 15.0, lng: 145.0, zoom: 2.5 },
  { id: "north_africa", label: "North Africa", lat: 32.0, lng: 10.0, zoom: 4 },
  { id: "atlantic", label: "Atlantic", lat: 40.0, lng: -30.0, zoom: 3 },
];

function fmtK(v: number): string {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return String(v);
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export default function TheaterComparisonOverlay() {
  const mode = useAppStore((s) => s.mode);
  const currentDate = useAppStore((s) => s.currentDate);
  const accent = mode === "historical" ? CYAN : AMBER;
  const borderColor = mode === "historical"
    ? "rgba(0, 212, 255, 0.35)"
    : "rgba(255, 170, 0, 0.35)";

  const [selectedTheater, setSelectedTheater] = useState<TheaterName>("western_europe");
  const flyTo = useAppStore((s) => s.flyTo);

  const selectTheater = (theater: TheaterName) => {
    setSelectedTheater(theater);
    const t = THEATERS.find((th) => th.id === theater);
    if (t) flyTo(t.lng, t.lat, t.zoom);
  };

  const latest = useMemo(() => getTheaterLatest(currentDate), [currentDate]);
  const timeline = useMemo(() => getTheaterTimeline(selectedTheater), [selectedTheater]);
  const currentMs = new Date(currentDate).getTime();

  const chartData = useMemo(() => {
    return timeline
      .filter((t) => new Date(t.timestamp).getTime() <= currentMs)
      .map((t) => ({
        date: fmtDate(t.timestamp),
        "Allied Strength": t.allied_strength,
        "Axis Strength": t.axis_strength,
        "Allied Casualties": t.allied_casualties_30d,
        "Axis Casualties": t.axis_casualties_30d,
        "Supply Throughput": t.supply_throughput_tons,
        "Allied Territory": t.allied_controlled_hexes,
        "Axis Territory": t.axis_controlled_hexes,
        "Contested": t.contested_hexes,
      }));
  }, [timeline, currentMs]);

  const selectedLatest = latest.get(selectedTheater);

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: "rgba(10,10,15,0.9)",
      border: `1px solid ${borderColor}`,
      borderRadius: 6,
      fontSize: 10,
      fontFamily: "monospace",
    },
    labelStyle: { color: accent },
    itemStyle: { padding: 0 },
  };

  return (
    <>
      {/* Theater selector tabs — top center */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex gap-1">
        {THEATERS.map((t) => {
          const data = latest.get(t.id);
          const isSelected = t.id === selectedTheater;
          return (
            <button
              key={t.id}
              onClick={() => selectTheater(t.id)}
              className="px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-wide transition-colors"
              style={{
                border: `1px solid ${isSelected ? accent : "rgba(255,255,255,0.1)"}`,
                color: isSelected ? accent : "rgba(224,224,224,0.5)",
                backgroundColor: isSelected ? `${accent}15` : "rgba(18,18,26,0.6)",
              }}
            >
              {t.label}
              {data && (
                <span className="block text-[8px] text-foreground/30 mt-0.5">
                  {fmtK(data.allied_strength + data.axis_strength)} troops
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* KPI cards for selected theater */}
      {selectedLatest && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          <KpiCard label="Allied Strength" value={fmtK(selectedLatest.allied_strength)} valueColor={CYAN} />
          <KpiCard label="Axis Strength" value={fmtK(selectedLatest.axis_strength)} valueColor={RED} />
          <KpiCard label="Allied Cas/30d" value={fmtK(selectedLatest.allied_casualties_30d)} valueColor={CYAN} />
          <KpiCard label="Axis Cas/30d" value={fmtK(selectedLatest.axis_casualties_30d)} valueColor={RED} />
          <KpiCard label="Supply" value={`${fmtK(selectedLatest.supply_throughput_tons)} t/d`} valueColor={accent} />
        </div>
      )}

      {/* Charts — single row at bottom */}
      <div className="absolute bottom-2 left-4 right-4 z-10 flex gap-2">
        <div className="flex-1 bg-panel/35 backdrop-blur-sm rounded-lg p-2" style={{ border: `2px solid ${borderColor}` }}>
          <h3 className="text-[8px] font-mono tracking-widest uppercase mb-1" style={{ color: accent, opacity: 0.5 }}>Troop Strength</h3>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(224,224,224,0.3)", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "rgba(224,224,224,0.3)", fontFamily: "monospace" }} axisLine={false} tickLine={false} width={30} tickFormatter={fmtK} />
              <Tooltip {...tooltipStyle} formatter={(v) => fmtK(Number(v))} />
              <Area type="monotone" dataKey="Allied Strength" stroke={CYAN} fill={CYAN} fillOpacity={0.15} strokeWidth={1.5} isAnimationActive={false} />
              <Area type="monotone" dataKey="Axis Strength" stroke={RED} fill={RED} fillOpacity={0.15} strokeWidth={1.5} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 bg-panel/35 backdrop-blur-sm rounded-lg p-2" style={{ border: `2px solid ${borderColor}` }}>
          <h3 className="text-[8px] font-mono tracking-widest uppercase mb-1" style={{ color: accent, opacity: 0.5 }}>Casualties (30d)</h3>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(224,224,224,0.3)", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "rgba(224,224,224,0.3)", fontFamily: "monospace" }} axisLine={false} tickLine={false} width={30} tickFormatter={fmtK} />
              <Tooltip {...tooltipStyle} formatter={(v) => fmtK(Number(v))} />
              <Line type="monotone" dataKey="Allied Casualties" stroke={CYAN} strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="Axis Casualties" stroke={RED} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 bg-panel/35 backdrop-blur-sm rounded-lg p-2" style={{ border: `2px solid ${borderColor}` }}>
          <h3 className="text-[8px] font-mono tracking-widest uppercase mb-1" style={{ color: accent, opacity: 0.5 }}>Supply (t/d)</h3>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(224,224,224,0.3)", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "rgba(224,224,224,0.3)", fontFamily: "monospace" }} axisLine={false} tickLine={false} width={30} tickFormatter={fmtK} />
              <Tooltip {...tooltipStyle} formatter={(v) => `${fmtK(Number(v))} t/d`} />
              <Area type="monotone" dataKey="Supply Throughput" stroke={accent} fill={accent} fillOpacity={0.15} strokeWidth={1.5} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 bg-panel/35 backdrop-blur-sm rounded-lg p-2" style={{ border: `2px solid ${borderColor}` }}>
          <h3 className="text-[8px] font-mono tracking-widest uppercase mb-1" style={{ color: accent, opacity: 0.5 }}>Territory</h3>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(224,224,224,0.3)", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "rgba(224,224,224,0.3)", fontFamily: "monospace" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip {...tooltipStyle} formatter={(v) => `${v} hexes`} />
              <Bar dataKey="Allied Territory" fill={CYAN} fillOpacity={0.6} isAnimationActive={false} />
              <Bar dataKey="Axis Territory" fill={RED} fillOpacity={0.6} isAnimationActive={false} />
              <Bar dataKey="Contested" fill={AMBER} fillOpacity={0.6} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
