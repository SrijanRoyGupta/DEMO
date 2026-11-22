/**
 * TerraAlert — Local 3D Mountain Terrain Diorama Engine
 * ======================================================
 * Inspired directly by 3d-mapper.com (Image 1 & 2):
 * - Authentic Copernicus 30m Global DEM elevation profile
 * - 5 km / 7 km / 10 km localized high-relief mountain block
 * - Geological cross-section skirt walls (rock strata / pedestal base)
 * - Draped realistic satellite & topographic relief surface
 * - Physically clamped dynamic landslide & flood hazard glowing highlights
 * - Concentric analysis boundary rings (1–10 km)
 * - 3D station beacon & landmark pins
 */

import * as THREE from "three";
import { STATION_ELEVATION_GRIDS, type StationElevationGrid } from "./station-elevation-data";
import { STATIONS } from "./stations";
import type { RiskLevel } from "./types";

export interface TerrainPointInspection {
  lat: number;
  lon: number;
  elevationM: number;
  slopeDeg: number;
  aspectDeg: number;
  aspectCompass: string;
  distanceFromStationKm: number;
  bearingFromStationDeg: number;
  bearingCompass: string;
  isSteepSlope: boolean;
  isValleyChannel: boolean;
  zoneName?: string;
}

export interface DroneZoneInspection {
  id: string;
  name: string;
  u: number;
  v: number;
  slopeDeg: number;
  riskScore: number;
  severity: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  color: string;
  status: string;
}

export const DRONE_ZONES: DroneZoneInspection[] = [
  { id: "z1", name: "East Chhirro Drone Zone", u: 0.44, v: 0.38, slopeDeg: 38, riskScore: 78, severity: "CRITICAL", color: "#ef4444", status: "Severe Critical Risk — Threshold Exceeded" },
  { id: "z2", name: "East Fallo Drone Zone", u: 0.54, v: 0.35, slopeDeg: 42, riskScore: 84, severity: "CRITICAL", color: "#dc2626", status: "Active Slip Plane Rupture" },
  { id: "z3", name: "East Shivan Drone Zone", u: 0.49, v: 0.44, slopeDeg: 39, riskScore: 80, severity: "CRITICAL", color: "#ea580c", status: "High Pore Pressure Surge" },
  { id: "z4", name: "East Balkot Drone Zone", u: 0.60, v: 0.48, slopeDeg: 31, riskScore: 58, severity: "HIGH", color: "#f59e0b", status: "Elevated Line-of-Sight Creep" },
  { id: "z5", name: "Mandhal Drone Zone", u: 0.36, v: 0.58, slopeDeg: 23, riskScore: 34, severity: "MODERATE", color: "#22d3ee", status: "Controlled Drainage Channel" },
  { id: "z6", name: "Khedi Drone Zone", u: 0.56, v: 0.64, slopeDeg: 19, riskScore: 22, severity: "LOW", color: "#34d399", status: "Nominal Bedrock Stability" },
];

export interface TerrainDioramaOptions {
  stationId: string;
  radiusKm: number; // 5, 7, 10 km (default: 10)
  verticalExaggeration: number; // 1.0 to 2.5 (default: 1.2)
  riskLevel: RiskLevel;
  landslideRisk: number; // 0-100
  flashFloodRisk: number; // 0-100
  showSlopeRisk: boolean;
  showConcentricZones: boolean;
  showRivers: boolean;
  showLandmarks: boolean;
  showSafeRoutes?: boolean;
  showRainfallOverlay?: boolean;
  textureMode: "satellite" | "topographic" | "hypsometric";
}

/**
 * Get compass heading from degrees (0 = N, 90 = E, 180 = S, 270 = W)
 */
export function degreesToCompass(deg: number): string {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const val = Math.floor((deg / 22.5) + 0.5);
  return directions[val % 16] ?? "N";
}

/**
 * Bilinear interpolation on the authentic 15x15 elevation grid
 */
