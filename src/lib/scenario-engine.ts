/**
 * TerraAlert — Advanced What-If Scenario Modeling Engine
 * ======================================================
 * Scientifically rigorous scenario modeling workbench.
 * Integrates directly with the authentic production risk engine (calculateRisk)
 * with strict data isolation.
 * 
 * CRITICAL RULE — STRICT SIMULATION ISOLATION:
 * Scenario calculations NEVER mutate live sensor telemetry, production stations,
 * or persistent incident records. All outputs are explicitly flagged as
 * "SIMULATION — NOT A LIVE OBSERVATION".
 */

import { calculateRisk, type ScientificRiskResult } from "./risk";
import type { RiskLevel, StationLive } from "./types";
import { assessInfrastructureExposure, type ExposedAssetAssessment } from "./exposure-intelligence";

export type ScenarioParameters = {
  scenarioId: string;
  name: string;
  description: string;
  targetStationId: string;
  additionalRainIntensityMmH: number; // Delta rain intensity rate (mm/hr)
  simulated24hAccumMm: number; // Total simulated 24h accumulation (mm)
  simulatedSoilMoistPct: number; // Simulated soil saturation % (0–100%)
  simulatedTiltDeltaDeg: number; // Additional slope tilt displacement (degrees)
  durationHours: number; // Scenario forward duration (hours)
  createdAt: string;
};

export type ScenarioEvaluationResult = {
  scenarioId: string;
  stationId: string;
  stationName: string;
  isSimulation: true;
  simulationDisclaimer: "SIMULATION — NOT A LIVE OBSERVATION";

  // Baseline Live State (Unmodified ground truth)
  baseline: {
    riskScore: number;
    riskLevel: RiskLevel;
    rainRateMmH: number;
    soilSatPct: number;
    tiltDeg: number;
    caineExceeded: boolean;
    caineRatio: number;
  };

  // Scenario State (Computed with modified parameters through calculateRisk)
  scenario: {
    riskScore: number;
    riskLevel: RiskLevel;
    rainRateMmH: number;
    soilSatPct: number;
    tiltDeg: number;
    caineExceeded: boolean;
    caineRatio: number;
  };

  // Delta Comparisons
  delta: {
    riskScoreDelta: number;
    levelChanged: boolean;
    caineBreachedNow: boolean;
    summary: string;
  };

  // Full Model Diagnostics from calculateRisk
  scientificRisk: ScientificRiskResult;

  // Infrastructure Exposure under Scenario
  potentiallyExposedAssets: ExposedAssetAssessment[];

  // Reproducible Parameter Snapshot
  parameters: ScenarioParameters;
};

/**
 * Standard scientifically grounded disaster stress scenarios
 */
export const PRESET_SCENARIOS: Omit<ScenarioParameters, "scenarioId" | "targetStationId" | "createdAt">[] = [
  {
    name: "Extreme Convective Cloudburst Burst (+50 mm/h)",
    description: "Simulates sudden localized convective downburst characteristic of Himalayan cloudbursts (e.g. Kedarnath / Leh / Chamoli).",
    additionalRainIntensityMmH: 50.0,
    simulated24hAccumMm: 160.0,
    simulatedSoilMoistPct: 95.0,
    simulatedTiltDeltaDeg: 0.25,
    durationHours: 2.0,
  },
  {
    name: "Prolonged Multi-Day Monsoon Saturation (+15 mm/h sustained)",
    description: "Simulates continuous 48-hour antecedent monsoon precipitation saturating regolith and driving pore-water pressure to shear limits.",
    additionalRainIntensityMmH: 15.0,
    simulated24hAccumMm: 240.0,
    simulatedSoilMoistPct: 98.0,
    simulatedTiltDeltaDeg: 0.15,
    durationHours: 6.0,
  },
  {
    name: "Seismic Ground-Motion + Intense Rain Co-Trigger",
    description: "Simulates co-seismic regolith fracture accompanied by moderate rain, drastically reducing effective shear cohesion.",
    additionalRainIntensityMmH: 25.0,
    simulated24hAccumMm: 95.0,
    simulatedSoilMoistPct: 88.0,
    simulatedTiltDeltaDeg: 0.85,
    durationHours: 1.0,
  },
];

