export type RiskLevel = "SAFE" | "WATCH" | "CRITICAL";

export type DataProvenance =
  | "MEASURED_IOT" // ResqNet $10 physical LoRa tilt & VWC sensors (5-min ground truth)
  | "DOPPLER_RADAR" // RainViewer 10-min volumetric C-Band radar composite nowcasting
  | "SATELLITE_GPM" // NASA/JAXA GPM IMERG 30-min calibrated satellite precipitation
  | "SAR_SENTINEL1" // Copernicus Sentinel-1 SAR C-Band radar deformation & moisture
  | "MODEL_REANALYSIS"; // ECMWF IFS / Copernicus CEMS GloFAS / Open-Meteo

export type StationDef = {
  id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
  histScore: number;
  baseTilt: number;
  slopeDeg: number;
  ward: string;
  terrain: string;
  historyLog: string;

  // Global-grade scientific attributes
  elevationDem: number; // Copernicus 30m Global DEM (m above MSL)
  aspectDeg: number; // Slope aspect orientation (0–360°)
  soilTexture: string; // ISRIC SoilGrids 250m taxonomy
  soilPermeabilityKsat: number; // Saturated hydraulic conductivity Ksat (mm/h)
  clayFractionPct: number; // SoilGrids clay percentage (0-100%)
  worldCoverClass: string; // ESA WorldCover 10m land cover category
  vegetationCoverPct: number; // ESA WorldCover canopy density %
  populationDensity: number; // WorldPop / Meta High-Res human density (people/km²)
  sarDeformationMmYr: number; // Copernicus Sentinel-1 InSAR line-of-sight creep (mm/yr)
  iotNodeId: string; // ResqNet LoRa sensor node identifier
  iotBatteryPct: number;
  iotSignalDbm: number;
};

export type HourPoint = {
  time: string;
  mm: number;
};

export type {
  SpatialRainfallIntelligence,
  RadiusRainfallStats,
  SpatialSamplePoint,
  SpatialAlertEvent,
  RainfallMetricProvenance,
} from "./spatial-rainfall";

export type {
  AdvancedHazardIntelligence,
  RainCellCluster,
  RainfallTrendReport,
  RainfallAccelerationReport,
  CellMovementVector,
  DirectionalSectorReport,
  DirectionalSector,
  TerrainConditionedRisk,
  UpstreamCatchmentRisk,
  ExplainableRiskDrivers,
  MultiSourceValidationReport,
  DataConfidenceScore,
  DataFreshnessReport,
  AlertStateMachineState,
  NearestHazardEvent,
  EscalationTimelineStep,
  SensorDivergenceReport,
} from "./hazard-intelligence";

import type { SpatialRainfallIntelligence } from "./spatial-rainfall";
import type { AdvancedHazardIntelligence } from "./hazard-intelligence";

export type StationLive = StationDef & {
  /** Recent 1 h precipitation from model analysis / past hours (proxy for observed). mm */
  rainObserved: number;
  /** Next 1 h forecast precipitation rate. mm/h */
  rainForecast: number;
  /** Backward-compatible alias = rainObserved for risk calc */
  rain: number;

  /** Clearly separated explicit rainfall metrics (no unit confusion) */
  rainIntensityMmH?: number; // mm/hr (instantaneous Doppler radar or gauge intensity rate)
  rainAccum1hMm?: number; // mm (past 1-hour total accumulation)
  rainForecast1hMm?: number; // mm (predicted 1-hour forward accumulation)
  rainForecast6hMm?: number; // mm (predicted 6-hour forward accumulation)

  /** High-resolution multi-radius spatial rainfall intelligence (1–5 km) */
  spatialRainfall?: SpatialRainfallIntelligence;

  /** Advanced Spatial & Temporal Hazard Intelligence Engine (V2) */
  hazardIntelligence?: AdvancedHazardIntelligence;

  moist: number;
  humidity: number;
  tilt: number;
  tempC: number;
  windMs: number;
  pressureHpa: number;
  cloudPct: number;
  /** Rolling 24 h accumulation (model analysis). mm */
  rain24h: number;
  /** Next 6 h forecast total. mm */
  rain6h: number;
  discharge: number | null;
  dischargeMean: number | null;
  weatherLabel: string;
  weatherSymbol: string;
  forecast1h: HourPoint[];
  sourceUpdatedAt: number;
  soilEstimated: boolean;

  // Global Science fields
  gpmPrecip30m?: number; // NASA GPM IMERG 30-min calibrated rate (mm/h)
  dopplerDbz?: number; // RainViewer live radar reflectivity (dBZ)
  seismicPgaG?: number; // USGS Realtime distance-attenuated PGA (g)
  caineRatio?: number; // Caine (1980) I-D threshold exceedance ratio
  caineExceeded?: boolean; // True if rainfall intensity exceeds Caine 1980 threshold
  susceptibilityScore?: number; // USGS/NASA GLSM static terrain susceptibility (0–1)
  triggerScore?: number; // Dynamic multi-source trigger intensity (0–1)
  riskToPeople?: number; // Population-weighted human exposure risk index (0–100)
  provenance?: DataProvenance;
  confidencePct?: number; // Provenance confidence level (e.g. 98% IoT vs 82% satellite)
};

