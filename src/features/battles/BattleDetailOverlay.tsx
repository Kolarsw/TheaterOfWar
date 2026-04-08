"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { getEvents, getEventById, getBattlePhases, getUnitById, BattleEvent, BattlePhase } from "@/services/dataService";
import KpiCard from "@/components/KpiCard";
import TimelineScrubber from "@/components/TimelineScrubber";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const CYAN = "#00d4ff";
const AMBER = "#ffaa00";
const RED = "#ff3344";

export default function BattleDetailOverlay() {
  const mode = useAppStore((s) => s.mode);
  const selectedEventId = useAppStore((s) => s.selectedEventId);
  const currentDate = useAppStore((s) => s.currentDate);
  const setSelectedEventId = useAppStore((s) => s.setSelectedEventId);
  const flyTo = useAppStore((s) => s.flyTo);

  const setCurrentDate = useAppStore((s) => s.setCurrentDate);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const setSelectedUnitId = useAppStore((s) => s.setSelectedUnitId);

  const accent = mode === "historical" ? CYAN : AMBER;
  const borderColor = mode === "historical"
    ? "rgba(0, 212, 255, 0.35)"
    : "rgba(255, 170, 0, 0.35)";

  const events = useMemo(() => getEvents(), []);
  const selectedEvent = useMemo(
    () => (selectedEventId ? getEventById(selectedEventId) : null),
    [selectedEventId]
  );
  const phases = useMemo(
    () => (selectedEventId ? getBattlePhases(selectedEventId) : []),
    [selectedEventId]
  );

  const [activePhaseIdx, setActivePhaseIdx] = useState(0);

  const selectPhase = (idx: number) => {
    setActivePhaseIdx(idx);
    if (phases[idx]) {
      setCurrentDate(phases[idx].timestamp);
    }
  };

  const selectBattle = (eventId: string) => {
    setSelectedEventId(eventId);
    setActivePhaseIdx(0);
    useAppStore.getState().setTimeScale("hours");
    const evt = getEventById(eventId);
    if (evt) {
      flyTo(evt.lng, evt.lat, 12);
      setCurrentDate(evt.timestamp_start);
    }
  };

  const chartData = useMemo(() => {
    if (phases.length > 0) {
      return phases.map((p) => {
        const time = new Date(p.timestamp);
        return {
          name: p.phase_name,
          time: `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`,
          "Allied Strength": p.allied_strength - p.allied_casualties_cumulative,
          "Axis Strength": p.axis_strength - p.axis_casualties_cumulative,
          "Allied Casualties": p.allied_casualties_cumulative,
          "Axis Casualties": p.axis_casualties_cumulative,
        };
      });
    }
    // Fallback: show start vs end from summary data
    if (!selectedEvent) return [];
    const startTime = new Date(selectedEvent.timestamp_start);
    const endTime = new Date(selectedEvent.timestamp_end);
    const fmt = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const alliedCas = selectedEvent.casualties_allied || 0;
    const axisCas = selectedEvent.casualties_axis || 0;
    // Estimate troop strength from involved units
    const totalAllied = selectedEvent.units_involved.reduce((sum, uid) => {
      const unit = getUnitById(uid);
      return sum + (unit && unit.faction === "allied" ? (unit.troop_count || 0) : 0);
    }, 0);
    const totalAxis = selectedEvent.units_involved.reduce((sum, uid) => {
      const unit = getUnitById(uid);
      return sum + (unit && unit.faction === "axis" ? (unit.troop_count || 0) : 0);
    }, 0);
    return [
      {
        name: "Start",
        time: fmt(startTime),
        "Allied Strength": totalAllied,
        "Axis Strength": totalAxis,
        "Allied Casualties": 0,
        "Axis Casualties": 0,
      },
      {
        name: "End",
        time: fmt(endTime),
        "Allied Strength": totalAllied - alliedCas,
        "Axis Strength": totalAxis - axisCas,
        "Allied Casualties": alliedCas,
        "Axis Casualties": axisCas,
      },
    ];
  }, [phases, selectedEvent]);

  return (
    <>
      {/* Left column — battle index + timeline */}
      <div className="absolute top-4 left-4 z-10 mt-14 w-64 flex flex-col gap-2" style={{ bottom: "12rem" }}>
        {/* Battle index */}
        <div
          className="bg-panel/35 backdrop-blur-sm rounded-lg p-3 overflow-y-auto min-h-0 flex-1"
          style={{ border: `2px solid ${borderColor}` }}
        >
          <h3
            className="text-[9px] font-mono tracking-widest uppercase mb-2"
            style={{ color: accent, opacity: 0.5 }}
          >
            Battle Index
          </h3>
          <div className="space-y-1">
            {events.map((evt) => (
              <button
                key={evt.event_id}
                onClick={() => selectBattle(evt.event_id)}
                className={`w-full text-left px-2 py-1.5 rounded text-[10px] font-mono transition-colors ${
                  selectedEventId === evt.event_id
                    ? "bg-white/10"
                    : "hover:bg-white/5"
                }`}
              >
                <span
                  style={{
                    color: selectedEventId === evt.event_id ? accent : "rgba(224,224,224,0.6)",
                  }}
                >
                  {evt.event_name}
                </span>
                <span className="block text-[9px] text-foreground/30 mt-0.5">
                  {evt.event_type.replace(/_/g, " ")} ·{" "}
                  {new Date(evt.timestamp_start).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Embedded timeline */}
        <div className="shrink-0 w-[460px]">
          <TimelineScrubber embedded />
        </div>
      </div>

      {/* Battle detail — right panel + header + charts */}
      {selectedEvent && (
        <>
          {/* KPI header */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex gap-2">
            <KpiCard
              label={selectedEvent.event_name}
              value={selectedEvent.event_type.replace(/_/g, " ").toUpperCase()}
              valueColor={accent}
            />
            <KpiCard
              label="Outcome"
              value={selectedEvent.outcome.replace(/_/g, " ").toUpperCase()}
              valueColor={
                selectedEvent.outcome === "allied_victory" ? CYAN
                : selectedEvent.outcome === "axis_victory" ? RED
                : AMBER
              }
            />
            <KpiCard
              label="Allied Casualties"
              value={selectedEvent.casualties_allied?.toLocaleString() ?? "—"}
              valueColor={CYAN}
            />
            <KpiCard
              label="Axis Casualties"
              value={selectedEvent.casualties_axis?.toLocaleString() ?? "—"}
              valueColor={RED}
            />
          </div>

          {/* Phase timeline + involved units — right panel */}
          <div className="absolute top-4 right-4 z-10 mt-14 w-72 max-h-[calc(100%-8rem)] overflow-y-auto">
            <div
              className="bg-panel/35 backdrop-blur-sm rounded-lg p-3"
              style={{ border: `2px solid ${borderColor}` }}
            >
              {/* Battle description */}
              <p className="text-[9px] font-mono leading-relaxed mb-3" style={{ color: "rgba(200, 210, 220, 0.7)" }}>
                {selectedEvent.description}
              </p>

              <h3
                className="text-[9px] font-mono tracking-widest uppercase mb-3"
                style={{ color: accent, opacity: 0.5 }}
              >
                Battle Phases
              </h3>
              {phases.length === 0 ? (
                <p className="text-[10px] font-mono text-foreground/20 italic">
                  No phase data available for this event
                </p>
              ) : (
                <div className="space-y-0">
                  {phases.map((phase, idx) => {
                    const isActive = idx === activePhaseIdx;
                    const time = new Date(phase.timestamp);
                    const timeStr = time.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <button
                        key={phase.phase_id}
                        onClick={() => selectPhase(idx)}
                        className="w-full text-left flex gap-2 group"
                      >
                        {/* Vertical timeline line + dot */}
                        <div className="flex flex-col items-center w-4 shrink-0">
                          <div
                            className="w-2.5 h-2.5 rounded-full border-2 shrink-0"
                            style={{
                              borderColor: isActive ? accent : "rgba(255,255,255,0.2)",
                              backgroundColor: isActive ? accent : "transparent",
                            }}
                          />
                          {idx < phases.length - 1 && (
                            <div
                              className="w-px flex-1 min-h-[2rem]"
                              style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                            />
                          )}
                        </div>
                        {/* Phase content */}
                        <div className="pb-3">
                          <span
                            className="text-[10px] font-mono block"
                            style={{ color: isActive ? accent : "rgba(224,224,224,0.6)" }}
                          >
                            {phase.phase_name}
                          </span>
                          <span className="text-[9px] font-mono text-foreground/30 block">
                            {timeStr}
                          </span>
                          {isActive && (
                            <p className="text-[9px] font-mono text-foreground/40 mt-1 leading-relaxed">
                              {phase.description}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Involved units — cross-links */}
              {selectedEvent.units_involved.length > 0 && (
                <div className="mt-3 pt-3 border-t border-panel-border">
                  <h3
                    className="text-[9px] font-mono tracking-widest uppercase mb-2"
                    style={{ color: accent, opacity: 0.5 }}
                  >
                    Units Involved
                  </h3>
                  <div className="space-y-1">
                    {selectedEvent.units_involved.map((uid) => {
                      const unit = getUnitById(uid);
                      if (!unit) return null;
                      const color = unit.faction === "allied" ? CYAN : RED;
                      return (
                        <button
                          key={uid}
                          onClick={() => {
                            setSelectedUnitId(uid);
                            setActiveView("oob");
                          }}
                          className="w-full text-left px-2 py-1 rounded text-[10px] font-mono hover:bg-white/5 transition-colors flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span style={{ color }}>{unit.unit_name}</span>
                          <span className="text-foreground/20 ml-auto">→ OOB</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom charts */}
          {chartData.length > 0 && (
            <div className="absolute bottom-2 left-4 right-4 z-10 flex gap-2">
              {/* Force strength chart */}
              <div
                className="flex-1 bg-panel/35 backdrop-blur-sm rounded-lg p-3"
                style={{ border: `2px solid ${borderColor}` }}
              >
                <h3
                  className="text-[9px] font-mono tracking-widest uppercase mb-2"
                  style={{ color: accent, opacity: 0.5 }}
                >
                  Effective Strength
                </h3>
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={chartData}>
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 9, fill: "rgba(224,224,224,0.3)", fontFamily: "monospace" }}
                      axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "rgba(224,224,224,0.3)", fontFamily: "monospace" }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                      tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(10,10,15,0.9)",
                        border: `1px solid ${borderColor}`,
                        borderRadius: 6,
                        fontSize: 10,
                        fontFamily: "monospace",
                      }}
                      labelStyle={{ color: accent }}
                      itemStyle={{ padding: 0 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Allied Strength"
                      stroke={CYAN}
                      fill={CYAN}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="Axis Strength"
                      stroke={RED}
                      fill={RED}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Casualty curve chart */}
              <div
                className="flex-1 bg-panel/35 backdrop-blur-sm rounded-lg p-3"
                style={{ border: `2px solid ${borderColor}` }}
              >
                <h3
                  className="text-[9px] font-mono tracking-widest uppercase mb-2"
                  style={{ color: accent, opacity: 0.5 }}
                >
                  Cumulative Casualties
                </h3>
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={chartData}>
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 9, fill: "rgba(224,224,224,0.3)", fontFamily: "monospace" }}
                      axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "rgba(224,224,224,0.3)", fontFamily: "monospace" }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                      tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(10,10,15,0.9)",
                        border: `1px solid ${borderColor}`,
                        borderRadius: 6,
                        fontSize: 10,
                        fontFamily: "monospace",
                      }}
                      labelStyle={{ color: accent }}
                      itemStyle={{ padding: 0 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Allied Casualties"
                      stroke={CYAN}
                      fill={CYAN}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="Axis Casualties"
                      stroke={RED}
                      fill={RED}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {/* No selection prompt */}
      {!selectedEvent && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <p className="text-xs font-mono text-foreground/20 italic text-center">
            Select a battle from the index or click an event on the map
          </p>
        </div>
      )}
    </>
  );
}