/**
 * Execute What-If Scenario evaluation using the authentic calculateRisk engine.
 * STRICT ISOLATION: clones the station and never mutates original state.
 */
export function evaluateWhatIfScenario(
  liveStation: StationLive,
  params: ScenarioParameters,
): ScenarioEvaluationResult {
  // 1. Evaluate baseline ground truth
  const baselineResult = calculateRisk(liveStation);

  // 2. Synthesize isolated scenario station clone
  const scenarioStation: StationLive = {
    ...liveStation,
    // Add delta rain to observed/live rain rate
    rain: liveStation.rain + params.additionalRainIntensityMmH,
    rainObserved: liveStation.rainObserved + params.additionalRainIntensityMmH,
    rainIntensityMmH: (liveStation.rainIntensityMmH ?? liveStation.rain) + params.additionalRainIntensityMmH,
    rain24h: params.simulated24hAccumMm,
    moist: Math.min(100, Math.max(0, params.simulatedSoilMoistPct)),
    tilt: liveStation.tilt + params.simulatedTiltDeltaDeg,
    soilEstimated: false,
  };

  // 3. Run production calculateRisk function on isolated clone
  const scenarioResult = calculateRisk(scenarioStation);

  // 4. Compute deltas
  const scoreDelta = scenarioResult.total - baselineResult.total;
  const levelChanged = scenarioResult.level !== baselineResult.level;
  const caineBreachedNow = !baselineResult.caineExceeded && scenarioResult.caineExceeded;

  let deltaSummary = "Risk remains within baseline category.";
  if (levelChanged) {
    deltaSummary = `Risk escalated from ${baselineResult.level} (${baselineResult.total}/100) to ${scenarioResult.level} (${scenarioResult.total}/100).`;
  } else if (Math.abs(scoreDelta) >= 5) {
    deltaSummary = `Risk score shifted by ${scoreDelta > 0 ? "+" : ""}${scoreDelta} points (${baselineResult.total} → ${scenarioResult.total}).`;
  }

  // 5. Evaluate infrastructure exposure under simulated conditions
  const potentiallyExposedAssets = assessInfrastructureExposure(
    liveStation.lat,
    liveStation.lon,
    scenarioResult.total >= 70 ? 5.0 : 2.5,
  );

  return {
    scenarioId: params.scenarioId,
    stationId: liveStation.id,
    stationName: liveStation.name,
    isSimulation: true,
    simulationDisclaimer: "SIMULATION — NOT A LIVE OBSERVATION",
    baseline: {
      riskScore: baselineResult.total,
      riskLevel: baselineResult.level,
      rainRateMmH: liveStation.rainIntensityMmH ?? liveStation.rain,
      soilSatPct: liveStation.moist,
      tiltDeg: liveStation.tilt,
      caineExceeded: baselineResult.caineExceeded ?? false,
      caineRatio: baselineResult.caineRatio ?? 1.0,
    },
    scenario: {
      riskScore: scenarioResult.total,
      riskLevel: scenarioResult.level,
      rainRateMmH: scenarioStation.rain,
      soilSatPct: scenarioStation.moist,
      tiltDeg: scenarioStation.tilt,
      caineExceeded: scenarioResult.caineExceeded ?? false,
      caineRatio: scenarioResult.caineRatio ?? 1.0,
    },
    delta: {
      riskScoreDelta: scoreDelta,
      levelChanged,
      caineBreachedNow,
      summary: deltaSummary,
    },
    scientificRisk: scenarioResult,
    potentiallyExposedAssets,
    parameters: params,
  };
}

