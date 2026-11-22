import { clamp } from "./utils";
import type { DataProvenance, PredictorState, RiskLevel, StationLive } from "./types";

export const RISK_HEX = {
  safe: "#34d399",
  watch: "#f5a524",
  crit: "#fb7185",
  accent: "#38bdf8",
} as const;

/**
 * Caine (1980) Global Rainfall Intensity-Duration Threshold
 * Published in Geografiska Annaler, Series A: Physical Geography:
 *   I_c = 14.82 * D^(-0.39) (mm/h)
 * where D is storm duration in hours.
 * Recognised globally by USGS, British Geological Survey, and UNDRR as the reference
 * empirical boundary above which debris flows and shallow landslides are triggered.
 */
export function caineThreshold(durationHours: number): number {
  const d = Math.max(0.25, Math.min(168, durationHours));
  return 14.82 * Math.pow(d, -0.39);
}

export type RiskInput = {
  rain: number;
  moist: number;
  tilt: number;
  histScore: number;
  rain24h?: number;
  rain6h?: number;
  rainForecast?: number;
  discharge?: number | null;
  dischargeMean?: number | null;

  // Spatial rainfall intelligence features (concentric 1–5 km)
  rainCenterMmH?: number;
  rainSpatialMedian5km?: number;
  rainSpatialMax5km?: number;
  rainSpatialP905km?: number;
  distanceToMaxRainKm?: number;

  // Global scientific parameters
  slopeDeg?: number;
  clayFractionPct?: number;
  soilPermeabilityKsat?: number;
  vegetationCoverPct?: number;
  populationDensity?: number;
  dopplerDbz?: number;
  seismicPgaG?: number;
  sarDeformationMmYr?: number;
  provenance?: DataProvenance;
};

export type LandslideFactorComponent = {
  name: string;
  weightPct: number;
  score: number; // 0 to 100
  weightedValue: number; // score * (weightPct / 100)
  description: string;
};

export type LandslideRiskBreakdown = {
  history: LandslideFactorComponent;
  slope: LandslideFactorComponent;
  soilMoisture: LandslideFactorComponent;
  rainfall: LandslideFactorComponent;
  geology: LandslideFactorComponent;
  drainage: LandslideFactorComponent;
  trend: LandslideFactorComponent;
};

export type FlashFloodFactorComponent = {
  name: string;
  weightPct: number;
  score: number; // 0 to 100
  weightedValue: number; // score * (weightPct / 100)
  description: string;
};

export type FlashFloodRiskBreakdown = {
  currentRain: FlashFloodFactorComponent;
  antecedentRain: FlashFloodFactorComponent;
  accumulation: FlashFloodFactorComponent;
  drainageRunoff: FlashFloodFactorComponent;
  floodHistory: FlashFloodFactorComponent;
  soilSaturation: FlashFloodFactorComponent;
};

export type ScientificRiskResult = {
  total: number;
  level: RiskLevel;
  landslideRisk: number; // Transparent 0-100 score
  flashFloodRisk: number; // Transparent 0-100 score
  landslideBreakdown: LandslideRiskBreakdown;
  flashFloodBreakdown: FlashFloodRiskBreakdown;
  primaryDrivers: string[];
  susceptibility: number; // 0 to 1
  trigger: number; // 0 to 1
  caineRatio: number; // I / I_c
  caineExceeded: boolean;
  caineThreshold1h: number;
  caineIntensity1h: number;
  riskToPeople: number; // 0 to 100
  confidencePct: number; // 0 to 100 (decoupled from hazard risk)
  provenance: DataProvenance;
  breakdown: {
    slopeFactor: number;
    soilFactor: number;
    vegetationFactor: number;
    caineFactor: number;
    moistureFactor: number;
    radarFactor: number;
    spatialFactor: number;
    tiltFactor: number;
    seismicFactor: number;
  };
};

/**
 * Global-Grade Multi-Hazard Risk Model:
 * Structured as: Hazard = Susceptibility x Trigger
 * Aligned with USGS Global Landslide Susceptibility Model (GLSM) and UNDRR standards.
 */
