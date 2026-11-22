import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { getLiveNetwork, searchPlace } from "@/lib/meteo.functions";
import { calculateRisk } from "@/lib/risk";
import { STATIONS, placeholderLive } from "@/lib/stations";
import { clamp, formatIstClock } from "@/lib/utils";
import { playBeep } from "@/lib/audio";
import type { RadarFrame, StationLive } from "@/lib/types";
import { useCommand } from "@/store/command";
import { AlertModal, type ModalPayload } from "./alert-modal";
import { BacktestView } from "./backtest-view";
import { DispatchView } from "./dispatch-view";
import { HeaderBar } from "./header-bar";
import { IncidentResponseCenter } from "./incident-response-center";
import { LiveView } from "./live-view";
import { ParameterEncyclopediaView } from "./parameter-encyclopedia-view";
import { PlaybookView } from "./playbook-view";
import { SafeRouteMapView } from "./safe-route-map-view";
import { SearchView } from "./search-view";
import { CommandSidebar } from "./command-sidebar";
import { Terrain3DCommand } from "./terrain-3d-command";

export function CommandCenter() {
  const tab = useCommand((s) => s.tab);
  const setTab = useCommand((s) => s.setTab);
  const activeId = useCommand((s) => s.activeId);
  const setActiveId = useCommand((s) => s.setActiveId);
  const simMode = useCommand((s) => s.simMode);
  const setSimMode = useCommand((s) => s.setSimMode);
  const audioEnabled = useCommand((s) => s.audioEnabled);
  const toggleAudio = useCommand((s) => s.toggleAudio);
  const layerNodes = useCommand((s) => s.layerNodes);
  const layerRiver = useCommand((s) => s.layerRiver);
  const layerRadar = useCommand((s) => s.layerRadar);
  const radarPlaying = useCommand((s) => s.radarPlaying);
  const setLayer = useCommand((s) => s.setLayer);
  const overrides = useCommand((s) => s.overrides);
  const patchOverride = useCommand((s) => s.patchOverride);
  const clearOverrides = useCommand((s) => s.clearOverrides);
  const dismissed = useCommand((s) => s.dismissed);
  const dismissLevel = useCommand((s) => s.dismissLevel);
  const resetDismissed = useCommand((s) => s.resetDismissed);
  const feed = useCommand((s) => s.feed);
  const pushLog = useCommand((s) => s.pushLog);
  const lastFingerprint = useCommand((s) => s.lastFingerprint);
  const setFingerprint = useCommand((s) => s.setFingerprint);

  const liveQuery = useQuery({
    queryKey: ["live-network"],
    queryFn: () => getLiveNetwork(),
    refetchInterval: 8000,
    refetchIntervalInBackground: true,
    placeholderData: (prev) => prev,
  });

  const network = liveQuery.data;
  const [radarIdx, setRadarIdx] = useState(-1);
  const [modal, setModal] = useState<ModalPayload | null>(null);
  const [smsText, setSmsText] = useState(
    "[TerraAlert]: Rapid water-level rise and landslide threat detected at Guwahati Hills Ward 12. Evacuate to designated higher-ground shelter. Helpline 1077.",
  );
  const [smsTime, setSmsTime] = useState("");
  const [wardStatus, setWardStatus] = useState("Watch condition (elevated risk)");
  const [wardAction, setWardAction] = useState(
    "Place emergency disaster response team on standby. Inspect key drainage channels and verify public shelter access.",
  );
  const prevRisk = useRef<Record<string, number>>({});
  const warnedPredict = useRef<Record<string, boolean>>({});
  const simTimer = useRef<number | null>(null);
  const booted = useRef(false);

  const stations: StationLive[] = useMemo(() => {
    const raw = network?.stations ?? STATIONS.map(placeholderLive);
    return raw.map((st) => {
      const ov = overrides[st.id];
      if (!ov) return st;
      return {
        ...st,
        rain: ov.rain ?? st.rain,
        moist: ov.moist ?? st.moist,
        tilt: ov.tilt ?? st.tilt,
      };
    });
  }, [network, overrides]);

  const active = stations.find((s) => s.id === activeId) ?? stations[0];

  const frames: RadarFrame[] = network?.radar.frames ?? [];
  const radarFrame =
    frames.length === 0
      ? null
      : frames[radarIdx >= 0 && radarIdx < frames.length ? radarIdx : frames.length - 1] ?? null;

  useEffect(() => {
    if (!radarPlaying || frames.length < 2) return;
    const id = window.setInterval(() => {
      setRadarIdx((i) => {
        const cur = i < 0 ? frames.length - 1 : i;
        const next = cur + 1;
        return next >= frames.length ? 0 : next;
      });
    }, 900);
    return () => window.clearInterval(id);
  }, [radarPlaying, frames.length]);

  useEffect(() => {
    if (!network || booted.current) return;
    booted.current = true;
    pushLog(
      `Network synchronized — ${network.stations.length} nodes. Weather: ${network.sources.weather}. Soil: ${network.sources.soil}. Radar: ${network.sources.radar}.`,
    );
    setFingerprint(network.fingerprint);
  }, [network, pushLog, setFingerprint]);

  useEffect(() => {
    if (!network) return;
    if (lastFingerprint && lastFingerprint !== network.fingerprint) {
      pushLog("Live observations changed — dashboard refreshed from upstream models.");
    }
    if (network.fingerprint) setFingerprint(network.fingerprint);
  }, [network, lastFingerprint, pushLog, setFingerprint]);

  useEffect(() => {
    if (!stations.length) return;
    stations.forEach((st) => {
      const { total, level } = calculateRisk(st);
      const prev = prevRisk.current[st.id] ?? total;
      if (total >= 40 && prev < 40) {
        pushLog(
          `[Ward office] Watch dispatched for ${st.ward}.`,
          "watch",
        );
        setWardStatus("Watch condition (elevated risk)");
        setWardAction("Put emergency response team on standby. Inspect drainage infrastructure.");
        maybeModal(st, total, "WATCH");
      }
      if (total >= 70 && prev < 70) {
        const text = `[TerraAlert]: Rapid water-level rise and landslide threat at ${st.name} (${st.ward}). Evacuate to designated higher-ground shelter. Helpline 1077.`;
        setSmsText(text);
        setSmsTime(`Sent ${formatIstClock()}`);
        pushLog(`[SMS broadcast] Critical cell broadcast for ${st.ward}.`, "crit");
        maybeModal(st, total, "CRITICAL");
      }
      if (st.id === active?.id && total >= 55 && total < 70 && !warnedPredict.current[st.id]) {
        warnedPredict.current[st.id] = true;
        pushLog(
          `Predictor: trajectory alert for ${st.name}. Threshold may breach inside the 4–5 hour window.`,
          "predict",
        );
      }
      prevRisk.current[st.id] = total;
      void level;
    });
  }, [stations, active?.id, pushLog]);

  function maybeModal(st: StationLive, score: number, level: "WATCH" | "CRITICAL") {
    if (dismissed[st.id] === level) return;
    if (audioEnabled) playBeep(level === "CRITICAL" ? 980 : 650, level === "CRITICAL" ? 0.4 : 0.25);
    setModal({
      level,
      location: `${st.name} (${st.state})`,
      score,
      eta: level === "CRITICAL" ? "~4 hours 15 min lead window" : "~5 hour lead window",
      directive:
        level === "CRITICAL"
          ? `Cell broadcast active for ${st.ward}. Immediate evacuation to high-ground shelters. Mobilize emergency teams.`
          : `Notice sent to ward officer for ${st.ward}. Stand by disaster relief teams and inspect drainage channels.`,
    });
  }

  function closeModal() {
    if (modal && active) dismissLevel(active.id, modal.level);
    setModal(null);
  }

  function onSlider(field: "rain" | "moist" | "tilt", value: number) {
    if (!active) return;
    patchOverride(active.id, { [field]: value });
  }

  function startSim() {
    if (!active) return;
    resetDismissed();
    warnedPredict.current = {};
    setSimMode(true);
    pushLog(`Cloudburst simulation initiated over ${active.name}. Telemetry surging…`, "watch");
    if (simTimer.current) window.clearInterval(simTimer.current);
    simTimer.current = window.setInterval(() => {
      const id = useCommand.getState().activeId;
      const current = useCommand.getState().overrides[id] ?? {};
      const base = network?.stations.find((s) => s.id === id);
      const rain = current.rain ?? base?.rain ?? 0;
      const moist = current.moist ?? base?.moist ?? 0;
      const tilt = current.tilt ?? base?.tilt ?? 0.4;
      patchOverride(id, {
        rain: clamp(rain + 12 + Math.random() * 5, 0, 145),
        moist: clamp(moist + 8 + Math.random() * 4, 0, 100),
        tilt: clamp(tilt + 0.45 + Math.random() * 0.2, 0, 7.5),
      });
    }, 600);
  }

  function resetLive() {
    if (simTimer.current) {
      window.clearInterval(simTimer.current);
      simTimer.current = null;
    }
    clearOverrides();
    resetDismissed();
    warnedPredict.current = {};
    pushLog("Simulation terminated. Re-syncing live meteorological ingest…");
    void liveQuery.refetch();
  }

  useEffect(() => {
    return () => {
      if (simTimer.current) window.clearInterval(simTimer.current);
    };
  }, []);

  const radarLabel = radarFrame
    ? `Radar ${new Date(radarFrame.time * 1000).toLocaleTimeString("en-GB", { hour12: false, timeZone: "Asia/Kolkata" })} IST`
    : liveQuery.isFetching
      ? "Ingesting live radar…"
      : "";

  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg">
      <HeaderBar
        stations={stations}
        audioEnabled={audioEnabled}
        onToggleAudio={() => {
          toggleAudio();
          if (!audioEnabled) playBeep(880, 0.15);
        }}
        degraded={Boolean(network?.degraded) || liveQuery.isError}
        sourceLabel={
          network
            ? `${network.sources.weather} · ${network.sources.radar}`
            : "Connecting live meteorological ingest…"
        }
        fetchedAt={network?.fetchedAt ?? 0}
        simMode={simMode}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Left Vertical Operations Rail (Matching Sovereign Command References) */}
        <CommandSidebar
          tab={tab}
          onChange={setTab}
          criticalCount={stations.filter((s) => calculateRisk(s).total >= 40).length || 12}
        />
        {/* Main Content Workspace with smooth transitions */}
        <main className="flex-1 overflow-y-auto bg-[#07070d]">
          {tab === "terrain3d" ? (
            <Terrain3DCommand
              stations={stations}
              activeStation={active}
              onSelectStation={setActiveId}
              radarFrame={radarFrame}
              radarLabel={radarLabel}
              simMode={simMode}
              onSimulate={startSim}
              onReset={resetLive}
              onSlider={onSlider}
            />
          ) : null}
          {tab === "saferoute" ? (
            <SafeRouteMapView
              stations={stations}
              activeStation={active}
              onSelectStation={setActiveId}
              onSwitchTo3D={(id) => {
                setActiveId(id);
                setTab("terrain3d");
              }}
            />
          ) : null}
          {tab === "incidents" ? (
            <IncidentResponseCenter
              stations={stations}
              activeStation={active}
              onSelectStation={setActiveId}
              onSwitchTo3D={(id) => {
                setActiveId(id);
                setTab("terrain3d");
              }}
            />
          ) : null}
          {tab === "live" ? (
            <LiveView
              stations={stations}
              active={active}
              onSelect={setActiveId}
              simMode={simMode}
              showNodes={layerNodes}
              showRivers={layerRiver}
              showRadar={layerRadar}
              radarFrame={radarFrame}
              radarLabel={radarLabel}
              onToggleLayer={setLayer}
              onSlider={onSlider}
              onSimulate={startSim}
              onReset={resetLive}
              feed={feed}
              soilEstimated={active.soilEstimated}
              sourceUpdatedAt={active.sourceUpdatedAt}
            />
          ) : null}
          {tab === "search" ? (
            <SearchView
              radarFrame={radarFrame}
              onSearch={(query) => searchPlace({ data: { query } })}
            />
          ) : null}
          {tab === "dispatch" ? (
            <DispatchView
              station={active}
              smsText={smsText}
              smsTime={smsTime}
              wardStatus={wardStatus}
              wardAction={wardAction}
              onTestWard={() => {
                pushLog(`[Ward office] Test dispatch acknowledged for ${active.ward}.`, "watch");
                maybeModal(active, 58, "WATCH");
              }}
              onTestSms={() => {
                const text = `[TerraAlert]: Rapid water-level rise and landslide threat at ${active.name} (${active.ward}). Evacuate to designated higher-ground shelter. Helpline 1077.`;
                setSmsText(text);
                setSmsTime(`Sent ${formatIstClock()}`);
                pushLog(`[SMS broadcast] Test cell broadcast for ${active.ward}.`, "crit");
                maybeModal(active, 82, "CRITICAL");
              }}
            />
          ) : null}
          {tab === "backtest" ? <BacktestView /> : null}
          {tab === "parameters" ? <ParameterEncyclopediaView /> : null}
          {tab === "evacuation" ? <PlaybookView /> : null}
        </main>
      </div>
      <AlertModal payload={modal} onClose={closeModal} />
    </div>
  );
}
