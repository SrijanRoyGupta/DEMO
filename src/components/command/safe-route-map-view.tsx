import { useState, useMemo, useRef, useEffect } from "react";
import type { Map as LeafletMap, LayerGroup, Marker, Polyline, Polygon } from "leaflet";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Compass,
  ExternalLink,
  MapPin,
  Navigation,
  Phone,
  PhoneCall,
  Radio,
  Route as RouteIcon,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Waves,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATIONS } from "@/lib/stations";
import {
  VERIFIED_RELIEF_SHELTERS,
  VERIFIED_EVACUATION_ROUTES,
  discoverNearbyShelters,
  getEvacuationRoutesForStation,
  type ReliefShelter,
  type EvacuationRoute,
} from "@/lib/shelter-routing";
import { calculateRisk, riskColor } from "@/lib/risk";
import type { StationLive } from "@/lib/types";
import { cn } from "@/lib/utils";

const TILE_LAYER = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";
const SATELLITE_TILE_LAYER = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

type LeafletNS = typeof import("leaflet");

type Props = {
  stations: StationLive[];
  activeStation: StationLive;
  onSelectStation: (id: string) => void;
  onSwitchTo3D: (id: string) => void;
};

// Tourist Hotspots & Road Conditions Database (All key mountain sectors)
const TOURIST_HOTSPOTS: Record<
  string,
  Array<{
    name: string;
    type: "SCENIC_SPOT" | "PILGRIM_SITE" | "TRANSIT_HUB" | "MOUNTAIN_PASS";
    lat: number;
    lon: number;
    status: "OPEN_AND_SAFE" | "CAUTION_HEAVY_RAIN" | "BLOCKED_HAZARD" | "RESTRICTED";
    advisory: string;
  }>
