import { Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  ChevronRight,
  Database,
  ExternalLink,
  Flame,
  Layers,
  Map,
  Radio,
  Search,
  Shield,
  Sliders,
  TrendingUp,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { HeroScene } from "@/components/landing/hero-scene";
import { SiteHeader } from "@/components/navigation/site-header";
import { calculateRisk, riskColor } from "@/lib/risk";
import { STATIONS } from "@/lib/stations";
import type { StationLive } from "@/lib/types";
import { cn } from "@/lib/utils";

const TICKER = [
  "Weather Union ground-station telemetry",
  "RainViewer Doppler radar composite (C-band)",
  "Copernicus 30m Global DEM topography",
  "MET Norway high-resolution forecast models",
  "GloFAS transboundary river discharge",
];

type CategoryFilter =
  | "ALL"
  | "3D_TERRAIN"
  | "DOPPLER_RADAR"
  | "LANDSLIDE"
  | "FLASH_FLOOD"
  | "INCIDENT_DISPATCH"
  | "BACKTEST";

export function SituationCommand() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("ALL");
  const [tickerIdx, setTickerIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTickerIdx((i) => (i + 1) % TICKER.length), 3200);
    return () => clearInterval(id);
  }, []);

  const handleStationSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      navigate({ to: "/command" });
      return;
    }
    const match = STATIONS.find(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.state.toLowerCase().includes(query) ||
        s.id.toLowerCase() === query,
    );
    if (match) {
      navigate({ to: "/command", search: { station: match.id } });
    } else {
      navigate({ to: "/command", search: { q: searchQuery } });
    }
  };

  // Systems directory data matching Dark.design showcase cards
  const systemCards = [
    {
      id: "terrain-diorama",
      category: "3D_TERRAIN",
      tag: "GEOMORPHIC 3D TWIN",
      title: "Local 3D Mountain Diorama",
      subtitle: "Copernicus 30m DEM With Rock Strata Skirts",
      description:
        "High-relief 10 km localized elevation dioramas for mountain stations. Features cut-away geological rock strata side skirts, dynamic terrain-clamped Caine (1980) slope failure overlays, and vertical relief exaggeration up to 2.5x.",
      metrics: [
        { label: "Vertical Relief", value: "450m – 4,831m MSL" },
        { label: "Slope Gradient", value: "Up to 42° Steep" },
      ],
      linkTo: "/command",
      linkSearch: { tab: "terrain3d" },
      actionLabel: "Launch 3D Diorama",
      accent: "#ff3b30",
    },
    {
      id: "radar-composite",
      category: "DOPPLER_RADAR",
      tag: "ATMOSPHERIC RADAR",
      title: "Doppler Composite & Rainfall Clustering",
      subtitle: "RainViewer C-Band Convective Core Tracking",
      description:
        "Multi-radius spatial precipitation clustering covering 1 km, 3 km, 5 km, and 10 km buffers. Detects severe convective rainfall cells, precipitation velocity vectors, and antecedent soil moisture saturation.",
      metrics: [
        { label: "Radar Buffer", value: "1–10 km Multi-Zone" },
        { label: "Temporal Refresh", value: "10-Minute Loop" },
      ],
      linkTo: "/radar",
      linkSearch: {},
      actionLabel: "View Live Basin Radar",
      accent: "#3b9eff",
    },
    {
      id: "risk-engine",
      category: "LANDSLIDE",
      tag: "PHYSICS ENGINE",
      title: "Deterministic Multi-Factor Hazard Model",
      subtitle: "Decoupled Physical Risk & Data Confidence",
      description:
        "Rigorous physical formulation combining pore-water pressure, antecedent precipitation index (API), terrain slope, and Caine (1980) intensity-duration thresholds with explainable primary driver logs.",
      metrics: [
        { label: "Scoring Metric", value: "0–100 Scale" },
        { label: "Physical Invariant", value: "Zero Synthetic Data" },
      ],
      linkTo: "/command",
      linkSearch: { tab: "telemetry" },
      actionLabel: "Open Risk Engine",
      accent: "#34d399",
    },
    {
      id: "incident-center",
      category: "INCIDENT_DISPATCH",
      tag: "INCIDENT RESPONSE",
      title: "Sovereign Incident Response Center",
      subtitle: "Autonomous Ward-Level Dispatch & Shelter Routing",
      description:
        "Strict 4-stage disaster state machine (DETECTED → VERIFIED → ACTIVE → RESOLVED). Automated ward-level SMS alerts, evacuation route planning, shelter capacity checks, and immutable operator audit trails.",
      metrics: [
        { label: "Dispatch Cadence", value: "Sub-Second" },
        { label: "Shelter Routing", value: "Verified Capacity" },
      ],
      linkTo: "/command",
      linkSearch: { tab: "incidents" },
      actionLabel: "Open Incident Center",
      accent: "#f5a524",
    },
    {
      id: "historical-backtest",
      category: "BACKTEST",
      tag: "MODEL VALIDATION",
      title: "Zero-Lookahead Retrospective Validation",
      subtitle: "Reconstructed Historical Disaster Benchmarks",
      description:
        "Deterministic replay of catastrophic disaster events (Wayanad 2024, Chamoli 2021, Malpa 1998) at T-24h, T-6h, T-3h, and T-1h before onset, strictly evaluating sensor telemetry available prior to each timestamp.",
      metrics: [
        { label: "Validation Horizon", value: "T-24h to T-1h" },
        { label: "Leakage Guard", value: "Zero Lookahead" },
      ],
      linkTo: "/command",
      linkSearch: { tab: "backtest" },
      actionLabel: "Run Backtest Suite",
      accent: "#7c5cff",
    },
    {
      id: "sensor-mesh",
      category: "FLASH_FLOOD",
      tag: "IN-SITU TELEMETRY",
      title: "Geotechnical & River Discharge Mesh",
      subtitle: "In-Situ Tiltmeters & GloFAS Hydrology",
      description:
        "Real-time ingestion of ground tilt displacement, volumetric soil water content, pore-pressure sensors, and transboundary GloFAS river discharge to anticipate flash-flood surges before cresting.",
      metrics: [
        { label: "Monitored Stations", value: "12 Strategic Nodes" },
        { label: "Ingest Cadence", value: "Continuous Stream" },
      ],
      linkTo: "/command",
      linkSearch: { tab: "search" },
      actionLabel: "Inspect In-Situ Sensors",
      accent: "#22d3ee",
    },
  ];

  const filteredCards = useMemo(() => {
    if (selectedCategory === "ALL") return systemCards;
    return systemCards.filter((c) => c.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="relative min-h-screen bg-[#060608] text-white selection:bg-[#ff3b30]/30 selection:text-white">
      {/* Subtle atmospheric vignette */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_75%_45%_at_50%_-10%,rgba(255,69,58,0.12),transparent_70%)]" />

      {/* Shared Site Header */}
      <SiteHeader currentPath="/" />

      {/* Sub-header Live Telemetry Ticker */}
      <div className="relative z-10 border-b border-white/[0.06] bg-[#09090c]/80 px-4 py-2 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between font-mono text-[11px] text-[#8e8e9c]">
          <div className="flex items-center gap-2">
            <span className="size-1.5 animate-pulse rounded-full bg-[#34d399]" />
            <span className="font-semibold text-white uppercase tracking-wider">LIVE INGEST STREAM:</span>
            <span className="text-[#c4c4cf] truncate max-w-[280px] sm:max-w-none">
              {TICKER[tickerIdx]}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[10px] uppercase tracking-widest text-[#8e8e9c]">
            <span>12 STATIONS</span>
            <span>·</span>
            <span>10 STATES</span>
            <span>·</span>
            <span className="text-[#34d399]">ZERO SYNTHETIC DATA</span>
          </div>
        </div>
      </div>

      <main className="relative z-10">
        {/* ========================================================================= */}
        {/* HERO SECTION — EXACT DARK.DESIGN ARCHITECTURE                            */}
        {/* ========================================================================= */}
        <section className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-8 items-center">
            {/* Left Column: Big Bold Architectural Headline & Quick Jump */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-[#ff3b30]">
                <span className="size-1.5 rounded-full bg-[#ff3b30]" />
                SOVEREIGN GEOSPATIAL INTELLIGENCE
              </div>

              {/* Big, bold headline matching dark.design */}
              <h1 className="mt-4 font-heading text-5xl font-black uppercase tracking-[-0.03em] text-white sm:text-6xl lg:text-7xl leading-[0.95]">
                PREDICTIVE TERRAIN & DISASTER
                <br />
                <span className="text-[#ff3b30]">INTELLIGENCE.</span>
              </h1>

              <p className="mt-6 max-w-xl font-sans text-base leading-relaxed text-[#c4c4cf] sm:text-lg">
                Real-time hydro-geological digital twin, multi-sensor Doppler radar fusion, and
                automated evacuation dispatch across India's high-risk mountain basins.
              </p>

              {/* Quick Jump / Station Search Bar (styled like email signup in dark.design) */}
              <form onSubmit={handleStationSearch} className="mt-8">
                <div className="flex max-w-lg items-center rounded-xl border border-white/15 bg-[#0e0e13] p-1.5 shadow-2xl focus-within:border-white/40">
                  <Search className="ml-2.5 size-4 text-[#8e8e9c] shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search station or state (e.g. Gangtok, Wayanad, Joshimath)..."
                    className="w-full bg-transparent px-3 py-1.5 font-sans text-xs text-white placeholder:text-[#6e6e7c] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="shrink-0 flex items-center gap-1.5 rounded-lg bg-[#ff3b30] px-4 py-2 font-sans text-xs font-bold text-white transition hover:bg-[#ff5147] active:scale-95 shadow-md"
                  >
                    <span>Deploy Stream</span>
                    <ArrowRight className="size-3" />
                  </button>
                </div>
                <p className="mt-2.5 font-mono text-[10px] uppercase tracking-wider text-[#6e6e7c]">
                  Active Telemetry: Gangtok Ridge · Dharamshala · Wayanad · Joshimath · Cherrapunji · Shimla
                </p>
              </form>

              {/* Operational Stats Bar */}
              <div className="mt-10 grid grid-cols-3 gap-6 border-t border-white/[0.08] pt-6 max-w-lg">
                <div>
                  <div className="font-heading text-3xl font-black text-white">12</div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-[#8e8e9c]">
                    Mountain Stations
                  </div>
                </div>
                <div>
                  <div className="font-heading text-3xl font-black text-white">30m</div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-[#8e8e9c]">
                    Copernicus DEM
                  </div>
                </div>
                <div>
                  <div className="font-heading text-3xl font-black text-[#34d399]">100%</div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-[#8e8e9c]">
                    Zero Fabrication
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Featured Showcase Card with Signature Red Glowing Border */}
            <div className="lg:col-span-5">
              <div className="relative group rounded-2xl border border-[#ff453a]/50 bg-[#0e0e13] p-5 shadow-[0_0_40px_rgba(255,69,58,0.18)] transition-all duration-300 hover:border-[#ff453a]/80 hover:shadow-[0_0_55px_rgba(255,69,58,0.28)]">
                {/* Header Tag */}
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#ff3b30]">
                    FEATURED DIGITAL TWIN
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-[10px] text-[#34d399]">
                    <span className="size-1.5 rounded-full bg-[#34d399] animate-pulse" />
                    LIVE 60 FPS
                  </span>
                </div>

                {/* 3D Wireframe Scene Window */}
                <div className="relative mt-3 h-64 w-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#07070a]">
                  <HeroScene className="h-full w-full" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0e0e13] via-transparent to-transparent" />
                  <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-[#8e8e9c]">
                    <span>High-Relief Mountain Diorama</span>
                    <span className="text-[#ff3b30]">10 km Radius</span>
                  </div>
                </div>

                {/* Card Meta & Title */}
                <div className="mt-4">
                  <h3 className="font-heading text-xl font-black uppercase tracking-tight text-white">
                    3D MOUNTAIN TERRAIN DIORAMA
                  </h3>
                  <p className="mt-1 font-sans text-xs text-[#8e8e9c] leading-relaxed">
                    Copernicus 30m Global DEM with cut-away rock strata walls, river drainage ribbons,
                    and terrain-clamped Caine (1980) slope failure overlays.
                  </p>
                </div>

                {/* Action Link */}
                <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/[0.08]">
                  <span className="font-mono text-[11px] font-bold text-[#c4c4cf]">
                    12 STATIONS READY
                  </span>
                  <Link
                    to="/command"
                    search={{ tab: "terrain3d" }}
                    className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 font-sans text-xs font-bold text-black transition hover:bg-neutral-200"
                  >
                    <span>Inspect Diorama</span>
                    <ChevronRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* FILTER / CATEGORY PILL BAR (EXACT DARK.DESIGN COMPONENT)                  */}
        {/* ========================================================================= */}
        <section className="border-y border-white/[0.08] bg-[#09090d]/60 py-4 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#8e8e9c] mr-2 shrink-0">
                SYSTEM FILTER:
              </span>
              {[
                { id: "ALL", label: "All Systems" },
                { id: "3D_TERRAIN", label: "3D Terrain Diorama" },
                { id: "DOPPLER_RADAR", label: "Doppler Radar" },
                { id: "LANDSLIDE", label: "Landslide Geomechanics" },
                { id: "FLASH_FLOOD", label: "Flash Flood Inundation" },
                { id: "INCIDENT_DISPATCH", label: "Incident Dispatch" },
                { id: "BACKTEST", label: "Historical Backtest" },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setSelectedCategory(pill.id as CategoryFilter)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 font-sans text-xs font-semibold transition ${
                    selectedCategory === pill.id
                      ? "bg-white text-black shadow-sm"
                      : "border border-white/[0.08] bg-[#0e0e13] text-[#8e8e9c] hover:border-white/20 hover:text-white"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SHOWCASE CARDS GRID (HIGH-DENSITY DARK ARCHITECTURE)                       */}
        {/* ========================================================================= */}
        <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ff3b30]">
                CORE CAPABILITIES DIRECTORY
              </p>
              <h2 className="mt-1 font-heading text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
                INTEGRATED DISASTER INTELLIGENCE PLATFORM
              </h2>
            </div>
            <Link
              to="/command"
              className="hidden sm:flex items-center gap-1 font-sans text-xs font-semibold text-[#8e8e9c] hover:text-white transition"
            >
              <span>Full Command Matrix</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCards.map((card) => (
              <div
                key={card.id}
                className="group flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#0c0c10] p-6 transition-all duration-200 hover:border-white/25 hover:bg-[#111116] hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                    <span
                      className="font-mono text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: card.accent }}
                    >
                      {card.tag}
                    </span>
                    <span className="size-2 rounded-full" style={{ backgroundColor: card.accent }} />
                  </div>

                  <h3 className="mt-4 font-heading text-xl font-bold uppercase tracking-tight text-white group-hover:text-white">
                    {card.title}
                  </h3>
                  <p className="mt-0.5 font-mono text-[11px] text-[#8e8e9c]">
                    {card.subtitle}
                  </p>
                  <p className="mt-3 font-sans text-xs leading-relaxed text-[#c4c4cf]">
                    {card.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/[0.06]">
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {card.metrics.map((m, i) => (
                      <div key={i} className="rounded-lg bg-[#07070a] p-2 border border-white/[0.04]">
                        <div className="font-mono text-[9px] uppercase tracking-wider text-[#8e8e9c]">
                          {m.label}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] font-bold text-white truncate">
                          {m.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Link
                    to={card.linkTo}
                    search={card.linkSearch}
                    className="flex items-center justify-between w-full rounded-lg border border-white/10 bg-[#14141a] px-3.5 py-2 font-sans text-xs font-bold text-white transition hover:bg-white hover:text-black"
                  >
                    <span>{card.actionLabel}</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* LIVE STATION DIRECTORY (REAL REPOSITORY STATIONS)                          */}
        {/* ========================================================================= */}
        <section className="border-t border-white/[0.08] bg-[#09090c]/40 py-16">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#34d399]">
                  OPERATIONAL STATIONS DIRECTORY
                </p>
                <h2 className="mt-1 font-heading text-3xl font-black uppercase tracking-tight text-white">
                  12 VERIFIED SENSING NODES
                </h2>
                <p className="mt-1 font-sans text-xs text-[#8e8e9c]">
                  Continuous ingest across 10 mountainous Indian states · Copernicus 30m Global DEM
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to="/radar"
                  className="rounded-lg border border-white/10 bg-[#121216] px-3.5 py-1.5 font-sans text-xs font-semibold text-white transition hover:bg-white/10"
                >
                  View 3D Basin Map →
                </Link>
                <Link
                  to="/command"
                  className="rounded-lg bg-[#ff3b30] px-3.5 py-1.5 font-sans text-xs font-bold text-white transition hover:bg-[#ff5147]"
                >
                  Open Command Center →
                </Link>
              </div>
            </div>

            {/* Stations Grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {STATIONS.map((station) => (
                <Link
                  key={station.id}
                  to="/command"
                  search={{ station: station.id }}
                  className="group rounded-xl border border-white/[0.06] bg-[#0e0e13] p-4 transition hover:border-white/20 hover:bg-[#13131a]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#8e8e9c]">
                      {station.state}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-[#34d399]">ONLINE</span>
                  </div>

                  <div className="mt-2 font-heading text-base font-bold text-white group-hover:text-[#ff3b30] transition">
                    {station.name}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[10px] text-[#8e8e9c]">
                    <div className="rounded bg-[#07070a] p-1.5">
                      <span className="text-[#6e6e7c]">Elev:</span>{" "}
                      <span className="text-white font-semibold">{station.elevationDem}m MSL</span>
                    </div>
                    <div className="rounded bg-[#07070a] p-1.5">
                      <span className="text-[#6e6e7c]">Slope:</span>{" "}
                      <span className="text-white font-semibold">{station.slopeDeg}°</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-[#8e8e9c] pt-2 border-t border-white/[0.04]">
                    <span>{station.lat.toFixed(2)}°N, {station.lon.toFixed(2)}°E</span>
                    <span className="text-white group-hover:translate-x-0.5 transition">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* ENTERPRISE ARCHITECTURE & INVARIANT SPECIFICATIONS                        */}
        {/* ========================================================================= */}
        <section className="border-t border-white/[0.08] bg-[#060608] py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#ff3b30]">
                ENTERPRISE SYSTEM ARCHITECTURE
              </p>
              <h2 className="mt-2 font-heading text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
                DETERMINISTIC DATA FLOW & SOVEREIGNTY
              </h2>
              <p className="mt-4 font-sans text-sm text-[#8e8e9c] leading-relaxed">
                Zero synthetic data. Zero LLM hallucinations in the physical risk loop. Every
                calculation is traceable to verified satellite, radar, or in-situ ground sensors.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-4">
              <div className="rounded-xl border border-white/[0.08] bg-[#0c0c10] p-6">
                <span className="font-mono text-xs font-bold text-[#ff3b30]">01 / INGEST</span>
                <h3 className="mt-3 font-heading text-lg font-bold text-white uppercase">Multi-Sensor Mesh</h3>
                <p className="mt-2 font-sans text-xs text-[#8e8e9c] leading-relaxed">
                  Parallel ingestion of Weather Union ground stations, RainViewer C-band Doppler radar,
                  Copernicus DEM, MET Norway, and GloFAS discharge.
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#0c0c10] p-6">
                <span className="font-mono text-xs font-bold text-[#3b9eff]">02 / CACHE & DEGRADE</span>
                <h3 className="mt-3 font-heading text-lg font-bold text-white uppercase">Fault-Tolerant Cache</h3>
                <p className="mt-2 font-sans text-xs text-[#8e8e9c] leading-relaxed">
                  Multi-tier rate-limited cache ensuring no API downtime takes the command center offline.
                  Last-good observations served with provenance timestamps.
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#0c0c10] p-6">
                <span className="font-mono text-xs font-bold text-[#34d399]">03 / DETERMINISTIC RISK</span>
                <h3 className="mt-3 font-heading text-lg font-bold text-white uppercase">Physical Engine</h3>
                <p className="mt-2 font-sans text-xs text-[#8e8e9c] leading-relaxed">
                  Caine (1980) physical intensity-duration threshold, pore-water pressure, shear stress,
                  and decoupled data confidence scoring.
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#0c0c10] p-6">
                <span className="font-mono text-xs font-bold text-[#f5a524]">04 / BROADCAST</span>
                <h3 className="mt-3 font-heading text-lg font-bold text-white uppercase">Autonomous Act</h3>
                <p className="mt-2 font-sans text-xs text-[#8e8e9c] leading-relaxed">
                  Sub-second ward-level SMS dispatch, real-time 3D diorama highlighting, and verified
                  shelter capacity routing with immutable operator audit trail.
                </p>
              </div>
            </div>

            {/* Enterprise Readiness Strip */}
            <div className="mt-12 rounded-2xl border border-white/[0.08] bg-[#0e0e13] p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#34d399]">
                  <Shield className="size-3.5 text-[#34d399]" />
                  GOVERNMENT & ENTERPRISE DEPLOYMENT READY
                </div>
                <h3 className="mt-1 font-heading text-2xl font-black uppercase text-white">
                  Sovereign Enclaves & UN EW4All 2027 Compliant
                </h3>
                <p className="mt-1 max-w-xl font-sans text-xs text-[#8e8e9c]">
                  MeitY DPDP (India Central), EU CEMS / GDPR (Frankfurt), and US GovCloud (FedRAMP)
                  isolated operational deployment configurations.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Link
                  to="/command"
                  className="rounded-xl bg-white px-5 py-3 font-sans text-xs font-bold text-black transition hover:bg-neutral-200 active:scale-95"
                >
                  Enter Command Center →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* INSTITUTIONAL FOOTER                                                      */}
      {/* ========================================================================= */}
      <footer className="border-t border-white/[0.08] bg-[#050507] py-12 text-[#8e8e9c]">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg border border-white/15 bg-[#121216] text-white">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 2 22 22 22" />
                    <path d="M12 11v5" />
                  </svg>
                </div>
                <span className="font-heading text-base font-black uppercase tracking-tight text-white">
                  TERRA<span className="text-[#ff3b30]">ALERT</span>
                </span>
              </div>
              <p className="mt-3 max-w-sm font-sans text-xs leading-relaxed text-[#8e8e9c]">
                Next-generation geospatial disaster intelligence, real-time Doppler radar compositing,
                and 3D digital terrain models for high-risk mountain basins.
              </p>
              <p className="mt-4 font-mono text-[10px] text-[#6e6e7c]">
                © 2026 TerraAlert Geospatial Infrastructure. All rights reserved.
              </p>
            </div>

            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-white">
                PLATFORM
              </p>
              <ul className="mt-3 space-y-2 font-sans text-xs">
                <li>
                  <Link to="/" className="hover:text-white transition">Overview</Link>
                </li>
                <li>
                  <Link to="/command" className="hover:text-white transition">Command Center</Link>
                </li>
                <li>
                  <Link to="/radar" className="hover:text-white transition">3D Basin Twin</Link>
                </li>
                <li>
                  <Link to="/command" search={{ tab: "terrain3d" }} className="hover:text-white transition">
                    3D Mountain Diorama
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-white">
                INTELLIGENCE
              </p>
              <ul className="mt-3 space-y-2 font-sans text-xs">
                <li>
                  <Link to="/command" search={{ tab: "incidents" }} className="hover:text-white transition">
                    Incident Center
                  </Link>
                </li>
                <li>
                  <Link to="/command" search={{ tab: "backtest" }} className="hover:text-white transition">
                    Historical Backtest
                  </Link>
                </li>
                <li>
                  <Link to="/command" search={{ tab: "encyclopedia" }} className="hover:text-white transition">
                    Parameter Encyclopedia
                  </Link>
                </li>
                <li>
                  <Link to="/command" search={{ tab: "dispatch" }} className="hover:text-white transition">
                    Ward Dispatch
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
