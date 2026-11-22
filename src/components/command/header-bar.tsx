import { Link } from "@tanstack/react-router";
import { Radio, Shield, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateRisk } from "@/lib/risk";
import type { StationLive } from "@/lib/types";
import { cn, formatIstClock } from "@/lib/utils";

type Props = {
  stations: StationLive[];
  audioEnabled: boolean;
  onToggleAudio: () => void;
  degraded: boolean;
  sourceLabel: string;
  fetchedAt: number;
  simMode: boolean;
};

export function HeaderBar({
  stations,
  audioEnabled,
  onToggleAudio,
  degraded,
  sourceLabel,
  fetchedAt,
  simMode,
}: Props) {
  const [clock, setClock] = useState("");
  const [sovereigntyRegion, setSovereigntyRegion] = useState<string>("India Central (MeitY / DPDP)");
  useEffect(() => {
    const tick = () => setClock(formatIstClock());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const maxRisk = stations.reduce((m, s) => Math.max(m, calculateRisk(s).total), 0);
  const status =
    maxRisk >= 70 ? "CRITICAL ALERT ACTIVE" : maxRisk >= 40 ? "ELEVATED WATCH STATE" : "System nominal";
  const statusTone = maxRisk >= 70 ? "crit" : maxRisk >= 40 ? "watch" : "safe";

  return (
    <header className="sticky top-0 z-[1050] border-b border-white/[0.08] bg-[#060608] px-4 py-3 shadow-lg md:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <Link to="/" className="group flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-[#121216] text-white shadow-md transition hover:border-white/30 hover:bg-[#1a1a22]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 22 22 22" />
              <path d="M12 11v5" />
              <circle cx="12" cy="18" r="0.5" fill="currentColor" />
            </svg>
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link to="/" className="font-heading text-xl font-black uppercase tracking-tight text-white md:text-2xl">
                TERRA<span className="text-[#ff3b30]">ALERT</span>
              </Link>
              <span className="hidden sm:inline-flex rounded-md border border-white/10 bg-[#121217] px-2 py-0.5 font-mono text-[10px] font-bold text-[#c4c4cf] uppercase tracking-wider">
                Command Operations
              </span>
            </div>
            <p className="mt-0.5 flex items-center gap-2 font-mono text-[11px] text-[#8e8e9c]">
              <span
                className={cn(
                  "size-1.5 rounded-full shadow-[0_0_8px]",
                  simMode ? "bg-[#ff453a] shadow-[#ff453a]" : degraded ? "bg-[#f5a524] shadow-[#f5a524]" : "bg-[#34d399] shadow-[#34d399]",
                )}
              />
              <span className="truncate">
                {simMode
                  ? "Simulation Active — Isolated Stress Analysis"
                  : degraded
                    ? "Partial ingest — Serving verified cached observations"
                    : sourceLabel}
              </span>
              {fetchedAt ? (
                <span className="hidden md:inline text-[#8e8e9c]/80" suppressHydrationWarning>
                  · {formatIstClock(fetchedAt)}
                </span>
              ) : null}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <Link
            to="/"
            className="rounded-lg border border-white/10 bg-[#121216] px-3 py-1.5 font-sans text-xs font-semibold text-[#8e8e9c] transition hover:border-white/20 hover:text-white"
          >
            ← Overview
          </Link>
          <Link
            to="/radar"
            className="hidden sm:inline-flex rounded-lg border border-white/10 bg-[#121216] px-3 py-1.5 font-sans text-xs font-semibold text-[#8e8e9c] transition hover:border-white/20 hover:text-white"
          >
            3D Basin Twin
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleAudio}
            className="hidden sm:inline-flex border-white/10 bg-[#121216] text-xs font-semibold text-[#c9c9d3] hover:bg-white/5 hover:text-white"
            title="Toggle alarm audio"
          >
            {audioEnabled ? <Volume2 className="size-4 text-[#34d399]" /> : <VolumeX className="size-4" />}
            <span className="font-mono text-[11px]">{audioEnabled ? "Audio on" : "Audio off"}</span>
          </Button>
          <Button variant="outline" size="icon" onClick={onToggleAudio} className="sm:hidden border-white/10 bg-[#121216]" title="Audio">
            {audioEnabled ? <Volume2 className="size-4 text-[#34d399]" /> : <VolumeX className="size-4" />}
          </Button>

          {/* UN EW4All 2027 Compliance & Sovereign Data Enclave Selector */}
          <button
            type="button"
            onClick={() => {
              setSovereigntyRegion((prev) =>
                prev.startsWith("India")
                  ? "EU West (Frankfurt / GDPR & CEMS)"
                  : prev.startsWith("EU")
                    ? "US GovCloud (FedRAMP / USGS & NASA)"
                    : "India Central (MeitY / DPDP)",
              );
            }}
            className="hidden items-center gap-1.5 rounded-xl border border-[#7c5cff]/40 bg-[#1b1a20] px-3 py-1.5 font-mono text-[11px] text-[#22d3ee] transition hover:bg-[#7c5cff]/20 lg:inline-flex"
            title="Click to cycle multi-region sovereign data enclave"
          >
            <Shield className="size-3.5 text-[#7c5cff]" />
            <span>{sovereigntyRegion}</span>
          </button>

          {clock ? (
            <div className="hidden rounded-xl border border-white/10 bg-[#121216] px-3 py-1.5 font-mono text-xs font-bold text-[#22d3ee] md:block shadow-inner">
              {clock}
            </div>
          ) : (
            <div className="hidden h-[34px] w-[118px] rounded-xl border border-white/10 bg-[#121216] md:block" />
          )}

          <div
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold",
              statusTone === "crit" && "border-[#f0657a]/50 bg-[#f0657a]/15 text-[#f0657a] shadow-[0_0_12px_rgba(240,101,122,0.3)]",
              statusTone === "watch" && "border-[#f5a524]/50 bg-[#f5a524]/15 text-[#f5a524] shadow-[0_0_12px_rgba(245,165,36,0.3)]",
              statusTone === "safe" && "border-white/10 bg-[#121216] text-[#34d399]",
            )}
          >
            <Radio className={cn("size-3.5", statusTone === "crit" && "animate-pulse")} />
            <span className="hidden sm:inline">{status}</span>
            <span className="sm:hidden">{maxRisk >= 70 ? "CRIT" : maxRisk >= 40 ? "WATCH" : "OK"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
