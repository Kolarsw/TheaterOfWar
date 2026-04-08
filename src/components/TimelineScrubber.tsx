"use client";

import { useEffect, useCallback, useRef, useMemo } from "react";
import { useAppStore, TimeScale } from "@/stores/useAppStore";

const timeScales: TimeScale[] = ["hours", "days", "weeks", "months", "years"];
const speeds = [1, 2, 4, 8, 16];

const msPerTick: Record<TimeScale, number> = {
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
  weeks: 7 * 24 * 60 * 60 * 1000,
  months: 30 * 24 * 60 * 60 * 1000,
  years: 365 * 24 * 60 * 60 * 1000,
};

function formatDateForScale(iso: string, scale: TimeScale): string {
  const d = new Date(iso);
  switch (scale) {
    case "hours":
      return d.toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    case "days":
      return d.toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      });
    case "weeks":
    case "months":
      return d.toLocaleDateString("en-US", {
        month: "long", year: "numeric",
      });
    case "years":
      return d.getFullYear().toString();
  }
}

const CYAN = "#00d4ff";
const AMBER = "#ffaa00";

export default function TimelineScrubber({ embedded = false }: { embedded?: boolean }) {
  const {
    currentDate, isPlaying, playbackSpeed, timeScale, warStart, warEnd,
    setCurrentDate, togglePlayback, setPlaybackSpeed, setTimeScale, mode,
  } = useAppStore();

  const activeView = useAppStore((s) => s.activeView);
  const zoom = useAppStore((s) => s.mapZoom);

  const hasBottomPanel = !embedded && (activeView === "theaters" || activeView === "battles");

  const animRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  const currentMs = new Date(currentDate).getTime();
  const progress = (currentMs - warStart) / (warEnd - warStart);

  const accent = mode === "historical" ? CYAN : AMBER;
  const borderColor = mode === "historical"
    ? "rgba(0, 212, 255, 0.35)"
    : "rgba(255, 170, 0, 0.35)";

  const sliderStyle = useMemo(() => {
    const thumbShadow = mode === "historical"
      ? "0 0 6px rgba(0,212,255,0.4)"
      : "0 0 6px rgba(255,170,0,0.4)";
    return `
      .timeline-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: ${accent};
        cursor: grab;
        box-shadow: ${thumbShadow};
      }
      .timeline-slider::-webkit-slider-thumb:active {
        cursor: grabbing;
      }
    `;
  }, [accent, mode]);

  const tick = useCallback((timestamp: number) => {
    if (!lastTickRef.current) lastTickRef.current = timestamp;
    const delta = timestamp - lastTickRef.current;

    if (delta >= 50) {
      lastTickRef.current = timestamp;
      const advance = msPerTick[useAppStore.getState().timeScale] *
        useAppStore.getState().playbackSpeed * (delta / 1000);
      const current = new Date(useAppStore.getState().currentDate).getTime();
      const next = Math.min(current + advance, warEnd);

      if (next >= warEnd) {
        useAppStore.getState().setIsPlaying(false);
        return;
      }
      setCurrentDate(new Date(next).toISOString());
    }

    animRef.current = requestAnimationFrame(tick);
  }, [setCurrentDate, warEnd]);

  useEffect(() => {
    if (isPlaying) {
      lastTickRef.current = 0;
      animRef.current = requestAnimationFrame(tick);
    } else if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, tick]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = parseFloat(e.target.value);
    const ms = warStart + pct * (warEnd - warStart);
    setCurrentDate(new Date(ms).toISOString());
  };

  const scaleIdx = timeScales.indexOf(timeScale);

  // When logistics view is active, the standalone (non-embedded) scrubber hides
  // because LogisticsOverlay renders its own embedded copy
  if (!embedded && activeView === "logistics") return null;

  if (embedded) {
    return (
      <div>
        {zoom >= 6 && (
          <p className="text-[10px] font-mono text-foreground/40 italic max-w-xs mb-2">
            {zoom < 10
              ? "Operational-level data. Some positions interpolated."
              : "Tactical-level data. Positions and unit details are estimated where primary sources are unavailable."}
          </p>
        )}
        <style>{sliderStyle}</style>
        <div
          className="bg-panel/35 backdrop-blur-sm rounded-lg px-4 py-2.5"
          style={{ border: `2px solid ${borderColor}` }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono tracking-widest uppercase" style={{ color: accent, opacity: 0.6 }}>Timeline</span>
            <span className="text-xs font-mono tracking-wide" style={{ color: accent, opacity: 0.8 }}>{formatDateForScale(currentDate, timeScale)}</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => { const ms = Math.max(new Date(currentDate).getTime() - msPerTick[timeScale], warStart); setCurrentDate(new Date(ms).toISOString()); }} className="text-xs font-mono px-1.5 py-0.5 rounded transition-colors text-foreground/50 hover:text-foreground/80" style={{ border: `1px solid ${borderColor}` }} aria-label="Step back one unit">−</button>
            <div className="relative flex-1">
              <input type="range" min="0" max="1" step="0.0001" value={progress} onChange={handleSliderChange} className="timeline-slider w-full h-1 appearance-none bg-panel-border rounded-full cursor-pointer" aria-label="Timeline position" />
              <div className="absolute top-1/2 left-0 h-1 rounded-full pointer-events-none -translate-y-1/2" style={{ width: `${progress * 100}%`, backgroundColor: accent, opacity: 0.3 }} />
            </div>
            <button onClick={() => { const ms = Math.min(new Date(currentDate).getTime() + msPerTick[timeScale], warEnd); setCurrentDate(new Date(ms).toISOString()); }} className="text-xs font-mono px-1.5 py-0.5 rounded transition-colors text-foreground/50 hover:text-foreground/80" style={{ border: `1px solid ${borderColor}` }} aria-label="Step forward one unit">+</button>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <button onClick={togglePlayback} className="w-7 h-7 rounded flex items-center justify-center transition-colors" style={{ border: `1px solid ${accent}`, color: accent }} aria-label={isPlaying ? "Pause" : "Play"}><span className="text-xs font-mono">{isPlaying ? "⏸" : "▶"}</span></button>
            {speeds.map((s) => (<button key={s} onClick={() => setPlaybackSpeed(s)} className="w-7 h-7 rounded flex items-center justify-center text-xs font-mono transition-colors" style={{ border: `1px solid ${playbackSpeed === s ? accent : 'rgba(255,255,255,0.1)'}`, color: playbackSpeed === s ? accent : 'rgba(255,255,255,0.4)', backgroundColor: playbackSpeed === s ? `${accent}15` : 'transparent' }} aria-label={`Set speed to ${s}x`}>{s}x</button>))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono tracking-widest uppercase" style={{ color: accent, opacity: 0.4 }}>Scale</span>
            <div className="flex items-center gap-2">
              <button onClick={() => scaleIdx > 0 && setTimeScale(timeScales[scaleIdx - 1])} className={`text-xs font-mono px-1.5 py-0.5 rounded ${scaleIdx > 0 ? "text-foreground/50 hover:text-foreground/80" : "text-foreground/20"}`} disabled={scaleIdx === 0} aria-label="Zoom in timeline">−</button>
              <span className="text-xs font-mono text-foreground/50 w-14 text-center uppercase">{timeScale}</span>
              <button onClick={() => scaleIdx < timeScales.length - 1 && setTimeScale(timeScales[scaleIdx + 1])} className={`text-xs font-mono px-1.5 py-0.5 rounded ${scaleIdx < timeScales.length - 1 ? "text-foreground/50 hover:text-foreground/80" : "text-foreground/20"}`} disabled={scaleIdx === timeScales.length - 1} aria-label="Zoom out timeline">+</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`absolute z-20 w-[460px] ${
      hasBottomPanel
        ? "bottom-[10rem] left-4"
        : "bottom-12 left-4"
    }`}>
      {/* Data disclaimer — sits above the timeline box */}
      {zoom >= 6 && (
        <p className="text-[10px] font-mono text-foreground/40 italic max-w-xs mb-2">
          {zoom < 10
            ? "Operational-level data. Some positions interpolated."
            : "Tactical-level data. Positions and unit details are estimated where primary sources are unavailable."}
        </p>
      )}
      <style>{sliderStyle}</style>
      <div
        className="bg-panel/35 backdrop-blur-sm rounded-lg px-4 py-2.5"
        style={{ border: `2px solid ${borderColor}` }}
      >
        {/* Header: Timeline label + date */}
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-xs font-mono tracking-widest uppercase"
            style={{ color: accent, opacity: 0.6 }}
          >
            Timeline
          </span>
          <span
            className="text-xs font-mono tracking-wide"
            style={{ color: accent, opacity: 0.8 }}
          >
            {formatDateForScale(currentDate, timeScale)}
          </span>
        </div>

        {/* Slider with step buttons */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => {
              const ms = Math.max(new Date(currentDate).getTime() - msPerTick[timeScale], warStart);
              setCurrentDate(new Date(ms).toISOString());
            }}
            className="text-xs font-mono px-1.5 py-0.5 rounded transition-colors text-foreground/50 hover:text-foreground/80"
            style={{ border: `1px solid ${borderColor}` }}
            aria-label="Step back one unit"
          >
            −
          </button>
          <div className="relative flex-1">
            <input
              type="range"
              min="0"
              max="1"
              step="0.0001"
              value={progress}
              onChange={handleSliderChange}
              className="timeline-slider w-full h-1 appearance-none bg-panel-border rounded-full cursor-pointer"
              aria-label="Timeline position"
            />
            <div
              className="absolute top-1/2 left-0 h-1 rounded-full pointer-events-none -translate-y-1/2"
              style={{ width: `${progress * 100}%`, backgroundColor: accent, opacity: 0.3 }}
            />
          </div>
          <button
            onClick={() => {
              const ms = Math.min(new Date(currentDate).getTime() + msPerTick[timeScale], warEnd);
              setCurrentDate(new Date(ms).toISOString());
            }}
            className="text-xs font-mono px-1.5 py-0.5 rounded transition-colors text-foreground/50 hover:text-foreground/80"
            style={{ border: `1px solid ${borderColor}` }}
            aria-label="Step forward one unit"
          >
            +
          </button>
        </div>

        {/* Play + Speed squares row */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={togglePlayback}
            className="w-7 h-7 rounded flex items-center justify-center transition-colors"
            style={{ border: `1px solid ${accent}`, color: accent }}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            <span className="text-xs font-mono">{isPlaying ? "⏸" : "▶"}</span>
          </button>

          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => setPlaybackSpeed(s)}
              className="w-7 h-7 rounded flex items-center justify-center text-xs font-mono transition-colors"
              style={{
                border: `1px solid ${playbackSpeed === s ? accent : 'rgba(255,255,255,0.1)'}`,
                color: playbackSpeed === s ? accent : 'rgba(255,255,255,0.4)',
                backgroundColor: playbackSpeed === s ? `${accent}15` : 'transparent',
              }}
              aria-label={`Set speed to ${s}x`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Time scale row */}
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-mono tracking-widest uppercase"
            style={{ color: accent, opacity: 0.4 }}
          >
            Scale
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scaleIdx > 0 && setTimeScale(timeScales[scaleIdx - 1])}
              className={`text-xs font-mono px-1.5 py-0.5 rounded ${scaleIdx > 0 ? "text-foreground/50 hover:text-foreground/80" : "text-foreground/20"}`}
              disabled={scaleIdx === 0}
              aria-label="Zoom in timeline"
            >
              −
            </button>
            <span className="text-xs font-mono text-foreground/50 w-14 text-center uppercase">
              {timeScale}
            </span>
            <button
              onClick={() => scaleIdx < timeScales.length - 1 && setTimeScale(timeScales[scaleIdx + 1])}
              className={`text-xs font-mono px-1.5 py-0.5 rounded ${scaleIdx < timeScales.length - 1 ? "text-foreground/50 hover:text-foreground/80" : "text-foreground/20"}`}
              disabled={scaleIdx === timeScales.length - 1}
              aria-label="Zoom out timeline"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
