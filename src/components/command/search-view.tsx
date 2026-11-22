import { ArrowLeft, Compass, Radio, RotateCcw, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SEARCH_PRESETS } from "@/lib/stations";
import { riskColor } from "@/lib/risk";
import type { PlaceRisk, RadarFrame } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BasinMap } from "./basin-map";
import { RadarScan3D } from "./radar-scan-3d";

type Props = {
  radarFrame: RadarFrame | null;
  onSearch: (query: string) => Promise<PlaceRisk>;
};

export function SearchView({ radarFrame, onSearch }: Props) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlaceRisk | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(query: string) {
    const clean = query.trim();
    if (!clean) return;
    setBusy(true);
    setError(null);
    setStatus(`Querying live meteorological radar for “${clean}”…`);
    try {
      const res = await onSearch(clean);
      setResult(res);
      setStatus(null);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Search failed");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  const color = result ? riskColor(result.score) : "#34d399";

  return (
    <div className="tab-enter relative mx-auto w-full max-w-6xl p-4 md:p-8">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(ellipse_100%_80%_at_50%_0%,rgba(56,189,248,0.12),transparent)]" />

      {/* Header section */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone="watch">
              <span className="mr-1 inline-block size-1.5 animate-ping rounded-full bg-watch" />
              Live meteorological radar
            </Badge>
            <span className="font-mono text-[11px] text-muted">· RainViewer C-Band / GloFAS</span>
          </div>
          <h2 className="mt-2 font-sans text-2xl font-extrabold tracking-tight text-fg md:text-3xl">
            Himalayan & NE India regional risk search
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">
            Search any corridor coordinates (lat, lon) or place name. Observed rain uses Open-Meteo
            recent-hour analysis; forecast uses MET Norway next 1–6 h. Map radar is RainViewer live
            composite.
          </p>
        </div>

        {result ? (
          <Button
            variant="outline"
            onClick={() => setResult(null)}
            className="flex items-center gap-2 border-accent/40 bg-panel-2/80 font-mono text-xs text-accent transition hover:bg-accent/20"
          >
            <ArrowLeft className="size-3.5" />
            3D Radar Scanner
          </Button>
        ) : null}
      </div>

      {/* Search Input Box with modern glowing border */}
      <div className="relative mt-6 rounded-2xl border border-border/80 bg-panel/70 p-2 shadow-xl backdrop-blur-xl transition-all focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/20">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void run(q);
              }}
              placeholder="Place name or lat, lon  e.g. 25.27, 91.73"
              className="h-12 w-full rounded-xl bg-panel-2/90 px-4 font-mono text-sm text-fg outline-none placeholder:text-muted/60"
            />
          </div>
          <Button
            className="h-12 gap-2 px-6 font-mono text-xs uppercase tracking-wider shadow-lg"
            onClick={() => void run(q)}
            disabled={busy}
          >
            <Search className="size-4" />
            Analyze regional risk
          </Button>
        </div>
      </div>
      <p className="mt-2 font-mono text-[11px] text-muted">
        Coordinates: enter as <span className="font-semibold text-fg">lat, lon</span> (decimal degrees). Example: 25.2700, 91.7300 for Cherrapunji.
      </p>

      {/* Preset Quick Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 font-mono text-xs text-muted">
          <Compass className="size-3.5 text-accent" /> Presets
        </span>
        {SEARCH_PRESETS.map((p) => (
          <button
            key={p.query}
            type="button"
            className="rounded-lg border border-border/80 bg-panel/80 px-3 py-1 font-mono text-xs text-fg backdrop-blur-sm transition-all hover:border-accent hover:bg-panel-2 hover:text-accent hover:shadow-[0_0_12px_rgba(56,189,248,0.25)]"
            onClick={() => {
              setQ(p.query);
              void run(p.query);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Query Status / Loading Indicator */}
      {status ? (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4 font-mono text-xs text-accent backdrop-blur-md">
          <span className="size-2.5 animate-ping rounded-full bg-accent" />
          <span>{status}</span>
        </div>
      ) : null}

      {/* Query Error Notice */}
      {error ? (
        <div className="mt-6 rounded-2xl border border-crit bg-crit/15 p-4 font-mono text-xs text-crit">
          {error}
        </div>
      ) : null}

      {/* When NO result is loaded: Render Animated 3D Radar Scanner */}
      {!result ? (
        <RadarScan3D
          onSelectStation={(name) => {
            setQ(name);
            void run(name);
          }}
        />
      ) : null}

      {/* When result IS loaded: Render Map + Detailed Analysis Card */}
      {result ? (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-[380px] overflow-hidden rounded-2xl border border-border bg-panel p-1 shadow-2xl">
            <BasinMap
              stations={[]}
              activeId=""
              onSelect={() => undefined}
              showNodes
              showRivers={false}
              showRadar
              radarFrame={radarFrame}
              center={[result.lat, result.lon]}
              zoom={8}
              singleMarker={{ lat: result.lat, lon: result.lon, color, spatialRainfall: result.spatialRainfall }}
            />
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-border bg-panel p-6 shadow-2xl">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-sans text-2xl font-extrabold text-fg">{result.name}</h3>
                  <p className="mt-0.5 font-mono text-xs text-muted">
                    {result.lat.toFixed(4)}°N, {result.lon.toFixed(4)}°E
                  </p>
                  <p className="mt-1 text-xs text-muted">{result.region}</p>
                </div>
                <div
                  className="rounded-xl px-3.5 py-1.5 font-mono text-xs font-bold uppercase shadow-sm"
                  style={{ color, background: `${color}22`, border: `1px solid ${color}66` }}
                >
                  {result.level === "SAFE" ? "Safe / nominal" : result.level === "WATCH" ? "Watch" : "Critical"}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between rounded-xl border border-border bg-panel-2 p-4">
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase text-muted">Weather state</div>
                  <div className="mt-0.5 text-sm font-semibold text-accent">{result.weatherLabel}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[10px] font-bold uppercase text-muted">Humidity</div>
                  <div className="font-mono text-sm font-bold tabular-nums text-fg">{result.humidity.toFixed(0)}%</div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5">
                  <div className="mb-2 font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                    Observed / recent analysis
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Stat label="Last 1 h rain" value={(result.rainObserved ?? result.rain).toFixed(1)} unit="mm" />
                    <Stat label="24 h total" value={result.rain24h.toFixed(1)} unit="mm" />
                    <Stat label="Soil saturation" value={result.moist.toFixed(0)} unit="%" />
                    <Stat label="Humidity" value={result.humidity.toFixed(0)} unit="%" />
                  </div>
                </div>

                <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-3.5">
                  <div className="mb-2 font-mono text-[9px] font-bold uppercase tracking-wider text-sky-400">
                    Forecast (next hours)
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Stat label="Next 1 h" value={(result.rainForecast ?? 0).toFixed(1)} unit="mm" />
                    <Stat label="Next 6 h" value={result.rain6h.toFixed(1)} unit="mm" />
                    <Stat label="Air temp" value={result.tempC.toFixed(1)} unit="°C" />
                    <Stat label="Weather" value={result.weatherLabel} unit="" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-border pt-5">
              <div className="mb-2 flex items-end justify-between">
                <div>
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-fg">
                    USGS / UNDRR Hazard Index
                  </h4>
                  <p className="text-[11px] text-muted">
                    Caine I-D Ratio: <strong className={result.caineExceeded ? "text-crit" : "text-accent"}>{result.caineRatio ?? 0.2}x</strong> ({result.caineExceeded ? "EXCEEDED" : "SAFE"}) · S({result.susceptibilityScore ?? 0.6}) × T({result.triggerScore ?? 0.2})
                  </p>
                </div>
                <div className="text-right">
                  <span className={cn("font-sans text-3xl font-extrabold tabular-nums")} style={{ color }}>
                    {result.score}
                  </span>
                  <div className="font-mono text-[10px] text-muted">People: {result.riskToPeople ?? result.score}/100</div>
                </div>
              </div>
              <div className="h-3 overflow-hidden rounded-full border border-border/40 bg-panel-2">
                <div
                  className="h-full transition-all duration-700"
                  style={{ width: `${result.score}%`, background: color }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl border border-border bg-panel-2 p-3.5">
      <div className="mb-1 font-mono text-[10px] font-bold uppercase text-muted">{label}</div>
      <div className="font-mono text-2xl font-bold tabular-nums text-fg">
        {value}
        <span className="ml-1 text-xs font-normal text-muted">{unit}</span>
      </div>
    </div>
  );
}
