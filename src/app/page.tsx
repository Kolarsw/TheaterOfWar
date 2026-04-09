"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";
import TopNav from "@/components/TopNav";
import GlobeMap from "@/features/map/GlobeMap";
import ViewOverlay from "@/components/ViewOverlay";
import StrategicCommandOverlay from "@/features/strategic-command/StrategicCommandOverlay";
import LogisticsOverlay from "@/features/logistics/LogisticsOverlay";
import BattleDetailOverlay from "@/features/battles/BattleDetailOverlay";
import TheaterComparisonOverlay from "@/features/theaters/TheaterComparisonOverlay";
import OobPanel from "@/features/oob/OobPanel";
import OobDetailPanel from "@/features/oob/OobDetailPanel";
import LayerToggles from "@/components/LayerToggles";
import UnitDetailPanel from "@/components/UnitDetailPanel";
import TimelineScrubber from "@/components/TimelineScrubber";

export default function Home() {
  const mode = useAppStore((s) => s.mode);
  const activeView = useAppStore((s) => s.activeView);

  // Global spacebar to toggle timeline playback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        (document.activeElement as HTMLElement)?.blur();
        useAppStore.getState().togglePlayback();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className="flex flex-col h-full ring-1 ring-inset"
      style={{ '--tw-ring-color': mode === 'historical' ? 'rgba(0, 212, 255, 0.35)' : 'rgba(255, 170, 0, 0.35)' } as React.CSSProperties}
    >
      <TopNav />

      <div className="relative flex-1 overflow-hidden">
        {/* Globe — always visible */}
        <GlobeMap />

        {/* View-specific panels overlaid on the map */}
        <ViewOverlay />

        {/* Strategic Command overlay — KPIs + unit detail */}
        {activeView === "strategic-command" && <StrategicCommandOverlay />}

        {/* Logistics overlay — supply KPIs, filters, route table */}
        {activeView === "logistics" && <LogisticsOverlay />}

        {/* Battle detail overlay — battle index, phase timeline, charts */}
        {activeView === "battles" && <BattleDetailOverlay />}

        {/* Theater comparison overlay — charts, KPIs, theater selector */}
        {activeView === "theaters" && <TheaterComparisonOverlay />}

        {/* OOB Panel — collapsed by default on command, expanded on oob */}
        {activeView === "strategic-command" && <OobPanel defaultCollapsed={true} />}
        {activeView === "oob" && <OobPanel defaultCollapsed={false} />}

        {/* Layer toggles — visible on map views */}
        {(activeView === "strategic-command" || activeView === "logistics" || activeView === "oob") && <LayerToggles />}

        {/* Unit detail panel — lite on command, rich on oob */}
        {activeView === "oob" ? <OobDetailPanel /> : <UnitDetailPanel />}

        {/* Timeline scrubber — always visible, includes data disclaimer */}
        <TimelineScrubber />
      </div>
    </div>
  );
}