export function calculateRisk(st: RiskInput): ScientificRiskResult {
  const rain1h = Math.max(0, st.rain);
  const rain6h = Math.max(0, st.rain6h ?? rain1h * 3.5);
  const rain24h = Math.max(0, st.rain24h ?? rain1h * 8);

  // 1. Caine (1980) Intensity-Duration evaluation across multiple durations
  const caine1hThresh = caineThreshold(1); // 14.82 mm/h
  const caine6hThresh = caineThreshold(6); // ~7.37 mm/h
  const caine24hThresh = caineThreshold(24); // ~4.31 mm/h

  const r1 = rain1h / caine1hThresh;
  const r6 = (rain6h / 6) / caine6hThresh;
  const r24 = (rain24h / 24) / caine24hThresh;
  const caineRatio = Math.max(r1, r6, r24);
  const caineExceeded = caineRatio >= 1.0;

  // 2. Susceptibility Index (S in [0.15, 0.98])
  // Derived from Copernicus 30m DEM slope, ISRIC SoilGrids texture, and ESA WorldCover
  const slope = st.slopeDeg ?? 28;
  // Peak critical shear instability occurs between 25° and 45°
  const slopeRad = (slope * Math.PI) / 180;
  const slopeFactor = clamp(Math.sin(slopeRad) * 1.35, 0.1, 1.0);

  // Soil factor: High clay fraction + low permeability traps pore-water
  const clayPct = st.clayFractionPct ?? 32;
  const soilFactor = clamp((clayPct / 50) * 0.7 + 0.3, 0.2, 1.0);

  // Vegetation factor: Lower vegetation cover = reduced root shear strength
  const vegCover = st.vegetationCoverPct ?? 55;
  const vegetationFactor = clamp(1.0 - (vegCover / 100) * 0.5, 0.3, 0.95);

  const histBaseline = clamp(st.histScore, 0.2, 0.95);

  const susceptibility = clamp(
    0.38 * slopeFactor +
      0.24 * soilFactor +
      0.20 * vegetationFactor +
      0.18 * histBaseline,
    0.15,
    0.98,
  );

  // 3. Trigger Index (T in [0.0, 1.0])
  // Dynamic forces: Caine I-D exceedance + Soil pore-saturation + Doppler Radar dBZ + Ground Tilt + Seismic
  const caineFactor = clamp(caineRatio / 1.15, 0, 1.0);

  const satRatio = clamp(st.moist / 100, 0, 1);
  const moistureFactor = Math.pow(satRatio, 1.8); // Non-linear pore pressure response

  // RainViewer live Doppler radar reflectivity (dBZ)
  const dbz = st.dopplerDbz ?? (rain1h > 0 ? clamp(20 + Math.log10(rain1h + 0.1) * 15, 10, 60) : 12);
  const radarFactor = clamp(dbz / 52, 0, 1.0);

  // Ground slope tilt from ResqNet IoT sensor or Sentinel-1 InSAR creep
  const tiltFactor = clamp(st.tilt / 4.2, 0, 1.0);

  // USGS Real-time seismic dynamic ground acceleration (PGA in g)
  const pga = st.seismicPgaG ?? 0.005;
  const seismicFactor = clamp(pga / 0.12, 0, 1.0);

  // Catchment discharge flood surcharge (GloFAS)
  let dischargeFactor = 0;
  if (st.discharge != null && st.dischargeMean && st.dischargeMean > 0) {
    const ratio = st.discharge / st.dischargeMean;
    dischargeFactor = clamp((ratio - 0.9) / 1.5, 0, 1.0);
  }

  // Spatial convective storm cell proximity factor (0 to 1.0)
  // When an intense rainfall cell exists within 1–5 km, catchment drainage & sheetwash
  // impact the slope even if the center coordinate is temporarily lower.
  let spatialFactor = 0;
  if (st.rainSpatialMax5km != null && st.rainSpatialMax5km > rain1h) {
    const diff = st.rainSpatialMax5km - rain1h;
    const dist = st.distanceToMaxRainKm ?? 2.5;
    const distDecay = clamp(1.0 - dist / 6.0, 0.2, 1.0);
    spatialFactor = clamp((diff / 25.0) * distDecay, 0, 1.0);
  }

  // Combine dynamic trigger components (spatial factor provides convective proximity boost)
  let rawTrigger =
    (spatialFactor > 0 ? 0.30 : 0.35) * caineFactor +
    (spatialFactor > 0 ? 0.22 : 0.25) * moistureFactor +
    0.15 * radarFactor +
    (spatialFactor > 0 ? 0.12 * spatialFactor : 0) +
    (spatialFactor > 0 ? 0.11 : 0.13) * tiltFactor +
    (spatialFactor > 0 ? 0.06 : 0.07) * seismicFactor +
    (spatialFactor > 0 ? 0.04 : 0.05) * dischargeFactor;

  // Catastrophic non-linear threshold breach:
  // When Caine I-D is exceeded AND soil moisture is saturated (>75%), liquefaction surge accelerates
  if (caineExceeded && satRatio >= 0.75) {
    rawTrigger = Math.min(1.0, rawTrigger * 1.35 + 0.12);
  }

  const trigger = clamp(rawTrigger, 0.02, 1.0);

  // 4. Multi-Factor Transparent Landslide Risk Model (Part 13)
  // LANDSLIDE_RISK = 0.30×HISTORY + 0.20×SLOPE + 0.15×SOIL_MOISTURE + 0.15×RAINFALL + 0.10×GEOLOGY + 0.05×DRAINAGE + 0.05×TREND
  const histNorm = clamp(Math.round((st.histScore ?? 0.5) * 100), 0, 100);
  const slopeNorm = clamp(Math.round(((slope / 45) * 85) + (st.tilt > 1 ? 15 : 0)), 0, 100);
  const moistNorm = clamp(Math.round(st.moist), 0, 100);
  const rainNorm = clamp(Math.round(Math.min(100, (rain1h / 40) * 75 + (caineExceeded ? 25 : 0))), 0, 100);
  const geolNorm = clamp(Math.round((clayPct / 50) * 55 + (st.sarDeformationMmYr ? Math.min(st.sarDeformationMmYr / 25, 1) * 45 : 20)), 0, 100);
  const drainNorm = clamp(Math.round(spatialFactor * 65 + (dischargeFactor * 35)), 0, 100);
  const trendNorm = clamp(Math.round((rain1h > 15 ? 75 : rain1h > 5 ? 40 : 15) + (st.tilt > 0.8 ? 25 : 0)), 0, 100);

  const landslideBreakdown: LandslideRiskBreakdown = {
    history: {
      name: "Historical Susceptibility",
      weightPct: 30,
      score: histNorm,
      weightedValue: Number(((histNorm * 30) / 100).toFixed(1)),
      description: "Persistent baseline terrain susceptibility based on documented disaster inventory",
    },
    slope: {
      name: "Slope Gradient & Tilt",
      weightPct: 20,
      score: slopeNorm,
      weightedValue: Number(((slopeNorm * 20) / 100).toFixed(1)),
      description: "DEM topographic slope angle and real-time physical sensor tilt displacement",
    },
    soilMoisture: {
      name: "Soil Moisture & Saturation",
      weightPct: 15,
      score: moistNorm,
      weightedValue: Number(((moistNorm * 15) / 100).toFixed(1)),
      description: "Pore-water pressure and volumetric water content saturation",
    },
    rainfall: {
      name: "Rainfall Intensity & Ingest",
      weightPct: 15,
      score: rainNorm,
      weightedValue: Number(((rainNorm * 15) / 100).toFixed(1)),
      description: "Instantaneous Doppler radar rain rate and Caine I-D threshold ratio",
    },
    geology: {
      name: "Geology & Regolith Texture",
      weightPct: 10,
      score: geolNorm,
      weightedValue: Number(((geolNorm * 10) / 100).toFixed(1)),
      description: "ISRIC SoilGrids clay content, permeability Ksat, and InSAR creep deformation",
    },
    drainage: {
      name: "Drainage & Spatial Proximity",
      weightPct: 5,
      score: drainNorm,
      weightedValue: Number(((drainNorm * 5) / 100).toFixed(1)),
      description: "Concentric 1–5 km convective storm core proximity and catchment drainage",
    },
    trend: {
      name: "Environmental Trend & Kinematics",
      weightPct: 5,
      score: trendNorm,
      weightedValue: Number(((trendNorm * 5) / 100).toFixed(1)),
      description: "Rainfall acceleration and rate of tilt change over time",
    },
  };

  const landslideRisk = clamp(
    Math.round(
      landslideBreakdown.history.weightedValue +
      landslideBreakdown.slope.weightedValue +
      landslideBreakdown.soilMoisture.weightedValue +
      landslideBreakdown.rainfall.weightedValue +
      landslideBreakdown.geology.weightedValue +
      landslideBreakdown.drainage.weightedValue +
      landslideBreakdown.trend.weightedValue
    ),
    0,
    100
  );

  // 5. Multi-Factor Transparent Flash Flood Risk Model (Part 15)
  // FLASH_FLOOD_RISK = 0.25×CURRENT_RAIN + 0.20×ANTECEDENT_RAIN + 0.15×ACCUMULATION + 0.15×DRAINAGE_RUNOFF + 0.15×FLOOD_HISTORY + 0.10×SOIL_SATURATION
  const curRainNorm = clamp(Math.round((rain1h / 50) * 100), 0, 100);
  const anteRainNorm = clamp(Math.round((rain6h / 90) * 100), 0, 100);
  const accumNorm = clamp(Math.round((rain24h / 180) * 100), 0, 100);
  const drainRunoffNorm = clamp(Math.round((dischargeFactor * 70) + (slope < 15 ? 30 : 10)), 0, 100);
  const floodHistNorm = clamp(Math.round(slope < 20 ? st.histScore * 100 : st.histScore * 65), 0, 100);
  const soilSatNorm = clamp(Math.round(st.moist), 0, 100);

  const flashFloodBreakdown: FlashFloodRiskBreakdown = {
    currentRain: {
      name: "Current Rainfall Intensity",
      weightPct: 25,
      score: curRainNorm,
      weightedValue: Number(((curRainNorm * 25) / 100).toFixed(1)),
      description: "Instantaneous radar/gauge precipitation intensity rate (mm/h)",
    },
    antecedentRain: {
      name: "Antecedent 6-Hour Rainfall",
      weightPct: 20,
      score: anteRainNorm,
      weightedValue: Number(((anteRainNorm * 20) / 100).toFixed(1)),
      description: "Recent storm accumulation charging valley catchment tributaries",
    },
    accumulation: {
      name: "Rolling 24-Hour Total",
      weightPct: 15,
      score: accumNorm,
      weightedValue: Number(((accumNorm * 15) / 100).toFixed(1)),
      description: "Cumulative multi-day precipitation loading regional waterways",
    },
    drainageRunoff: {
      name: "Drainage & River Runoff",
      weightPct: 15,
      score: drainRunoffNorm,
      weightedValue: Number(((drainRunoffNorm * 15) / 100).toFixed(1)),
      description: "GloFAS river discharge ratio and valley floor constriction factor",
    },
    floodHistory: {
      name: "Terrain Flood History",
      weightPct: 15,
      score: floodHistNorm,
      weightedValue: Number(((floodHistNorm * 15) / 100).toFixed(1)),
      description: "Historical inundation and basin submergence records",
    },
    soilSaturation: {
      name: "Soil Saturation & Runoff Yield",
      weightPct: 10,
      score: soilSatNorm,
      weightedValue: Number(((soilSatNorm * 10) / 100).toFixed(1)),
      description: "Reduced infiltration capacity forcing immediate surface runoff sheetwash",
    },
  };

  const flashFloodRisk = clamp(
    Math.round(
      flashFloodBreakdown.currentRain.weightedValue +
      flashFloodBreakdown.antecedentRain.weightedValue +
      flashFloodBreakdown.accumulation.weightedValue +
      flashFloodBreakdown.drainageRunoff.weightedValue +
      flashFloodBreakdown.floodHistory.weightedValue +
      flashFloodBreakdown.soilSaturation.weightedValue
    ),
    0,
    100
  );

  // Explainable Primary Drivers (Part 16)
  const primaryDrivers: string[] = [];
  if (caineExceeded) {
    primaryDrivers.push(`Caine (1980) physical threshold breached (${caineRatio.toFixed(2)}x threshold)`);
  }
  if (slope >= 28) {
    primaryDrivers.push(`Steep topographic terrain slope (${slope}° gradient)`);
  }
  if (histNorm >= 70) {
    primaryDrivers.push("High historical disaster and terrain susceptibility baseline");
  }
  if (rain1h >= 15) {
    primaryDrivers.push(`Torrential precipitation intensity (${rain1h.toFixed(1)} mm/hr)`);
  }
  if (moistNorm >= 75) {
    primaryDrivers.push(`Elevated pore-water pressure and soil saturation (${moistNorm}%)`);
  }
  if (st.tilt >= 0.8) {
    primaryDrivers.push(`Active geotechnical ground tilt displacement (${st.tilt.toFixed(2)}°)`);
  }
  if (slope < 15 && dischargeFactor > 0.3) {
    primaryDrivers.push("Low-lying floodplain elevation with elevated river discharge");
  }
  if (primaryDrivers.length === 0) {
    primaryDrivers.push("Environmental and geotechnical parameters within normal baseline limits");
  }

  // Physical Trigger Gating (USGS / Varnes Landslide Hazard Formulation):
  // Hazard = Susceptibility × Dynamic Trigger.
  // When there is NO rainfall (0 mm/h), NO storm forecast, and NO seismic shock,
  // high-susceptibility terrain is dormant. Flagging it as 70+ CRITICAL is a false alarm.
  const meteorologicalTrigger = Math.max(
    caineRatio,                     // Caine (1980) physical threshold ratio
    rain1h / 14.82,                 // Instantaneous rainfall intensity
    rain6h / 45.0,                  // 6h antecedent storm accumulation
    (st.rainForecast ?? 0) / 15.0          // Near-term forecast rain rate
  );
  const seismicTrigger = (st.seismicPgaG ?? 0.004) > 0.04 ? (st.seismicPgaG ?? 0.004) / 0.08 : 0;
  const activeTriggerMetric = Math.max(meteorologicalTrigger, seismicTrigger);

  let activeLandslideScore = landslideRisk;
  let activeFloodScore = flashFloodRisk;

  if (activeTriggerMetric < 0.10) {
    // Zero / negligible physical trigger: slope is in dormant baseline stability
    // Cap score to safe baseline (max 28), completely avoiding cry-wolf false alarms in dry conditions
    activeLandslideScore = Math.min(Math.round(landslideRisk * 0.35), 28);
    activeFloodScore = Math.min(Math.round(flashFloodRisk * 0.30), 22);
  } else if (activeTriggerMetric < 0.60) {
    // Moderate trigger: rising rainfall / early moisture accumulation -> watch zone (32–58)
    const factor = 0.35 + 0.65 * (activeTriggerMetric / 0.60);
    activeLandslideScore = Math.min(Math.round(landslideRisk * factor), 58);
    activeFloodScore = Math.min(Math.round(flashFloodRisk * factor), 55);
  }
  // When activeTriggerMetric >= 0.60 (e.g. Caine breach, cloudburst > 15 mm/h, or tilt surge),
  // full hazard is unleashed reaching 70 - 100 CRITICAL!

  // Unified physical hazard score: dominated by landslide in mountain terrain, or flash flood in alluvial basins
  const dominantHazardScore = slope >= 22 
    ? Math.max(activeLandslideScore, Math.round(activeFloodScore * 0.85)) 
    : Math.max(activeFloodScore, Math.round(activeLandslideScore * 0.85));
  const totalScore = clamp(dominantHazardScore, 0, 100);
  const level: RiskLevel = totalScore >= 70 ? "CRITICAL" : totalScore >= 40 ? "WATCH" : "SAFE";

  // 6. Population Exposure & Risk-to-People (WorldPop / Meta Density)
  const popDensity = st.populationDensity ?? 850;
  const popFactor = clamp(0.65 + 0.35 * Math.min(popDensity / 3000, 1.0), 0.65, 1.0);
  const riskToPeople = clamp(Math.round(totalScore * popFactor), 0, 100);

  // 7. Decoupled Data Provenance & Confidence Scoring (Part 17)
  const provenance: DataProvenance =
    st.provenance ?? (st.tilt > 0 ? "MEASURED_IOT" : "DOPPLER_RADAR");
  const confidencePct =
    provenance === "MEASURED_IOT"
      ? 96
      : provenance === "DOPPLER_RADAR"
        ? 88
        : provenance === "SATELLITE_GPM"
          ? 82
          : provenance === "SAR_SENTINEL1"
            ? 80
            : 68;

  return {
    total: totalScore,
    level,
    landslideRisk,
    flashFloodRisk,
    landslideBreakdown,
    flashFloodBreakdown,
    primaryDrivers,
    susceptibility: Number(susceptibility.toFixed(3)),
    trigger: Number(trigger.toFixed(3)),
    caineRatio: Number(caineRatio.toFixed(2)),
    caineExceeded,
    caineThreshold1h: Number(caine1hThresh.toFixed(2)),
    caineIntensity1h: Number(rain1h.toFixed(2)),
    riskToPeople,
    confidencePct,
    provenance,
    breakdown: {
      slopeFactor: Number(slopeFactor.toFixed(2)),
      soilFactor: Number(soilFactor.toFixed(2)),
      vegetationFactor: Number(vegetationFactor.toFixed(2)),
      caineFactor: Number(caineFactor.toFixed(2)),
      moistureFactor: Number(moistureFactor.toFixed(2)),
      radarFactor: Number(radarFactor.toFixed(2)),
      spatialFactor: Number(spatialFactor.toFixed(2)),
      tiltFactor: Number(tiltFactor.toFixed(2)),
      seismicFactor: Number(seismicFactor.toFixed(2)),
    },
  };
}

