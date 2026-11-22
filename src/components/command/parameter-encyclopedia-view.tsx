import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Compass,
  Cpu,
  Eye,
  Flame,
  Globe2,
  HelpCircle,
  Layers,
  Radio,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  Users,
  Waves,
  Wifi,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Parameter3DScene, type ParameterSceneMode } from "./parameter-3d-scene";
import { cn } from "@/lib/utils";

export interface ParameterEntry {
  id: string;
  name: string;
  acronym?: string;
  category: "rain" | "slope" | "risk" | "hydro" | "standards";
  sceneMode: ParameterSceneMode;
  tagline: string;
  plainEnglish: string; // The simple layman's analogy
  whyEvaluated: string; // Why emergency commanders & algorithms need it
  benchmarks: {
    safe: string;
    watch: string;
    critical: string;
  };
  dataSource: string;
  icon: string;
}

export const PARAMETER_ENCYCLOPEDIA: ParameterEntry[] = [
  {
    id: "caine-threshold",
    name: "Caine (1980) Intensity-Duration Threshold",
    acronym: "I_c = 14.82 · D^(-0.39)",
    category: "rain",
    sceneMode: "caine-threshold",
    tagline: "The global empirical law that determines when rainfall causes mountains to slide.",
    plainEnglish:
      "Think of a mountain like a sponge on a tilted cutting board. If you pour a spoonful of water over an hour, it absorbs safely. But if you dump a bucket in 10 minutes, the sponge slides off the board. In 1980, geomorphologist Dr. Nel Caine analyzed hundreds of worldwide landslides and proved mathematically that the shorter and more violent the downpour, the less total water is needed to cause a catastrophic collapse.",
    whyEvaluated:
      "Standard weather apps only tell you 'it might rain'. But Caine's threshold tells disaster rescue commanders the exact mathematical tipping point where rain intensity physically overpowers the ground's friction, opening the window for debris flows.",
    benchmarks: {
      safe: "Ratio < 0.50x — Ground comfortably absorbs precipitation.",
      watch: "Ratio 0.50x to 0.99x — Soil saturation approaching critical limits.",
      critical: "Ratio ≥ 1.00x (BREACH) — Debris flow probability exceeds 80%. Immediate evacuation mandatory.",
    },
    dataSource: "Calculated dynamically across 1h, 6h, and 24h windows using NASA GPM IMERG and RainViewer radar.",
    icon: "CloudRain",
  },
  {
    id: "caine-ratio",
    name: "Caine Exceedance Ratio",
    acronym: "I / I_c",
    category: "rain",
    sceneMode: "caine-threshold",
    tagline: "A single multiplier showing how close rainfall is to the critical landslide threshold.",
    plainEnglish:
      "Like a speedometer for landslide danger. If the Caine Ratio is 0.2x, the rain is only 20% of the danger limit. If it reaches 1.0x, you are exactly at the redline. If it hits 1.8x (as seen in the 2024 Wayanad catastrophe), rainfall is nearly double the failure capacity of the mountain.",
    whyEvaluated:
      "Gives non-technical field workers, ward councilors, and sirens an instantaneous, non-ambiguous trigger number to declare emergency status without needing to decipher complex meteorology charts.",
    benchmarks: {
      safe: "0.0x – 0.49x (Green)",
      watch: "0.50x – 0.99x (Amber Advisory)",
      critical: "≥ 1.00x (Redline Evacuation Directive)",
    },
    dataSource: "Real-time automated ratio between active rainfall rate and Caine theoretical ceiling.",
    icon: "Activity",
  },
  {
    id: "composite-risk-index",
    name: "Composite Hazard Index (0–100)",
    category: "risk",
    sceneMode: "slope-shear",
    tagline: "The single master hazard score combining terrain, soil, radar, and physics.",
    plainEnglish:
      "Imagine assessing your health: a single test like temperature doesn't tell the whole story. You need heart rate, blood pressure, and oxygen combined. The Composite Hazard Index fuses 7 different factors — slope steepness, how wet the soil is, how fast rain is falling, radar echoes, ground tilt, and historical weakness — into one clean score from 0 to 100.",
    whyEvaluated:
      "Civil protection authorities need a unified operational index to trigger automated protocol stages (Level 1 Standby at 40, Level 2 Full Evacuation & Siren Broadcast at 70).",
    benchmarks: {
      safe: "0 – 39: Nominal stability. Normal operations.",
      watch: "40 – 69: Elevated hazard. Clear storm drains, standby response teams.",
      critical: "70 – 100: Critical disaster breach. Execute mass evacuation.",
    },
    dataSource: "USGS Two-Factor Model (Susceptibility × Trigger × 100).",
    icon: "ShieldAlert",
  },
  {
    id: "susceptibility-vs-trigger",
    name: "Susceptibility (S) × Trigger (T) Framework",
    acronym: "Hazard = S × T",
    category: "risk",
    sceneMode: "slope-shear",
    tagline: "The international gold standard equation for natural hazard modeling (USGS, BGS, UNDRR).",
    plainEnglish:
      "Think of Gunpowder and a Match. Susceptibility is how much gunpowder is in the barrel (steep cliffs, loose sand, deforested trees) — it changes very slowly over years. The Trigger is the lit match (a cloudburst downpour, a sudden earthquake shake) — it happens in minutes. A match in an empty room creates no explosion; gunpowder without a match sits safely. But when high Susceptibility meets a high Trigger, disaster strikes.",
    whyEvaluated:
      "Prevents false alarms! If a massive cloudburst hits flat plains (low Susceptibility), no landslide warning is issued. If a steep cliff has no rain (no Trigger), no false alert is sounded.",
    benchmarks: {
      safe: "S × T < 0.40 — Either the slope is sturdy or the weather is calm.",
      watch: "S × T between 0.40 and 0.69 — Pre-saturated weak slope experiencing moderate storm.",
      critical: "S × T ≥ 0.70 — Severe trigger impacting structurally vulnerable geological formation.",
    },
    dataSource: "Copernicus 30m DEM + ISRIC SoilGrids + GPM IMERG + RainViewer Doppler.",
    icon: "Layers",
  },
  {
    id: "doppler-dbz",
    name: "Radar Doppler Reflectivity (dBZ)",
    acronym: "dBZ (Decibels of Z)",
    category: "rain",
    sceneMode: "doppler-radar",
    tagline: "How intensely radio waves bounce off raindrops hovering in the clouds right now.",
    plainEnglish:
      "Weather radar shoots invisible microwave pulses into the sky. Raindrops bounce these waves back like an echo. 'dBZ' measures how loud that echo is. If the echo is faint (15 dBZ), it's just mist or fog. If the echo is deafening (50+ dBZ), the cloud is packed with gigantic water drops or hail about to drop a wall of water.",
    whyEvaluated:
      "Ground rain gauges only measure water AFTER it has already hit the dirt. Doppler radar sees the cloudburst 10 to 20 minutes BEFORE the water hits the mountain, giving precious advance minutes to warn people.",
    benchmarks: {
      safe: "< 25 dBZ: Light drizzle or mist.",
      watch: "30 – 45 dBZ: Moderate to heavy soaking rainfall (10–25 mm/h).",
      critical: "> 50 dBZ: Severe convective cloudburst or hail (50+ mm/h downpour).",
    },
    dataSource: "RainViewer C-Band / S-Band Radar volumetric composite updated every 10 minutes.",
    icon: "Radio",
  },
  {
    id: "soil-moisture-saturation",
    name: "Soil Moisture Saturation (%)",
    acronym: "S_moist (% of Field Capacity)",
    category: "slope",
    sceneMode: "soil-strata",
    tagline: "How close the ground is to drowning and turning into liquid mud.",
    plainEnglish:
      "Dirt is held together by tiny air pockets and friction between grains. When rain fills these air pockets with water, pressure builds up from the inside ('pore-water pressure'). At 100% saturation, water pushes the soil grains apart until the ground literally turns into liquid soup — exactly like quicksand on a steep hill.",
    whyEvaluated:
      "A dry mountain can withstand a 1-hour cloudburst without budging. But if the soil is already 95% soaked from three days of prior rain, even a modest shower will trigger an instant massive mudslide.",
    benchmarks: {
      safe: "< 60%: Soil has plenty of air capacity to absorb incoming rain.",
      watch: "70% – 84%: High pore-water pressure. Slope friction substantially degraded.",
      critical: "≥ 85%: Near-total liquefaction threshold. Catastrophic shear failure imminent.",
    },
    dataSource: "ResqNet in-situ physical TDR probes + Open-Meteo 0–100cm multi-layer reanalysis.",
    icon: "Waves",
  },
  {
    id: "slope-tilt-angle",
    name: "Ground Slope Tilt & Shear Drift (Degrees °)",
    category: "slope",
    sceneMode: "slope-shear",
    tagline: "Direct physical measurement of the hillside bending or creeping downward.",
    plainEnglish:
      "Imagine a house built on wooden stilts. Before the stilts snap, they slowly bend and creak by a few millimeters. Hillsides do the exact same thing: before a thousand tons of rock slide into a valley, the ground tilts by fractions of a degree as the subterranean fault line starts stretching.",
    whyEvaluated:
      "Satellites and weather forecasts are models, but physical tilt sensors in the rock provide 100% indisputable ground truth that the mountain is physically moving right now.",
    benchmarks: {
      safe: "Base Tilt ± 0.1°: Solid ground stability.",
      watch: "Drift +0.5° to +1.2°: Sub-surface creep and micro-shearing active.",
      critical: "Drift > +2.0°: Macroscopic structural failure. Slope rupture underway.",
    },
    dataSource: "ResqNet $10 physical LoRa tiltmeters + Copernicus Sentinel-1 InSAR satellite radar.",
    icon: "Compass",
  },
  {
    id: "sentinel-1-insar",
    name: "Copernicus Sentinel-1 InSAR Deformation (mm/yr)",
    acronym: "InSAR (Interferometric SAR)",
    category: "slope",
    sceneMode: "satellite-orbit",
    tagline: "European Space Agency satellites measuring millimeter ground movement through thick clouds.",
    plainEnglish:
      "Normal cameras on satellites can't see through rain clouds or fog. Sentinel-1 shoots radar microwaves that slice right through monsoon clouds, bounce off the mountain surface, and measure if the hillside has shifted by even 2 millimeters compared to last week.",
    whyEvaluated:
      "Detects 'slow-motion' slope subsidence months before a sudden failure, allowing engineers to evacuate vulnerable communities or build retention anchors long before tragedy strikes.",
    benchmarks: {
      safe: "< 5 mm/yr: Normal tectonic baseline settling.",
      watch: "6 – 15 mm/yr: Active slope creep detected.",
      critical: "> 18 mm/yr: Severe active shear acceleration. High risk of catastrophic collapse.",
    },
    dataSource: "European Space Agency (ESA) Copernicus Sentinel-1 Radar constellation.",
    icon: "Globe2",
  },
  {
    id: "nasa-gpm-imerg",
    name: "NASA/JAXA GPM IMERG Satellite Precipitation",
    acronym: "GPM (Global Precipitation Measurement)",
    category: "rain",
    sceneMode: "satellite-orbit",
    tagline: "The closest thing to a universal global satellite rainfall ground truth.",
    plainEnglish:
      "In remote mountain ranges (like the Himalayas, Andes, or East Africa), there are no Doppler radar towers or weather stations. NASA and JAXA (Japan) run a constellation of 10+ satellites orbiting Earth that measure rainfall across the entire planet every 30 minutes from space.",
    whyEvaluated:
      "Ensures TerraAlert works anywhere on Earth — even in developing nations or isolated valleys that lack expensive radar infrastructure.",
    benchmarks: {
      safe: "< 5 mm/h: Normal regional rain.",
      watch: "15 – 30 mm/h: Intense monsoon convergence band.",
      critical: "> 40 mm/h: Torrential tropical convective deluge.",
    },
    dataSource: "NASA Goddard Space Flight Center IMERG Early & Late Run 30-minute calibrated feed.",
    icon: "Globe2",
  },
  {
    id: "glofas-river-discharge",
    name: "GloFAS River Discharge (m³/s)",
    acronym: "CEMS GloFAS (m³/s)",
    category: "hydro",
    sceneMode: "slope-shear",
    tagline: "The volume of rushing water flowing through river canyons every second.",
    plainEnglish:
      "One cubic meter of water ($1\\text{ m}^3$) is a gigantic 1,000-liter cube that weighs one full metric ton. River discharge is how many of these one-ton cubes rush past every single second. When discharge surges to 5 times normal, the river undercuts the toe of surrounding cliffs, causing the slopes above to lose support and collapse into the water.",
    whyEvaluated:
      "Flash floods and landslides are twin disasters: swollen mountain rivers erode cliff bases, while landslides dam rivers until they burst into catastrophic downstream flood waves.",
    benchmarks: {
      safe: "Ratio < 1.0x mean discharge: River inside natural channels.",
      watch: "Ratio 1.5x to 2.5x mean: Bankfull stage. Cliff toe erosion underway.",
      critical: "Ratio > 3.0x mean (or > 100-year flood level): Catastrophic flood crest.",
    },
    dataSource: "Copernicus Emergency Management Service (CEMS) GloFAS v4.0 Global Flood Awareness System.",
    icon: "Waves",
  },
  {
    id: "usgs-seismic-pga",
    name: "USGS Peak Ground Acceleration (PGA in g)",
    acronym: "PGA (fraction of gravity g)",
    category: "hydro",
    sceneMode: "slope-shear",
    tagline: "Real-time earthquake shaking force acting on water-saturated slopes.",
    plainEnglish:
      "If you shake a bowl of dry sand, it stays in the bowl. But if the sand is waterlogged, even a gentle vibration makes the sand instantly liquefy and spill out. PGA measures earthquake shaking in units of gravity. $1.0g$ is violent enough to throw people into the air. Even a tiny tremor ($0.05g$) can instantly liquefy a rain-saturated mountain slope.",
    whyEvaluated:
      "Multi-hazard synergy: Many of the world's deadliest landslides (like the 2008 Sichuan or 2015 Nepal disasters) occurred when moderate earthquakes struck mountains already softened by rain.",
    benchmarks: {
      safe: "< 0.01g: Barely perceptible micro-tremors.",
      watch: "0.02g – 0.08g: Moderate shaking; can destabilize pre-saturated slopes.",
      critical: "> 0.10g: Severe dynamic ground acceleration triggering mass slope failure.",
    },
    dataSource: "USGS Global Realtime Earthquake Hazards GeoJSON feed (M2.5+ events).",
    icon: "Activity",
  },
  {
    id: "isric-soilgrids",
    name: "ISRIC SoilGrids Texture & Clay Fraction (%)",
    acronym: "ISRIC 250m Global Taxonomy",
    category: "slope",
    sceneMode: "soil-strata",
    tagline: "The global subterranean map of dirt types: clay, sand, silt, and permeability.",
    plainEnglish:
      "Sandy soil acts like a sieve: water drains through quickly without causing trouble. Clay soil acts like slippery plastic wrap: it traps water, swells up, and turns into an ultra-slick lubricant when soaked. SoilGrids provides a 250-meter global satellite-derived map of what kind of dirt is under your feet anywhere in the world.",
    whyEvaluated:
      "Knowing the clay percentage and hydraulic conductivity ($K_{sat}$) tells the model exactly how fast rain will pool up underground to create a slip plane.",
    benchmarks: {
      safe: "Sandy / Gravelly Loam (Clay < 20%): High drainage, low landslide risk.",
      watch: "Silty Clay Loam (Clay 25% – 38%): Moderate water retention.",
      critical: "Dense Heavy Clay / Laterite (Clay > 40%): Highly prone to structural liquefaction.",
    },
    dataSource: "ISRIC — World Soil Information (Global SoilGrids 250m open data).",
    icon: "Layers",
  },
  {
    id: "cap-protocol",
    name: "OASIS Common Alerting Protocol (CAP v1.2)",
    acronym: "CAP v1.2 / ITU-T X.1303",
    category: "standards",
    sceneMode: "caine-threshold",
    tagline: "The international digital language that lets computers broadcast emergency alerts globally.",
    plainEnglish:
      "In the old days, every country had its own custom format for emergency alerts, meaning international systems couldn't talk to local police. CAP is like the universal HTML of disaster warnings. A single CAP alert created by TerraAlert can be ingested automatically by cell phone towers (IPAWS), television networks, digital road signs, and the United Nations WMO Alert Hub without human retyping.",
    whyEvaluated:
      "Interoperability is what makes TerraAlert globally pluggable into any nation's emergency infrastructure within minutes instead of requiring bespoke government contracts.",
    benchmarks: {
      safe: "Status: System Monitoring — Normal background cadence.",
      watch: "Urgency: Expected | Severity: Severe | Certainty: Likely",
      critical: "Urgency: Immediate | Severity: Extreme | Certainty: Observed (Mandatory Evac)",
    },
    dataSource: "OASIS Standard / ITU-T X.1303 International Emergency Telecommunication Schema.",
    icon: "Radio",
  },
  {
    id: "parametric-insurance",
    name: "Parametric Reinsurance Catastrophe Trigger",
    category: "standards",
    sceneMode: "caine-threshold",
    tagline: "Instant disaster relief funds paid automatically when verifiable sensors cross a threshold.",
    plainEnglish:
      "Traditional insurance takes 6 to 18 months: after a landslide, insurance adjusters visit your damaged house, file paperwork, and argue over claims. Parametric insurance is completely automatic: if physical sensors verify that rain was $>300\\text{ mm}$ and Caine ratio was $>1.0\\text{x}$, the reinsurance company (like Swiss Re or Munich Re) releases millions of dollars to the community bank account in 24 hours — zero paperwork needed.",
    whyEvaluated:
      "Unlocks multi-billion dollar private climate finance and catastrophe bonds (World Bank GFDRR, Swiss Re, African Risk Capacity) by providing tamper-proof, auditable sensor proofs.",
    benchmarks: {
      safe: "Tier 0: No payout — Normal insurance coverage active.",
      watch: "Tier 1 ($125,000 Early Mobilization): Released when Caine ratio ≥ 0.85x for emergency rescue deployment.",
      critical: "Tier 2 ($500,000 Full Disbursement): Released when Caine ratio ≥ 1.00x + critical pore saturation for immediate reconstruction liquidity.",
    },
    dataSource: "Cryptographic SHA-256 verifiable trigger certificate based on multi-sensor consensus.",
    icon: "Shield",
  },
  {
    id: "resqnet-iot",
    name: "ResqNet $10 LoRa IoT Physical Sensor Mesh",
    category: "standards",
    sceneMode: "slope-shear",
    tagline: "Low-cost physical tilt & soil sensors delivering 5-minute ground truth from the mountain.",
    plainEnglish:
      "Satellites are great, but they only fly overhead every few days or hours. ResqNet is our own physical hardware: a $10 solar-powered sensor spiked directly into the mountain rock. It measures real soil moisture and tilt every 5 minutes and broadcasts it across 15 kilometers using long-range radio (LoRaWAN) — even if cell phone towers lose power.",
    whyEvaluated:
      "Satellites and AI can be doubted, but a physical sensor anchored in the rock with a 5-minute heartbeat provides the ultimate, unchallengeable proof for life-safety evacuations.",
    benchmarks: {
      safe: "Heartbeat every 300s · Battery > 80% · Tilt stable ± 0.05°.",
      watch: "Telemetry reporting rapid moisture percolation (> 15% increase/hour).",
      critical: "Continuous angular drift > 1.5° with 98% sensor confidence score.",
    },
    dataSource: "ResqNet hardware mesh (868/915 MHz LoRaWAN nodes with Sub-GHz gateway uplink).",
    icon: "Wifi",
  },
  {
    id: "risk-to-people",
    name: "Risk-to-People / Human Exposure Index",
    acronym: "Hazard × WorldPop",
    category: "risk",
    sceneMode: "slope-shear",
    tagline: "Calculating threat to human life, not just rocks and trees.",
    plainEnglish:
      "If a giant cliff collapses in an uninhabited arctic valley where nobody lives, the physical hazard is massive, but the danger to human life is zero. If a smaller mudslide hits a crowded valley town with 3,000 people per square kilometer, it is a catastrophic human emergency. Risk-to-People multiplies the physical hazard by real population density from satellite maps.",
    whyEvaluated:
      "Disaster response teams have limited ambulances and rescue helicopters. This index tells commanders exactly which community needs priority evacuation first to prevent the greatest loss of life.",
    benchmarks: {
      safe: "0 – 35: Sparse population or minimal hazard footprint.",
      watch: "36 – 65: Dense settlement in elevated watch corridor.",
      critical: "66 – 100: Extreme humanitarian threat — dense population in direct path of active failure.",
    },
    dataSource: "WorldPop Global High-Resolution Human Population Mapping (100m grid).",
    icon: "Users",
  },
  {
    id: "lead-time-window",
    name: "Advance Warning Lead-Time Horizon (Hours)",
    category: "risk",
    sceneMode: "caine-threshold",
    tagline: "How many hours of advance notice the system provides before disaster strikes.",
    plainEnglish:
      "A siren that goes off 30 seconds before mud hits your door is useless — people get trapped in their houses. TerraAlert’s 4 to 6-hour lead time gives entire families time to pack essentials, help elderly neighbors, move livestock, and drive safely to higher-ground emergency shelters before roads get washed away.",
    whyEvaluated:
      "The primary metric multilateral donors (World Bank, USAID, WMO) evaluate when funding early warning systems is: 'How many hours of actionable lead time did you deliver?'",
    benchmarks: {
      safe: "4 to 6 hours: Normal predictive horizon.",
      watch: "2 to 3 hours: Upstream trajectory confirmed; initiate precautionary staging.",
      critical: "0 to 1 hour: Immediate life-safety window; shelter in place or immediate high ground.",
    },
    dataSource: "Trajectory forecast engine fusing ECMWF IFS short-range predictions with Caine I-D curves.",
    icon: "Activity",
  },
];

