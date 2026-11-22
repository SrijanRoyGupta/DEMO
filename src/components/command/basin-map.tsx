import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup, Marker, TileLayer } from "leaflet";
import { RIVER_CATCHMENTS } from "@/lib/stations";
import { calculateRisk, riskColor } from "@/lib/risk";
import type { RadarFrame, SpatialRainfallIntelligence, StationLive } from "@/lib/types";
import { cn } from "@/lib/utils";

const TILE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";

type LeafletNS = typeof import("leaflet");

type Props = {
  stations: StationLive[];
  activeId: string;
  onSelect: (id: string) => void;
  showNodes: boolean;
  showRivers: boolean;
  showRadar: boolean;
  radarFrame: RadarFrame | null;
  className?: string;
  center?: [number, number];
  zoom?: number;
  singleMarker?: { lat: number; lon: number; color: string; spatialRainfall?: SpatialRainfallIntelligence } | null;
};

export function BasinMap({
  stations,
  activeId,
  onSelect,
  showNodes,
  showRivers,
  showRadar,
  radarFrame,
  className,
  center = [24.5, 85],
  zoom = 5,
  singleMarker = null,
}: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const nodesRef = useRef<LayerGroup | null>(null);
  const riversRef = useRef<LayerGroup | null>(null);
  const spatialRef = useRef<LayerGroup | null>(null);
  const radarRef = useRef<TileLayer | null>(null);
  const markersRef = useRef<Record<string, Marker>>({});
  const Lref = useRef<LeafletNS | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const centerRef = useRef(center);
  const zoomRef = useRef(zoom);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = elRef.current;
    if (!el || mapRef.current) return;
    let cancelled = false;

    void import("leaflet").then((mod) => {
      if (cancelled || !elRef.current) return;
      const L = (mod as LeafletNS & { default?: LeafletNS }).default ?? (mod as LeafletNS);
      Lref.current = L;
      const map = L.map(elRef.current, { zoomControl: true, attributionControl: false }).setView(
        centerRef.current,
        zoomRef.current,
      );
      L.tileLayer(TILE, { maxZoom: 16 }).addTo(map);
      nodesRef.current = L.layerGroup().addTo(map);
      riversRef.current = L.layerGroup().addTo(map);
      spatialRef.current = L.layerGroup().addTo(map);

      RIVER_CATCHMENTS.forEach((coords) => {
        L.polyline(coords, {
          color: "#22d3ee",
          weight: 2.5,
          opacity: 0.55,
          dashArray: "6 8",
        }).addTo(riversRef.current!);
      });

      mapRef.current = map;
      setReady(true);
      window.setTimeout(() => map.invalidateSize(), 80);
    });

    return () => {
      cancelled = true;
      setReady(false);
      mapRef.current?.remove();
      mapRef.current = null;
      nodesRef.current = null;
      riversRef.current = null;
      spatialRef.current = null;
      radarRef.current = null;
      markersRef.current = {};
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    window.setTimeout(() => map.invalidateSize(), 120);
  }, [className, showRadar, showNodes]);

  useEffect(() => {
    const map = mapRef.current;
    const L = Lref.current;
    if (!map || !L) return;
    const group = nodesRef.current;
    if (!group) return;

    if (singleMarker) {
      group.clearLayers();
      markersRef.current = {};
      const m = L.marker([singleMarker.lat, singleMarker.lon], {
        icon: makeIcon(L, singleMarker.color, ""),
      }).addTo(group);
      map.setView([singleMarker.lat, singleMarker.lon], 9);
      markersRef.current.search = m;
      return;
    }

    stations.forEach((st) => {
      const { total } = calculateRisk(st);
      const color = riskColor(total);
      const existing = markersRef.current[st.id];
      const pulse = total >= 70 ? "is-crit" : total >= 40 ? "is-watch" : "";
      if (existing) {
        existing.setIcon(makeIcon(L, color, pulse));
        existing.setLatLng([st.lat, st.lon]);
      } else {
        const marker = L.marker([st.lat, st.lon], {
          icon: makeIcon(L, color, pulse),
        }).addTo(group);
        marker.bindTooltip(
          `<div style="font-size:12px;font-weight:600">${st.name}</div><div style="font-size:10px;opacity:.7">${st.state}</div>`,
          { direction: "top", offset: [0, -8] },
        );
        marker.on("click", () => onSelectRef.current(st.id));
        markersRef.current[st.id] = marker;
      }
    });
  }, [stations, singleMarker, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const found = stations.find((s) => s.id === activeId);
    if (found && !singleMarker) {
      map.panTo([found.lat, found.lon], { animate: true });
    }
  }, [activeId, stations, singleMarker]);

  // Spatial Radar Intelligence Layer: Multi-Radius Concentric Rings & Max Rainfall Marker
  useEffect(() => {
    const map = mapRef.current;
    const L = Lref.current;
    if (!map || !L) return;
    const spatialGroup = spatialRef.current;
    if (!spatialGroup) return;

    spatialGroup.clearLayers();

    let targetLat: number | null = null;
    let targetLon: number | null = null;
    let spatial: SpatialRainfallIntelligence | undefined = undefined;
    let stationName = "Monitored Station";

    if (singleMarker) {
      targetLat = singleMarker.lat;
      targetLon = singleMarker.lon;
      spatial = singleMarker.spatialRainfall;
      stationName = "Query Location";
    } else {
      const activeStation = stations.find((s) => s.id === activeId);
      if (activeStation) {
        targetLat = activeStation.lat;
        targetLon = activeStation.lon;
        spatial = activeStation.spatialRainfall;
        stationName = activeStation.name;
      }
    }

    if (targetLat == null || targetLon == null || !spatial) return;

    // 1. Concentric Analysis Radii (1 km, 2 km, 3 km, 4 km, 5 km)
    const radii = spatial.analysisRadiiKm || [1, 2, 3, 4, 5];
    radii.forEach((rKm) => {
      const circle = L.circle([targetLat!, targetLon!], {
        radius: rKm * 1000,
        color: rKm === 5 ? "#ef4444" : rKm >= 3 ? "#f59e0b" : "#38bdf8",
        weight: 1.5,
        dashArray: "5 7",
        fillColor: "#38bdf8",
        fillOpacity: 0.02,
        opacity: 0.55,
      }).addTo(spatialGroup);

      circle.bindTooltip(
        `<span style="font-size:10px;font-weight:600;color:#94a3b8">${rKm} km Analysis Radius</span>`,
        { permanent: false, direction: "top", opacity: 0.85 }
      );
    });

    // 2. Spatial Grid / Sample Points
    if (spatial.samplePoints && spatial.samplePoints.length > 0) {
      spatial.samplePoints.forEach((pt) => {
        if (pt.distanceKm <= 0.05) return;
        const val = pt.intensityMmH ?? 0;
        const color =
          val >= 20 ? "#ef4444" : val >= 10 ? "#f97316" : val >= 3 ? "#eab308" : "#38bdf8";

        const ptMarker = L.circleMarker([pt.lat, pt.lon], {
          radius: 3.5,
          color,
          fillColor: color,
          fillOpacity: 0.7,
          weight: 1,
        }).addTo(spatialGroup);

        ptMarker.bindTooltip(
          `<div style="font-family:monospace;font-size:10px;line-height:1.3">
            <b>${val.toFixed(1)} mm/hr</b> (${pt.dbz ?? 14} dBZ)<br/>
            ${pt.distanceKm.toFixed(1)} km @ ${pt.bearingDeg}°<br/>
            <span style="color:#64748b">[${pt.lat.toFixed(4)}, ${pt.lon.toFixed(4)}]</span>
          </div>`,
          { direction: "top", offset: [0, -4] }
        );
      });
    }

    // 3. Highlight Maximum Rainfall Point (🔴)
    if (spatial.maxLocation && spatial.spatialMax5kmMmH != null) {
      const maxLoc = spatial.maxLocation;
      const maxVal = spatial.spatialMax5kmMmH;

      if (maxLoc.distanceKm > 0.2) {
        L.polyline(
          [
            [targetLat, targetLon],
            [maxLoc.lat, maxLoc.lon],
          ],
          {
            color: "#ef4444",
            weight: 2,
            dashArray: "3 5",
            opacity: 0.75,
          }
        ).addTo(spatialGroup);
      }

      const maxMarker = L.marker([maxLoc.lat, maxLoc.lon], {
        icon: L.divIcon({
          className: "custom-div-icon max-rain-icon",
          html: `
            <div style="position:relative;width:22px;height:22px;display:flex;align-items:center;justify-content:center">
              <div style="position:absolute;width:22px;height:22px;border-radius:9999px;background:rgba(239,68,68,0.3);animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite"></div>
              <div style="width:12px;height:12px;border-radius:9999px;background:#ef4444;border:2px solid #ffffff;box-shadow:0 0 10px #ef4444"></div>
            </div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
      }).addTo(spatialGroup);

      maxMarker.bindPopup(
        `
        <div style="font-family:system-ui,-apple-system,sans-serif;font-size:12px;min-width:200px;line-height:1.45;color:#0f172a">
          <div style="display:flex;align-items:center;gap:6px;font-weight:700;color:#dc2626;border-bottom:1px solid #fee2e2;padding-bottom:4px;margin-bottom:6px">
            <span style="font-size:14px">🔴</span> Spatial Peak Rainfall Core
          </div>
          <div><b>Intensity:</b> <span style="color:#dc2626;font-size:13px;font-weight:700">${maxVal.toFixed(1)} mm/hr</span></div>
          <div><b>Offset:</b> ${maxLoc.distanceKm.toFixed(2)} km from ${stationName} (${maxLoc.bearingDeg.toFixed(0)}°)</div>
          <div><b>Coordinates:</b> ${maxLoc.lat.toFixed(4)}° N, ${maxLoc.lon.toFixed(4)}° E</div>
          <div style="margin-top:6px;padding:4px 6px;background:#f8fafc;border-radius:4px;font-size:10px;color:#64748b">
            Source: ${spatial.provenance?.spatialGrid?.source || "Doppler C-Band Composite"}
          </div>
        </div>
        `,
        { offset: [0, -10] }
      );
    }
  }, [stations, activeId, singleMarker, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (showNodes) {
      if (nodesRef.current && !map.hasLayer(nodesRef.current)) map.addLayer(nodesRef.current);
    } else if (nodesRef.current && map.hasLayer(nodesRef.current)) {
      map.removeLayer(nodesRef.current);
    }
    if (showRivers) {
      if (riversRef.current && !map.hasLayer(riversRef.current)) map.addLayer(riversRef.current);
    } else if (riversRef.current && map.hasLayer(riversRef.current)) {
      map.removeLayer(riversRef.current);
    }
  }, [showNodes, showRivers, ready]);

  useEffect(() => {
    const map = mapRef.current;
    const L = Lref.current;
    if (!map || !L) return;
    if (radarRef.current) {
      map.removeLayer(radarRef.current);
      radarRef.current = null;
    }
    if (!showRadar || !radarFrame) return;
    const layer = L.tileLayer(radarFrame.tileUrl, {
      opacity: 0.72,
      maxNativeZoom: 7,
      maxZoom: 12,
    });
    layer.addTo(map);
    radarRef.current = layer;
  }, [showRadar, radarFrame, ready]);

  return <div ref={elRef} className={cn("h-full w-full rounded-2xl", className)} />;
}

function makeIcon(L: LeafletNS, color: string, pulse: string) {
  return L.divIcon({
    className: "custom-div-icon",
    html: `<div class="marker-dot ${pulse}" style="background:${color};box-shadow:0 0 12px ${color}"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}