export function riskColor(score: number) {
  if (score >= 70) return RISK_HEX.crit;
  if (score >= 40) return RISK_HEX.watch;
  return RISK_HEX.safe;
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 70) return "CRITICAL";
  if (score >= 40) return "WATCH";
  return "SAFE";
}

export function derivedTilt(baseTilt: number, moist: number, rain: number) {
  const sat = moist / 100;
  const rainF = Math.min(rain, 40) / 40;
  return clamp(baseTilt * (1 + sat * 0.55 + rainF * 1.1), 0, 8);
}

export function volumetricToSaturation(vwc: number) {
  const wilt = 0.08;
  const field = 0.46;
  return clamp(((vwc - wilt) / (field - wilt)) * 100, 4, 99);
}

export function projectLeadTime(
  st: Pick<
    StationLive,
    | "rain"
    | "moist"
    | "tilt"
    | "histScore"
    | "rain24h"
    | "rain6h"
    | "discharge"
    | "dischargeMean"
    | "forecast1h"
    | "name"
    | "slopeDeg"
    | "clayFractionPct"
    | "vegetationCoverPct"
    | "populationDensity"
    | "dopplerDbz"
  >,
  simSurge = false,
): PredictorState {
  const now = calculateRisk(st);
  if (now.total >= 70) {
    return {
      level: "critical",
      etaLabel: "Caine I-D Threshold Breached",
      leadLabel: "Evacuation directives active",
      message: `Critical debris-flow trigger breached at ${st.name} (Caine ratio: ${now.caineRatio}x). Immediate life-safety action active.`,
      caineTriggerLeadHours: 0,
    };
  }

  let soil = st.moist;
  let tilt = st.tilt;
  let rain24 = st.rain24h;
  const hours = st.forecast1h.slice(0, 6);

  for (let i = 0; i < hours.length; i++) {
    const mm = hours[i]?.mm ?? 0;
    soil = clamp(soil + mm * 0.42, 0, 100);
    tilt = clamp(tilt + mm * 0.018, 0, 8);
    rain24 += mm;
    const projected = calculateRisk({
      rain: mm,
      moist: soil,
      tilt,
      histScore: st.histScore,
      rain24h: rain24,
      rain6h: st.rain6h,
      discharge: st.discharge,
      dischargeMean: st.dischargeMean,
      slopeDeg: st.slopeDeg,
      clayFractionPct: st.clayFractionPct,
      vegetationCoverPct: st.vegetationCoverPct,
      populationDensity: st.populationDensity,
      dopplerDbz: st.dopplerDbz,
    });
    if (projected.total >= 70) {
      const eta = i + 1;
      return {
        level: "trajectory",
        etaLabel: `Caine breach in ${eta}h`,
        leadLabel: `${eta.toFixed(0)} hour advance lead-time window`,
        message: `ECMWF/MET forecast of ${mm.toFixed(1)} mm/h at hour +${eta} causes Caine I-D exceedance (proj ratio: ${projected.caineRatio}x). Evacuation window is open.`,
        caineTriggerLeadHours: eta,
      };
    }
    if (projected.total >= 40 && now.total < 40 && i <= 1) {
      return {
        level: "trajectory",
        etaLabel: "Watch threshold inside 2h",
        leadLabel: "3 to 4 hour advance window open",
        message: `Upstream radar/forecast shows rising precipitation rate. Place ${st.name} emergency teams on alert.`,
        caineTriggerLeadHours: 2,
      };
    }
  }

  if (simSurge && now.total >= 40) {
    return {
      level: "trajectory",
      etaLabel: "Simulated cloudburst surge ETA 03h 45m",
      leadLabel: "Advance lead time: 3.8 hours",
      message: "Stress simulation: Caine I-D rainfall threshold breached with high pore-water saturation.",
      caineTriggerLeadHours: 3.8,
    };
  }

  return {
    level: "stable",
    etaLabel: "Within safe Caine I-D envelope",
    leadLabel: "4 to 6 hour horizon monitored",
    message: "Rainfall intensity and pore-water pressure remain safely below Caine (1980) triggering curves.",
  };
}

