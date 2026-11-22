import { Link } from "@tanstack/react-router";
import { Activity, ArrowRight, Layers, Map, Radio, Shield, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { STATIONS } from "@/lib/stations";
import { formatIstClock } from "@/lib/utils";

interface SiteHeaderProps {
  currentPath?: "/" | "/command" | "/radar";
  audioEnabled?: boolean;
  onToggleAudio?: () => void;
  statusText?: string;
  isCrit?: boolean;
}

export function SiteHeader({
  currentPath = "/",
  audioEnabled = false,
  onToggleAudio,
  statusText = "12 STATIONS STREAMING",
  isCrit = false,
}: SiteHeaderProps) {
  const [clock, setClock] = useState("");
  const [sovereignRegion, setSovereignRegion] = useState("India Central (MeitY / DPDP)");

  useEffect(() => {
    const tick = () => setClock(formatIstClock());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#060608]/90 px-4 py-3 backdrop-blur-2xl md:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {/* Brand identity: Bold, architectural, strictly non-AI */}
        <div className="flex items-center gap-6">
          <Link to="/" className="group flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border border-white/15 bg-[#121216] text-white shadow-md transition group-hover:border-white/30 group-hover:bg-[#1a1a22]">
              {/* Sovereign terrain radar glyph */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 22 22 22" />
                <path d="M12 11v5" />
                <circle cx="12" cy="18" r="0.5" fill="currentColor" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-lg font-black tracking-tight text-white uppercase group-hover:text-white/90">
                TERRA<span className="text-[#ff3b30]">ALERT</span>
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#8e8e9c]">
                Sovereign Terrain Defense
              </span>
            </div>
          </Link>

          {/* Institutional Primary Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            <Link
              to="/"
              className={`rounded-md px-3 py-1.5 font-sans text-xs font-semibold transition ${
                currentPath === "/"
                  ? "bg-white/[0.10] text-white shadow-sm"
                  : "text-[#8e8e9c] hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              Overview
            </Link>
            <Link
              to="/command"
              className={`rounded-md px-3 py-1.5 font-sans text-xs font-semibold transition ${
                currentPath === "/command"
                  ? "bg-white/[0.10] text-white shadow-sm"
                  : "text-[#8e8e9c] hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              Command Center
            </Link>
            <Link
              to="/radar"
              className={`rounded-md px-3 py-1.5 font-sans text-xs font-semibold transition ${
                currentPath === "/radar"
                  ? "bg-white/[0.10] text-white shadow-sm"
                  : "text-[#8e8e9c] hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              3D Basin Twin
            </Link>
            <Link
              to="/command"
              search={{ tab: "terrain3d" }}
              className="rounded-md px-3 py-1.5 font-sans text-xs font-semibold text-[#8e8e9c] transition hover:bg-white/[0.04] hover:text-white"
            >
              3D Diorama
            </Link>
            <Link
              to="/command"
              search={{ tab: "incidents" }}
              className="rounded-md px-3 py-1.5 font-sans text-xs font-semibold text-[#8e8e9c] transition hover:bg-white/[0.04] hover:text-white"
            >
              Incident Intelligence
            </Link>
            <Link
              to="/command"
              search={{ tab: "backtest" }}
              className="rounded-md px-3 py-1.5 font-sans text-xs font-semibold text-[#8e8e9c] transition hover:bg-white/[0.04] hover:text-white"
            >
              Backtest
            </Link>
          </nav>
        </div>

        {/* Telemetry & Action Bar */}
        <div className="flex items-center gap-3">
          {/* Sovereign Enclave Selector */}
          <button
            type="button"
            onClick={() => {
              setSovereignRegion((prev) =>
                prev.startsWith("India")
                  ? "EU West (Frankfurt / GDPR & CEMS)"
                  : prev.startsWith("EU")
                    ? "US GovCloud (FedRAMP / USGS)"
                    : "India Central (MeitY / DPDP)",
              );
            }}
            className="hidden items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#0d0d11] px-2.5 py-1.5 font-mono text-[10px] text-[#8e8e9c] transition hover:border-white/20 hover:text-white lg:inline-flex"
            title="Multi-Region Sovereign Data Enclave"
          >
            <Shield className="size-3 text-[#ff3b30]" />
            <span className="truncate max-w-[140px]">{sovereignRegion}</span>
          </button>

          {/* Live Ingest Status */}
          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#0d0d11] px-2.5 py-1.5 font-mono text-[11px] text-[#c4c4cf]">
            <span className={`size-1.5 rounded-full ${isCrit ? "bg-[#ff453a] animate-pulse" : "bg-[#34d399]"}`} />
            <span className="text-[10px] tracking-wide uppercase">{statusText}</span>
          </div>

          {/* Clock */}
          {clock ? (
            <div className="hidden md:block rounded-lg border border-white/[0.08] bg-[#0d0d11] px-2.5 py-1.5 font-mono text-xs font-semibold text-[#8e8e9c]">
              {clock}
            </div>
          ) : null}

          {/* Audio toggle if supplied */}
          {onToggleAudio ? (
            <button
              type="button"
              onClick={onToggleAudio}
              className="flex size-8 items-center justify-center rounded-lg border border-white/[0.08] bg-[#0d0d11] text-[#8e8e9c] transition hover:border-white/20 hover:text-white"
              title="Toggle Alert Audio"
            >
              {audioEnabled ? <Volume2 className="size-3.5 text-[#34d399]" /> : <VolumeX className="size-3.5" />}
            </button>
          ) : null}

          {/* Primary Action Button: High contrast, dark design style */}
          {currentPath !== "/command" ? (
            <Link
              to="/command"
              className="flex items-center gap-2 rounded-lg bg-white px-3.5 py-1.5 font-sans text-xs font-bold text-black transition hover:bg-neutral-200 active:scale-95"
            >
              <span>Launch Operations</span>
              <ArrowRight className="size-3.5" />
            </Link>
          ) : (
            <Link
              to="/radar"
              className="flex items-center gap-2 rounded-lg border border-white/20 bg-[#121216] px-3.5 py-1.5 font-sans text-xs font-bold text-white transition hover:bg-[#1a1a22] active:scale-95"
            >
              <Map className="size-3.5 text-[#ff3b30]" />
              <span>3D Basin Map</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

