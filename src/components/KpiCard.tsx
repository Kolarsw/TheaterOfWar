"use client";

import { useAppStore } from "@/stores/useAppStore";

const CYAN = "#00d4ff";
const AMBER = "#ffaa00";

interface KpiCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  subtextColor?: string;
}

export default function KpiCard({ label, value, subtext, subtextColor }: KpiCardProps) {
  const mode = useAppStore((s) => s.mode);
  const accent = mode === "historical" ? CYAN : AMBER;
  const borderColor = mode === "historical"
    ? "rgba(0, 212, 255, 0.35)"
    : "rgba(255, 170, 0, 0.35)";

  return (
    <div
      className="bg-panel/35 backdrop-blur-sm rounded-lg px-3 py-2 min-w-[120px]"
      style={{ border: `2px solid ${borderColor}` }}
    >
      <p className="text-[10px] font-mono tracking-widest uppercase text-foreground/40">
        {label}
      </p>
      <p
        className="text-lg font-mono font-semibold mt-0.5"
        style={{ color: accent }}
      >
        {value}
      </p>
      {subtext && (
        <p
          className="text-[10px] font-mono mt-0.5"
          style={{ color: subtextColor || "rgba(255,255,255,0.3)" }}
        >
          {subtext}
        </p>
      )}
    </div>
  );
}