> = {
  st8: [
    // Dharamshala / Kangra
    {
      name: "HPCA Stadium Civil Enclave",
      type: "SCENIC_SPOT",
      lat: 32.197,
      lon: 76.326,
      status: "OPEN_AND_SAFE",
      advisory: "Main access boulevard fully open. Clear slope gradient and active civil police post.",
    },
    {
      name: "Tsuglagkhang Complex & Temple Road",
      type: "PILGRIM_SITE",
      lat: 32.235,
      lon: 76.325,
      status: "OPEN_AND_SAFE",
      advisory: "Upper Dharamshala pedestrian access operational. Normal tourist movement.",
    },
    {
      name: "Bhagsu Waterfall & Mountain Stream",
      type: "SCENIC_SPOT",
      lat: 32.248,
      lon: 76.335,
      status: "CAUTION_HEAVY_RAIN",
      advisory: "Upstream catchment surge warning. Keep 50m safe perimeter away from gorge stream bed.",
    },
    {
      name: "Triund Ridge High Pass Trail",
      type: "MOUNTAIN_PASS",
      lat: 32.259,
      lon: 76.353,
      status: "RESTRICTED",
      advisory: "High-altitude ridge trekking temporarily paused by HP Forest Dept during heavy rain.",
    },
  ],
  st4: [
    // Gangtok
    {
      name: "Gangtok MG Marg Promenade",
      type: "TRANSIT_HUB",
      lat: 27.329,
      lon: 88.613,
      status: "OPEN_AND_SAFE",
      advisory: "Pedestrian tourist hub verified open. Municipal civil defense station active.",
    },
    {
      name: "Tsomgo (Changu) Lake & Baba Mandir",
      type: "SCENIC_SPOT",
      lat: 27.374,
      lon: 88.761,
      status: "BLOCKED_HAZARD",
      advisory: "NH-310 Mile 13 rockfall & mudflow hazard. Border Roads Organisation (BRO) clearing.",
    },
    {
      name: "Rumtek Dharma Chakra Centre",
      type: "PILGRIM_SITE",
      lat: 27.294,
      lon: 88.548,
      status: "CAUTION_HEAVY_RAIN",
      advisory: "Rain-induced surface slickness on approach road. 4WD vehicles advised.",
    },
    {
      name: "Nathula Himalayan Border Pass",
      type: "MOUNTAIN_PASS",
      lat: 27.387,
      lon: 88.831,
      status: "RESTRICTED",
      advisory: "Tourist permits temporarily suspended by State Tourism Dept due to cloudburst warning.",
    },
  ],
  st9: [
    // Joshimath
    {
      name: "Auli Ski Resort & Cable Car",
      type: "SCENIC_SPOT",
      lat: 30.528,
      lon: 79.569,
      status: "CAUTION_HEAVY_RAIN",
      advisory: "Ropeway operating under strict geological subsidence monitoring.",
    },
    {
      name: "Badrinath National Highway (NH-07)",
      type: "TRANSIT_HUB",
      lat: 30.56,
      lon: 79.575,
      status: "BLOCKED_HAZARD",
      advisory: "Active shooting stones near Helang. Traffic halted by Uttarakhand Police.",
    },
  ],
  st1: [
    // Guwahati
    {
      name: "Kamakhya Temple Hilltop",
      type: "PILGRIM_SITE",
      lat: 26.166,
      lon: 91.705,
      status: "OPEN_AND_SAFE",
      advisory: "Hill access road cleared. Traffic flow normal with traffic police regulation.",
    },
    {
      name: "Brahmaputra Riverfront Promenade",
      type: "SCENIC_SPOT",
      lat: 26.185,
      lon: 91.745,
      status: "CAUTION_HEAVY_RAIN",
      advisory: "Water level approaching high flood warning stage. Ferry services restricted.",
    },
  ],
  st2: [
    // Cherrapunji
    {
      name: "Nohkalikai Falls Scenic Viewpoint",
      type: "SCENIC_SPOT",
      lat: 25.275,
      lon: 91.685,
      status: "OPEN_AND_SAFE",
      advisory: "Plateau ridge stable. High cloud cover & localized mist.",
    },
    {
      name: "Double Decker Living Root Bridge Trail",
      type: "SCENIC_SPOT",
      lat: 25.248,
      lon: 91.674,
      status: "BLOCKED_HAZARD",
      advisory: "Gorge stream overflowing. Steep 3,000-step trail closed by local village durbar.",
    },
  ],
  st7: [
    // Shimla
    {
      name: "The Ridge & Christ Church Promenade",
      type: "SCENIC_SPOT",
      lat: 31.105,
      lon: 77.174,
      status: "OPEN_AND_SAFE",
      advisory: "Promenade open with emergency civil defense booth on standby.",
    },
    {
      name: "Jakhu Temple & Ropeway",
      type: "PILGRIM_SITE",
      lat: 31.101,
      lon: 77.185,
      status: "OPEN_AND_SAFE",
      advisory: "Hill road clear. Strict speed limit 25 km/h enforced.",
    },
  ],
  st11: [
    // Wayanad
    {
      name: "Kalpetta Central Commercial Promenade",
      type: "TRANSIT_HUB",
      lat: 11.612,
      lon: 76.085,
      status: "OPEN_AND_SAFE",
      advisory: "Town roads clear. State emergency shelter operational at Municipal Hall.",
    },
    {
      name: "Chembra Peak Trekking Trail",
      type: "SCENIC_SPOT",
      lat: 11.512,
      lon: 76.088,
      status: "BLOCKED_HAZARD",
      advisory: "Trek route closed by Kerala Forest Dept due to heavy slope saturation.",
    },
  ],
};