export type RadarFrame = {
  time: number;
  path: string;
  tileUrl: string;
};

export type NetworkLive = {
  fetchedAt: number;
  sourceUpdatedAt: number;
  cacheAgeMs: number;
  fingerprint: string;
  sources: {
    weather: string;
    soil: string;
    flood: string;
    radar: string;
    satelliteGpm?: string;
    seismicity?: string;
    sar?: string;
  };
  degraded: boolean;
  stations: StationLive[];
  radar: {
    host: string;
    generated: number;
    frames: RadarFrame[];
  };
};

export type PlaceRisk = {
  name: string;
  region: string;
  lat: number;
  lon: number;
  /** Recent 1 h (model analysis). mm */
  rainObserved: number;
  /** Next 1 h forecast. mm/h */
  rainForecast: number;
  /** Alias for risk = rainObserved */
  rain: number;
  moist: number;
  humidity: number;
  tempC: number;
  rain6h: number;
  rain24h: number;
  weatherLabel: string;
  score: number;
  level: RiskLevel;
  forecast1h: HourPoint[];
  sourceUpdatedAt: number;

  // Scientific model metadata
  susceptibilityScore?: number;
  triggerScore?: number;
  caineRatio?: number;
  caineExceeded?: boolean;
  riskToPeople?: number;
  provenance?: DataProvenance;
  confidencePct?: number;

  /** Separated explicit rainfall metrics (no unit confusion) */
  rainIntensityMmH?: number;
  rainAccum1hMm?: number;
  rainForecast1hMm?: number;
  rainForecast6hMm?: number;

  /** High-resolution multi-radius spatial rainfall intelligence (1–5 km) */
  spatialRainfall?: SpatialRainfallIntelligence;
};

export type LogKind = "info" | "watch" | "crit" | "predict";

export type LogEntry = {
  id: string;
  ts: number;
  kind: LogKind;
  message: string;
};

export type PredictorState = {
  level: "stable" | "trajectory" | "critical";
  etaLabel: string;
  leadLabel: string;
  message: string;
  caineTriggerLeadHours?: number;
};

// Common Alerting Protocol (OASIS CAP v1.2 / ITU-T X.1303)
export type CapAlertMessage = {
  identifier: string;
  sender: string;
  sent: string;
  status: "Actual" | "Exercise" | "System" | "Test";
  msgType: "Alert" | "Update" | "Cancel";
  scope: "Public" | "Restricted";
  info: {
    category: "Met" | "Geo" | "Safety" | "Other";
    event: string;
    urgency: "Immediate" | "Expected" | "Future";
    severity: "Extreme" | "Severe" | "Moderate" | "Minor";
    certainty: "Observed" | "Likely" | "Possible";
    headline: string;
    description: string;
    instruction: string;
    area: {
      areaDesc: string;
      circle: string; // "lat,lon,radiusKm"
    };
    parameter: {
      valueName: string;
      value: string;
    }[];
  };
  rawXml?: string;
};

