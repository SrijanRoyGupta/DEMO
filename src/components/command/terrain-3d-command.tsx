import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  BarChart2,
  BarChart3,
  Bell,
  Camera,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Compass,
  Crosshair,
  Database,
  Eye,
  Flame,
  Globe2,
  HardHat,
  Info,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingUp,
  Waves,
  Wind,
  X,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateRisk, riskColor } from "@/lib/risk";
import { STATIONS } from "@/lib/stations";
import type { RadarFrame, StationLive } from "@/lib/types";
import { cn, formatIstClock, formatIstTime } from "@/lib/utils";
import { useCommand } from "@/store/command";
import {
  VERIFIED_INFRASTRUCTURE_ASSETS,
  assessInfrastructureExposure,
  calculatePopulationExposure,
} from "@/lib/exposure-intelligence";
import {
  VERIFIED_RELIEF_SHELTERS,
  VERIFIED_EVACUATION_ROUTES,
  discoverNearbyShelters,
  getEvacuationRoutesForStation,
} from "@/lib/shelter-routing";
import {
  evaluateWhatIfScenario,
  type ScenarioParameters,
  type ScenarioEvaluationResult,
} from "@/lib/scenario-engine";
import {
  STATION_ELEVATION_GRIDS,
  type StationElevationGrid,
} from "@/lib/station-elevation-data";
import {
  buildMountainDioramaGroup,
  type TerrainPointInspection,
  type TerrainDioramaOptions,
  DRONE_ZONES,
  type DroneZoneInspection,
} from "@/lib/terrain-diorama-builder";

type Props = {
  stations: StationLive[];
  activeStation: StationLive;
  onSelectStation: (id: string) => void;
  radarFrame: RadarFrame | null;
  radarLabel: string;
  simMode: boolean;
  onSimulate: () => void;
  onReset: () => void;
  onSlider: (field: "rain" | "moist" | "tilt", value: number) => void;
};

