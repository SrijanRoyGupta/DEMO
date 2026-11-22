import { create } from "zustand";
import type { LogEntry, LogKind } from "@/lib/types";

export type TabId = "terrain3d" | "saferoute" | "incidents" | "live" | "search" | "dispatch" | "backtest" | "parameters" | "evacuation";

export type FieldOverride = {
  rain?: number;
  moist?: number;
  tilt?: number;
};

type CommandState = {
  tab: TabId;
  activeId: string;
  simMode: boolean;
  audioEnabled: boolean;
  layerNodes: boolean;
  layerRiver: boolean;
  layerRadar: boolean;
  radarPlaying: boolean;
  overrides: Record<string, FieldOverride>;
  dismissed: Record<string, string>;
  feed: LogEntry[];
  lastFingerprint: string;
  setTab: (tab: TabId) => void;
  setActiveId: (id: string) => void;
  setSimMode: (on: boolean) => void;
  toggleAudio: () => void;
  setLayer: (key: "layerNodes" | "layerRiver" | "layerRadar", on: boolean) => void;
  setRadarPlaying: (on: boolean) => void;
  patchOverride: (id: string, patch: FieldOverride) => void;
  clearOverrides: () => void;
  dismissLevel: (id: string, level: string) => void;
  resetDismissed: () => void;
  pushLog: (message: string, kind?: LogKind) => void;
  setFingerprint: (fp: string) => void;
};

let logSeq = 0;

export const useCommand = create<CommandState>((set) => ({
  tab: "terrain3d",
  activeId: "st1",
  simMode: false,
  audioEnabled: true,
  layerNodes: true,
  layerRiver: true,
  layerRadar: true,
  radarPlaying: true,
  overrides: {},
  dismissed: {},
  feed: [],
  lastFingerprint: "",
  setTab: (tab) => set({ tab }),
  setActiveId: (id) => set({ activeId: id }),
  setSimMode: (on) => set({ simMode: on }),
  toggleAudio: () => set((s) => ({ audioEnabled: !s.audioEnabled })),
  setLayer: (key, on) => set({ [key]: on }),
  setRadarPlaying: (on) => set({ radarPlaying: on }),
  patchOverride: (id, patch) =>
    set((s) => ({
      overrides: { ...s.overrides, [id]: { ...s.overrides[id], ...patch } },
    })),
  clearOverrides: () => set({ overrides: {}, simMode: false }),
  dismissLevel: (id, level) => set((s) => ({ dismissed: { ...s.dismissed, [id]: level } })),
  resetDismissed: () => set({ dismissed: {} }),
  pushLog: (message, kind = "info") =>
    set((s) => {
      const entry: LogEntry = {
        id: `log-${Date.now()}-${logSeq++}`,
        ts: Date.now(),
        kind,
        message,
      };
      return { feed: [entry, ...s.feed].slice(0, 36) };
    }),
  setFingerprint: (fp) => set({ lastFingerprint: fp }),
}));