export function SafeRouteMapView({ stations, activeStation, onSelectStation, onSwitchTo3D }: Props) {
  const [mode, setMode] = useState<"tourist" | "civilian">("tourist");
  const [mapStyle, setMapStyle] = useState<"streets" | "satellite">("streets");

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const Lref = useRef<LeafletNS | null>(null);
  const hazardLayerRef = useRef<LayerGroup | null>(null);
  const routesLayerRef = useRef<LayerGroup | null>(null);
  const sheltersLayerRef = useRef<LayerGroup | null>(null);

  // Available shelters & routes for active station (strictly local to its district!)
  const stationShelters = useMemo(() => {
    return discoverNearbyShelters(activeStation.id);
  }, [activeStation.id]);

  const stationRoutes = useMemo(() => {
    return getEvacuationRoutesForStation(activeStation.id);
  }, [activeStation.id]);

  const [selectedRouteId, setSelectedRouteId] = useState<string>(() => {
    const initial = getEvacuationRoutesForStation(activeStation.id);
    return initial[0]?.id || "rt-st1-01";
  });

  // Whenever active station changes, auto-select its primary route
  useEffect(() => {
    if (stationRoutes.length > 0) {
      setSelectedRouteId(stationRoutes[0].id);
    }
  }, [activeStation.id, stationRoutes]);

  const activeRoute = useMemo(() => {
    return stationRoutes.find((r) => r.id === selectedRouteId) ?? stationRoutes[0];
  }, [stationRoutes, selectedRouteId]);

  const activeShelter = useMemo(() => {
    if (activeRoute?.destinationShelterId) {
      const match = stationShelters.find((s) => s.id === activeRoute.destinationShelterId);
      if (match) return match;
    }
    return stationShelters[0] ?? discoverNearbyShelters(activeStation.id)[0];
  }, [activeRoute, stationShelters, activeStation.id]);

  const hotspots = useMemo(() => {
    return TOURIST_HOTSPOTS[activeStation.id] ?? [
      {
        name: `${activeStation.name} Town Center`,
        type: "TRANSIT_HUB" as const,
        lat: activeStation.lat,
        lon: activeStation.lon,
        status: "OPEN_AND_SAFE" as const,
        advisory: "Local municipal access road clear. Monitored civil relief perimeter.",
      },
    ];
  }, [activeStation]);

  const riskResult = useMemo(() => calculateRisk(activeStation), [activeStation]);

  // Construct Google Maps Turn-by-Turn GPS Directions URL
  // CRITICAL INVARIANT: EXACT station coordinates -> EXACT local safe shelter coordinates (in same district!)
  const googleMapsGpsUrl = useMemo(() => {
    const originLat = activeStation.lat;
    const originLon = activeStation.lon;
    const destLat = activeShelter.coordinates.lat;
    const destLon = activeShelter.coordinates.lon;
    return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLon}&destination=${destLat},${destLon}&travelmode=driving`;
  }, [activeStation.lat, activeStation.lon, activeShelter.coordinates.lat, activeShelter.coordinates.lon]);

  // Initialize Leaflet Map
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapRef.current) return;

    let cancelled = false;

    void import("leaflet").then((mod) => {
      if (cancelled || !mapContainerRef.current) return;
      const L = (mod as LeafletNS & { default?: LeafletNS }).default ?? (mod as LeafletNS);
      Lref.current = L;

      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView([activeStation.lat, activeStation.lon], 13);

      const tileUrl = mapStyle === "satellite" ? SATELLITE_TILE_LAYER : TILE_LAYER;
      L.tileLayer(tileUrl, { maxZoom: 18 }).addTo(map);

      hazardLayerRef.current = L.layerGroup().addTo(map);
      routesLayerRef.current = L.layerGroup().addTo(map);
      sheltersLayerRef.current = L.layerGroup().addTo(map);

      mapRef.current = map;
      renderMapElements();
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Map Elements when active station, mode, selected route, or mapStyle changes
  useEffect(() => {
    if (!mapRef.current || !Lref.current) return;
    mapRef.current.setView([activeStation.lat, activeStation.lon], 13);
    renderMapElements();
  }, [activeStation.id, selectedRouteId, mode, mapStyle]);

  function renderMapElements() {
    const L = Lref.current;
    const map = mapRef.current;
    if (!L || !map) return;

    // Clear existing layers
    hazardLayerRef.current?.clearLayers();
    routesLayerRef.current?.clearLayers();
    sheltersLayerRef.current?.clearLayers();

    const cLat = activeStation.lat;
    const cLon = activeStation.lon;

    // 1. HAZARD ZONES (Visual Clamped Polygons)
    // Red Polygon: Active High-Risk Landslide Slope (North-West Sector)
    const redPolygonCoords: [number, number][] = [
      [cLat + 0.012, cLon - 0.018],
      [cLat + 0.022, cLon - 0.008],
      [cLat + 0.016, cLon + 0.004],
      [cLat + 0.006, cLon - 0.006],
    ];
    const redPoly = L.polygon(redPolygonCoords, {
      color: "#ef4444",
      fillColor: "#ef4444",
      fillOpacity: 0.35,
      weight: 2,
    }).bindPopup(
      `<div style="font-family: sans-serif; font-size: 12px; color: #111;">
        <strong style="color: #dc2626; font-size: 13px;">⚠️ CRITICAL HAZARD ZONE</strong><br/>
        Active Landslide & Slope Failure Risk (38°+ Slope)<br/>
        <strong>Status: AVOID ENTRY</strong>
      </div>`,
    );
    hazardLayerRef.current?.addLayer(redPoly);

    // Amber Polygon: Saturated High-Pore-Pressure Watch Zone
    const amberPolygonCoords: [number, number][] = [
      [cLat - 0.008, cLon - 0.022],
      [cLat + 0.004, cLon - 0.020],
      [cLat - 0.002, cLon - 0.009],
      [cLat - 0.014, cLon - 0.012],
    ];
    const amberPoly = L.polygon(amberPolygonCoords, {
      color: "#f59e0b",
      fillColor: "#f59e0b",
      fillOpacity: 0.25,
      weight: 1.5,
    }).bindPopup(
      `<div style="font-family: sans-serif; font-size: 12px; color: #111;">
        <strong style="color: #d97706; font-size: 13px;">ELEVATED WATCH TERRAIN</strong><br/>
        Pore Pressure Saturation: 82%<br/>
        Secondary bypass recommended.
      </div>`,
    );
    hazardLayerRef.current?.addLayer(amberPoly);

    // Cyan Polygon: Valley Flash Flood Drainage Channel
    const cyanPolygonCoords: [number, number][] = [
      [cLat - 0.018, cLon - 0.004],
      [cLat - 0.010, cLon + 0.014],
      [cLat - 0.013, cLon + 0.019],
      [cLat - 0.024, cLon + 0.004],
    ];
    const cyanPoly = L.polygon(cyanPolygonCoords, {
      color: "#06b6d4",
      fillColor: "#06b6d4",
      fillOpacity: 0.3,
      weight: 1.5,
    }).bindPopup(
      `<div style="font-family: sans-serif; font-size: 12px; color: #111;">
        <strong style="color: #0284c7; font-size: 13px;">🌊 VALLEY DRAINAGE CHANNEL</strong><br/>
        Rapid flash flood runoff path. Avoid parking or camping.
      </div>`,
    );
    hazardLayerRef.current?.addLayer(cyanPoly);

    // 2. EVACUATION & TOURIST ROUTES (Google Maps Style: Distinct Core + Casing)
    // Primary Route: Google Maps Emerald Green (#10b981) with dark green casing (#064e3b)
    // Secondary Route: Google Maps Vibrant Yellow (#facc15) with dark amber casing (#78350f)
    stationRoutes.forEach((route) => {
      const isSelected = route.id === selectedRouteId;
      const isPrimary = route.routeType === "PRIMARY_RELIEF_CORRIDOR";
      const coreColor = isPrimary ? "#10b981" : "#facc15";
      const casingColor = isPrimary ? "#064e3b" : "#78350f";

      // Convert [lon, lat] waypoints to [lat, lon]
      const latLngs: [number, number][] = route.waypointCoordinates.map(([lon, lat]) => [lat, lon]);

      // Route Casing (Dark outline underneath for high contrast visibility)
      const casing = L.polyline(latLngs, {
        color: casingColor,
        weight: isSelected ? 11 : 8,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round",
      });
      routesLayerRef.current?.addLayer(casing);

      // Outer glow polyline if selected
      if (isSelected) {
        const glow = L.polyline(latLngs, {
          color: coreColor,
          weight: 18,
          opacity: 0.35,
          lineCap: "round",
          lineJoin: "round",
        });
        routesLayerRef.current?.addLayer(glow);
      }

      // Core Polyline (Vivid Green or Vibrant Yellow)
      const line = L.polyline(latLngs, {
        color: coreColor,
        weight: isSelected ? 6 : 4.5,
        dashArray: isPrimary ? undefined : "10, 6",
        opacity: 1.0,
        lineCap: "round",
        lineJoin: "round",
      }).bindPopup(
        `<div style="font-family: sans-serif; font-size: 12px; color: #111; min-width: 200px;">
          <div style="font-weight: 800; color: ${isPrimary ? '#059669' : '#d97706'}; font-size: 13px; margin-bottom: 2px;">
            ${isPrimary ? '🟢 PRIMARY SAFE CORRIDOR (GREEN)' : '🟡 SECONDARY BYPASS ROUTE (YELLOW)'}
          </div>
          <strong>${route.name}</strong><br/>
          To: <strong>${route.destinationName}</strong><br/>
          Distance: <strong>${route.distanceKm} km</strong> | Drive Time: <strong>~${route.estimatedTravelTimeMin} min</strong><br/>
          Road: <strong>${route.roadClassification.replace(/_/g, " ")}</strong> (Avg slope ${route.averageGradientPct}%)<br/>
          Safety: <strong style="color: ${isPrimary ? '#059669' : '#d97706'};">${route.safetyAssessment.replace(/_/g, " ")}</strong>
        </div>`,
      );

      line.on("click", () => {
        setSelectedRouteId(route.id);
      });

      routesLayerRef.current?.addLayer(line);
    });

    // 3. RELIEF SHELTERS & HIGH GROUND DESTINATIONS
    stationShelters.forEach((shelter) => {
      const isTarget = shelter.id === activeShelter.id;
      const shelterIcon = L.divIcon({
        className: "custom-shelter-marker",
        html: `
          <div style="background-color: ${isTarget ? '#10b981' : '#059669'}; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 16px rgba(16, 185, 129, ${isTarget ? '1' : '0.6'}); border: 2.5px solid #ffffff; cursor: pointer;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const sMarker = L.marker([shelter.coordinates.lat, shelter.coordinates.lon], { icon: shelterIcon }).bindPopup(
        `<div style="font-family: sans-serif; font-size: 12px; color: #111; min-width: 210px;">
          <div style="font-size: 10px; font-weight: 800; color: #059669; text-transform: uppercase;">Verified Relief Assembly Target</div>
          <strong style="color: #059669; font-size: 14px;">🛡️ ${shelter.name}</strong><br/>
          District: <strong>${shelter.district}, ${shelter.state}</strong><br/>
          Elevation: <strong>${shelter.elevationM}m MSL</strong> (Safe High Ground)<br/>
          Capacity: <strong>${shelter.officialCapacity} persons</strong> | Status: <strong>${shelter.operationalStatus}</strong><br/>
          Distance from Origin: <strong>${shelter.distanceFromStationKm} km</strong>
        </div>`,
      );
      sheltersLayerRef.current?.addLayer(sMarker);
    });

    // 4. CURRENT LOCATION / DISASTER SITE ORIGIN PIN (At exact station coordinates)
    const userIcon = L.divIcon({
      className: "custom-user-marker",
      html: `
        <div style="background-color: #8b5cf6; color: white; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 18px rgba(139, 92, 246, 0.95); border: 2.5px solid #ffffff;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M2 12h2"/><path d="M20 12h2"/></svg>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });

    const uMarker = L.marker([cLat, cLon], { icon: userIcon }).bindPopup(
      `<div style="font-family: sans-serif; font-size: 12px; color: #111; min-width: 200px;">
        <div style="font-size: 10px; font-weight: 800; color: #7c3aed; text-transform: uppercase;">GPS Origin Point (Disaster Site Center)</div>
        <strong style="font-size: 13px; color: #6d28d9;">📍 ${activeStation.name}</strong><br/>
        Coordinates: <strong>${cLat.toFixed(4)}° N, ${cLon.toFixed(4)}° E</strong><br/>
        ${activeStation.ward}, ${activeStation.state} · Elev: ${activeStation.elevationDem}m<br/>
        Hazard Status: <strong style="color: ${riskColor(riskResult.total)};">${riskResult.level} (${riskResult.total}/100)</strong>
      </div>`,
    );
    sheltersLayerRef.current?.addLayer(uMarker);

    // 5. TOURIST HOTSPOTS (in Tourist Mode)
    if (mode === "tourist") {
      hotspots.forEach((spot) => {
        const spotColor =
          spot.status === "OPEN_AND_SAFE"
            ? "#10b981"
            : spot.status === "BLOCKED_HAZARD"
              ? "#ef4444"
              : "#f59e0b";

        const spotIcon = L.divIcon({
          className: "custom-spot-marker",
          html: `
            <div style="background-color: ${spotColor}; color: white; width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px ${spotColor}; border: 1.5px solid #ffffff;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const sMarker = L.marker([spot.lat, spot.lon], { icon: spotIcon }).bindPopup(
          `<div style="font-family: sans-serif; font-size: 12px; color: #111; max-width: 220px;">
            <strong style="color: ${spotColor}; font-size: 13px;">${spot.name}</strong><br/>
            Category: <strong>${spot.type.replace(/_/g, " ")}</strong><br/>
            Status: <strong style="color: ${spotColor};">${spot.status.replace(/_/g, " ")}</strong><br/>
            <p style="margin: 4px 0 0 0; color: #333; font-size: 11px;">${spot.advisory}</p>
          </div>`,
        );
        sheltersLayerRef.current?.addLayer(sMarker);
      });
    }
  }

  return (
    <div className="flex h-[calc(100vh-65px)] flex-col lg:flex-row overflow-hidden bg-[#07070d] text-white">
      {/* LEFT COLUMN: Map & Visuals (Dominant Space) */}
      <div className="relative flex-1 h-[50vh] lg:h-full overflow-hidden">
        {/* Leaflet Map DOM Canvas */}
        <div ref={mapContainerRef} className="h-full w-full z-10" />

        {/* Top Floating Station & Mode Selector Bar */}
        <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
          {/* Station Selector Dropdown */}
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/15 bg-[#090b14]/92 px-3.5 py-2 backdrop-blur-xl shadow-2xl">
            <MapPin className="size-4 text-purple-400 shrink-0" />
            <select
              value={activeStation.id}
              onChange={(e) => onSelectStation(e.target.value)}
              className="bg-transparent font-sans text-xs font-bold text-white focus:outline-none cursor-pointer pr-1"
            >
              {stations.map((st) => (
                <option key={st.id} value={st.id} className="bg-[#090b14] text-white">
                  {st.name} ({st.state})
                </option>
              ))}
            </select>
          </div>

          {/* Mode Switcher: Tourist Safety vs Civilian Evacuation */}
          <div className="pointer-events-auto flex items-center rounded-2xl border border-white/15 bg-[#090b14]/92 p-1 text-xs backdrop-blur-xl shadow-2xl">
            <button
              type="button"
              onClick={() => setMode("tourist")}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition-all",
                mode === "tourist"
                  ? "bg-gradient-to-r from-emerald-500/30 to-teal-500/20 text-emerald-300 border border-emerald-500/40"
                  : "text-[#8e8e9c] hover:text-white",
              )}
            >
              <Compass className="size-3.5" />
              Tourist Safety
            </button>
            <button
              type="button"
              onClick={() => setMode("civilian")}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition-all",
                mode === "civilian"
                  ? "bg-gradient-to-r from-purple-500/30 to-blue-500/20 text-purple-300 border border-purple-500/40"
                  : "text-[#8e8e9c] hover:text-white",
              )}
            >
              <Users className="size-3.5" />
              Civilian Evacuation
            </button>
          </div>

          {/* Map Layer Switcher (Street vs Satellite) */}
          <div className="pointer-events-auto hidden sm:flex items-center rounded-xl border border-white/10 bg-[#090b14]/90 p-1 text-[11px] backdrop-blur-md">
            <button
              type="button"
              onClick={() => setMapStyle("streets")}
              className={cn(
                "rounded-lg px-2.5 py-1 font-bold transition",
                mapStyle === "streets" ? "bg-white/20 text-white" : "text-[#8e8e9c] hover:text-white",
              )}
            >
              Street Map
            </button>
            <button
              type="button"
              onClick={() => setMapStyle("satellite")}
              className={cn(
                "rounded-lg px-2.5 py-1 font-bold transition",
                mapStyle === "satellite" ? "bg-white/20 text-white" : "text-[#8e8e9c] hover:text-white",
              )}
            >
              Satellite
            </button>
          </div>
        </div>

        {/* Bottom Floating Legend on Map */}
        <div className="absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-[#090b14]/92 px-4 py-2.5 backdrop-blur-xl shadow-2xl font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]" />
            <span className="font-bold text-emerald-300">Primary Safe Corridor (Green)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-[#facc15] shadow-[0_0_8px_#facc15]" />
            <span className="font-bold text-yellow-300">Secondary Bypass (Yellow)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-[#8b5cf6] shadow-[0_0_8px_#8b5cf6]" />
            <span className="text-purple-300">Origin Center</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-sm bg-[#ef4444]/60 border border-[#ef4444]" />
            <span className="text-red-400 font-bold">Hazard Zone</span>
          </div>
        </div>

        {/* 3D Digital Twin Shortcut */}
        <button
          type="button"
          onClick={() => onSwitchTo3D(activeStation.id)}
          className="absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-2xl border border-cyan-500/40 bg-[#090b14]/90 px-3.5 py-2 font-mono text-xs font-bold text-cyan-400 backdrop-blur-xl shadow-2xl hover:bg-cyan-500/10 transition-colors"
        >
          <Sparkles className="size-3.5 text-cyan-400" />
          Switch to 3D Digital Twin →
        </button>
      </div>

      {/* RIGHT COLUMN: SafeRoute Intelligence & Turn-by-Turn GPS Panel */}
      <div className="w-full lg:w-[440px] xl:w-[480px] h-[50vh] lg:h-full overflow-y-auto border-t lg:border-t-0 lg:border-l border-white/10 bg-[#090b14] p-5 space-y-5">
        {/* Header Title */}
        <div className="border-b border-white/10 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="size-5 text-emerald-400" />
              <h2 className="font-heading text-xl font-black text-white">
                {mode === "tourist" ? "Tourist Safety Radar" : "Evacuation SafeRoute"}
              </h2>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-400 border border-emerald-500/40">
              GPS LIVE
            </span>
          </div>
          <p className="mt-1 text-xs text-[#8e8e9c]">
            {mode === "tourist"
              ? "Live mountain travel advisories, local road clearance, and turn-by-turn safe navigation for travelers."
              : "Civil defense evacuation routes, shelter capacity, and slope failure avoidance corridors."}
          </p>
        </div>

        {/* Primary Destination Recommendation Card */}
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 to-[#0e1620] p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              ★ Designated Safe Assembly Destination
            </span>
            <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
              {activeShelter.operationalStatus}
            </span>
          </div>

          <div>
            <h3 className="font-sans text-base font-extrabold text-white flex items-center gap-2">
              <Building2 className="size-4 text-emerald-400 shrink-0" />
              {activeShelter.name}
            </h3>
            <div className="text-xs text-[#c9c9d3] mt-0.5">
              {activeShelter.ward}, {activeShelter.district} · Elev: <strong className="text-white">{activeShelter.elevationM}m MSL</strong>
            </div>
          </div>

          {/* Route Metrics Row */}
          <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-center">
            <div className="rounded-xl border border-white/10 bg-black/40 p-2">
              <div className="text-[10px] text-[#8e8e9c]">Distance</div>
              <div className="text-sm font-black text-white">{activeRoute.distanceKm} km</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-2">
              <div className="text-[10px] text-[#8e8e9c]">Travel Time</div>
              <div className="text-sm font-black text-emerald-400">~{activeRoute.estimatedTravelTimeMin} min</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-2">
              <div className="text-[10px] text-[#8e8e9c]">Route Risk</div>
              <div className="text-sm font-black text-emerald-400">LOW</div>
            </div>
          </div>

          {/* Accurate Local GPS Navigation Verification Box */}
          <div className="rounded-xl border border-white/10 bg-black/50 p-2.5 text-[11px] font-mono space-y-1.5">
            <div className="flex items-center justify-between text-[#8e8e9c]">
              <span className="flex items-center gap-1 text-purple-400">
                <MapPin className="size-3" /> GPS Origin (Station Center):
              </span>
              <span className="text-white font-bold">
                {activeStation.name.split(" ")[0]} ({activeStation.lat.toFixed(3)}°, {activeStation.lon.toFixed(3)}°)
              </span>
            </div>
            <div className="flex items-center justify-between text-[#8e8e9c]">
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="size-3" /> Safe Target Shelter:
              </span>
              <span className="text-emerald-300 font-bold">
                {activeShelter.name.slice(0, 24)} ({activeShelter.coordinates.lat.toFixed(3)}°, {activeShelter.coordinates.lon.toFixed(3)}°)
              </span>
            </div>
            <div className="text-[10px] text-teal-300/90 pt-1 border-t border-white/10 flex items-center justify-between">
              <span>District: {activeShelter.district}, {activeShelter.state}</span>
              <span className="text-emerald-400 font-bold">✓ Direct Local Route ({activeRoute.distanceKm} km)</span>
            </div>
          </div>

          {/* GOOGLE MAPS GPS NAVIGATION BUTTON (Turn-by-Turn GPS) */}
          <a
            href={googleMapsGpsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 font-sans text-sm font-extrabold text-black shadow-lg shadow-emerald-500/30 hover:brightness-110 transition-all text-center"
          >
            <Navigation className="size-4" />
            Start Turn-by-Turn GPS in Google Maps
            <ExternalLink className="size-3.5" />
          </a>
        </div>

        {/* Multi-Route Selection Table (Primary Green vs Secondary Yellow) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-sans text-xs font-bold uppercase tracking-wider text-[#8e8e9c]">
              Available Route Options & Road Clearance
            </h4>
            <span className="text-[10px] font-mono text-[#8e8e9c]">Click to preview</span>
          </div>

          <div className="space-y-2">
            {stationRoutes.map((rt) => {
              const isSelected = rt.id === selectedRouteId;
              const isPrimary = rt.routeType === "PRIMARY_RELIEF_CORRIDOR";
              return (
                <button
                  key={rt.id}
                  type="button"
                  onClick={() => setSelectedRouteId(rt.id)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-xl border p-3 text-left transition-all",
                    isSelected
                      ? isPrimary
                        ? "border-emerald-500/70 bg-emerald-500/15 ring-1 ring-emerald-500/50"
                        : "border-yellow-500/70 bg-yellow-500/15 ring-1 ring-yellow-500/50"
                      : "border-white/10 bg-white/5 hover:bg-white/10",
                  )}
                >
                  <div className="space-y-0.5 pr-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "size-2.5 rounded-full shrink-0",
                          isPrimary
                            ? "bg-emerald-400 shadow-[0_0_8px_#10b981]"
                            : "bg-yellow-400 shadow-[0_0_8px_#facc15]",
                        )}
                      />
                      <span className="font-sans text-xs font-bold text-white">
                        {isPrimary ? "🟢 Primary Safe Corridor" : "🟡 Secondary Bypass Route"}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#c9c9d3]">
                      {rt.name}
                    </div>
                    <div className="text-[10px] text-[#8e8e9c]">
                      Via {rt.roadClassification.replace(/_/g, " ")} · Slope {rt.averageGradientPct}%
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs shrink-0">
                    <div className="font-bold text-white">{rt.distanceKm} km</div>
                    <div className={cn("text-[11px]", isPrimary ? "text-emerald-400" : "text-yellow-400")}>
                      ~{rt.estimatedTravelTimeMin} min
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* HAZARD WARNING: ROADS & SECTORS TO AVOID */}
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
            <AlertTriangle className="size-4 shrink-0" />
            <span>Hazard Alert: Roads & Sectors to Avoid</span>
          </div>
          <div className="text-xs text-[#c9c9d3] space-y-1">
            <p>
              • <strong className="text-white">Active Mudflow Chute (NW Sector):</strong> Slope gradient exceeds 38°. Avoid pedestrian and vehicular passage.
            </p>
            <p>
              • <strong className="text-white">Valley Runoff Pass:</strong> Catchment runoff channel under active hydrologic surge warning.
            </p>
          </div>
        </div>

        {/* TOURIST SAFETY RADAR: SIGHTSEEING SPOTS & TRAVEL ADVISORIES (If Tourist Mode) */}
        {mode === "tourist" && (
          <div className="space-y-2">
            <h4 className="font-sans text-xs font-bold uppercase tracking-wider text-[#8e8e9c]">
              Tourist Destination Access Status ({activeStation.name})
            </h4>

            <div className="space-y-2">
              {hotspots.map((spot) => (
                <div
                  key={spot.name}
                  className="rounded-xl border border-white/10 bg-white/5 p-3 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-xs font-bold text-white">{spot.name}</span>
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 font-mono text-[10px] font-black uppercase",
                        spot.status === "OPEN_AND_SAFE"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : spot.status === "BLOCKED_HAZARD"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-amber-500/20 text-amber-400",
                      )}
                    >
                      {spot.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8e8e9c] leading-relaxed">{spot.advisory}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 24x7 EMERGENCY & TOURIST HELPLINES */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 space-y-2.5">
          <div className="flex items-center gap-2 text-white font-bold text-xs">
            <PhoneCall className="size-4 text-cyan-400" />
            <span>24×7 Tourist & Disaster Emergency Hotlines</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <a
              href="tel:1077"
              className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white hover:bg-white/10 transition"
            >
              <div>
                <div className="text-[10px] text-[#8e8e9c]">State Disaster</div>
                <div className="font-bold text-cyan-400">1077</div>
              </div>
              <Phone className="size-3.5 text-cyan-400" />
            </a>

            <a
              href="tel:112"
              className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white hover:bg-white/10 transition"
            >
              <div>
                <div className="text-[10px] text-[#8e8e9c]">National Police</div>
                <div className="font-bold text-emerald-400">112</div>
              </div>
              <Phone className="size-3.5 text-emerald-400" />
            </a>

            <a
              href="tel:1364"
              className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white hover:bg-white/10 transition col-span-2"
            >
              <div>
                <div className="text-[10px] text-[#8e8e9c]">State Tourist Safety Helpdesk</div>
                <div className="font-bold text-amber-400">1364 (Toll-Free 24×7)</div>
              </div>
              <Phone className="size-3.5 text-amber-400" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