export function sampleElevationFromGrid(grid: StationElevationGrid, u: number, v: number): number {
  const size = grid.size;
  const col = Math.max(0, Math.min(size - 1, u * (size - 1)));
  const row = Math.max(0, Math.min(size - 1, v * (size - 1)));

  const c0 = Math.floor(col);
  const c1 = Math.min(size - 1, c0 + 1);
  const r0 = Math.floor(row);
  const r1 = Math.min(size - 1, r0 + 1);

  const fx = col - c0;
  const fy = row - r0;

  const h00 = grid.elevations[r0 * size + c0] ?? grid.minElev;
  const h10 = grid.elevations[r0 * size + c1] ?? grid.minElev;
  const h01 = grid.elevations[r1 * size + c0] ?? grid.minElev;
  const h11 = grid.elevations[r1 * size + c1] ?? grid.minElev;

  const top = h00 * (1 - fx) + h10 * fx;
  const bottom = h01 * (1 - fx) + h11 * fx;

  return top * (1 - fy) + bottom * fy;
}

/**
 * Generates realistic topographic procedural texture combining satellite-like mountain
 * vegetation, exposed rock ridges, scree, water bodies, and contour relief.
 */
export function generateDioramaTexture(
  grid: StationElevationGrid,
  options: TerrainDioramaOptions,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  const res = 1024;
  canvas.width = res;
  canvas.height = res;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const imgData = ctx.createImageData(res, res);
  const data = imgData.data;

  const minE = grid.minElev;
  const maxE = grid.maxElev;
  const relief = Math.max(1, maxE - minE);

  const isCritical = options.riskLevel === "CRITICAL";
  const isWatch = options.riskLevel === "WATCH" || options.riskLevel === "CRITICAL";
  const highlightHazard = options.showSlopeRisk && options.landslideRisk >= 40;

  for (let y = 0; y < res; y++) {
    const v = y / (res - 1);
    for (let x = 0; x < res; x++) {
      const u = x / (res - 1);

      // Sample elevation & compute local slope
      const elev = sampleElevationFromGrid(grid, u, v);
      const elevE = sampleElevationFromGrid(grid, Math.min(1, u + 0.015), v);
      const elevN = sampleElevationFromGrid(grid, u, Math.max(0, v - 0.015));

      const dx = (elevE - elev) / (options.radiusKm * 15);
      const dy = (elevN - elev) / (options.radiusKm * 15);
      const slopeDeg = (Math.atan(Math.sqrt(dx * dx + dy * dy)) * 180) / Math.PI;

      // Normalized height (0.0 at valley base to 1.0 at peak)
      const hNorm = Math.max(0, Math.min(1, (elev - minE) / relief));

      // Shading hillshade vector (Sun from NW: azimuth 315°, altitude 45°)
      const hillshade = Math.max(0.4, Math.min(1.2, 0.8 + (dx * -0.5 + dy * 0.5) * 0.02));

      // Base Realistic Mountain Colors:
      // Valleys: lush dark green forest (#234327)
      // Mid slopes: montane scrub / tea plantation / temperate woods (#4a6741)
      // Steep ridges & high rock: exposed metamorphic schist / granite grey-brown (#6e685f)
      // Peaks: pale rocky crest (#8c867a)
      let r = 0, g = 0, b = 0;

      if (options.textureMode === "topographic") {
        // Topographic map style (crisp cartographic relief matching Reference 1)
        if (hNorm < 0.25) {
          r = 175; g = 215; b = 165; // Lowland vibrant meadow
        } else if (hNorm < 0.6) {
          r = 210; g = 215; b = 175; // Mid elevation beige-green
        } else if (hNorm < 0.85) {
          r = 220; g = 210; b = 190; // Upper slope light buff
        } else {
          r = 240; g = 238; b = 230; // Peak pale rock
        }
      } else {
        // Photorealistic Alpine Mountain & Orthophoto Style (Matching Swiss Alps / 3d-mapper Reference)
        if (hNorm < 0.22) {
          r = 95; g = 155; b = 80; // Lush alpine valley floor & pine canopy
        } else if (hNorm < 0.48) {
          r = 125; g = 168; b = 95; // Vibrant montane meadows & terraced slopes
        } else if (hNorm < 0.72) {
          r = 155; g = 162; b = 125; // Sub-alpine treeline & granite outcrops
        } else if (hNorm < 0.88) {
          r = 178; g = 174; b = 162; // Exposed schist & jagged mountain scree
        } else {
          r = 225; g = 230; b = 235; // Summit snow & high alpine rock crest
        }
      }

      // Contour lines every ~50m relief
      const contourInterval = relief > 1500 ? 100 : 50;
      if (Math.abs(elev % contourInterval) < 3.5) {
        r = Math.floor(r * 0.88);
        g = Math.floor(g * 0.88);
        b = Math.floor(b * 0.88);
      }

      // Apply hillshade
      r = Math.min(255, Math.floor(r * hillshade));
      g = Math.min(255, Math.floor(g * hillshade));
      b = Math.min(255, Math.floor(b * hillshade));

      // HIGH-FIDELITY SLOPE THREAT HEATMAP (Clamped smoothly to mountain slope facets)
      if (highlightHazard && slopeDeg >= 24) {
        const distToCenter = Math.sqrt((u - 0.5) ** 2 + (v - 0.44) ** 2);
        if (distToCenter < 0.36) {
          // Threat blend factor
          const blend = Math.min(0.85, (slopeDeg - 23) / 16);
          if (slopeDeg >= 34 || (isCritical && slopeDeg >= 28)) {
            // Critical Slope Zone (Luminous Crimson Red)
            r = Math.floor(r * (1 - blend) + 239 * blend);
            g = Math.floor(g * (1 - blend) + 68 * blend);
            b = Math.floor(b * (1 - blend) + 68 * blend);
          } else if (slopeDeg >= 28) {
            // High Threat Slope Zone (Vibrant Flame Orange)
            r = Math.floor(r * (1 - blend) + 249 * blend);
            g = Math.floor(g * (1 - blend) + 115 * blend);
            b = Math.floor(b * (1 - blend) + 22 * blend);
          } else {
            // Moderate Watch Slope (Radiant Amber Gold)
            r = Math.floor(r * (1 - blend) + 234 * blend);
            g = Math.floor(g * (1 - blend) + 179 * blend);
            b = Math.floor(b * (1 - blend) + 8 * blend);
          }
        }
      }

      // Alpine Rivers & Water Depressions in Valleys (Shimmering Alpine Blue)
      if (options.showRivers && hNorm < 0.10 && slopeDeg < 15) {
        r = Math.floor(r * 0.25 + 38);
        g = Math.floor(g * 0.35 + 115);
        b = Math.min(255, Math.floor(b * 0.35 + 195)); // Sparkling alpine blue water
      }

      const idx = (y * res + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Concentric Analysis Rings drawn onto canvas texture (clamped to surface)
  if (options.showConcentricZones) {
    const center = res / 2;
    const maxRadiusPx = res * 0.46; // 10 km corresponds to ~46% of canvas half-width
    const scalePxPerKm = maxRadiusPx / options.radiusKm;

    ctx.lineWidth = 2.5;
    const radiiToDraw = [1, 2, 3, 5, 7, 10].filter((rKm) => rKm <= options.radiusKm);

    radiiToDraw.forEach((rKm) => {
      const radiusPx = rKm * scalePxPerKm;
      ctx.beginPath();
      ctx.arc(center, center, radiusPx, 0, Math.PI * 2);
      ctx.strokeStyle = rKm === options.radiusKm ? "rgba(239, 68, 68, 0.75)" : "rgba(34, 211, 238, 0.55)";
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Radius label
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = "bold 13px 'JetBrains Mono', sans-serif";
      ctx.fillText(`${rKm} km`, center + radiusPx - 18, center - 6);
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

/**
 * Creates rock geological strata texture for the cut-out side skirt walls
 * (directly replicating the 3d-mapper reference diorama look in Image 2!)
 */
export function generateGeologicalSkirtTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Base rock background
  ctx.fillStyle = "#2a2420";
  ctx.fillRect(0, 0, 512, 256);

  // Layered sedimentary/metamorphic bands
  const bands = [
    { y: 0, h: 40, col: "#443930" }, // Topsoil / regolith
    { y: 40, h: 65, col: "#685848" }, // Weathered sandstone
    { y: 105, h: 50, col: "#3d3630" }, // Dark shale strata
    { y: 155, h: 60, col: "#5e5246" }, // Metamorphic phyllite / schist
    { y: 215, h: 41, col: "#2a2420" }, // Basement crystalline rock
  ];

  bands.forEach((b) => {
    ctx.fillStyle = b.col;
    ctx.fillRect(0, b.y, 512, b.h);

    // Subtle grain lines
    ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
    ctx.lineWidth = 1;
    for (let gy = b.y; gy < b.y + b.h; gy += 6) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(512, gy + (Math.sin(gy) * 2));
      ctx.stroke();
    }
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 1);
  return texture;
}

/**
 * 3D SafeRoute Evacuation Corridors & Terrain Markers
 * (Matching TerraAlert Visual Implementation Blueprint 2 & 3)
 */
export function build3DSafeRouteOverlay(
  worldSize: number,
  heights2D: number[][],
  segments: number,
): THREE.Group {
  const routeGroup = new THREE.Group();
  routeGroup.name = "saferoute-3d-corridors";

  const sampleHeight = (u: number, v: number): number => {
    const c = Math.max(0, Math.min(segments, Math.round(u * segments)));
    const r = Math.max(0, Math.min(segments, Math.round(v * segments)));
    return (heights2D[r]?.[c] ?? 0) + 0.12; // Clamp right above terrain surface
  };

  // 1. Primary Route A (Low-Risk Relief Artery — Luminous Emerald Green)
  const routeAWaypointsUV: [number, number][] = [
    [0.50, 0.50],
    [0.53, 0.48],
    [0.58, 0.52],
    [0.62, 0.57],
    [0.67, 0.63],
    [0.72, 0.68],
  ];

  const pointsA: THREE.Vector3[] = routeAWaypointsUV.map(([u, v]) => {
    const x = (u - 0.5) * worldSize;
    const z = (v - 0.5) * worldSize;
    const y = sampleHeight(u, v);
    return new THREE.Vector3(x, y, z);
  });

  const curveA = new THREE.CatmullRomCurve3(pointsA);
  const tubeGeoA = new THREE.TubeGeometry(curveA, 48, 0.12, 8, false);
  const tubeMatA = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 0.9,
    roughness: 0.3,
    metalness: 0.2,
  });
  const meshA = new THREE.Mesh(tubeGeoA, tubeMatA);
  routeGroup.add(meshA);

  // 2. Alternative Route B (Moderate-Risk Bypass Artery — Luminous Amber/Orange)
  const routeBWaypointsUV: [number, number][] = [
    [0.50, 0.50],
    [0.46, 0.55],
    [0.48, 0.64],
    [0.55, 0.70],
    [0.65, 0.72],
    [0.72, 0.68],
  ];

  const pointsB: THREE.Vector3[] = routeBWaypointsUV.map(([u, v]) => {
    const x = (u - 0.5) * worldSize;
    const z = (v - 0.5) * worldSize;
    const y = sampleHeight(u, v);
    return new THREE.Vector3(x, y, z);
  });

  const curveB = new THREE.CatmullRomCurve3(pointsB);
  const tubeGeoB = new THREE.TubeGeometry(curveB, 48, 0.09, 8, false);
  const tubeMatB = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.8,
    roughness: 0.4,
    metalness: 0.2,
  });
  const meshB = new THREE.Mesh(tubeGeoB, tubeMatB);
  routeGroup.add(meshB);

  // 3. Relief Centre Destination Pin (Singtam Relief Centre)
  const destU = 0.72;
  const destV = 0.68;
  const destX = (destU - 0.5) * worldSize;
  const destZ = (destV - 0.5) * worldSize;
  const destY = sampleHeight(destU, destV);

  const shelterPin = new THREE.Group();
  shelterPin.position.set(destX, destY, destZ);

  // Beacon Pole
  const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8);
  poleGeo.translate(0, 0.4, 0);
  const poleMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
  shelterPin.add(new THREE.Mesh(poleGeo, poleMat));

  // Glowing Shelter Beacon Head
  const beaconHeadGeo = new THREE.SphereGeometry(0.22, 16, 16);
  beaconHeadGeo.translate(0, 0.9, 0);
  const beaconHeadMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x059669,
    emissiveIntensity: 1.2,
  });
  shelterPin.add(new THREE.Mesh(beaconHeadGeo, beaconHeadMat));

  // Ground Target Ring
  const targetRingGeo = new THREE.RingGeometry(0.3, 0.55, 32);
  targetRingGeo.rotateX(-Math.PI / 2);
  targetRingGeo.translate(0, 0.04, 0);
  const targetRingMat = new THREE.MeshBasicMaterial({
    color: 0x34d399,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
  });
  shelterPin.add(new THREE.Mesh(targetRingGeo, targetRingMat));

  routeGroup.add(shelterPin);

  // 4. Safe High Ground Marker (Elev: 2,840 m)
  const highU = 0.64;
  const highV = 0.32;
  const highX = (highU - 0.5) * worldSize;
  const highZ = (highV - 0.5) * worldSize;
  const highY = sampleHeight(highU, highV);

  const highPin = new THREE.Group();
  highPin.position.set(highX, highY, highZ);

  const highHeadGeo = new THREE.ConeGeometry(0.25, 0.6, 6);
  highHeadGeo.rotateX(Math.PI);
  highHeadGeo.translate(0, 0.5, 0);
  const highHeadMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x0891b2,
    emissiveIntensity: 1.0,
  });
  highPin.add(new THREE.Mesh(highHeadGeo, highHeadMat));

  const highRingGeo = new THREE.RingGeometry(0.25, 0.45, 24);
  highRingGeo.rotateX(-Math.PI / 2);
  highRingGeo.translate(0, 0.04, 0);
  const highRingMat = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
  });
  highPin.add(new THREE.Mesh(highRingGeo, highRingMat));

  routeGroup.add(highPin);

  return routeGroup;
}

