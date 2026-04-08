import { create } from "zustand";

export type ViewId =
  | "strategic-command"
  | "logistics"
  | "oob"
  | "network"
  | "theaters"
  | "battles"
  | "simulation";

export type AppMode = "historical" | "simulation";
export type TimeScale = "hours" | "days" | "weeks" | "months" | "years";

// WWII date range
const WAR_START = new Date("1939-09-01T00:00:00Z").getTime();
const WAR_END = new Date("1945-09-02T00:00:00Z").getTime();

export type LayerKey = "units" | "supplyArcs" | "hexControl" | "events";

interface VisibleLayers {
  units: boolean;
  supplyArcs: boolean;
  hexControl: boolean;
  events: boolean;
}

interface AppState {
  activeView: ViewId;
  mode: AppMode;
  currentDate: string;
  isPlaying: boolean;
  playbackSpeed: number; // 1x, 2x, 4x, 8x
  timeScale: TimeScale;
  warStart: number;
  warEnd: number;
  selectedUnitId: string | null;
  selectedEventId: string | null;
  flyToTarget: { lng: number; lat: number; zoom: number } | null;
  mapZoom: number;
  visibleLayers: VisibleLayers;
  setActiveView: (view: ViewId) => void;
  setMode: (mode: AppMode) => void;
  setCurrentDate: (date: string) => void;
  toggleMode: () => void;
  setIsPlaying: (playing: boolean) => void;
  togglePlayback: () => void;
  setPlaybackSpeed: (speed: number) => void;
  setTimeScale: (scale: TimeScale) => void;
  cyclePlaybackSpeed: () => void;
  setSelectedUnitId: (id: string | null) => void;
  setSelectedEventId: (id: string | null) => void;
  flyTo: (lng: number, lat: number, zoom?: number) => void;
  setMapZoom: (zoom: number) => void;
  toggleLayer: (layer: LayerKey) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeView: "strategic-command",
  mode: "historical",
  currentDate: "1944-06-06T06:30:00Z",
  isPlaying: false,
  playbackSpeed: 1,
  timeScale: "days",
  warStart: WAR_START,
  warEnd: WAR_END,
  selectedUnitId: null,
  selectedEventId: null,
  flyToTarget: null,
  mapZoom: 3,
  visibleLayers: { units: true, supplyArcs: true, hexControl: false, events: true },
  setActiveView: (view) => set({ activeView: view }),
  setMode: (mode) => set({ mode }),
  setCurrentDate: (date) => set({ currentDate: date }),
  toggleMode: () =>
    set((state) => ({
      mode: state.mode === "historical" ? "simulation" : "historical",
    })),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setTimeScale: (scale) => set({ timeScale: scale }),
  cyclePlaybackSpeed: () =>
    set((state) => {
      const speeds = [1, 2, 4, 8];
      const idx = speeds.indexOf(state.playbackSpeed);
      return { playbackSpeed: speeds[(idx + 1) % speeds.length] };
    }),
  setSelectedUnitId: (id) => set({ selectedUnitId: id }),
  setSelectedEventId: (id) => set({ selectedEventId: id }),
  flyTo: (lng, lat, zoom = 10) => set({ flyToTarget: { lng, lat, zoom } }),
  setMapZoom: (zoom) => set({ mapZoom: zoom }),
  toggleLayer: (layer) =>
    set((state) => ({
      visibleLayers: {
        ...state.visibleLayers,
        [layer]: !state.visibleLayers[layer],
      },
    })),
}));
