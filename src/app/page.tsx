"use client";

import { useAppStore } from "@/stores/useAppStore";
import TopNav from "@/components/TopNav";
import GlobeMap from "@/features/map/GlobeMap";
import ViewOverlay from "@/components/ViewOverlay";
import StrategicCommandOverlay from "@/features/strategic-command/StrategicCommandOverlay";
import OobPanel from "@/features/oob/OobPanel";
import LayerToggles from "@/components/LayerToggles";
import UnitDetailPanel from "@/components/UnitDetailPanel";
import TimelineScrubber from "@/components/TimelineScrubber";

export default function Home() {
  const mode = useAppStore((s) => s.mode);
  const activeView = useAppStore((s) => s.activeView);

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

        {/* OOB Panel — visible on strategic-command and oob views */}
        {(activeView === "strategic-command" || activeView === "oob") && <OobPanel />}

        {/* Layer toggles — visible on map views */}
        {(activeView === "strategic-command" || activeView === "logistics" || activeView === "oob") && <LayerToggles />}

        {/* Unit detail panel — shows on any view when a unit is selected */}
        <UnitDetailPanel />

        {/* Timeline scrubber — always visible */}
        <TimelineScrubber />
      </div>
    </div>
  );
}