// Parametric Reinsurance Payout Certificate (Swiss Re / Munich Re / ARC standard)
export type ParametricTriggerCertificate = {
  certificateId: string;
  timestamp: string;
  assetWard: string;
  peril: "LANDSLIDE_DEBRIS_FLOW" | "FLASH_FLOOD_INUNDATION" | "CLOUDBURST_BREACH";
  triggerIndex: number;
  caineExceedance: number;
  payoutApproved: boolean;
  payoutTier: "NONE" | "TIER_1_EARLY_RESPONSE" | "TIER_2_FULL_DISBURSEMENT";
  disbursementAmountUsd: number;
  verifiableHash: string;
  dataSources: string[];
};

export type HistoricalDisasterType =
  | "Landslide Debris Flow"
  | "Flash Flood & Dam Breach"
  | "Glacial Lake Outburst (GLOF)"
  | "Monsoon Cloudburst & Slope Failure"
  | "Catchment Flash Flood"
  | "Extreme Precipitation / Non-Failure Control";

export type HistoricalTimelineStep = {
  hourOffset: number; // e.g. -24, -18, -12, -6, -3, -1, 0 (onset)
  label: string; // e.g. "T-24h: Antecedent Monsoon Infiltration"
  timestampStr?: string; // e.g. "29 July 02:00 IST"
  
  // Reconstructed environmental condition inputs
  rainRateMmH: number; // 1h precipitation rate (mm/h)
  accumulated6hMm: number; // 6h accumulated rainfall (mm)
  accumulated24hMm: number; // 24h accumulated rainfall (mm)
  forecastRain1h: number; // Next 1h forecast rain (mm/h)
  soilSatPct: number; // Volumetric / pore-water saturation (%)
  dischargeM3s: number | null; // Catchment discharge (m3/s)
  dischargeMeanM3s: number | null; // Baseline seasonal mean discharge (m3/s)
  slopeDeg: number; // Topographic slope gradient (degrees)
  clayFractionPct: number; // Clay fraction / soil shear factor (%)
  tiltDeg: number; // Sensor / InSAR slope displacement (degrees or mm/yr)
  dopplerDbz: number; // Doppler radar reflectivity (dBZ)
  seismicPgaG?: number; // Ground motion acceleration (g)

  // Evaluated outputs from frozen model pipeline (calculateRisk)
  modelRiskScore: number; // 0 to 100
  systemAlertLevel: RiskLevel; // "SAFE" | "WATCH" | "CRITICAL"
  caineRatio: number; // I / I_c threshold exceedance ratio
  caineExceeded: boolean;
  capAlertIssued: boolean;
  
  // Explainable factors breakdown from calculateRisk
  factors: {
    rainfallLevel: "LOW" | "MODERATE" | "HIGH" | "VERY HIGH";
    moistureLevel: "LOW" | "MODERATE" | "HIGH" | "SATURATED";
    dischargeLevel: "NORMAL" | "MODERATE" | "HIGH" | "EXTREME";
    slopeLevel: "MODERATE" | "HIGH" | "VERY HIGH" | "CRITICAL";
    forecastLevel: "LOW" | "MODERATE" | "HIGH" | "SEVERE";
    soilShearLevel: "STABLE" | "MODERATE" | "HIGH" | "CRITICAL";
  };
};

export type HistoricalEventRecord = {
  id: string;
  name: string;
  location: string;
  state: string;
  country: string;
  date: string;
  onsetTimeStr: string;
  disasterType: HistoricalDisasterType;
  isControlEvent?: boolean;
  casualties: string;
  peakPrecipitation: string;
  terrainProfile: string;
  
  watchLeadTimeHours: number;
  criticalLeadTimeHours: number;
  observedLeadTimeHours: number;
  peakRiskScore: number;
  caineExceedancePeak: number;
  eventDetected: boolean;
  warningSummaryCallout: string;
  
  timeline: HistoricalTimelineStep[];
  summary: string;
  sourcesCitation: string;
  reconstructedDatasets: string[];
};

export type ValidationMetrics = {
  totalEvents: number;
  catastrophicEvents: number;
  controlEvents: number;
  eventsDetected: number;
  detectionRatePct: number;
  meanWatchLeadTimeHours: number;
  meanCriticalLeadTimeHours: number;
  
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  rocAuc: number;
  falseAlarmRate: number;
  missedEventRate: number;
};

