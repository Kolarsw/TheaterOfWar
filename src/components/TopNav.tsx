"use client";

import { useAppStore, ViewId } from "@/stores/useAppStore";

const views: { id: ViewId; label: string }[] = [
  { id: "strategic-command", label: "Command" },
  { id: "logistics", label: "Logistics" },
  { id: "oob", label: "OOB" },
  { id: "network", label: "Network" },
  { id: "theaters", label: "Theaters" },
  { id: "battles", label: "Battles" },
  { id: "simulation", label: "Simulation" },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function TopNav() {
  const { activeView, setActiveView, mode, toggleMode, currentDate } =
    useAppStore();

  const visibleViews = mode === "historical"
    ? views.filter((v) => v.id !== "simulation")
    : views;

  return (
    <nav className="relative z-20 flex items-center justify-between h-10 px-4 bg-panel/90 backdrop-blur-sm border-b border-panel-border">
      {/* View Switcher */}
      <div className="flex items-center gap-1">
        {visibleViews.map((v) => (
          <button
            key={v.id}
            onClick={() => setActiveView(v.id)}
            className={`px-3 py-1 text-xs font-mono tracking-wide rounded transition-colors ${
              activeView === v.id
                ? mode === "historical"
                  ? "bg-cyan/15 text-cyan"
                  : "bg-amber/15 text-amber"
                : "text-foreground/50 hover:text-foreground/80"
            }`}
            aria-label={`Switch to ${v.label} view`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Center: Date Display */}
      <div
        className="absolute left-1/2 -translate-x-1/2 text-sm font-mono tracking-widest"
        style={{ color: mode === "historical" ? "#00d4ff" : "#ffaa00", opacity: 0.8 }}
      >
        {formatDate(currentDate)}
      </div>

      {/* Right: Mode Toggle */}
      <button
        onClick={() => {
          if (mode === "simulation" && activeView === "simulation") {
            setActiveView("strategic-command");
          }
          toggleMode();
        }}
        className={`flex items-center gap-2 px-3 py-1 text-xs font-mono tracking-wide rounded border transition-colors ${
          mode === "historical"
            ? "border-cyan/40 text-cyan bg-cyan/10"
            : "border-amber/40 text-amber bg-amber/10"
        }`}
        aria-label={`Current mode: ${mode}. Click to toggle.`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            mode === "historical" ? "bg-cyan" : "bg-amber"
          }`}
        />
        {mode === "historical" ? "HISTORICAL" : "SIMULATION"}
      </button>
    </nav>
  );
}
