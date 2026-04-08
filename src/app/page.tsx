"use client";

import { useAppStore } from "@/stores/useAppStore";
import TopNav from "@/components/TopNav";
import GlobeMap from "@/features/map/GlobeMap";
import ViewOverlay from "@/components/ViewOverlay";
import TimelineScrubber from "@/components/TimelineScrubber";

export default function Home() {
  const mode = useAppStore((s) => s.mode);

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

        {/* Timeline scrubber — always visible */}
        <TimelineScrubber />
      </div>
    </div>
  );
}