/**
 * Master Diorama Mesh Constructor: Builds the complete 3D Diorama block
 */
export function buildMountainDioramaGroup(
  grid: StationElevationGrid,
  options: TerrainDioramaOptions,
): {
  group: THREE.Group;
  terrainMesh: THREE.Mesh;
  inspectPointAt: (uv: THREE.Vector2) => TerrainPointInspection;
} {
  const group = new THREE.Group();

  const worldSize = 24.0; // World units for 3D viewport
  const segments = 96; // High resolution for smooth, realistic mountain relief

  const minE = grid.minElev;
  const maxE = grid.maxElev;
  const reliefM = Math.max(1, maxE - minE);

  // Scale height into world units
  // E.g., 2000m relief scaled to ~5.0 world units with vertical exaggeration
  const heightScale = (5.5 / reliefM) * options.verticalExaggeration;
  const baseLevelY = -0.8; // Pedestal skirt base height

  // 1. Top Mountain Surface Geometry
  const topGeo = new THREE.PlaneGeometry(worldSize, worldSize, segments, segments);
  topGeo.rotateX(-Math.PI / 2);

  const posAttr = topGeo.attributes.position;
  const heights2D: number[][] = [];

  for (let r = 0; r <= segments; r++) {
    heights2D[r] = [];
    const v = r / segments;
    for (let c = 0; c <= segments; c++) {
      const u = c / segments;
      const elev = sampleElevationFromGrid(grid, u, v);
      const worldY = (elev - minE) * heightScale;
      heights2D[r][c] = worldY;

      const idx = r * (segments + 1) + c;
      posAttr.setY(idx, worldY);
    }
  }

  topGeo.computeVertexNormals();

  // Draped Top Texture
  const surfaceTexture = generateDioramaTexture(grid, options);
  const topMat = new THREE.MeshStandardMaterial({
    map: surfaceTexture,
    roughness: 0.85,
    metalness: 0.05,
    flatShading: false,
  });

  const terrainMesh = new THREE.Mesh(topGeo, topMat);
  terrainMesh.castShadow = true;
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // 2. Cut-Out Geological Base Skirts (4 Vertical Walls)
  const skirtMat = new THREE.MeshStandardMaterial({
    map: generateGeologicalSkirtTexture(),
    roughness: 0.9,
    metalness: 0.1,
  });

  const skirtGeo = new THREE.BufferGeometry();
  const skirtVertices: number[] = [];
  const skirtUvs: number[] = [];

  const half = worldSize / 2;

  // Helper to append a vertical quad along the perimeter
  function addSkirtQuad(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    u1: number, u2: number,
  ) {
    // Triangle 1
    skirtVertices.push(x1, y1, z1, x1, baseLevelY, z1, x2, y2, z2);
    skirtUvs.push(u1, 1, u1, 0, u2, 1);

    // Triangle 2
    skirtVertices.push(x2, y2, z2, x1, baseLevelY, z1, x2, baseLevelY, z2);
    skirtUvs.push(u2, 1, u1, 0, u2, 0);
  }

  // North edge (z = -half, x from -half to +half)
  for (let c = 0; c < segments; c++) {
    const x1 = -half + (c / segments) * worldSize;
    const x2 = -half + ((c + 1) / segments) * worldSize;
    const y1 = heights2D[0][c];
    const y2 = heights2D[0][c + 1];
    addSkirtQuad(x1, y1, -half, x2, y2, -half, c / segments, (c + 1) / segments);
  }

  // South edge (z = +half, x from +half to -half)
  for (let c = segments; c > 0; c--) {
    const x1 = -half + (c / segments) * worldSize;
    const x2 = -half + ((c - 1) / segments) * worldSize;
    const y1 = heights2D[segments][c];
    const y2 = heights2D[segments][c - 1];
    addSkirtQuad(x1, y1, half, x2, y2, half, c / segments, (c - 1) / segments);
  }

  // West edge (x = -half, z from +half to -half)
  for (let r = segments; r > 0; r--) {
    const z1 = -half + (r / segments) * worldSize;
    const z2 = -half + ((r - 1) / segments) * worldSize;
    const y1 = heights2D[r][0];
    const y2 = heights2D[r - 1][0];
    addSkirtQuad(-half, y1, z1, -half, y2, z2, r / segments, (r - 1) / segments);
  }

  // East edge (x = +half, z from -half to +half)
  for (let r = 0; r < segments; r++) {
    const z1 = -half + (r / segments) * worldSize;
    const z2 = -half + ((r + 1) / segments) * worldSize;
    const y1 = heights2D[r][segments];
    const y2 = heights2D[r + 1][segments];
    addSkirtQuad(half, y1, z1, half, y2, z2, r / segments, (r + 1) / segments);
  }

  skirtGeo.setAttribute("position", new THREE.Float32BufferAttribute(skirtVertices, 3));
  skirtGeo.setAttribute("uv", new THREE.Float32BufferAttribute(skirtUvs, 2));
  skirtGeo.computeVertexNormals();

  const skirtMesh = new THREE.Mesh(skirtGeo, skirtMat);
  skirtMesh.receiveShadow = true;
  group.add(skirtMesh);

  // Bottom Base Plate
  const bottomGeo = new THREE.PlaneGeometry(worldSize, worldSize);
  bottomGeo.rotateX(Math.PI / 2);
  bottomGeo.translate(0, baseLevelY, 0);
  const bottomMat = new THREE.MeshBasicMaterial({ color: 0x121216 });
  const bottomMesh = new THREE.Mesh(bottomGeo, bottomMat);
  group.add(bottomMesh);

  // 3. Station Beacon 3D Pin (placed at exact center u=0.5, v=0.5)
  const stationCenterY = heights2D[Math.floor(segments / 2)][Math.floor(segments / 2)];

  const pinGroup = new THREE.Group();
  pinGroup.position.set(0, stationCenterY, 0);

  // Vertical staff
  const staffGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.4, 12);
  staffGeo.translate(0, 0.7, 0);
  const staffMat = new THREE.MeshBasicMaterial({ color: 0xf4f4fb });
  const staffMesh = new THREE.Mesh(staffGeo, staffMat);
  pinGroup.add(staffMesh);

  // Glowing sphere beacon
  const beaconColor =
    options.riskLevel === "CRITICAL" ? 0xf0657a : options.riskLevel === "WATCH" ? 0xf5a524 : 0x34d399;
  const beaconGeo = new THREE.SphereGeometry(0.32, 16, 16);
  beaconGeo.translate(0, 1.5, 0);
  const beaconMat = new THREE.MeshStandardMaterial({
    color: beaconColor,
    emissive: beaconColor,
    emissiveIntensity: 0.85,
    roughness: 0.2,
  });
  const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
  pinGroup.add(beaconMesh);

  // Pulsing alert ring on the ground
  const ringGeo = new THREE.RingGeometry(0.5, 0.75, 32);
  ringGeo.rotateX(-Math.PI / 2);
  ringGeo.translate(0, 0.05, 0);
  const ringMat = new THREE.MeshBasicMaterial({
    color: beaconColor,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  pinGroup.add(ringMesh);

  group.add(pinGroup);

  // 3B. DRONE ZONE INSPECTION PINS (Matching Reference Images 1 & 2)
  DRONE_ZONES.forEach((zone) => {
    const colIdx = Math.max(0, Math.min(segments, Math.round(zone.u * segments)));
    const rowIdx = Math.max(0, Math.min(segments, Math.round(zone.v * segments)));
    const surfaceY = heights2D[rowIdx]?.[colIdx] ?? stationCenterY;

    const zPin = new THREE.Group();
    const posX = (zone.u - 0.5) * worldSize;
    const posZ = (zone.v - 0.5) * worldSize;
    zPin.position.set(posX, surfaceY, posZ);

    const zStaffGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8);
    zStaffGeo.translate(0, 0.25, 0);
    const zStaffMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    zPin.add(new THREE.Mesh(zStaffGeo, zStaffMat));

    const zColor = new THREE.Color(zone.color);
    const zHeadGeo = new THREE.SphereGeometry(0.12, 12, 12);
    zHeadGeo.translate(0, 0.55, 0);
    const zHeadMat = new THREE.MeshStandardMaterial({
      color: zColor,
      emissive: zColor,
      emissiveIntensity: 0.9,
    });
    zPin.add(new THREE.Mesh(zHeadGeo, zHeadMat));

    const zRingGeo = new THREE.RingGeometry(0.18, 0.32, 16);
    zRingGeo.rotateX(-Math.PI / 2);
    zRingGeo.translate(0, 0.05, 0);
    const zRingMat = new THREE.MeshBasicMaterial({
      color: zColor,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    zPin.add(new THREE.Mesh(zRingGeo, zRingMat));

    group.add(zPin);
  });

  // 3C. 3D SAFEROUTE EVACUATION CORRIDORS & RELIEF MARKERS (Blueprint 2 & 3)
  if (options.showSafeRoutes !== false) {
    const routeOverlay = build3DSafeRouteOverlay(worldSize, heights2D, segments);
    group.add(routeOverlay);
  }

  // 4. Click Inspector Point Resolver
  const inspectPointAt = (uv: THREE.Vector2): TerrainPointInspection => {
    const u = Math.max(0, Math.min(1, uv.x));
    const v = Math.max(0, Math.min(1, uv.y));

    // Convert UV to geographic offset from center station
    const degSpan = options.radiusKm / 111.32;
    const lon = grid.lon - degSpan + u * (2 * degSpan);
    const lat = grid.lat + degSpan - v * (2 * degSpan); // v=0 is North

    // Compute elevation and local slope
    const elevationM = Math.round(sampleElevationFromGrid(grid, u, v));
    const deltaU = 0.01;
    const deltaV = 0.01;
    const eRight = sampleElevationFromGrid(grid, Math.min(1, u + deltaU), v);
    const eDown = sampleElevationFromGrid(grid, u, Math.min(1, v + deltaV));

    const distStepM = (options.radiusKm * 2000) * deltaU;
    const dzX = eRight - elevationM;
    const dzY = eDown - elevationM;

    const slopeRad = Math.atan(Math.sqrt(dzX * dzX + dzY * dzY) / distStepM);
    const slopeDeg = Math.round((slopeRad * 180) / Math.PI);

    let aspectDeg = Math.round((Math.atan2(dzY, -dzX) * 180) / Math.PI + 180);
    if (aspectDeg >= 360) aspectDeg -= 360;

    // Distance and bearing from station
    const dXKm = (u - 0.5) * 2 * options.radiusKm;
    const dYKm = (0.5 - v) * 2 * options.radiusKm;
    const distanceFromStationKm = Math.round(Math.sqrt(dXKm * dXKm + dYKm * dYKm) * 10) / 10;

    let bearingDeg = Math.round((Math.atan2(dXKm, dYKm) * 180) / Math.PI);
    if (bearingDeg < 0) bearingDeg += 360;

    const hNorm = (elevationM - minE) / reliefM;

    return {
      lat: Number(lat.toFixed(4)),
      lon: Number(lon.toFixed(4)),
      elevationM,
      slopeDeg,
      aspectDeg,
      aspectCompass: degreesToCompass(aspectDeg),
      distanceFromStationKm,
      bearingFromStationDeg: bearingDeg,
      bearingCompass: degreesToCompass(bearingDeg),
      isSteepSlope: slopeDeg >= 26,
      isValleyChannel: hNorm < 0.12 && slopeDeg < 15,
    };
  };

  return { group, terrainMesh, inspectPointAt };
}