export function Terrain3DCommand({
  stations,
  activeStation,
  onSelectStation,
  radarFrame,
  radarLabel,
  simMode,
  onSimulate,
  onReset,
  onSlider,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const dioramaGroupRef = useRef<THREE.Group | null>(null);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const inspectFnRef = useRef<((uv: THREE.Vector2) => TerrainPointInspection) | null>(null);

  // Status & Viewport State
  const [loading, setLoading] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number>(10); // 5, 7, 10 km (Default: 10 km)
  const [verticalExaggeration, setVerticalExaggeration] = useState<number>(1.2);
  const [textureMode, setTextureMode] = useState<"satellite" | "topographic">("satellite");

  // Layer Visibility
  const [showSlopeRisk, setShowSlopeRisk] = useState(true);
  const [showConcentricZones, setShowConcentricZones] = useState(true);
  const [showRivers, setShowRivers] = useState(true);
  const [showInfrastructure, setShowInfrastructure] = useState(true);
  const [showEvacRoutes, setShowEvacRoutes] = useState(true);

  // UI Panels State (Clean, uncluttered map-first defaults)
  const [showInspectorDrawer, setShowInspectorDrawer] = useState(false);
  const [showControlsDrawer, setShowControlsDrawer] = useState(false);
  const [showOverlays, setShowOverlays] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [showSafeRoutePanel, setShowSafeRoutePanel] = useState(false);
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<"telemetry" | "exposure" | "whatif">("telemetry");

  // Blueprint Layer Toggles
  const [layerTerrain3D, setLayerTerrain3D] = useState(true);
  const [layerLandslide, setLayerLandslide] = useState(true);
  const [layerFlashFlood, setLayerFlashFlood] = useState(true);
  const [layerRainfall, setLayerRainfall] = useState(true);
  const [layerSoilMoisture, setLayerSoilMoisture] = useState(true);
  const [layerInfrastructure, setLayerInfrastructure] = useState(true);
  const [layerWaterBodies, setLayerWaterBodies] = useState(true);
  const [layerSafeRoutes, setLayerSafeRoutes] = useState(true);

  // Blueprint Timeline Scrubber State
  const [activeScrubberHour, setActiveScrubberHour] = useState<string>("Now");
  const [simRunning, setSimRunning] = useState(false);

  // Station Selector Dropdown State
  const [showStationDropdown, setShowStationDropdown] = useState(false);
  const [stationSearch, setStationSearch] = useState("");

  // Drone Zone & Bottom Analytics State (Matching Sovereign Command References)
  const [selectedDroneZone, setSelectedDroneZone] = useState<DroneZoneInspection>(DRONE_ZONES[0]);
  const [showZoneDropdown, setShowZoneDropdown] = useState(false);
  const [showBottomAnalytics, setShowBottomAnalytics] = useState(false);

  // Timeline Scrubber Auto-Advancement when Simulation is Running
  useEffect(() => {
    if (!simRunning) return;
    const hours = ["Now", "+1h", "+2h", "+3h", "+4h", "+5h", "+6h"];
    const timer = setInterval(() => {
      setActiveScrubberHour((current) => {
        const idx = hours.indexOf(current);
        const nextIdx = (idx + 1) % hours.length;
        return hours[nextIdx];
      });
    }, 1400);
    return () => clearInterval(timer);
  }, [simRunning]);

  const currentStationIndex = useMemo(() => {
    return STATIONS.findIndex((s) => s.id === activeStation.id);
  }, [activeStation.id]);

  const handlePrevStation = useCallback(() => {
    const idx = (currentStationIndex - 1 + STATIONS.length) % STATIONS.length;
    onSelectStation(STATIONS[idx].id);
  }, [currentStationIndex, onSelectStation]);

  const handleNextStation = useCallback(() => {
    const idx = (currentStationIndex + 1) % STATIONS.length;
    onSelectStation(STATIONS[idx].id);
  }, [currentStationIndex, onSelectStation]);

  const handleSelectZone = useCallback((zone: DroneZoneInspection) => {
    setSelectedDroneZone(zone);
    setShowZoneDropdown(false);
    const degSpan = radiusKm / 111.32;
    const lon = activeStation.lon - degSpan + zone.u * (2 * degSpan);
    const lat = activeStation.lat + degSpan - zone.v * (2 * degSpan);
    setInspectedPoint({
      lat: Number(lat.toFixed(4)),
      lon: Number(lon.toFixed(4)),
      elevationM: activeStation.elevationDem || 1850,
      slopeDeg: zone.slopeDeg,
      aspectDeg: activeStation.aspectDeg || 140,
      aspectCompass: "SE",
      distanceFromStationKm: Math.round(Math.sqrt(((zone.u - 0.5) * 2 * radiusKm) ** 2 + ((0.5 - zone.v) * 2 * radiusKm) ** 2) * 10) / 10,
      bearingFromStationDeg: 45,
      bearingCompass: "NE",
      isSteepSlope: zone.slopeDeg >= 26,
      isValleyChannel: false,
      zoneName: zone.name,
    });
  }, [activeStation, radiusKm]);

  // What-If Simulation Sliders
  const [simDeltaRain, setSimDeltaRain] = useState(25);
  const [simSoilMoist, setSimSoilMoist] = useState(90);
  const [simTiltDelta, setSimTiltDelta] = useState(0.2);

  const setTab = useCommand((s) => s.setTab);
  const setActiveId = useCommand((s) => s.setActiveId);

  // Active Station Calculations
  const riskResult = useMemo(() => calculateRisk(activeStation), [activeStation]);

  // Click Inspected Point
  const [inspectedPoint, setInspectedPoint] = useState<TerrainPointInspection | null>(() => ({
    lat: activeStation.lat,
    lon: activeStation.lon,
    elevationM: activeStation.elevationDem || 1650,
    slopeDeg: activeStation.slopeDeg || 38,
    aspectDeg: activeStation.aspectDeg || 140,
    aspectCompass: "SE",
    distanceFromStationKm: 0,
    bearingFromStationDeg: 0,
    bearingCompass: "N",
    isSteepSlope: activeStation.slopeDeg >= 28,
    isValleyChannel: false,
  }));

  // Scenario Simulation Evaluation
  const scenarioResult: ScenarioEvaluationResult = useMemo(() => {
    return evaluateWhatIfScenario(activeStation, {
      scenarioId: "scen-interactive",
      name: "Interactive Cloudburst Stress",
      description: "User parameter stress test",
      targetStationId: activeStation.id,
      additionalRainIntensityMmH: simDeltaRain,
      simulated24hAccumMm: activeStation.rain24h + simDeltaRain * 2,
      simulatedSoilMoistPct: simSoilMoist,
      simulatedTiltDeltaDeg: simTiltDelta,
      durationHours: 3,
      createdAt: new Date().toISOString(),
    });
  }, [activeStation, simDeltaRain, simSoilMoist, simTiltDelta]);

  // Exposure Assets & Demographics
  const nearbyExposure = useMemo(() => {
    return assessInfrastructureExposure(activeStation.lat, activeStation.lon, radiusKm);
  }, [activeStation, radiusKm]);

  const popExposure = useMemo(() => {
    return calculatePopulationExposure(activeStation.id, riskResult.total);
  }, [activeStation, riskResult.total]);

  const nearbyShelters = useMemo(() => {
    return discoverNearbyShelters(activeStation.id, activeStation.lat, activeStation.lon);
  }, [activeStation]);

  const nearbyRoutes = useMemo(() => {
    return getEvacuationRoutesForStation(activeStation.id);
  }, [activeStation]);

  // Initialize Three.js WebGL Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene & Lighting Setup (Alpine Atmospheric Environment)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a101f);
    scene.fog = new THREE.FogExp2(0x0a101f, 0.012);
    sceneRef.current = scene;

    // 2. Camera Setup (Oblique 3D Perspective)
    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 18, 28);
    cameraRef.current = camera;

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls Setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 6;
    controls.maxDistance = 65;
    controls.maxPolarAngle = Math.PI * 0.48; // Prevent going beneath ground plane
    controls.target.set(0, 2.5, 0);
    controlsRef.current = controls;

    // 5. Lighting: High-Contrast Alpine Solar Shading
    // Sky downwelling & ground bounce
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 0.85);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.8);
    sunLight.position.set(-25, 42, -25);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 90;
    sunLight.shadow.camera.left = -22;
    sunLight.shadow.camera.right = 22;
    sunLight.shadow.camera.top = 22;
    sunLight.shadow.camera.bottom = -22;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.45);
    fillLight.position.set(20, 18, 20);
    scene.add(fillLight);

    // 6. Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 7. Resize Observer
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Build / Update Mountain Diorama when station, radius, exaggeration, or risk changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove existing diorama
    if (dioramaGroupRef.current) {
      scene.remove(dioramaGroupRef.current);
      dioramaGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      dioramaGroupRef.current = null;
    }

    setLoading(true);

    // Get authentic DEM elevation grid for active station
    const grid: StationElevationGrid =
      STATION_ELEVATION_GRIDS[activeStation.id] ??
      STATION_ELEVATION_GRIDS.st4 ?? // Gangtok default
      {
        id: activeStation.id,
        name: activeStation.name,
        lat: activeStation.lat,
        lon: activeStation.lon,
        size: 15,
        radiusKm: 10,
        minElev: 800,
        maxElev: 2400,
        elevations: new Array(225).fill(1600),
      };

    const dioramaOptions: TerrainDioramaOptions = {
      stationId: activeStation.id,
      radiusKm,
      verticalExaggeration: layerTerrain3D ? verticalExaggeration : 0.08,
      riskLevel: riskResult.level,
      landslideRisk: riskResult.landslideRisk,
      flashFloodRisk: riskResult.flashFloodRisk,
      showSlopeRisk: layerLandslide,
      showConcentricZones,
      showRivers: layerWaterBodies,
      showLandmarks: layerInfrastructure,
      textureMode,
      showSafeRoutes: layerSafeRoutes,
    };

    const { group, terrainMesh, inspectPointAt } = buildMountainDioramaGroup(grid, dioramaOptions);
    scene.add(group);

    dioramaGroupRef.current = group;
    terrainMeshRef.current = terrainMesh;
    inspectFnRef.current = inspectPointAt;

    // Reset default inspection point to station center
    setInspectedPoint({
      lat: activeStation.lat,
      lon: activeStation.lon,
      elevationM: activeStation.elevationDem || Math.round((grid.minElev + grid.maxElev) / 2),
      slopeDeg: activeStation.slopeDeg || 36,
      aspectDeg: activeStation.aspectDeg || 140,
      aspectCompass: "SE",
      distanceFromStationKm: 0,
      bearingFromStationDeg: 0,
      bearingCompass: "N",
      isSteepSlope: activeStation.slopeDeg >= 26,
      isValleyChannel: false,
    });

    setLoading(false);
  }, [
    activeStation.id,
    radiusKm,
    verticalExaggeration,
    riskResult.level,
    riskResult.landslideRisk,
    riskResult.flashFloodRisk,
    showSlopeRisk,
    showConcentricZones,
    showRivers,
    textureMode,
    layerTerrain3D,
    layerLandslide,
    layerWaterBodies,
    layerInfrastructure,
    layerSafeRoutes,
  ]);

  // Click on Terrain Mesh -> Raycast to inspect exact coordinates
  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current || !terrainMeshRef.current || !inspectFnRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const intersects = raycaster.intersectObject(terrainMeshRef.current, false);
    if (intersects.length > 0 && intersects[0].uv) {
      const inspected = inspectFnRef.current(intersects[0].uv);
      setInspectedPoint(inspected);
      setShowInspectorDrawer(true);
    }
  }, []);

  // Camera Presets
  const setCameraView = (mode: "overview" | "steep" | "valley" | "top") => {
    if (!controlsRef.current || !cameraRef.current) return;
    const controls = controlsRef.current;
    const camera = cameraRef.current;

    if (mode === "overview") {
      camera.position.set(0, 18, 28);
      controls.target.set(0, 2.5, 0);
    } else if (mode === "steep") {
      camera.position.set(-20, 8, 16);
      controls.target.set(0, 3, 0);
    } else if (mode === "valley") {
      camera.position.set(0, 5, 24);
      controls.target.set(0, 1.5, -4);
    } else if (mode === "top") {
      camera.position.set(0, 36, 0.1);
      controls.target.set(0, 0, 0);
    }
    controls.update();
  };

  return (
    <div className="relative h-[calc(100vh-105px)] w-full overflow-hidden bg-[#07070d]">
      {/* 1. Main 3D WebGL Canvas Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        className="h-full w-full cursor-grab active:cursor-grabbing"
      />

      {/* 2. Unified Responsive Command Bar (Left: Station & Radius & Mode, Right: Toggles) */}
      <div className="absolute left-3 right-3 top-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left Section: Station Switcher & Analysis Radius & Mode */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          {/* Station Switcher with Dropdown Popover */}
          <div className="relative">
            <div className="flex items-center rounded-2xl border border-white/15 bg-[#07070d]/90 p-1 shadow-2xl backdrop-blur-xl">
              <button
                type="button"
                onClick={handlePrevStation}
                title="Previous Station"
                className="flex size-7 items-center justify-center rounded-xl text-[#9a9aab] hover:bg-white/10 hover:text-white transition-colors"
              >
                <ChevronLeft className="size-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowStationDropdown(!showStationDropdown)}
                className="flex max-w-[210px] sm:max-w-xs items-center gap-2 rounded-xl px-2.5 py-1 font-sans text-xs font-bold text-white hover:bg-white/10 transition-all"
              >
                <MapPin className="size-3.5 text-[#22d3ee] shrink-0" />
                <span className="font-serif text-sm tracking-wide truncate">{activeStation.name}</span>
                <span className="hidden sm:inline-block rounded bg-white/10 px-1.5 py-0.5 font-mono text-[9px] text-[#9a9aab] shrink-0">
                  {activeStation.state} · {activeStation.elevationDem}m
                </span>
                <span
                  className="size-2 rounded-full shrink-0 shadow-sm"
                  style={{
                    backgroundColor:
                      riskResult.level === "CRITICAL"
                        ? "#ff453a"
                        : riskResult.level === "WATCH"
                          ? "#f5a524"
                          : "#34d399",
                  }}
                />
                <ChevronDown className={cn("size-3.5 text-[#9a9aab] shrink-0 transition-transform", showStationDropdown && "rotate-180")} />
              </button>

              <button
                type="button"
                onClick={handleNextStation}
                title="Next Station"
                className="flex size-7 items-center justify-center rounded-xl text-[#9a9aab] hover:bg-white/10 hover:text-white transition-colors"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {/* Dropdown Menu */}
            {showStationDropdown && (
              <div className="absolute left-0 top-full mt-2 z-50 w-80 rounded-2xl border border-white/15 bg-[#0e0e13]/95 p-3 shadow-2xl backdrop-blur-2xl">
                <div className="mb-2 flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5">
                  <Search className="size-3.5 text-[#9a9aab]" />
                  <input
                    type="text"
                    value={stationSearch}
                    onChange={(e) => setStationSearch(e.target.value)}
                    placeholder="Search 12 strategic mountain stations..."
                    className="w-full bg-transparent font-sans text-xs text-white placeholder:text-[#6e6e7c] focus:outline-none"
                    autoFocus
                  />
                  {stationSearch && (
                    <button type="button" onClick={() => setStationSearch("")} className="text-[#9a9aab] hover:text-white">
                      <X className="size-3" />
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1 pr-1 font-mono text-xs">
                  {stations.filter(
                    (s) =>
                      s.name.toLowerCase().includes(stationSearch.toLowerCase()) ||
                      s.state.toLowerCase().includes(stationSearch.toLowerCase())
                  ).map((st) => {
                    const isSelected = st.id === activeStation.id;
                    const r = calculateRisk(st);
                    const c = riskColor(r.total);
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          onSelectStation(st.id);
                          setShowStationDropdown(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-left transition-colors",
                          isSelected
                            ? "bg-[#7c5cff]/20 border border-[#7c5cff]/40 text-white"
                            : "hover:bg-white/5 text-[#c9c9d3]"
                        )}
                      >
                        <div>
                          <div className="font-serif font-semibold text-white text-xs">{st.name}</div>
                          <div className="text-[10px] text-[#9a9aab]">{st.state} · DEM {st.elevationDem}m</div>
                        </div>
                        <div className="flex items-center gap-1.5 font-bold tabular-nums" style={{ color: c }}>
                          <span>{r.total}</span>
                          <span className="size-1.5 rounded-full" style={{ backgroundColor: c }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Local Analysis Radius Chips (5 km, 7 km, 10 km default) */}
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#121216]/90 p-1 font-mono text-xs backdrop-blur-md">
            <span className="px-2 text-[10px] text-[#9a9aab]">RADIUS:</span>
            {[5, 7, 10].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRadiusKm(r)}
                className={cn(
                  "rounded-lg px-2.5 py-0.5 text-[11px] font-bold transition",
                  radiusKm === r
                    ? "bg-[#22d3ee] text-[#07070d]"
                    : "text-[#c9c9d3] hover:text-white",
                )}
              >
                {r} km{r === 10 ? " (Default)" : ""}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#121216]/90 p-1 font-mono text-xs backdrop-blur-md">
            <button
              type="button"
              onClick={() => setTextureMode(textureMode === "satellite" ? "topographic" : "satellite")}
              className="rounded-lg px-2.5 py-0.5 text-[11px] font-bold text-[#c9c9d3] hover:text-white"
            >
              Mode: {textureMode === "satellite" ? "🛰️ Ortho Satellite" : "🗺️ Topographic"}
            </button>
          </div>
        </div>

        {/* Right Section: Compact Action Controls */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCameraView("overview")}
            className="rounded-xl border-white/10 bg-[#121216]/90 px-2.5 py-1 text-xs font-bold text-[#f4f4fb] shadow-lg backdrop-blur-md hover:bg-white/10"
          >
            <RotateCcw className="mr-1 size-3.5" />
            <span className="hidden sm:inline">Reset View</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLayersPanel(!showLayersPanel)}
            className={cn(
              "rounded-xl border-white/10 bg-[#121216]/90 px-2.5 py-1 text-xs font-bold shadow-lg backdrop-blur-md",
              showLayersPanel ? "text-[#7c5cff] border-[#7c5cff]/40" : "text-[#f4f4fb]",
            )}
          >
            <Layers className="mr-1 size-3.5" />
            <span>Layers</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSafeRoutePanel(!showSafeRoutePanel)}
            className={cn(
              "rounded-xl border-white/10 bg-[#121216]/90 px-2.5 py-1 text-xs font-bold shadow-lg backdrop-blur-md",
              showSafeRoutePanel ? "text-[#10b981] border-[#10b981]/40" : "text-[#f4f4fb]",
            )}
          >
            <Navigation className="mr-1 size-3.5" />
            <span>SafeRoute</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBottomAnalytics(!showBottomAnalytics)}
            className={cn(
              "rounded-xl border-white/10 bg-[#121216]/90 px-2.5 py-1 text-xs font-bold shadow-lg backdrop-blur-md",
              showBottomAnalytics ? "text-[#34d399] border-[#34d399]/40" : "text-[#f4f4fb]",
            )}
          >
            <BarChart2 className="mr-1 size-3.5" />
            <span className="hidden sm:inline">Analytics</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInspectorDrawer(!showInspectorDrawer)}
            className={cn(
              "rounded-xl border-white/10 bg-[#121216]/90 px-2.5 py-1 text-xs font-bold shadow-lg backdrop-blur-md",
              showInspectorDrawer ? "text-[#22d3ee] border-[#22d3ee]/40" : "text-[#f4f4fb]",
            )}
          >
            <Eye className="mr-1 size-3.5" />
            <span>Inspector</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOverlays(!showOverlays)}
            className={cn(
              "rounded-xl border-white/10 bg-[#121216]/90 px-2.5 py-1 text-xs font-bold shadow-lg backdrop-blur-md",
              !showOverlays ? "text-[#f5a524] border-[#f5a524]/40" : "text-[#f4f4fb]",
            )}
          >
            {showOverlays ? <Minimize2 className="mr-1 size-3.5" /> : <Maximize2 className="mr-1 size-3.5" />}
            <span>{showOverlays ? "Full 3D" : "Overlays"}</span>
          </Button>
        </div>
      </div>

      {/* 3B. LEFT OVERLAY: LAYERS & ANALYSIS (Blueprint Page 2 & 3) */}
      {showOverlays && showLayersPanel && (
        <div className="absolute left-4 top-16 z-30 w-72 rounded-2xl border border-white/15 bg-[#090b14]/90 p-4 backdrop-blur-xl shadow-2xl">
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-[#7c5cff]" />
              <span className="font-sans text-xs font-bold uppercase tracking-wider text-white">
                Layers & Analysis
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowLayersPanel(false)}
              className="text-[#8e8e9c] hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {[
              { label: "Terrain (3D)", state: layerTerrain3D, set: setLayerTerrain3D, color: "#f59e0b" },
              { label: "Landslide Susceptibility", state: layerLandslide, set: setLayerLandslide, color: "#ef4444" },
              { label: "Flash Flood Risk", state: layerFlashFlood, set: setLayerFlashFlood, color: "#06b6d4" },
              { label: "Rainfall Intensity", state: layerRainfall, set: setLayerRainfall, color: "#3b82f6" },
              { label: "Soil Moisture", state: layerSoilMoisture, set: setLayerSoilMoisture, color: "#14b8a6" },
              { label: "Infrastructure", state: layerInfrastructure, set: setLayerInfrastructure, color: "#a855f7" },
              { label: "Water Bodies", state: layerWaterBodies, set: setLayerWaterBodies, color: "#0ea5e9" },
              { label: "Safe Routes", state: layerSafeRoutes, set: setLayerSafeRoutes, color: "#10b981" },
            ].map((layer) => (
              <label
                key={layer.label}
                className="flex cursor-pointer items-center justify-between rounded-xl px-2 py-1.5 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: layer.color }} />
                  <span className="text-white font-medium">{layer.label}</span>
                </div>
                <input
                  type="checkbox"
                  checked={layer.state}
                  onChange={(e) => layer.set(e.target.checked)}
                  className="rounded border-white/20 accent-[#7c5cff]"
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 3C. RIGHT OVERLAY: SAFEROUTE PLANNER [ACTIVE] (Blueprint Page 2 & 3) */}
      {showOverlays && showSafeRoutePanel && (
        <div className="absolute right-4 top-16 z-30 w-80 rounded-2xl border border-white/15 bg-[#090b14]/92 p-4 backdrop-blur-xl shadow-2xl">
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <Navigation className="size-4 text-[#10b981]" />
              <span className="font-sans text-xs font-bold uppercase tracking-wider text-white">
                SafeRoute Planner
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-[#10b981]/20 px-2 py-0.5 text-[10px] font-bold text-[#10b981] border border-[#10b981]/40">
                Active
              </span>
              <button
                type="button"
                onClick={() => setShowSafeRoutePanel(false)}
                className="text-[#8e8e9c] hover:text-white"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Recommended Destination */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8e8e9c]">
              Recommended Evacuation Destination
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">Singtam Relief Centre</span>
              <span className="rounded bg-[#10b981]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#10b981]">
                Recommended
              </span>
            </div>
            <div className="text-xs text-[#9a9aab] flex flex-wrap gap-x-3 gap-y-1">
              <span>Distance: <strong className="text-white">4.2 km</strong></span>
              <span>Est. Time: <strong className="text-[#22d3ee]">12 min</strong></span>
              <span className="text-[#10b981] font-semibold">✓ Route Risk: Low</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setActiveId(activeStation.id);
                  setTab("saferoute");
                }}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-extrabold text-xs shadow-md hover:brightness-110 flex items-center justify-center gap-1.5"
              >
                <Navigation className="size-3.5" />
                Open Tourist SafeRoute GPS Map
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCameraView("overview")}
                className="w-full border-white/15 text-xs font-bold text-[#c9c9d3] hover:text-white"
              >
                View on 3D Map
              </Button>
            </div>
          </div>

          {/* Alternative Routes */}
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#8e8e9c]">Alternative Routes</span>
              <button
                type="button"
                onClick={() => {
                  setActiveId(activeStation.id);
                  setTab("incidents");
                }}
                className="text-[#22d3ee] text-[11px] hover:underline"
              >
                View All →
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#10b981]" />
                  <span className="font-medium text-white">Route A — Low Risk</span>
                </div>
                <span className="font-mono text-[#8e8e9c]">4.8 km · 14 min</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#f59e0b]" />
                  <span className="font-medium text-white">Route B — Moderate</span>
                </div>
                <span className="font-mono text-[#8e8e9c]">6.1 km · 18 min</span>
              </div>
            </div>
          </div>

          {/* Hazard Avoidance Box */}
          <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 flex items-start gap-2 text-xs">
            <AlertTriangle className="size-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-red-300">Avoid: High Risk Slopes</div>
              <div className="text-[#c9c9d3] text-[11px]">Western Ridge (Red Zone) — Active failure hazard</div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Bottom-Left Floating Legend (Blueprint Page 2 & 3) */}
      {showOverlays && (
        showLegend ? (
          <div className="absolute bottom-28 left-4 z-30 flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#090b14]/90 p-3.5 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
              <span className="font-sans text-xs font-black text-white">
                TERRAIN-CLAMPED HAZARD LEGEND
              </span>
              <button
                type="button"
                onClick={() => setShowLegend(false)}
                className="rounded p-0.5 text-xs text-muted hover:text-white"
              >
                <ChevronDown className="size-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#f0657a] shadow-[0_0_8px_#f0657a]" />
                <span className="font-bold text-white">Critical Hazard Slope</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#f5a524]" />
                <span className="text-[#c9c9d3]">Elevated Risk Terrain</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#22d3ee]" />
                <span className="text-[#c9c9d3]">Valley Runoff Channel</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full border border-dashed border-[#22d3ee] bg-transparent" />
                <span className="text-[#c9c9d3]">1–5 km Analysis Zone</span>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-white/10 pt-2 font-mono text-[11px]">
              <span className="text-emerald-400 font-bold">● LIVE DATA</span>
              <span className="text-cyan-400 font-bold">● DERIVED</span>
              <span className="text-purple-400 font-bold">● MODEL OUTPUT</span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowLegend(true)}
            className="absolute bottom-28 left-4 z-30 flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#090b14]/90 px-3 py-1.5 font-mono text-xs font-bold text-white backdrop-blur-xl shadow-lg hover:border-white/30"
          >
            <span>Hazard Legend</span>
            <ChevronUp className="size-3.5 text-[#22d3ee]" />
          </button>
        )
      )}

      {/* 4. SLEEK FLOATING BOTTOM COMMAND DOCK (Default Uncluttered View) */}
      {showOverlays && !showBottomAnalytics && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-white/15 bg-[#090b14]/92 px-4 py-2 backdrop-blur-xl shadow-2xl font-mono text-xs max-w-[95vw]">
          {/* Active Station & Threat Badge */}
          <div className="flex items-center gap-2 border-r border-white/15 pr-3">
            <span
              className="size-2 rounded-full animate-pulse shadow-sm"
              style={{
                backgroundColor:
                  riskResult.level === "CRITICAL"
                    ? "#ff453a"
                    : riskResult.level === "WATCH"
                      ? "#f5a524"
                      : "#34d399",
              }}
            />
            <span className="font-sans font-bold text-white">{activeStation.name}</span>
            <span
              className="font-black"
              style={{
                color:
                  riskResult.level === "CRITICAL"
                    ? "#ff453a"
                    : riskResult.level === "WATCH"
                      ? "#f5a524"
                      : "#34d399",
              }}
            >
              {riskResult.total}/100 {riskResult.level}
            </span>
          </div>

          {/* Environmental Sensors Summary */}
          <div className="hidden md:flex items-center gap-3 border-r border-white/15 pr-3 text-[#c9c9d3]">
            <span>Rain: <strong className="text-white">{(activeStation.rainObserved ?? activeStation.rain).toFixed(1)} mm/hr</strong></span>
            <span>Soil: <strong className="text-white">{activeStation.moist.toFixed(0)}%</strong></span>
            <span>Slope: <strong className="text-white">{activeStation.slopeDeg}°</strong></span>
          </div>

          {/* Timeline Scrubber */}
          <div className="flex items-center gap-1 border-r border-white/15 pr-3">
            {["Now", "+1h", "+2h", "+3h", "+4h", "+5h", "+6h"].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => setActiveScrubberHour(step)}
                className={cn(
                  "rounded-lg px-2 py-0.5 text-[11px] font-bold transition",
                  activeScrubberHour === step
                    ? "bg-[#7c5cff] text-white shadow-md shadow-[#7c5cff]/40"
                    : "text-[#8e8e9c] hover:text-white hover:bg-white/5",
                )}
              >
                {step}
              </button>
            ))}
          </div>

          {/* Simulation Toggle */}
          <button
            type="button"
            onClick={() => {
              setSimRunning(!simRunning);
              if (!simRunning) onSimulate();
              else onReset();
            }}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[11px] font-bold shadow-md transition-all",
              simRunning
                ? "bg-amber-500 hover:bg-amber-600 text-black"
                : "bg-gradient-to-r from-[#7c5cff] to-[#22b8f0] text-white hover:brightness-110",
            )}
          >
            {simRunning ? "⏸ Pause" : "▶ Simulate"}
          </button>

          {/* Expand Full Analytics Button */}
          <button
            type="button"
            onClick={() => setShowBottomAnalytics(true)}
            className="flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-bold text-cyan-400 hover:bg-cyan-500/20 transition-colors ml-1"
          >
            <span>Analytics Dock</span>
            <ChevronUp className="size-3" />
          </button>
        </div>
      )}

      {/* 4B. EXPANDED BOTTOM DEFENSE ANALYTICS DOCK (When requested by operator) */}
      {showOverlays && showBottomAnalytics && (
        <div className="absolute bottom-3 left-4 right-4 z-30 flex flex-col gap-2">
          <div className="flex items-center justify-between rounded-xl border border-white/15 bg-[#090b14]/95 px-4 py-2 backdrop-blur-xl shadow-lg">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-cyan-400" />
              <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                Strategic Defense Analytics & Physical Model Ingest
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowBottomAnalytics(false)}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-white font-mono transition-colors"
            >
              <span>Collapse Analytics Dock</span>
              <ChevronDown className="size-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 pointer-events-none">
            {/* Card 1: Risk Assessment (Dual Gauges) */}
            <div className="pointer-events-auto rounded-2xl border border-white/15 bg-[#090b14]/95 p-3.5 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-sans text-xs font-bold uppercase tracking-wider text-white">
                  Risk Assessment
                </span>
                <Badge tone={riskResult.level === "CRITICAL" ? "crit" : "watch"}>
                  {riskResult.level}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex flex-col items-center">
                  <div className="relative size-16 flex items-center justify-center">
                    <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#232333"
                        strokeWidth="3.5"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="3.5"
                        strokeDasharray={`${riskResult.landslideRisk}, 100`}
                      />
                    </svg>
                    <span className="absolute font-mono text-sm font-black text-white">
                      {riskResult.landslideRisk}
                    </span>
                  </div>
                  <span className="mt-1 font-mono text-[10px] uppercase text-[#8e8e9c]">Landslide Risk</span>
                  <span className="font-mono text-xs font-bold text-red-400">Critical</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="relative size-16 flex items-center justify-center">
                    <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#232333"
                        strokeWidth="3.5"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="3.5"
                        strokeDasharray={`${riskResult.flashFloodRisk}, 100`}
                      />
                    </svg>
                    <span className="absolute font-mono text-sm font-black text-white">
                      {riskResult.flashFloodRisk}
                    </span>
                  </div>
                  <span className="mt-1 font-mono text-[10px] uppercase text-[#8e8e9c]">Flash Flood Risk</span>
                  <span className="font-mono text-xs font-bold text-cyan-400">High</span>
                </div>
              </div>
            </div>

            {/* Card 2: Key Risk Factors (Horizontal Bars) */}
            <div className="pointer-events-auto rounded-2xl border border-white/15 bg-[#090b14]/95 p-3.5 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-sans text-xs font-bold uppercase tracking-wider text-white">
                  Key Risk Factors
                </span>
                <span className="font-mono text-[10px] text-[#8e8e9c]">Model Weights</span>
              </div>

              <div className="space-y-1.5 pt-2 font-mono text-xs">
                <div>
                  <div className="flex justify-between text-[11px] text-[#8e8e9c]">
                    <span>Historical Susceptibility</span>
                    <span className="font-bold text-white">30%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden mt-0.5">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: "85%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-[#8e8e9c]">
                    <span>Slope & Terrain</span>
                    <span className="font-bold text-white">25%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden mt-0.5">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: "70%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-[#8e8e9c]">
                    <span>Soil Moisture</span>
                    <span className="font-bold text-white">20%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden mt-0.5">
                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: "65%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-[#8e8e9c]">
                    <span>Rainfall Intensity</span>
                    <span className="font-bold text-white">15%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden mt-0.5">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: "50%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-[#8e8e9c]">
                    <span>Drainage</span>
                    <span className="font-bold text-white">10%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden mt-0.5">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: "35%" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Live Environmental Data */}
            <div className="pointer-events-auto rounded-2xl border border-white/15 bg-[#090b14]/95 p-3.5 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-sans text-xs font-bold uppercase tracking-wider text-white">
                  Live Environmental Data
                </span>
                <span className="font-mono text-[10px] text-emerald-400 font-bold">● Sensor Feed</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 font-mono">
                <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                  <div className="text-[10px] text-[#8e8e9c]">Rainfall</div>
                  <div className="mt-0.5 text-base font-black text-white">
                    {(activeStation.rainObserved ?? activeStation.rain).toFixed(1)} <span className="text-[10px] font-normal text-muted">mm/hr</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold">+12% surge</span>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                  <div className="text-[10px] text-[#8e8e9c]">Soil Moisture</div>
                  <div className="mt-0.5 text-base font-black text-white">
                    {activeStation.moist.toFixed(0)}<span className="text-[10px] font-normal text-muted">%</span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-bold">Pore sat</span>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                  <div className="text-[10px] text-[#8e8e9c]">Slope Angle</div>
                  <div className="mt-0.5 text-base font-black text-white">
                    {activeStation.slopeDeg}<span className="text-[10px] font-normal text-muted">°</span>
                  </div>
                  <span className="text-[10px] text-red-400 font-bold">Steep slope</span>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                  <div className="text-[10px] text-[#8e8e9c]">Air Temp</div>
                  <div className="mt-0.5 text-base font-black text-white">
                    {activeStation.tempC.toFixed(0)}<span className="text-[10px] font-normal text-muted">°C</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-bold">Montane</span>
                </div>
              </div>
            </div>

            {/* Card 4: Active Alert */}
            <div className="pointer-events-auto rounded-2xl border border-red-500/40 bg-[#090b14]/95 p-3.5 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-1.5">
                    <AlertOctagon className="size-4 text-red-400 animate-pulse" />
                    <span className="font-sans text-xs font-bold uppercase tracking-wider text-red-400">
                      Active Alert
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[#8e8e9c]">
                    {formatIstTime(Date.now())}
                  </span>
                </div>

                <p className="mt-2.5 font-sans text-xs leading-relaxed text-[#f4f4fb]">
                  High landslide risk detected in <strong className="text-white">{activeStation.name}</strong> due to sustained rainfall and steep slope saturation.
                </p>
              </div>

              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setActiveId(activeStation.id);
                  setTab("incidents");
                }}
                className="mt-3 w-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md"
              >
                View Incident Details →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Right Sliding Location & Risk Inspector Drawer (Parts 16, 17, 19) */}
      {showOverlays && showInspectorDrawer && inspectedPoint ? (
        <div className="absolute right-4 top-16 z-40 max-h-[calc(100vh-6.5rem)] w-96 flex flex-col gap-3 overflow-y-auto rounded-3xl border border-white/15 bg-[#121216]/95 p-5 shadow-2xl backdrop-blur-2xl transition-all">
          <div className="flex items-start justify-between border-b border-white/10 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg font-bold text-white">
                  {activeStation.name}
                </span>
                <Badge
                  tone={
                    riskResult.level === "CRITICAL"
                      ? "crit"
                      : riskResult.level === "WATCH"
                        ? "watch"
                        : "safe"
                  }
                >
                  {riskResult.level}
                </Badge>
              </div>
              <div className="mt-0.5 font-mono text-xs text-[#9a9aab]">
                [{inspectedPoint.lat.toFixed(4)}° N, {inspectedPoint.lon.toFixed(4)}° E] · {inspectedPoint.distanceFromStationKm} km from node
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowInspectorDrawer(false)}
              className="rounded-lg p-1.5 text-[#9a9aab] hover:bg-white/10 hover:text-white transition-colors"
              title="Close panel (Drop away)"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Quick CTA to Incident Response Center */}
          <div className="mt-1">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setActiveId(activeStation.id);
                setTab("incidents");
              }}
              className="w-full flex items-center justify-center gap-1.5 font-bold shadow-lg shadow-[#7c5cff]/30 bg-gradient-to-r from-[#7c5cff] to-[#22b8f0] text-white hover:brightness-110"
            >
              <AlertTriangle className="size-3.5" />
              Open in Incident Response Center
            </Button>
          </div>

          {/* Inspector Sub-Tabs */}
          <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-[#0c0c10] p-1 font-mono text-xs font-bold">
            <button
              type="button"
              onClick={() => setInspectorTab("telemetry")}
              className={cn(
                "rounded-lg py-1.5 transition",
                inspectorTab === "telemetry"
                  ? "bg-[#1b1a20] text-[#22d3ee] shadow"
                  : "text-[#9a9aab] hover:text-white",
              )}
            >
              Telemetry
            </button>
            <button
              type="button"
              onClick={() => setInspectorTab("exposure")}
              className={cn(
                "rounded-lg py-1.5 transition",
                inspectorTab === "exposure"
                  ? "bg-[#1b1a20] text-[#22d3ee] shadow"
                  : "text-[#9a9aab] hover:text-white",
              )}
            >
              Exposure
            </button>
            <button
              type="button"
              onClick={() => setInspectorTab("whatif")}
              className={cn(
                "rounded-lg py-1.5 transition",
                inspectorTab === "whatif"
                  ? "bg-[#1b1a20] text-[#f0657a] shadow"
                  : "text-[#9a9aab] hover:text-white",
              )}
            >
              What-If
            </button>
          </div>

          {/* Sub-Tab 1: Telemetry & Multi-Factor Risk */}
          {inspectorTab === "telemetry" ? (
            <div className="mt-2 flex flex-col gap-3 font-mono text-xs">
              {/* Dual Risk Scores: Landslide vs Flash Flood */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/10 bg-[#1b1a20] p-3">
                  <div className="text-xs font-bold uppercase text-[#9a9aab]">Landslide Threat</div>
                  <div
                    className="mt-1 text-2xl font-black tabular-nums"
                    style={{ color: riskColor(riskResult.landslideRisk) }}
                  >
                    {riskResult.landslideRisk}
                    <span className="text-xs font-normal text-[#9a9aab]">/100</span>
                  </div>
                  <div className="text-xs text-[#9a9aab]">Multi-Factor Model</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#1b1a20] p-3">
                  <div className="text-xs font-bold uppercase text-[#9a9aab]">Flash Flood Threat</div>
                  <div
                    className="mt-1 text-2xl font-black tabular-nums text-[#22d3ee]"
                  >
                    {riskResult.flashFloodRisk}
                    <span className="text-xs font-normal text-[#9a9aab]">/100</span>
                  </div>
                  <div className="text-xs text-[#9a9aab]">Hydrological Model</div>
                </div>
              </div>

              {/* Physical Terrain Attributes */}
              <div className="space-y-2 rounded-xl border border-white/10 bg-[#1b1a20]/70 p-3">
                <div className="flex justify-between">
                  <span className="text-[#9a9aab]">Elevation (DEM):</span>
                  <span className="font-bold text-white">{inspectedPoint.elevationM} m MSL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9a9aab]">Slope Angle:</span>
                  <span
                    className={cn(
                      "font-bold",
                      inspectedPoint.slopeDeg >= 28 ? "text-[#f0657a]" : "text-white",
                    )}
                  >
                    {inspectedPoint.slopeDeg}° ({inspectedPoint.aspectCompass} aspect)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9a9aab]">Soil Saturation:</span>
                  <span className="font-bold text-[#22d3ee]">{activeStation.moist.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2">
                  <span className="text-[#9a9aab]">Data Confidence:</span>
                  <span className="font-bold text-[#34d399]">
                    {riskResult.confidencePct}% (Decoupled)
                  </span>
                </div>
              </div>

              {/* Disambiguated Rainfall Metrics */}
              <div className="rounded-xl border border-[#22d3ee]/30 bg-[#22d3ee]/5 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#22d3ee]">
                    Live Rain & Radar Rates
                  </span>
                  <span className="text-xs text-[#9a9aab]">Doppler C-Band</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-xs text-[#9a9aab]">Intensity:</div>
                    <div className="text-sm font-bold text-white">
                      {(activeStation.rainIntensityMmH ?? activeStation.rain).toFixed(1)}{" "}
                      <span className="text-xs text-[#9a9aab]">mm/hr</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#9a9aab]">Last 1h Accum:</div>
                    <div className="text-sm font-bold text-white">
                      {(activeStation.rainAccum1hMm ?? activeStation.rain).toFixed(1)}{" "}
                      <span className="text-xs text-[#9a9aab]">mm</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#9a9aab]">Forecast 1h:</div>
                    <div className="text-sm font-bold text-[#22d3ee]">
                      {(activeStation.rainForecast1hMm ?? activeStation.rainForecast).toFixed(1)}{" "}
                      <span className="text-xs text-[#9a9aab]">mm</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#9a9aab]">Forecast 6h:</div>
                    <div className="text-sm font-bold text-[#22d3ee]">
                      {(activeStation.rainForecast6hMm ?? activeStation.rain6h).toFixed(1)}{" "}
                      <span className="text-xs text-[#9a9aab]">mm</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Factor Landslide Breakdown */}
              <div className="rounded-xl border border-white/10 bg-[#1b1a20] p-3 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-[#c9c9d3]">
                  Landslide Component Contributors (0–100)
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#9a9aab]">History Baseline (30%):</span>
                    <span className="font-bold text-white">
                      {riskResult.landslideBreakdown.history.weightedValue} / 30
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9a9aab]">Slope Gradient (20%):</span>
                    <span className="font-bold text-white">
                      {riskResult.landslideBreakdown.slope.weightedValue} / 20
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9a9aab]">Soil Moisture (15%):</span>
                    <span className="font-bold text-white">
                      {riskResult.landslideBreakdown.soilMoisture.weightedValue} / 15
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9a9aab]">Rainfall Ingest (15%):</span>
                    <span className="font-bold text-white">
                      {riskResult.landslideBreakdown.rainfall.weightedValue} / 15
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9a9aab]">Geology & Soil (10%):</span>
                    <span className="font-bold text-white">
                      {riskResult.landslideBreakdown.geology.weightedValue} / 10
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9a9aab]">Drainage & Spatial (5%):</span>
                    <span className="font-bold text-white">
                      {riskResult.landslideBreakdown.drainage.weightedValue} / 5
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9a9aab]">Trend & Acceleration (5%):</span>
                    <span className="font-bold text-white">
                      {riskResult.landslideBreakdown.trend.weightedValue} / 5
                    </span>
                  </div>
                </div>
              </div>

              {/* Primary Model Drivers */}
              <div className="rounded-xl border border-white/10 bg-[#1b1a20]/70 p-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[#c9c9d3]">
                  Primary Physical Drivers
                </div>
                <ul className="mt-2 space-y-1 text-xs text-[#f4f4fb]">
                  {riskResult.primaryDrivers.map((driver, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-[#22d3ee] font-bold">•</span>
                      <span>{driver}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {/* Sub-Tab 2: Exposure, Settlements & Shelters */}
          {inspectorTab === "exposure" ? (
            <div className="mt-3 flex flex-col gap-3 font-mono text-xs">
              <div className="rounded-xl border border-white/10 bg-[#1b1a20] p-3">
                <div className="text-xs font-bold uppercase text-[#9a9aab]">
                  Census 2011 Population Exposure
                </div>
                <div className="mt-1 text-lg font-black text-white">
                  {popExposure.censusWardPopulation.toLocaleString()} residents
                </div>
                <div className="mt-1 text-xs text-[#9a9aab]">
                  ~{popExposure.modeledExposedPopulation1km.toLocaleString()} within 1 km epicenter
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#1b1a20] p-3">
                <div className="text-xs font-bold uppercase text-[#9a9aab]">
                  Nearby Infrastructure in {radiusKm} km Radius
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  {nearbyExposure.slice(0, 4).map((exp) => (
                    <div
                      key={exp.asset.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-white">{exp.asset.name}</span>
                      <span className="text-[#22d3ee] font-semibold">{exp.distanceKm} km</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#1b1a20] p-3">
                <div className="text-xs font-bold uppercase text-[#9a9aab]">
                  Designated Relief Shelters
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  {nearbyShelters.map((sh) => (
                    <div key={sh.id} className="border-t border-white/10 pt-2 first:border-0 first:pt-0">
                      <div className="font-bold text-white">{sh.name}</div>
                      <div className="text-xs text-[#9a9aab]">
                        Cap: {sh.officialCapacity} · {sh.liveOccupancy}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* Sub-Tab 3: What-If Workbench */}
          {inspectorTab === "whatif" ? (
            <div className="mt-3 flex flex-col gap-3 font-mono text-xs">
              <div className="rounded-xl border border-[#f0657a]/40 bg-[#f0657a]/10 p-2.5 text-center text-xs font-black text-[#f0657a]">
                ⚠️ SIMULATION — NOT A LIVE OBSERVATION
              </div>

              <div className="space-y-2 rounded-xl border border-white/10 bg-[#1b1a20] p-3">
                <div>
                  <div className="flex justify-between">
                    <span className="text-[#9a9aab]">Simulated Rain (+mm/h):</span>
                    <span className="font-bold text-[#f0657a]">+{simDeltaRain} mm/h</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="5"
                    value={simDeltaRain}
                    onChange={(e) => setSimDeltaRain(parseInt(e.target.value))}
                    className="w-full accent-[#f0657a]"
                  />
                </div>

                <div>
                  <div className="flex justify-between">
                    <span className="text-[#9a9aab]">Soil Saturation (%):</span>
                    <span className="font-bold text-[#22d3ee]">{simSoilMoist}%</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="100"
                    step="2"
                    value={simSoilMoist}
                    onChange={(e) => setSimSoilMoist(parseInt(e.target.value))}
                    className="w-full accent-[#22d3ee]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-white/10 bg-[#1b1a20] p-2.5">
                  <div className="text-xs uppercase text-[#9a9aab]">Live Baseline</div>
                  <div className="mt-1 text-xl font-bold text-white">
                    {scenarioResult.baseline.riskScore}/100
                  </div>
                  <div className="text-xs text-[#9a9aab]">{scenarioResult.baseline.riskLevel}</div>
                </div>

                <div className="rounded-xl border border-[#f0657a]/40 bg-[#f0657a]/15 p-2.5">
                  <div className="text-xs uppercase text-[#f0657a]">Simulated Risk</div>
                  <div className="mt-1 text-xl font-black text-[#f0657a]">
                    {scenarioResult.scenario.riskScore}/100
                  </div>
                  <div className="text-xs text-[#f0657a]">{scenarioResult.scenario.riskLevel}</div>
                </div>
              </div>

              <div className="text-xs text-[#9a9aab]">
                {scenarioResult.delta.summary}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 6. Layers & Terrain Controls Drawer */}
      {showControlsDrawer ? (
        <div className="absolute right-4 top-16 z-40 w-80 flex-col gap-3 rounded-3xl border border-white/15 bg-[#121216]/95 p-5 shadow-2xl backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="size-4 text-[#22d3ee]" />
              <span className="font-sans text-sm font-bold text-white">Layers & Terrain Relief</span>
            </div>
            <button
              type="button"
              onClick={() => setShowControlsDrawer(false)}
              className="rounded-lg p-1 text-[#9a9aab] hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Vertical Exaggeration Slider */}
          <div className="mt-3 space-y-1.5 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-[#9a9aab]">Vertical Exaggeration:</span>
              <span className="font-bold text-[#22d3ee]">{verticalExaggeration.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="2.5"
              step="0.1"
              value={verticalExaggeration}
              onChange={(e) => setVerticalExaggeration(parseFloat(e.target.value))}
              className="w-full accent-[#22d3ee]"
            />
            <p className="text-[9px] text-[#9a9aab]">
              Default 1.2x provides authentic mountain slope perspective.
            </p>
          </div>

          {/* Camera Presets */}
          <div className="mt-3 border-t border-white/10 pt-3">
            <div className="font-mono text-[10px] font-bold uppercase text-[#9a9aab]">
              Camera Angles:
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => setCameraView("overview")}
                className="rounded-lg border border-white/10 bg-[#1b1a20] py-1 text-center text-[#c9c9d3] hover:text-white"
              >
                Overview 3D
              </button>
              <button
                type="button"
                onClick={() => setCameraView("steep")}
                className="rounded-lg border border-white/10 bg-[#1b1a20] py-1 text-center text-[#c9c9d3] hover:text-white"
              >
                Mountain Face
              </button>
              <button
                type="button"
                onClick={() => setCameraView("valley")}
                className="rounded-lg border border-white/10 bg-[#1b1a20] py-1 text-center text-[#c9c9d3] hover:text-white"
              >
                Valley Runoff
              </button>
              <button
                type="button"
                onClick={() => setCameraView("top")}
                className="rounded-lg border border-white/10 bg-[#1b1a20] py-1 text-center text-[#c9c9d3] hover:text-white"
              >
                Top-Down Plan
              </button>
            </div>
          </div>

          {/* Layer Toggles */}
          <div className="mt-3 space-y-2 border-t border-white/10 pt-3 font-mono text-xs">
            <label className="flex cursor-pointer items-center justify-between">
              <span className="text-[#f4f4fb]">Steep Slope Hazard Highlight</span>
              <input
                type="checkbox"
                checked={showSlopeRisk}
                onChange={(e) => setShowSlopeRisk(e.target.checked)}
                className="rounded border-white/20 accent-[#22d3ee]"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between">
              <span className="text-[#f4f4fb]">Concentric 1–{radiusKm} km Rings</span>
              <input
                type="checkbox"
                checked={showConcentricZones}
                onChange={(e) => setShowConcentricZones(e.target.checked)}
                className="rounded border-white/20 accent-[#22d3ee]"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between">
              <span className="text-[#f4f4fb]">Valley Drainage Waterways</span>
              <input
                type="checkbox"
                checked={showRivers}
                onChange={(e) => setShowRivers(e.target.checked)}
                className="rounded border-white/20 accent-[#22d3ee]"
              />
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