export function placeScore(rain: number, moist: number) {
  const caine = caineThreshold(1);
  const caineRatio = rain / caine;
  const rainFactor = Math.min(caineRatio, 1.2) * 55;
  const soilFactor = Math.min(moist / 100, 1) * 45;
  const total = clamp(Math.round(rainFactor + soilFactor), 0, 100);
  const level: RiskLevel = total >= 70 ? "CRITICAL" : total >= 40 ? "WATCH" : "SAFE";
  return { total, level, caineRatio };
}

export function symbolLabel(symbol: string) {
  const key = symbol.replace(/_(day|night)$/, "");
  const map: Record<string, string> = {
    fair: "Clear",
    clearsky: "Clear",
    partlycloudy: "Partly cloudy",
    cloudy: "Overcast",
    rainshowers: "Rain showers",
    rain: "Rain",
    heavyrain: "Heavy rain",
    heavyrainshowers: "Heavy rain showers",
    lightrain: "Light rain",
    lightrainshowers: "Light showers",
    thunderstorm: "Thunderstorm",
    rainandthunder: "Rain and thunder",
    heavyrainandthunder: "Severe thunder rain",
    fog: "Fog",
    snow: "Snow",
    sleet: "Sleet",
  };
  return map[key] ?? key.replaceAll("_", " ");
}