export function ParameterEncyclopediaView() {
  const [selectedParamId, setSelectedParamId] = useState<string>("caine-threshold");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const activeParam =
    PARAMETER_ENCYCLOPEDIA.find((p) => p.id === selectedParamId) ?? PARAMETER_ENCYCLOPEDIA[0];

  const filteredParams = useMemo(() => {
    return PARAMETER_ENCYCLOPEDIA.filter((p) => {
      const matchCat = activeCategory === "all" || p.category === activeCategory;
      const matchSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.acronym && p.acronym.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <div className="tab-enter mx-auto w-full max-w-7xl p-4 md:p-8">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-accent/25 bg-panel p-6 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">
              <BookOpen className="mr-1 inline-block size-3.5" />
              Scientific Knowledge Base & Parameter Encyclopedia
            </Badge>
            <span className="font-mono text-[11px] text-muted">
              Interactive 3D Visualizer · Layman Explanations · Evaluation Rationale
            </span>
          </div>
          <h2 className="mt-2 font-sans text-2xl font-extrabold tracking-tight text-fg md:text-3xl">
            Demystifying Disaster Science for Everyone
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">
            Disaster intelligence shouldn't be hidden behind dense academic jargon. Understand
            every mathematical formula, satellite feed, and physical sensor parameter in plain
            English with live 3D physical simulations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone="safe" className="px-3 py-1.5 font-mono text-xs">
            {PARAMETER_ENCYCLOPEDIA.length} Terms Documented
          </Badge>
        </div>
      </div>

      {/* Main Layout: Left 3D Visualizer & Details | Right Parameter Index */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Interactive 3D Simulator & Active Parameter Deep Dive */}
        <div className="flex flex-col gap-6 lg:col-span-7">
          {/* 3D Scene Viewport */}
          <div className="relative">
            <div className="mb-2 flex items-center justify-between font-mono text-xs text-muted">
              <span className="flex items-center gap-1.5 text-accent font-bold">
                <Sparkles className="size-3.5 text-accent" />
                Live 3D Physical Simulation:{" "}
                <span className="text-fg">{activeParam.name}</span>
              </span>
              <span className="text-[10px] text-muted">Drag to rotate 3D view</span>
            </div>
            <Parameter3DScene mode={activeParam.sceneMode} />
          </div>

          {/* Deep Dive Card for Selected Parameter */}
          <div className="rounded-3xl border border-border bg-panel p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-accent/15 px-2 py-0.5 font-mono text-[11px] font-bold text-accent">
                    {activeParam.category.toUpperCase()}
                  </span>
                  {activeParam.acronym ? (
                    <span className="font-mono text-xs text-muted font-semibold">
                      {activeParam.acronym}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-1.5 font-sans text-2xl font-extrabold text-fg">
                  {activeParam.name}
                </h3>
              </div>
              <Badge tone="watch">{activeParam.dataSource.split(" ")[0]} Ingest</Badge>
            </div>

            <p className="mt-4 font-mono text-sm font-semibold text-accent leading-relaxed">
              "{activeParam.tagline}"
            </p>

            {/* Section 1: In Plain English (The Everyday Analogy) */}
            <div className="mt-5 rounded-2xl border border-accent/20 bg-accent/5 p-4">
              <div className="mb-1.5 flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-wider text-accent">
                <HelpCircle className="size-4 text-accent" />
                In Plain English (The Layman's Analogy)
              </div>
              <p className="text-sm leading-relaxed text-fg">{activeParam.plainEnglish}</p>
            </div>

            {/* Section 2: Why It Is Used for Evaluation */}
            <div className="mt-4 rounded-2xl border border-border bg-panel-2 p-4">
              <div className="mb-1.5 flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-wider text-safe">
                <Shield className="size-4 text-safe" />
                Why It Is Used for Evaluation (Life-Safety Impact)
              </div>
              <p className="text-sm leading-relaxed text-muted">{activeParam.whyEvaluated}</p>
            </div>

            {/* Section 3: Critical Benchmarks (Safe vs Watch vs Critical) */}
            <div className="mt-4">
              <h4 className="mb-2 font-mono text-xs font-bold uppercase tracking-wider text-muted">
                Critical Operational Thresholds
              </h4>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <div className="rounded-xl border border-safe/30 bg-safe/5 p-3">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase text-safe">
                    <CheckCircle2 className="size-3 text-safe" /> Safe Envelope
                  </div>
                  <p className="mt-1 font-mono text-xs text-fg leading-relaxed">
                    {activeParam.benchmarks.safe}
                  </p>
                </div>
                <div className="rounded-xl border border-watch/30 bg-watch/5 p-3">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase text-watch">
                    <AlertTriangle className="size-3 text-watch" /> Watch Level
                  </div>
                  <p className="mt-1 font-mono text-xs text-fg leading-relaxed">
                    {activeParam.benchmarks.watch}
                  </p>
                </div>
                <div className="rounded-xl border border-crit/30 bg-crit/5 p-3">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase text-crit">
                    <Flame className="size-3 text-crit" /> Critical Breach
                  </div>
                  <p className="mt-1 font-mono text-xs text-fg leading-relaxed">
                    {activeParam.benchmarks.critical}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 4: Data Origin & Instrument */}
            <div className="mt-5 border-t border-border/60 pt-3 font-mono text-xs text-muted flex justify-between items-center">
              <span>Sensor / Sat Source:</span>
              <span className="text-fg font-medium">{activeParam.dataSource}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Searchable Parameter Catalog & Categories */}
        <div className="flex flex-col gap-4 lg:col-span-5">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 size-4 text-muted" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search parameters e.g. Caine, dBZ, Saturation, SoilGrids..."
              className="h-11 w-full rounded-2xl border border-border bg-panel px-10 font-mono text-xs text-fg outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
            {[
              { id: "all", label: "All Parameters" },
              { id: "rain", label: "Rain & Radar" },
              { id: "slope", label: "Slope & Soil" },
              { id: "risk", label: "USGS Risk Math" },
              { id: "hydro", label: "River & Seismic" },
              { id: "standards", label: "CAP & Reinsurance" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "rounded-lg px-2.5 py-1 transition-all",
                  activeCategory === cat.id
                    ? "bg-accent font-bold text-accent-fg shadow-sm"
                    : "border border-border/80 bg-panel text-muted hover:text-fg",
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* List of Parameter Cards */}
          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[850px] pr-1">
            {filteredParams.length === 0 ? (
              <div className="rounded-2xl border border-border bg-panel p-6 text-center font-mono text-xs text-muted">
                No parameters found matching "{searchQuery}".
              </div>
            ) : (
              filteredParams.map((param) => {
                const isSelected = param.id === selectedParamId;
                return (
                  <button
                    key={param.id}
                    type="button"
                    onClick={() => setSelectedParamId(param.id)}
                    className={cn(
                      "flex flex-col rounded-2xl border p-4 text-left transition-all",
                      isSelected
                        ? "border-accent bg-panel-2 shadow-lg shadow-accent/10 ring-1 ring-accent/30"
                        : "border-border/70 bg-panel hover:border-border hover:bg-panel-2/60",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-sans text-sm font-bold text-fg">{param.name}</span>
                      <span className="rounded bg-panel px-1.5 py-0.5 font-mono text-[9px] text-accent">
                        {param.category.toUpperCase()}
                      </span>
                    </div>

                    {param.acronym ? (
                      <div className="mt-0.5 font-mono text-[10px] text-muted">
                        Formula: <code className="text-accent/90">{param.acronym}</code>
                      </div>
                    ) : null}

                    <p className="mt-1 line-clamp-2 text-xs text-muted leading-relaxed">
                      {param.tagline}
                    </p>

                    <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 font-mono text-[10px]">
                      <span className="text-muted truncate max-w-[200px]">
                        {param.dataSource.split(" ")[0]}
                      </span>
                      <span
                        className={cn(
                          "flex items-center gap-1 font-bold",
                          isSelected ? "text-accent" : "text-muted hover:text-fg",
                        )}
                      >
                        <Eye className="size-3" />
                        {isSelected ? "3D Active" : "Simulate in 3D"}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

