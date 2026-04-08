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
}));
