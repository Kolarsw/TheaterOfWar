"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";

/**
 * Shows a contextual data confidence disclaimer based on zoom level.
 * - Strategic (zoom < 6): hidden
 * - Operational (zoom 6-9): "Some positions interpolated"
 * - Tactical (zoom 10+): "Positions and details estimated where sources unavailable"
 */
export default function DataDisclaimer({ zoom }: { zoom: number }) {
  const mode = useAppStore((s) => s.mode);

  if (zoom < 6) return null;

  const message = zoom < 10
    ? "Operational-level data. Some positions interpolated."
    : "Tactical-level data. Positions and unit details are estimated where primary sources are unavailable.";

  return (
    <div className="absolute bottom-44 left-4 z-10 pointer-events-none">
      <p className="text-[10px] font-mono text-foreground/40 italic max-w-xs">
        {message}
      </p>
    </div>
  );
}
