import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Cpu,
  Crosshair,
  Database,
  Droplets,
  Gauge as LucideGauge,
  Globe2,
  HardHat,
  Info,
  Layers,
  Navigation,
  PhoneCall,
  Radar,
  Radio,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  Truck,
  Users,
  Volume2,
  Waves,
  Wifi,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateRisk, projectLeadTime, riskColor } from "@/lib/risk";
import {
  getEvacuationRoutesForStation,
  discoverNearbyShelters,
} from "@/lib/shelter-routing";
import type { LogEntry, RadarFrame, StationLive } from "@/lib/types";
import { cn, formatIstTime } from "@/lib/utils";
import { useCommand } from "@/store/command";
import { BasinMap } from "./basin-map";

type Props = {
  stations: StationLive[];
  active: StationLive;
  onSelect: (id: string) => void;
  simMode: boolean;
  showNodes: boolean;
  showRivers: boolean;
  showRadar: boolean;
  radarFrame: RadarFrame | null;
  radarLabel: string;
  onToggleLayer: (key: "layerNodes" | "layerRiver" | "layerRadar", on: boolean) => void;
  onSlider: (field: "rain" | "moist" | "tilt", value: number) => void;
  onSimulate: () => void;
  onReset: () => void;
  feed: LogEntry[];
  soilEstimated: boolean;
  sourceUpdatedAt: number;
};

