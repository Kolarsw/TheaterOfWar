"use client";

import { useAppStore } from "@/stores/useAppStore";

const CYAN = "#00d4ff";
const AMBER = "#ffaa00";

interface LayerToggleProps {
  label: string;
  enabled: boolean;
  onToggle: () => void;
}

function LayerToggle({ label, enabled, onToggle }: LayerToggleProps) {
  const mode = useAppStore((s) => s.mode);
  const accent = mode === "historical" ? CYAN : AMBER;

  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 px-2 py-1 rounded text-[10px] font-mono tracking-wide uppercase transition-colors hover:bg-white/5"
    >
      <span
        className="w-2 h-2 rounded-sm flex-shrink-0"
        style={{
          backgroundColor: enabled ? accent : "transparent",
          border: `1px solid ${enabled ? accent : "rgba(255,255,255,0.2)"}`,
        }}
      />
      <span style={{ color: enabled ? "rgba(224,224,224,0.7)" : "rgba(224,224,224,0.3)" }}>
        {label}
      </span>
    </button>
  );
}

export default function LayerToggles() {
  const mode = useAppStore((s) => s.mode);
  const layers = useAppStore((s) => s.visibleLayers);
  const toggleLayer = useAppStore((s) => s.toggleLayer);
  const borderColor = mode === "historical"
    ? "rgba(0, 212, 255, 0.35)"
    : "rgba(255, 170, 0, 0.35)";
  const accent = mode === "historical" ? CYAN : AMBER;

  return (
    <div className="absolute top-2 right-14 z-10">
      <div
        className="bg-panel/35 backdrop-blur-sm rounded-lg p-2"
        style={{ border: `2px solid ${borderColor}` }}
      >
        <span
          className="text-[9px] font-mono tracking-widest uppercase px-2 block mb-1"
          style={{ color: accent, opacity: 0.4 }}
        >
          Layers
        </span>
        <LayerToggle label="Units" enabled={layers.units} onToggle={() => toggleLayer("units")} />
        <LayerToggle label="Supply Arcs" enabled={layers.supplyArcs} onToggle={() => toggleLayer("supplyArcs")} />
        <LayerToggle label="Hex Control" enabled={layers.hexControl} onToggle={() => toggleLayer("hexControl")} />
        <LayerToggle label="Events" enabled={layers.events} onToggle={() => toggleLayer("events")} />
      </div>
    </div>
  );
}
