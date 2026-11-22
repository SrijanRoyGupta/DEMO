import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Layers, MapPin, Radio, Shield } from "lucide-react";
import { useState } from "react";
import { SiteHeader } from "@/components/navigation/site-header";
import { LiveTerrainScene } from "@/components/radar/terrain-rain-view";
import { getLiveNetwork } from "@/lib/meteo.functions";
import { calculateRisk } from "@/lib/risk";
import { cn } from "@/lib/utils";

export function LiveRadarPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const liveQuery = useQuery({
    queryKey: ["live-network"],
    queryFn: () => getLiveNetwork(),
    refetchInterval: 20_000,
  });

  const stations = liveQuery.data?.stations ?? [];
  const active = stations.find((s) => s.id === activeId) ?? stations[0];
  const activeRisk = active ? calculateRisk(active) : null;
  const isCritActive = stations.some((s) => calculateRisk(s).total >= 70);

  return (
    <div className="flex min-h-screen flex-col bg-[#060608] text-white">
      {/* Shared Site Header */}
      <SiteHeader currentPath="/radar" isCrit={isCritActive} />

      {/* Sub-header navigation & action toolbar */}
      <div className="border-b border-white/[0.08] bg-[#0c0c10]/90 px-4 py-2.5 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#14141a] px-3 py-1.5 font-sans text-xs font-semibold text-[#8e8e9c] transition hover:border-white/25 hover:text-white"
            >
              <ArrowLeft className="size-3.5" />
              <span>Platform Overview</span>
            </Link>
            <div className="h-4 w-px bg-white/10 hidden sm:block" />
            <div className="hidden sm:block">
              <h1 className="font-heading text-sm font-bold uppercase tracking-wide text-white">
                3D BASIN TERRAIN & DOPPLER RADAR TWIN
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/command"
              search={{ tab: "terrain3d" }}
              className="rounded-lg border border-[#ff3b30]/30 bg-[#ff3b30]/10 px-3 py-1.5 font-mono text-[11px] font-bold text-[#ff3b30] transition hover:bg-[#ff3b30]/20"
            >
              Switch to 10 km Diorama →
            </Link>
            <Link
              to="/command"
              className="rounded-lg bg-white px-3.5 py-1.5 font-sans text-xs font-bold text-black transition hover:bg-neutral-200"
            >
              Full Command Center →
            </Link>
          </div>
        </div>
      </div>

      {/* Main 3D Viewport & Inspector Panel */}
      <div className="grid flex-1 gap-0 lg:grid-cols-[1fr_360px]">
        {/* 3D Scene Viewport */}
        <div className="relative min-h-[500px] lg:min-h-full bg-[#050507]">
          {liveQuery.isLoading ? (
            <div className="flex h-full items-center justify-center font-mono text-xs text-[#8e8e9c]">
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-[#ff3b30] animate-ping" />
                Streaming live Copernicus DEM & Doppler composite…
              </span>
            </div>
          ) : (
            <LiveTerrainScene
              stations={stations}
              activeId={active?.id ?? null}
              onSelect={setActiveId}
              className="h-full w-full"
            />
          )}

          <div className="pointer-events-none absolute bottom-4 left-4 font-mono text-[10px] uppercase tracking-wider text-[#8e8e9c]/80 bg-[#060608]/80 px-3 py-1.5 rounded-lg border border-white/[0.06] backdrop-blur">
            Orbit: Drag Left-Click · Pan: Right-Click · Zoom: Scroll · Select: Click Marker
          </div>
        </div>

        {/* Selected Station Inspector Drawer */}
        <aside className="flex flex-col border-t border-white/[0.08] bg-[#0a0a0e] lg:border-l lg:border-t-0">
          <div className="border-b border-white/[0.08] p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#ff3b30]">
                ACTIVE SENSING NODE
              </span>
              {active ? (
                <span className="font-mono text-[10px] text-[#34d399] flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-[#34d399]" />
                  LIVE STREAM
                </span>
              ) : null}
            </div>

            {active ? (
              <>
                <h2 className="mt-2 font-heading text-2xl font-black uppercase text-white">
                  {active.name}
                </h2>
                <p className="font-mono text-[11px] text-[#8e8e9c]">
                  {active.state} · {active.lat.toFixed(2)}°N, {active.lon.toFixed(2)}°E
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <MiniStat
                    label="Precip (1h)"
                    value={`${active.rainObserved.toFixed(1)} mm`}
                    highlight={active.rainObserved >= 10 ? "#ff453a" : undefined}
                  />
                  <MiniStat
                    label="Soil Saturation"
                    value={`${active.moist.toFixed(0)}%`}
                    highlight={active.moist >= 75 ? "#f5a524" : undefined}
                  />
                  <MiniStat
                    label="Risk Score"
                    value={`${Math.round(activeRisk?.total ?? 0)} / 100`}
                    highlight={
                      (activeRisk?.total ?? 0) >= 70
                        ? "#ff453a"
                        : (activeRisk?.total ?? 0) >= 40
                          ? "#f5a524"
                          : "#34d399"
                    }
                  />
                  <MiniStat label="Ground Tilt" value={`${active.tilt.toFixed(2)}°`} />
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                  <Link
                    to="/command"
                    search={{ station: active.id }}
                    className="flex items-center gap-1.5 font-sans text-xs font-bold text-[#ff3b30] hover:text-white transition"
                  >
                    <span>Open in Command Center</span>
                    <ArrowRight className="size-3" />
                  </Link>
                  <Link
                    to="/command"
                    search={{ tab: "terrain3d", station: active.id }}
                    className="font-mono text-[11px] text-[#8e8e9c] hover:text-white transition"
                  >
                    10 km Diorama →
                  </Link>
                </div>
              </>
            ) : (
              <p className="mt-2 text-xs text-[#8e8e9c]">No station selected.</p>
            )}
          </div>

          {/* Station Ingest Stream List */}
          <div className="p-3 border-b border-white/[0.08] bg-[#0c0c12]">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#8e8e9c]">
              SORTED BY PHYSICAL HAZARD SEVERITY
            </span>
          </div>

          <div className="flex-1 divide-y divide-white/[0.04] overflow-y-auto">
            {stations
              .slice()
              .sort((a, b) => calculateRisk(b).total - calculateRisk(a).total)
              .map((s) => {
                const total = Math.round(calculateRisk(s).total);
                const isSelected = s.id === active?.id;
                const tone = total >= 70 ? "crit" : total >= 40 ? "watch" : "safe";

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveId(s.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition",
                      isSelected ? "bg-[#181822]" : "hover:bg-[#111116]",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-heading text-sm font-bold text-white">
                          {s.name}
                        </span>
                        <span className="font-mono text-[10px] text-[#6e6e7c]">
                          {s.elevationDem}m
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-[#8e8e9c] mt-0.5">
                        {s.state} · Rain: {s.rainObserved.toFixed(1)} mm/h · Moist: {s.moist.toFixed(0)}%
                      </div>
                    </div>

                    <div
                      className={cn(
                        "shrink-0 rounded-lg px-2.5 py-1 font-mono text-xs font-bold",
                        tone === "crit" && "border border-[#ff453a]/40 bg-[#ff453a]/15 text-[#ff453a]",
                        tone === "watch" && "border border-[#f5a524]/40 bg-[#f5a524]/15 text-[#f5a524]",
                        tone === "safe" && "border border-white/10 bg-[#121218] text-[#34d399]",
                      )}
                    >
                      {total}
                    </div>
                  </button>
                );
              })}
          </div>
        </aside>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#111116] p-3">
      <div
        className="font-mono text-base font-bold text-white"
        style={highlight ? { color: highlight } : undefined}
      >
        {value}
      </div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-[#8e8e9c] mt-0.5">
        {label}
      </div>
    </div>
  );
}
