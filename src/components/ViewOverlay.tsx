"use client";

import { useAppStore, ViewId } from "@/stores/useAppStore";

const overlayConfig: Record<ViewId, { title: string; description: string }> = {
  "strategic-command": {
    title: "Strategic Command",
    description: "Global force overview & territorial control",
  },
  logistics: {
    title: "Logistics Dashboard",
    description: "Supply chain health & route analysis",
  },
  oob: {
    title: "Order of Battle",
    description: "Force composition & unit readiness",
  },
  network: {
    title: "Supply Network",
    description: "Dependency graph & cascading failure analysis",
  },
  theaters: {
    title: "Theater Comparison",
    description: "Cross-theater analytics & force comparison",
  },
  battles: {
    title: "Battle Detail",
    description: "Engagement deep-dives & phase analysis",
  },
  simulation: {
    title: "Simulation Control",
    description: "What-if parameter adjustment & outcome modeling",
  },
};

const CYAN = "#00d4ff";
const AMBER = "#ffaa00";

export default function ViewOverlay() {
  const activeView = useAppStore((s) => s.activeView);
  const mode = useAppStore((s) => s.mode);
  const config = overlayConfig[activeView];

  const accent = mode === "historical" ? CYAN : AMBER;

  return (
    <>
      {/* Title overlay — top left */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h1
          className="text-sm font-mono tracking-widest uppercase opacity-80"
          style={{ color: accent }}
        >
          Theater of War
        </h1>
        <p className="text-xs font-mono text-foreground/40 mt-1">
          {config.title}
        </p>
      </div>

      {/* Left panel placeholder */}
      {activeView !== "strategic-command" && (
        <div className="absolute top-4 left-4 z-10 mt-14 w-72 max-h-[calc(100%-6rem)] overflow-y-auto">
          <div
            className="bg-panel/35 backdrop-blur-sm rounded-lg p-4"
            style={{ border: `1px solid ${accent}` }}
          >
            <h2
              className="text-xs font-mono tracking-widest uppercase mb-2"
              style={{ color: accent, opacity: 0.6 }}
            >
              {config.title}
            </h2>
            <p className="text-xs font-mono text-foreground/30">
              {config.description}
            </p>
            <div className="mt-4 border-t border-panel-border pt-4">
              <p className="text-xs font-mono text-foreground/20 italic">
                Panel content coming soon
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Right panel placeholder */}
      {activeView !== "strategic-command" && (
        <div className="absolute top-4 right-14 z-10 w-72 max-h-[calc(100%-6rem)] overflow-y-auto">
          <div
            className="bg-panel/35 backdrop-blur-sm rounded-lg p-4"
            style={{ border: `1px solid ${accent}` }}
          >
            <h2
              className="text-xs font-mono tracking-widest uppercase mb-2"
              style={{ color: accent, opacity: 0.4 }}
            >
              Details
            </h2>
            <div className="border-t border-panel-border pt-4">
              <p className="text-xs font-mono text-foreground/20 italic">
                Select an item on the map
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom panel placeholder — for data tables, charts */}
      {(activeView === "logistics" || activeView === "theaters" || activeView === "battles") && (
        <div className="absolute bottom-28 left-4 right-4 z-10">
          <div
            className="bg-panel/35 backdrop-blur-sm rounded-lg p-4 max-h-48 overflow-y-auto"
            style={{ border: `1px solid ${accent}` }}
          >
            <h2
              className="text-xs font-mono tracking-widest uppercase mb-2"
              style={{ color: accent, opacity: 0.4 }}
            >
              {activeView === "logistics" && "Supply Routes"}
              {activeView === "theaters" && "Theater Analytics"}
              {activeView === "battles" && "Battle Timeline"}
            </h2>
            <p className="text-xs font-mono text-foreground/20 italic">
              Data table coming soon
            </p>
          </div>
        </div>
      )}
    </>
  );
}
