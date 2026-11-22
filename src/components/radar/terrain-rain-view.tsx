import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { calculateRisk } from "@/lib/risk";
import { buildTerrainGeometry, riskTone, terrainHeightAt } from "@/lib/terrain-geometry";
import type { StationLive } from "@/lib/types";

type Props = {
  stations: StationLive[];
  activeId: string | null;
  onSelect: (id: string) => void;
  className?: string;
};

/**
 * Interactive, drag-to-orbit 3D view of the basin corridor: the wireframe
 * ridge from the landing hero, but now populated with real station
 * positions and a live rain-particle column over each one, sized and
 * colored by that station's actual current reading.
 */
export function LiveTerrainScene({ stations, activeId, onSelect, className }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stationsRef = useRef(stations);
  stationsRef.current = stations;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030712, 0.024);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 9, 15);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 6;
    controls.maxDistance = 26;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.set(0, 0, 0);

    const geo = buildTerrainGeometry();
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    });
    scene.add(new THREE.Mesh(geo, wireMat));

    // --- Map lat/lon -> plane x/z from the real spread of station coords ---
    const lats = stationsRef.current.map((s) => s.lat);
    const lons = stationsRef.current.map((s) => s.lon);
    const latMin = Math.min(...lats);
    const latMax = Math.max(...lats);
    const lonMin = Math.min(...lons);
    const lonMax = Math.max(...lons);
    const span = 20; // plane world units used for the station spread
    const project = (lat: number, lon: number) => {
      const x = ((lon - lonMin) / (lonMax - lonMin || 1) - 0.5) * span;
      const z = -((lat - latMin) / (latMax - latMin || 1) - 0.5) * span;
      return { x, z, y: terrainHeightAt(x, z) };
    };

    type Rig = {
      id: string;
      marker: THREE.Mesh;
      ring: THREE.Mesh;
      rain: THREE.Points | null;
      rainPositions: Float32Array | null;
      rainSpeed: number;
      base: THREE.Vector3;
    };
    const rigs: Rig[] = [];

    for (const st of stationsRef.current) {
      const { x, z, y } = project(st.lat, st.lon);
      const risk = calculateRisk(st).total;
      const tone = riskTone(risk);
      const base = new THREE.Vector3(x, y + 0.05, z);

      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 16, 16),
        new THREE.MeshBasicMaterial({ color: tone }),
      );
      marker.position.copy(base);
      marker.userData.stationId = st.id;
      scene.add(marker);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.24, 0.3, 24),
        new THREE.MeshBasicMaterial({ color: tone, transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(base).setY(base.y + 0.02);
      scene.add(ring);

      let rain: THREE.Points | null = null;
      let rainPositions: Float32Array | null = null;
      const intensity = Math.max(st.rainObserved, st.rain);
      if (intensity > 0.5) {
        const count = Math.min(80, 16 + Math.round(intensity * 3));
        rainPositions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          rainPositions[i * 3] = base.x + (Math.random() - 0.5) * 0.9;
          rainPositions[i * 3 + 1] = base.y + Math.random() * 3.2;
          rainPositions[i * 3 + 2] = base.z + (Math.random() - 0.5) * 0.9;
        }
        const rainGeo = new THREE.BufferGeometry();
        rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
        rain = new THREE.Points(
          rainGeo,
          new THREE.PointsMaterial({
            color: 0x38bdf8,
            size: 0.045,
            transparent: true,
            opacity: 0.75,
          }),
        );
        scene.add(rain);
      }

      rigs.push({
        id: st.id,
        marker,
        ring,
        rain,
        rainPositions,
        rainSpeed: 0.02 + Math.min(intensity, 40) * 0.0025,
        base,
      });
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    function onClick(ev: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(rigs.map((r) => r.marker));
      if (hits[0]) {
        const id = hits[0].object.userData.stationId as string;
        onSelectRef.current(id);
      }
    }
    renderer.domElement.addEventListener("click", onClick);

    function resize() {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let raf = 0;
    function animate() {
      raf = requestAnimationFrame(animate);
      for (const r of rigs) {
        const isActive = r.id === activeIdRef.current;
        r.marker.scale.setScalar(isActive ? 1.7 : 1);
        (r.ring.material as THREE.MeshBasicMaterial).opacity = isActive ? 0.95 : 0.4;

        if (r.rain && r.rainPositions) {
          const posAttr = r.rain.geometry.attributes.position as THREE.BufferAttribute;
          for (let i = 0; i < r.rainPositions.length / 3; i++) {
            let y = r.rainPositions[i * 3 + 1] - r.rainSpeed;
            if (y < r.base.y) y = r.base.y + 3.2;
            r.rainPositions[i * 3 + 1] = y;
          }
          posAttr.needsUpdate = true;
        }
      }
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("click", onClick);
      controls.dispose();
      geo.dispose();
      wireMat.dispose();
      for (const r of rigs) {
        r.marker.geometry.dispose();
        (r.marker.material as THREE.Material).dispose();
        r.ring.geometry.dispose();
        (r.ring.material as THREE.Material).dispose();
        if (r.rain) {
          r.rain.geometry.dispose();
          (r.rain.material as THREE.Material).dispose();
        }
      }
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
    // Scene is (re)built once per station-set identity change (network refetch);
    // active-station highlighting reads live refs each frame instead of rebuilding.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationsRef.current.map((s) => s.id).join(",")]);

  return <div ref={mountRef} className={className} />;
}