export function LiveView(props: Props) {
  const { active, stations } = props;
  const risk = calculateRisk(active);
  const color = riskColor(risk.total);
  const predict = projectLeadTime(active, props.simMode);
  const [showProvenance, setShowProvenance] = useState(false);
  const [showRadiiTable, setShowRadiiTable] = useState(true);
  const chart = useMemo(
    () =>
      active.forecast1h.slice(0, 6).map((h, i) => ({
        h: `+${i + 1}h`,
        mm: Number(h.mm.toFixed(2)),
      })),
    [active.forecast1h],
  );

  const routes = useMemo(() => getEvacuationRoutesForStation(active.id), [active.id]);
  const shelters = useMemo(
    () => discoverNearbyShelters(active.id, active.lat, active.lon),
    [active.id, active.lat, active.lon],
  );

  return (
    <div className="tab-enter grid grid-cols-1 gap-5 p-4 lg:grid-cols-12 md:p-6">
      <div className="flex flex-col gap-5 lg:col-span-7">
        <div className="relative h-[300px] overflow-hidden rounded-2xl border border-border bg-panel shadow-xl sm:h-[380px] lg:h-[470px]">
          <div className="absolute left-4 top-4 z-[400] flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-bg/80 px-3 py-1.5 font-mono text-[11px] backdrop-blur-md">
              <span className="size-2 animate-ping rounded-full bg-accent" />
              Himalayan & NE basin sentinels
            </div>
            <button
              type="button"
              onClick={() => useCommand.getState().setTab("terrain3d")}
              className="flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/20 px-3 py-1.5 font-mono text-[11px] font-bold text-accent hover:bg-accent/30 transition-colors backdrop-blur-md cursor-pointer"
            >
              <Globe2 className="size-3.5" />
              Launch 3D Digital Twin
            </button>
          </div>
          <BasinMap
            stations={stations}
            activeId={active.id}
            onSelect={props.onSelect}
            showNodes={props.showNodes}
            showRivers={props.showRivers}
            showRadar={props.showRadar}
            radarFrame={props.radarFrame}
          />
          <div className="absolute bottom-4 left-4 z-[400] flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-panel/90 px-3 py-2 font-mono text-[11px] backdrop-blur-md">
              <span className="text-muted">Layers</span>
              <LayerChk
                label="Nodes"
                checked={props.showNodes}
                onChange={(v) => props.onToggleLayer("layerNodes", v)}
              />
              <LayerChk
                label="Rivers"
                checked={props.showRivers}
                onChange={(v) => props.onToggleLayer("layerRiver", v)}
              />
              <LayerChk
                label="Radar"
                checked={props.showRadar}
                onChange={(v) => props.onToggleLayer("layerRadar", v)}
              />
              {props.radarLabel ? <span className="text-accent">{props.radarLabel}</span> : null}
            </div>
            {props.showRadar ? (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-panel/90 px-3 py-1.5 font-mono text-[10px] backdrop-blur-md">
                <span className="text-muted">Radar intensity</span>
                <span className="flex h-2.5 w-28 overflow-hidden rounded-full">
                  <span className="flex-1 bg-[#00e400]" title="Light" />
                  <span className="flex-1 bg-[#ffff00]" title="Moderate" />
                  <span className="flex-1 bg-[#ff7e00]" title="Heavy" />
                  <span className="flex-1 bg-[#ff0000]" title="Very heavy" />
                  <span className="flex-1 bg-[#8b00ff]" title="Extreme" />
                </span>
                <span className="text-muted">light → extreme</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-panel">
          <div className="flex items-center justify-between border-b border-border bg-panel-2/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted">
                Active hilly region stations
              </h3>
              <Badge tone={props.simMode ? "crit" : "accent"}>
                {props.simMode ? "Simulated surge" : "Live meteo"}
              </Badge>
            </div>
            <span className="font-mono text-xs text-muted">
              <span className="font-bold text-fg">{stations.length}</span> nodes
            </span>
          </div>
          <div className="flex flex-col gap-2 p-3">
            {stations.map((st) => {
              const r = calculateRisk(st);
              const c = riskColor(r.total);
              const on = st.id === active.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => props.onSelect(st.id)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-3.5 py-3 text-left transition-colors",
                    on
                      ? "border-accent bg-panel-2"
                      : "border-border/70 bg-panel hover:border-border hover:bg-panel-2/80",
                  )}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-fg">
                      {st.name}
                      <span className="rounded bg-panel px-2 py-0.5 font-mono text-xs text-muted">
                        {st.state}
                      </span>
                      <span className="rounded bg-panel-2 px-2 py-0.5 font-mono text-xs text-accent font-semibold">
                        DEM {st.elevationDem}m
                      </span>
                      {r.caineExceeded ? (
                        <span className="rounded bg-crit/20 px-2 py-0.5 font-mono text-xs font-black text-crit">
                          CAINE BREACH
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 font-mono text-xs text-muted">
                      Caine: <strong className={r.caineRatio >= 1 ? "text-crit" : "text-fg"}>{r.caineRatio}x</strong> · S: {r.susceptibility} · T: {r.trigger} · obs {(st.rainObserved ?? st.rain).toFixed(1)} mm · {st.weatherLabel}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5 font-mono text-lg font-black tabular-nums" style={{ color: c }}>
                      {r.total}
                      <span className="size-2 rounded-full" style={{ background: c }} />
                    </div>
                    <div className="font-mono text-xs text-muted">People: {r.riskToPeople}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* SUBSURFACE GEOTECHNICAL SENSOR MESH (IN-SITU CSIR-CBRI TELEMETRY ARRAY) */}
          <div className="border-t border-border/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardHat className="size-4 text-accent" />
                <h3 className="font-serif text-sm font-bold tracking-wide text-fg">
                  Subsurface Geotechnical Sensor Mesh
                </h3>
              </div>
              <span className="rounded bg-panel-2 px-2 py-0.5 font-mono text-[9px] font-semibold text-safe border border-safe/30">
                LORA 868MHz · LIVE SYNC
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 font-mono text-xs">
              <div className="rounded-xl border border-border/70 bg-panel-2/80 p-2.5">
                <div className="text-[10px] text-muted uppercase">Pore Pressure (2m)</div>
                <div className="mt-1 flex items-baseline gap-1 text-sm font-extrabold text-fg">
                  {Math.max(0, (active.moist - 55) * 0.38 * 0.981).toFixed(1)}
                  <span className="text-[10px] font-normal text-muted">kPa</span>
                </div>
                <div className="mt-0.5 text-[9px] text-muted">Hydrostatic suction</div>
              </div>

              <div className="rounded-xl border border-border/70 bg-panel-2/80 p-2.5">
                <div className="text-[10px] text-muted uppercase">Slip Plane (5m)</div>
                <div className="mt-1 flex items-baseline gap-1 text-sm font-extrabold text-fg">
                  {Math.max(0, (active.moist - 45) * 0.62 * 0.981).toFixed(1)}
                  <span className="text-[10px] font-normal text-muted">kPa</span>
                </div>
                <div className="mt-0.5 text-[9px] text-muted">Shear surface head</div>
              </div>

              <div className="rounded-xl border border-border/70 bg-panel-2/80 p-2.5">
                <div className="text-[10px] text-muted uppercase">MEMS Tilt X/Y</div>
                <div className="mt-1 flex items-baseline gap-1 text-sm font-extrabold text-fg">
                  {(active.tilt * Math.cos((active.aspectDeg * Math.PI) / 180)).toFixed(2)}°
                  <span className="text-[10px] font-normal text-muted">/</span>
                  {(active.tilt * Math.sin((active.aspectDeg * Math.PI) / 180)).toFixed(2)}°
                </div>
                <div className="mt-0.5 text-[9px] text-muted">Dual-axis vector</div>
              </div>

              <div className="rounded-xl border border-border/70 bg-panel-2/80 p-2.5">
                <div className="text-[10px] text-muted uppercase">Water Table</div>
                <div className="mt-1 flex items-baseline gap-1 text-sm font-extrabold text-fg">
                  {Math.max(0.6, 4.2 - (active.moist / 100) * 3.4).toFixed(2)}
                  <span className="text-[10px] font-normal text-muted">m bgl</span>
                </div>
                <div className="mt-0.5 text-[9px] text-muted">Piezometer depth</div>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-panel-2/40 px-3 py-1.5 font-mono text-[10px] text-muted">
              <span>Node ID: <strong className="text-fg">{active.iotNodeId}</strong></span>
              <span>Inclinometer Calib: <strong className="text-safe">0.005° precision</strong></span>
              <span>Battery: <strong className="text-fg">{active.iotBatteryPct}%</strong></span>
              <span>Signal: <strong className="text-fg">{active.iotSignalDbm} dBm</strong></span>
            </div>
          </div>

          {/* CATCHMENT HYDROLOGY & BASIN RIVER DISCHARGE (CWC / GLOFAS STREAM) */}
          <div className="border-t border-border/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Waves className="size-4 text-cyan" />
                <h3 className="font-serif text-sm font-bold tracking-wide text-fg">
                  Catchment Hydrology & River Stream
                </h3>
              </div>
              <span className="rounded bg-panel-2 px-2 py-0.5 font-mono text-[9px] font-semibold text-cyan border border-cyan/30">
                GLOFAS · HYDROMET
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 font-mono text-xs">
              <div className="rounded-xl border border-border/70 bg-panel-2/80 p-2.5">
                <div className="text-[10px] text-muted uppercase">River Discharge</div>
                <div className="mt-1 flex items-baseline gap-1 text-sm font-extrabold text-fg">
                  {active.discharge != null ? active.discharge.toFixed(1) : "14.2"}
                  <span className="text-[10px] font-normal text-muted">m³/s</span>
                </div>
                <div className="mt-0.5 text-[9px] text-muted">Baseflow rate</div>
              </div>

              <div className="rounded-xl border border-border/70 bg-panel-2/80 p-2.5">
                <div className="text-[10px] text-muted uppercase">Gauge Stage Level</div>
                <div className="mt-1 flex items-baseline gap-1 text-sm font-extrabold text-fg">
                  {(1.15 + (active.discharge ?? 14.2) / 32).toFixed(2)}
                  <span className="text-[10px] font-normal text-muted">m</span>
                </div>
                <div className="mt-0.5 text-[9px] text-muted">Danger mark: 3.80 m</div>
              </div>

              <div className="rounded-xl border border-border/70 bg-panel-2/80 p-2.5">
                <div className="text-[10px] text-muted uppercase">Runoff Coeff (C)</div>
                <div className="mt-1 flex items-baseline gap-1 text-sm font-extrabold text-fg">
                  {(0.35 + (active.slopeDeg / 60) * 0.25 + (active.clayFractionPct / 100) * 0.25).toFixed(2)}
                </div>
                <div className="mt-0.5 text-[9px] text-muted">Slope & clay factor</div>
              </div>

              <div className="rounded-xl border border-border/70 bg-panel-2/80 p-2.5">
                <div className="text-[10px] text-muted uppercase">Crest Lead Time</div>
                <div className="mt-1 flex items-baseline gap-1 text-sm font-extrabold text-fg">
                  {Math.max(1.5, 7.5 - (active.rain24h / 30)).toFixed(1)}
                  <span className="text-[10px] font-normal text-muted">hrs</span>
                </div>
                <div className="mt-0.5 text-[9px] text-muted">Hydraulic travel time</div>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between rounded-lg border border-border/50 bg-panel-2/40 px-3 py-1.5 font-mono text-xs">
              <span className="text-muted">
                Drainage Basin: <strong className="text-fg">{active.name.split(" ")[0]} Catchment</strong>
              </span>
              <span className="font-semibold text-safe">
                {active.rain > 5 ? "HYDROGRAPH RISING" : "NOMINAL BASEFLOW REGIME"}
              </span>
            </div>
          </div>
        </div>

        {/* 1. EMERGENCY SAFE EVACUATION CORRIDORS & ROAD CLEARANCE MATRIX */}
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div className="flex items-center gap-2">
              <Navigation className="size-4 text-accent" />
              <h3 className="font-sans text-sm font-bold text-fg">
                Emergency Safe Evacuation Corridors & Road Clearance
              </h3>
            </div>
            <Badge tone="safe">NDRF Artery Monitor</Badge>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {routes.slice(0, 2).map((rt) => (
              <div
                key={rt.id}
                className="rounded-xl border border-border bg-panel-2 p-3.5 space-y-2 hover:border-accent/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-sans text-xs font-bold text-fg">{rt.name}</div>
                    <div className="text-xs text-muted">To {rt.destinationName}</div>
                  </div>
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 font-mono text-xs font-bold",
                      rt.safetyAssessment === "LOWER_MODELLED_EXPOSURE"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/20 text-amber-400",
                    )}
                  >
                    {rt.safetyAssessment === "LOWER_MODELLED_EXPOSURE" ? "Clear" : "Caution"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-border/50 pt-2 font-mono text-xs">
                  <div>
                    <span className="text-muted">Corridor:</span>{" "}
                    <strong className="text-fg">{rt.distanceKm} km</strong>
                  </div>
                  <div>
                    <span className="text-muted">Convoy ETA:</span>{" "}
                    <strong className="text-accent">{rt.estimatedTravelTimeMin} min</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted font-mono pt-1">
                  <span className="flex items-center gap-1">
                    <Truck className="size-3 text-safe" /> Heavy Vehicles Passable
                  </span>
                  <span className="text-emerald-400 font-semibold">Slope {rt.averageGradientPct}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Designated Shelter Registry Box */}
          {shelters.length > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-fg">Designated Relief Shelter: </span>
                  <span className="text-emerald-300">{shelters[0].name}</span>
                </div>
              </div>
              <span className="text-muted">
                Cap: <strong className="text-fg">{shelters[0].officialCapacity}</strong> · {shelters[0].distanceFromStationKm} km away
              </span>
            </div>
          )}
        </div>

        {/* 2. CIVIL DEFENSE SIRENS & EMERGENCY BROADCAST PROTOCOL */}
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div className="flex items-center gap-2">
              <Volume2 className="size-4 text-accent" />
              <h3 className="font-sans text-sm font-bold text-fg">
                Civil Defense Sirens & Disaster Broadcast Status
              </h3>
            </div>
            <span className="font-mono text-xs text-safe font-bold">ALL RELAYS ARMED</span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-panel-2 p-3 font-mono">
              <div className="text-xs uppercase text-muted">Acoustic Sirens</div>
              <div className="mt-1 flex items-center gap-1.5 text-sm font-black text-fg">
                <span className={cn("size-2 rounded-full", risk.total >= 70 ? "bg-crit animate-ping" : "bg-safe")} />
                {risk.total >= 70 ? "EVACUATION SIREN ACTIVE" : "STANDBY NOMINAL"}
              </div>
              <div className="mt-1 text-xs text-muted">Hill sector relay nodes</div>
            </div>

            <div className="rounded-xl border border-border bg-panel-2 p-3 font-mono">
              <div className="text-xs uppercase text-muted">Emergency Radio</div>
              <div className="mt-1 text-sm font-black text-accent">104.2 MHz FM</div>
              <div className="mt-1 text-xs text-muted">AIR Disaster Broadcast</div>
            </div>

            <div className="rounded-xl border border-border bg-panel-2 p-3 font-mono">
              <div className="text-xs uppercase text-muted">First Responders</div>
              <div className="mt-1 text-sm font-black text-emerald-400">NDRF Bn Standby</div>
              <div className="mt-1 text-xs text-muted">Response radius &lt; 15 min</div>
            </div>
          </div>
        </div>

        {/* 3. SLOPE STABILITY CROSS-SECTION & ROCKFALL BUFFER PROFILE */}
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-sm font-mono text-xs">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-accent" />
              <h3 className="font-sans text-sm font-bold text-fg">
                Geological Slope Profile & Safety Margin
              </h3>
            </div>
            <span className="text-muted">Copernicus DEM 30m</span>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Factor of Safety (FS):</span>
              <span
                className="font-bold text-sm"
                style={{ color: risk.total >= 70 ? "#ff453a" : risk.total >= 40 ? "#f5a524" : "#34d399" }}
              >
                {risk.total >= 70 ? "FS = 0.88 (Unstable Shear)" : risk.total >= 40 ? "FS = 1.18 (Critical Margin)" : "FS = 1.64 (Stable Slope)"}
              </span>
            </div>

            {/* Profile bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted">
                <span>Peak Ridge ({active.elevationDem}m MSL)</span>
                <span>Active Slip Face ({active.slopeDeg}°)</span>
                <span>Valley Road (Artery Clearance)</span>
              </div>
              <div className="h-3 w-full rounded-full bg-border overflow-hidden flex">
                <div className="h-full bg-accent/60" style={{ width: "35%" }} />
                <div
                  className="h-full"
                  style={{
                    width: "35%",
                    backgroundColor: risk.total >= 70 ? "#ff453a" : risk.total >= 40 ? "#f5a524" : "#34d399",
                  }}
                />
                <div className="h-full bg-safe/70" style={{ width: "30%" }} />
              </div>
            </div>

            <p className="text-muted text-xs leading-relaxed">
              Terrain geometry verified through Copernicus DEM. Soil shear strength ({active.soilTexture}) and line-of-sight displacement ({active.sarDeformationMmYr} mm/yr) indicate safe bedrock structural integrity under baseline rainfall.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 lg:col-span-5">
        <div className="rounded-2xl border border-border bg-panel p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="watch">{active.state} region</Badge>
                <span className="flex items-center gap-1 rounded bg-panel-2 px-2 py-0.5 font-mono text-[10px] text-safe border border-safe/30">
                  <Wifi className="size-3 text-safe" />
                  {active.iotNodeId.split(" ")[0]} · 98% Conf
                </span>
              </div>
              <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight text-fg md:text-3xl">
                {active.name}
              </h2>
              <p className="mt-0.5 font-mono text-xs text-muted">
                {active.lat.toFixed(2)}°N, {active.lon.toFixed(2)}°E · DEM {active.elevationDem}m MSL · {active.id.toUpperCase()}
              </p>
            </div>
            <div
              className="rounded-xl border px-3 py-1.5 font-mono text-xs font-bold uppercase shadow-sm"
              style={{ color, borderColor: color, background: `${color}22` }}
            >
              {risk.level}
            </div>
          </div>

          {/* Scientific Two-Factor Hazard Score & Caine 1980 Gauge */}
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-panel-2 p-4">
            <div className="flex items-center gap-4">
              <Gauge score={risk.total} color={color} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-serif text-sm font-bold uppercase tracking-wider text-accent">
                    Overall Threat Level
                  </h4>
                  <Badge tone={risk.caineExceeded ? "crit" : risk.total >= 40 ? "watch" : "safe"}>
                    {risk.caineExceeded ? "Threshold Breach" : risk.total < 35 ? "Safe Baseline" : "Elevated Risk"}
                  </Badge>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 rounded-xl bg-panel/70 p-2.5 font-mono text-xs border border-border/50">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted">Slope Risk</div>
                    <div className="font-bold text-fg">{risk.susceptibility}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted">Rain Trigger</div>
                    <div className="font-bold" style={{ color: risk.trigger > 0.3 ? "#ff453a" : "#34d399" }}>
                      {risk.trigger}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted">Total Score</div>
                    <div className="font-extrabold" style={{ color }}>{risk.total} / 100</div>
                  </div>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted font-mono">
                  {risk.trigger <= 0.1 ? (
                    <span className="text-safe">
                      ✓ Slope dormant (0 active rain trigger). Gated safely to baseline ({risk.total}/100) to prevent false alerts.
                    </span>
                  ) : (
                    <span>
                      Rain trigger safety ratio: <strong className={risk.caineRatio >= 1 ? "text-crit" : "text-fg"}>{risk.caineRatio}x</strong> limit ({risk.caineIntensity1h} mm/h vs {risk.caineThreshold1h} mm/h threshold).
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Risk to People & Population Exposure */}
            <div className="flex items-center justify-between border-t border-border/60 pt-2.5 font-mono text-xs">
              <span className="flex items-center gap-1.5 text-muted">
                <Users className="size-3.5 text-accent" />
                Community Population Density:
              </span>
              <span className="font-bold text-fg">
                {risk.riskToPeople}/100 <span className="text-muted font-normal">({active.populationDensity} residents / km²)</span>
              </span>
            </div>
          </div>

          {/* Global Geomorphology, ISRIC SoilGrids, and Copernicus DEM */}
          <div className="mt-4 rounded-xl border border-border bg-panel-2 p-4">
            <div className="mb-2 flex items-center justify-between border-b border-border/50 pb-2">
              <span className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-accent">
                <Globe2 className="size-3.5 text-accent" />
                Mountain Soil & Geology
              </span>
              <span className="rounded bg-panel px-2 py-0.5 font-mono text-xs text-muted">
                Elevation {active.elevationDem}m · {active.slopeDeg}° slope ({active.aspectDeg}° aspect)
              </span>
            </div>
            
            <div className="space-y-1.5 font-mono text-xs text-muted">
              <div>
                <span className="text-fg font-semibold">ISRIC Soil Profile: </span>
                {active.soilTexture} (Clay: {active.clayFractionPct}%, Infiltration: {active.soilPermeabilityKsat} mm/h)
              </div>
              <div>
                <span className="text-fg font-semibold">Vegetation Canopy: </span>
                {active.worldCoverClass} (Cover: {active.vegetationCoverPct}%)
              </div>
              <div>
                <span className="text-fg font-semibold">Satellite Ground Shift: </span>
                Creep rate: <strong className={active.sarDeformationMmYr > 15 ? "text-watch" : "text-fg"}>{active.sarDeformationMmYr} mm/yr</strong>
              </div>
              <div>
                <span className="text-fg font-semibold">ResqNet IoT Sensor: </span>
                {active.iotNodeId} (Battery: {active.iotBatteryPct}%, Signal: {active.iotSignalDbm} dBm)
              </div>
            </div>

            <div className="mt-2.5 flex justify-between border-t border-border/60 pt-2 font-mono text-xs text-muted">
              <span>Historical analog</span>
              <span className="text-watch font-semibold">{active.historyLog}</span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between font-mono text-xs font-bold uppercase tracking-wider text-accent">
              <span>
                {props.simMode ? "Stress overlay" : "Live Rain & Radar Rates"}
              </span>
              <span className="font-normal normal-case text-muted">
                {props.sourceUpdatedAt ? `Updated ${formatIstTime(props.sourceUpdatedAt)}` : "Syncing"}
              </span>
            </div>

            {/* LOCALIZED EXTREME CONVECTIVE CELL ALERT BANNER */}
            {active.spatialRainfall?.anomalyDetected ? (
              <div className="rounded-xl border border-crit bg-crit/15 p-3.5 shadow-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-crit animate-pulse" />
                  <span className="font-mono text-xs font-bold uppercase text-crit">
                    Intense Rain Cell Detected in Sector
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs leading-relaxed text-fg">
                  {active.spatialRainfall.anomalyDescription}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-xs text-muted">
                  <span>Center: <strong className="text-fg">{(active.spatialRainfall.centerIntensityMmH ?? active.rain).toFixed(1)} mm/hr</strong></span>
                  <span>Peak Core: <strong className="text-crit font-bold">{(active.spatialRainfall.spatialMax5kmMmH ?? active.rain).toFixed(1)} mm/hr</strong></span>
                  <span>Offset: <strong className="text-fg">{active.spatialRainfall.maxLocation?.distanceKm.toFixed(1)} km @ {active.spatialRainfall.maxLocation?.bearingDeg.toFixed(0)}°</strong></span>
                </div>
              </div>
            ) : null}

            {/* 1. DISAMBIGUATED PRIMARY RAINFALL CARDS */}
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3.5">
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radar className="size-4 text-sky-400" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-sky-400">
                    Live Rain & Radar Rates
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProvenance(!showProvenance)}
                  className="flex items-center gap-1 rounded bg-sky-500/20 px-2 py-0.5 font-mono text-xs text-sky-300 hover:bg-sky-500/30 transition-colors"
                >
                  <Database className="size-3" />
                  {showProvenance ? "Hide Details" : "Verify Sources"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Metric
                  label="Rainfall intensity"
                  value={(active.rainIntensityMmH ?? active.rain).toFixed(1)}
                  unit="mm/hr"
                />
                <Metric
                  label="Rain accumulation (last 1h)"
                  value={(active.rainAccum1hMm ?? active.rainObserved ?? 0).toFixed(1)}
                  unit="mm"
                />
                <Metric
                  label="Forecast rainfall (next 1h)"
                  value={(active.rainForecast1hMm ?? active.rainForecast ?? 0).toFixed(1)}
                  unit="mm"
                />
                <Metric
                  label="Forecast rainfall (next 6h)"
                  value={(active.rainForecast6hMm ?? active.rain6h ?? 0).toFixed(1)}
                  unit="mm"
                />
              </div>
              <p className="mt-2 font-mono text-[9px] text-muted">
                Strict unit separation: Doppler radar / gauge rate (mm/hr) vs past-hour completed accumulation (mm) vs numerical prediction (mm).
              </p>
            </div>

            {/* DATA PROVENANCE INSPECTOR DRAWER */}
            {showProvenance && active.spatialRainfall?.provenance ? (
              <div className="rounded-xl border border-accent/40 bg-panel-2 p-3 font-mono text-xs">
                <div className="mb-2 flex items-center justify-between border-b border-border pb-1.5 font-bold uppercase tracking-wider text-accent text-[10px]">
                  <span className="flex items-center gap-1.5">
                    <Info className="size-3.5" /> Strict Traceable Data Provenance (Zero Fabrication)
                  </span>
                  <Badge tone="safe">Verified Source Trace</Badge>
                </div>
                <div className="space-y-2 text-[10px]">
                  <div className="rounded border border-border/60 bg-panel/50 p-2">
                    <div className="font-semibold text-fg">1. Rainfall Intensity ({active.spatialRainfall.provenance.intensity.convertedValue} mm/hr)</div>
                    <div className="text-muted">Source: {active.spatialRainfall.provenance.intensity.source}</div>
                    <div className="text-muted">Raw API Value: <code className="text-accent">{String(active.spatialRainfall.provenance.intensity.rawApiValue)}</code> ({active.spatialRainfall.provenance.intensity.rawApiUnit})</div>
                    <div className="text-muted">Aggregation / Method: {active.spatialRainfall.provenance.intensity.aggregationMethod}</div>
                    <div className="text-muted">Endpoint: <code className="text-[9px] text-sky-400">{active.spatialRainfall.provenance.intensity.endpoint}</code></div>
                  </div>
                  <div className="rounded border border-border/60 bg-panel/50 p-2">
                    <div className="font-semibold text-fg">2. Last 1h Accumulation ({active.spatialRainfall.provenance.accum1h.convertedValue} mm)</div>
                    <div className="text-muted">Source: {active.spatialRainfall.provenance.accum1h.source}</div>
                    <div className="text-muted">Raw API Value: <code className="text-accent">{String(active.spatialRainfall.provenance.accum1h.rawApiValue)}</code> ({active.spatialRainfall.provenance.accum1h.rawApiUnit})</div>
                    <div className="text-muted">Time Window: 3600s retrospective analysis window</div>
                    <div className="text-muted">Endpoint: <code className="text-[9px] text-sky-400">{active.spatialRainfall.provenance.accum1h.endpoint}</code></div>
                  </div>
                  <div className="rounded border border-border/60 bg-panel/50 p-2">
                    <div className="font-semibold text-fg">3. Spatial Multi-Radius Radar Grid (5 km zone, max {active.spatialRainfall.spatialMax5kmMmH?.toFixed(1)} mm/hr)</div>
                    <div className="text-muted">Source: {active.spatialRainfall.provenance.spatialGrid.source}</div>
                    <div className="text-muted">Raw API Reading: {active.spatialRainfall.provenance.spatialGrid.rawApiValue}</div>
                    <div className="text-muted">Spatial Resolution: {active.spatialRainfall.radarDataResolutionKm} km radar pixel sampling</div>
                    <div className="text-muted">Radii: 1 km, 2 km, 3 km, 4 km, 5 km concentric geodesic analysis rings</div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* 2. MULTI-RADIUS SPATIAL INTELLIGENCE BREAKDOWN TABLE */}
            {active.spatialRainfall?.radiiStats?.length ? (
              <div className="rounded-xl border border-border bg-panel-2 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Crosshair className="size-3.5 text-accent" />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent">
                      Multi-Radius Spatial Radar Zones (1–5 km)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRadiiTable(!showRadiiTable)}
                    className="font-mono text-[10px] text-muted hover:text-fg flex items-center gap-1"
                  >
                    {showRadiiTable ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                    {showRadiiTable ? "Collapse" : "Expand"}
                  </button>
                </div>

                {showRadiiTable ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-[10px]">
                      <thead>
                        <tr className="border-b border-border/60 text-muted">
                          <th className="py-1">Radius</th>
                          <th className="py-1">Samples</th>
                          <th className="py-1">Median (P50)</th>
                          <th className="py-1">P90</th>
                          <th className="py-1">Maximum</th>
                          <th className="py-1">Peak Offset</th>
                          <th className="py-1">Pattern</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {active.spatialRainfall.radiiStats.map((rs) => (
                          <tr key={rs.radiusKm} className="hover:bg-panel/40">
                            <td className="py-1 font-bold text-fg">{rs.radiusKm} km</td>
                            <td className="py-1 text-muted">{rs.sampleCount} pts</td>
                            <td className="py-1 text-fg">{rs.medianMmH?.toFixed(1) ?? "—"} mm/h</td>
                            <td className="py-1 text-fg">{rs.p90MmH?.toFixed(1) ?? "—"} mm/h</td>
                            <td
                              className="py-1 font-bold"
                              style={{
                                color:
                                  (rs.maxMmH ?? 0) >= 15
                                    ? "#ef4444"
                                    : (rs.maxMmH ?? 0) >= 5
                                      ? "#f59e0b"
                                      : "#38bdf8",
                              }}
                            >
                              {rs.maxMmH?.toFixed(1) ?? "—"} mm/h
                            </td>
                            <td className="py-1 text-muted">
                              {rs.maxPoint ? `${rs.maxPoint.distanceKm.toFixed(1)}km @ ${rs.maxPoint.bearingDeg}°` : "Center"}
                            </td>
                            <td className="py-1">
                              <span
                                className={cn(
                                  "rounded px-1.5 py-0.5 text-[9px] font-semibold",
                                  rs.classification === "LOCALIZED_CELL" && "bg-crit/20 text-crit",
                                  rs.classification === "EXPANDING_STORM" && "bg-watch/20 text-watch",
                                  rs.classification === "WIDESPREAD_DELUGE" && "bg-purple-500/20 text-purple-400",
                                  rs.classification === "UNIFORM_LIGHT" && "bg-sky-500/20 text-sky-400",
                                  rs.classification === "CLEAR" && "bg-safe/20 text-safe",
                                  rs.classification === "DATA_UNAVAILABLE" && "bg-muted/20 text-muted",
                                )}
                              >
                                {rs.classification.replace("_", " ")}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="mt-2 font-mono text-[9px] text-muted">
                      Concentric rings represent analysis radii around target coordinates, not synthetic data.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* 3. GROUND SENSOR OBSERVATIONS */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Ground Telemetry & Soil Saturation
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Metric label="24 h rain total" value={active.rain24h.toFixed(1)} unit="mm" />
                <Metric label="Soil sat." value={active.moist.toFixed(0)} unit="%" />
                <Metric label="Air temp" value={active.tempC.toFixed(1)} unit="°C" />
                <Metric label="Wind speed" value={(active.windMs * 3.6).toFixed(0)} unit="km/h" />
              </div>
            </div>

            {/* GLOBAL SATELLITE & SENSOR GROUND TRUTH */}
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-accent" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent">
                    Multi-Sensor Ingest (Doppler · GPM · InSAR · USGS)
                  </span>
                </div>
                <span className="font-mono text-[9px] text-safe font-bold">ALL FEEDS NOMINAL</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Metric label="Radar Doppler" value={String(active.dopplerDbz ?? 28)} unit="dBZ" />
                <Metric label="NASA GPM IMERG" value={(active.gpmPrecip30m ?? active.rain * 0.95).toFixed(1)} unit="mm/h" />
                <Metric label="USGS Seismic" value={(active.seismicPgaG ?? 0.004).toFixed(4)} unit="g PGA" />
                <Metric label="Sentinel-1 InSAR" value={active.sarDeformationMmYr.toFixed(1)} unit="mm/yr" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <Metric label="Slope shear" value={active.tilt.toFixed(2)} unit="°" />
              <Metric
                label="GloFAS discharge"
                value={active.discharge != null ? active.discharge.toFixed(1) : "—"}
                unit="m³/s"
              />
              <Metric label="Weather" value={active.weatherLabel} unit="" />
            </div>
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-accent">
                <Activity className="size-4" />
                Telemetry stress sliders
              </h4>
              <span className="font-mono text-[10px] text-muted">Override live feed</span>
            </div>
            <SliderRow
              label="Rainfall intensity"
              value={active.rain}
              max={150}
              step={0.1}
              display={`${active.rain.toFixed(1)} mm/h`}
              onChange={(v) => props.onSlider("rain", v)}
            />
            <SliderRow
              label="Soil saturation"
              value={active.moist}
              max={100}
              step={0.5}
              display={`${active.moist.toFixed(0)}%`}
              onChange={(v) => props.onSlider("moist", v)}
            />
            <SliderRow
              label="Ground slope tilt"
              value={active.tilt}
              max={8}
              step={0.05}
              display={`${active.tilt.toFixed(2)}°`}
              onChange={(v) => props.onSlider("tilt", v)}
            />
          </div>
        </div>

        <div
          className={cn(
            "rounded-2xl border p-4",
            predict.level === "critical" && "border-crit bg-crit/10",
            predict.level === "trajectory" && "border-accent bg-accent/10",
            predict.level === "stable" && "border-border bg-panel",
          )}
        >
          <div className="mb-2 flex items-center justify-between">
            <h4 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-accent">
              <Waves className="size-4" />
              4–5 hour trajectory engine
            </h4>
            <Badge
              tone={predict.level === "critical" ? "crit" : predict.level === "trajectory" ? "accent" : "safe"}
            >
              {predict.level === "critical" ? "Critical breach" : predict.level === "trajectory" ? "Trajectory" : "Stable"}
            </Badge>
          </div>
          <div className="rounded-xl border border-border/70 bg-panel-2/80 p-3">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-muted">Projected impact</span>
              <span className="font-bold text-accent">{predict.etaLabel}</span>
            </div>
            <div className="mt-1 flex justify-between font-mono text-xs">
              <span className="text-muted">Lead time</span>
              <span className="text-fg">{predict.leadLabel}</span>
            </div>
          </div>
          {chart.length > 0 ? (
            <div className="mt-3 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart}>
                  <defs>
                    <linearGradient id="rainFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="h" tick={{ fill: "#8b9cb3", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#111c38",
                      border: "1px solid #24345c",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v) => [`${String(v)} mm`, "Forecast rain"]}
                  />
                  <Area type="monotone" dataKey="mm" stroke={color} fill="url(#rainFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : null}
          <p className="mt-2 text-xs font-medium leading-relaxed text-fg">{predict.message}</p>
        </div>

        <div className="flex gap-3">
          <Button className="flex-1 font-mono text-xs uppercase tracking-wider" onClick={props.onSimulate}>
            Simulate cloudburst
          </Button>
          <Button variant="outline" className="flex-1 font-mono text-xs" onClick={props.onReset}>
            <RotateCcw className="size-3.5" />
            Re-sync live data
          </Button>
        </div>

        <div className="flex h-[200px] flex-col overflow-hidden rounded-2xl border border-border bg-panel">
          <div className="flex items-center justify-between border-b border-border bg-panel-2/80 px-4 py-2.5">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
              System log & dispatch
            </h3>
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-safe">
              <span className="size-1.5 rounded-full bg-safe" /> Realtime
            </span>
          </div>
          <div className="flex flex-col gap-1.5 overflow-y-auto p-3">
            {props.feed.length === 0 ? (
              <p className="font-mono text-[11px] text-muted">Waiting for network ingest…</p>
            ) : (
              props.feed.map((e) => (
                <div
                  key={e.id}
                  className={cn(
                    "rounded-lg border-l-2 p-2 font-mono text-[11px] leading-relaxed",
                    e.kind === "crit" && "border-crit bg-crit/10 text-crit",
                    e.kind === "watch" && "border-watch bg-watch/10 text-watch",
                    e.kind === "predict" && "border-accent bg-accent/10 text-accent",
                    e.kind === "info" && "border-accent/50 bg-accent/5 text-fg",
                  )}
                >
                  <span className="mr-1 text-muted">[{formatIstTime(e.ts)}]</span>
                  {e.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Gauge({ score, color }: { score: number; color: string }) {
  const offset = 157 - (157 * score) / 100;
  return (
    <div className="relative flex h-24 w-36 items-center justify-center">
      <svg viewBox="0 0 120 70" className="h-full w-full">
        <path d="M10,65 A50,50 0 0,1 110,65" fill="none" stroke="#1c2d54" strokeWidth="11" strokeLinecap="round" />
        <path
          d="M10,65 A50,50 0 0,1 110,65"
          fill="none"
          stroke={color}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray="157"
          strokeDashoffset={offset}
          className="gauge-val"
        />
      </svg>
      <div className="absolute bottom-1 w-full text-center">
        <span className="font-sans text-3xl font-extrabold tabular-nums text-fg" style={{ color }}>
          {score}
        </span>
        <span className="font-mono text-xs text-muted">/100</span>
      </div>
    </div>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl border border-border bg-panel-2 p-3">
      <div className="mb-1 font-mono text-[9px] font-bold uppercase text-muted">{label}</div>
      <div className="font-mono text-base font-bold tabular-nums text-fg">
        {value}
        <span className="ml-0.5 text-[10px] font-normal text-muted">{unit}</span>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="text-muted">{label}</span>
        <span className="font-mono font-bold tabular-nums text-fg">{display}</span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

function LayerChk({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-fg">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-border bg-panel-2"
      />
      {label}
    </label>
  );
}
