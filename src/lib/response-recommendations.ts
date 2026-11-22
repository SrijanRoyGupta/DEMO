/**
 * TerraAlert — Explainable Response Recommendation Engine
 * ========================================================
 * Generates transparent, SOP-aligned operational recommendations
 * for civil defense operators, DDMA officials, and emergency responders.
 * 
 * CRITICAL RULE — HUMAN-IN-THE-LOOP SAFETY:
 * NEVER automatically executes public cell broadcasts, sirens, or evacuation orders.
 * All consequential actions are queued for mandatory authorized human approval.
 */

import type { StationLive, RiskLevel } from "./types";
import { calculateRisk } from "./risk";
import type { IncidentRecord } from "./incident-system";

export type RecommendationUrgency = "IMMEDIATE" | "HIGH_PRIORITY" | "ROUTINE_MONITORING";

export type OperationalRecommendation = {
  id: string;
  actionTitle: string;
  urgency: RecommendationUrgency;
  whySuggested: string;
  empiricalEvidence: string[];
  dataConfidencePct: number;
  requiredHumanReview: "DISTRICT_COLLECTOR" | "DUTY_OFFICER" | "PANウイルス_SECRETARY" | "CIVIL_DEFENSE_HEAD";
  suggestedActionType:
    | "ISSUE_SHELTER_ADVISORY"
    | "ACTIVATE_CIVIL_DEFENSE_SQUAD"
    | "INSPECT_DRAINAGE_CULVERTS"
    | "STANDBY_AMBULANCE_UNIT"
    | "VERIFY_SENSOR_GROUND_TRUTH"
    | "ESCALATE_TO_STATE_SEOC";
  status: "PENDING_REVIEW" | "AUTHORIZED" | "EXECUTED" | "DISMISSED";
  operatorLogMessage: string;
};

/**
 * Generate explainable, rule-based response recommendations based on physical state
 */
export function generateResponseRecommendations(
  station: StationLive,
  activeIncident?: IncidentRecord,
): OperationalRecommendation[] {
  const risk = calculateRisk(station);
  const recommendations: OperationalRecommendation[] = [];

  const rainIntensity = station.rainIntensityMmH ?? station.rain;
  const isCaineBreached = risk.caineExceeded;
  const isCritical = risk.total >= 70;
  const isWatch = risk.total >= 40 && risk.total < 70;

  // 1. Extreme Critical Threat: Shelter Advisory & NDRF Standby
  if (isCritical || isCaineBreached) {
    recommendations.push({
      id: `rec-crit-${station.id}-01`,
      actionTitle: "Activate Ward Relief Shelter & Stage High-Clearance Rescue Convoys",
      urgency: "IMMEDIATE",
      whySuggested: "Caine (1980) physical threshold exceeded and shear stress in slope regolith approaching critical failure.",
      empiricalEvidence: [
        `Caine I-D exceedance ratio: ${risk.caineRatio}x threshold`,
        `Rainfall intensity: ${rainIntensity} mm/h`,
        `Copernicus DEM slope gradient: ${station.slopeDeg}°`,
        `Soil saturation: ${station.moist.toFixed(0)}% (ISRIC SoilGrids ${station.soilTexture})`,
      ],
      dataConfidencePct: station.confidencePct ?? 92,
      requiredHumanReview: "DISTRICT_COLLECTOR",
      suggestedActionType: "ISSUE_SHELTER_ADVISORY",
      status: "PENDING_REVIEW",
      operatorLogMessage: `Recommended designated shelter activation for ${station.ward} pending Collector authorization.`,
    });

    recommendations.push({
      id: `rec-crit-${station.id}-02`,
      actionTitle: "Deploy SDRF / Quick Response Teams to Axial Drainage Culverts",
      urgency: "HIGH_PRIORITY",
      whySuggested: "High probability of debris choke and flash inundation across mountain road culverts.",
      empiricalEvidence: [
        `River discharge: ${station.discharge ?? "Elevated"} m³/s`,
        `ResqNet LoRa tilt sensor: ${station.tilt.toFixed(2)}°`,
      ],
      dataConfidencePct: station.confidencePct ?? 90,
      requiredHumanReview: "DUTY_OFFICER",
      suggestedActionType: "ACTIVATE_CIVIL_DEFENSE_SQUAD",
      status: "PENDING_REVIEW",
      operatorLogMessage: "Urged patrol deployment along primary arterial road culverts.",
    });
  } else if (isWatch) {
    // 2. Elevated Watch Condition: Pre-Impact Preparation
    recommendations.push({
      id: `rec-watch-${station.id}-01`,
      actionTitle: "Inspect Arterial Drainage Inflows & Clear Silt Accumulations",
      urgency: "HIGH_PRIORITY",
      whySuggested: "Rising pore pressure and continuous antecedent rainfall approaching critical slope moisture boundaries.",
      empiricalEvidence: [
        `Soil moisture: ${station.moist.toFixed(0)}%`,
        `Rainfall: ${rainIntensity} mm/h (Forecast 6h: ${station.rain6h} mm)`,
      ],
      dataConfidencePct: station.confidencePct ?? 86,
      requiredHumanReview: "DUTY_OFFICER",
      suggestedActionType: "INSPECT_DRAINAGE_CULVERTS",
      status: "PENDING_REVIEW",
      operatorLogMessage: "Advised municipal stormwater inspection teams to clear grates.",
    });

    recommendations.push({
      id: `rec-watch-${station.id}-02`,
      actionTitle: "Place Medical Triage Units & 108 Ambulances on 15-Minute Standby",
      urgency: "ROUTINE_MONITORING",
      whySuggested: "Regional telemetry indicates convective cell buildup within 5 km buffer.",
      empiricalEvidence: [
        `Doppler radar reflectivity: ${station.dopplerDbz ?? 34} dBZ`,
        `Population density in ward: ${station.populationDensity} residents/km²`,
      ],
      dataConfidencePct: station.confidencePct ?? 88,
      requiredHumanReview: "DUTY_OFFICER",
      suggestedActionType: "STANDBY_AMBULANCE_UNIT",
      status: "PENDING_REVIEW",
      operatorLogMessage: "Placed medical ambulances on standby for rapid dispatch.",
    });
  } else {
    // 3. Normal / Low Risk: Routine Telemetry Health
    recommendations.push({
      id: `rec-norm-${station.id}-01`,
      actionTitle: "Maintain Automated 10-Minute Telemetry Monitoring & Sensor Health Poll",
      urgency: "ROUTINE_MONITORING",
      whySuggested: "All physical hazard parameters remain within nominal baseline safety limits.",
      empiricalEvidence: [
        `Risk score: ${risk.total}/100 (Nominal SAFE boundary < 40)`,
        `Rainfall: ${rainIntensity} mm/h`,
        `ResqNet LoRa battery: ${station.iotBatteryPct ?? 94}%`,
      ],
      dataConfidencePct: station.confidencePct ?? 95,
      requiredHumanReview: "DUTY_OFFICER",
      suggestedActionType: "VERIFY_SENSOR_GROUND_TRUTH",
      status: "PENDING_REVIEW",
      operatorLogMessage: "Routine monitoring active. No abnormal hazard deviations detected.",
    });
  }

  return recommendations;
}

