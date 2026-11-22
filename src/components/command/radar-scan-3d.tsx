import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Badge } from "@/components/ui/badge";
import { Activity, Compass, Radio, ShieldAlert, Sparkles, Wind } from "lucide-react";

interface NodePoint {
  name: string;
  state: string;
  lat: number;
  lon: number;
  risk: "SAFE" | "WATCH" | "CRITICAL";
  elev: number;
}

const REGION_NODES: NodePoint[] = [
  { name: "Guwahati", state: "Assam", lat: 26.14, lon: 91.73, risk: "WATCH", elev: 55 },
  { name: "Cherrapunji", state: "Meghalaya", lat: 25.27, lon: 91.73, risk: "CRITICAL", elev: 1430 },
  { name: "Gangtok", state: "Sikkim", lat: 27.33, lon: 88.61, risk: "CRITICAL", elev: 1650 },
  { name: "Shimla", state: "HP", lat: 31.1, lon: 77.17, risk: "SAFE", elev: 2276 },
  { name: "Darjeeling", state: "West Bengal", lat: 27.04, lon: 88.26, risk: "WATCH", elev: 2042 },
  { name: "Rishikesh", state: "Uttarakhand", lat: 30.08, lon: 78.26, risk: "SAFE", elev: 372 },
  { name: "Wayanad", state: "Kerala", lat: 11.68, lon: 76.13, risk: "WATCH", elev: 700 },
  { name: "Itanagar", state: "Arunachal", lat: 27.08, lon: 93.6, risk: "SAFE", elev: 320 },
];

export function RadarScan3D({
  onSelectStation,
}: {
  onSelectStation?: (query: string) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [azimuth, setAzimuth] = useState(142);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene & Camera setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030712, 0.035);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 6.5, 11);
    camera.lookAt(0, 0.5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Group for entire radar assembly (for mouse tilt interaction)
    const radarGroup = new THREE.Group();
    scene.add(radarGroup);

    // 1. Base Topographic Grid (Himalayan / Basin Terrain)
    const gridRes = 36;
    const gridSize = 14;
    const terrainGeo = new THREE.PlaneGeometry(gridSize, gridSize, gridRes, gridRes);
    terrainGeo.rotateX(-Math.PI / 2);
    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      // Generate mountain ridge waves in the north and river basin dip in the center
      const distFromCenter = Math.sqrt(x * x + z * z);
      const ridge = Math.sin(x * 0.55 + 1.2) * Math.cos(z * 0.45) * 0.95;
      const basin = Math.exp(-distFromCenter * 0.3) * -0.4;
      const northSlope = z < 0 ? Math.abs(z) * 0.28 : 0;
      posAttr.setY(i, ridge + basin + northSlope - 0.7);
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshBasicMaterial({
      color: 0x1e3a8a,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    radarGroup.add(terrainMesh);

    // 2. Concentric Radar Range Rings
    const ringRadii = [2.2, 4.2, 6.0, 7.8];
    ringRadii.forEach((radius, idx) => {
      const ringGeo = new THREE.BufferGeometry();
      const segments = 64;
      const ringPts: THREE.Vector3[] = [];
      for (let s = 0; s <= segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        ringPts.push(new THREE.Vector3(Math.cos(theta) * radius, 0.05, Math.sin(theta) * radius));
      }
      ringGeo.setFromPoints(ringPts);
      const ringMat = new THREE.LineBasicMaterial({
        color: idx === ringRadii.length - 1 ? 0x38bdf8 : 0x1e40af,
        transparent: true,
        opacity: 0.4 - idx * 0.05,
      });
      radarGroup.add(new THREE.Line(ringGeo, ringMat));
    });

    // Crosshairs on ground
    const axisGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-8, 0.05, 0),
      new THREE.Vector3(8, 0.05, 0),
      new THREE.Vector3(0, 0.05, -8),
      new THREE.Vector3(0, 0.05, 8),
    ]);
    const axisMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.2 });
    radarGroup.add(new THREE.LineSegments(axisGeo, axisMat));

    // 3. Rotating Doppler Radar Beam / Cone
    const sweepGroup = new THREE.Group();
    radarGroup.add(sweepGroup);

    // Radar beam sector / fan
    const beamRadius = 7.8;
    const beamAngle = Math.PI / 5; // 36-degree sector
    const beamGeo = new THREE.BufferGeometry();
    const beamVertices: number[] = [];
    const beamColors: number[] = [];
    const beamSegments = 24;

    const apex = new THREE.Vector3(0, 0.1, 0);
    for (let s = 0; s < beamSegments; s++) {
      const theta1 = (s / beamSegments) * beamAngle;
      const theta2 = ((s + 1) / beamSegments) * beamAngle;

      const p1 = new THREE.Vector3(Math.cos(theta1) * beamRadius, 0.1, Math.sin(theta1) * beamRadius);
      const p2 = new THREE.Vector3(Math.cos(theta2) * beamRadius, 0.1, Math.sin(theta2) * beamRadius);

      beamVertices.push(apex.x, apex.y, apex.z);
      beamVertices.push(p1.x, p1.y, p1.z);
      beamVertices.push(p2.x, p2.y, p2.z);

      // Trailing fade
      const alpha1 = 0.35 * Math.pow((s + 1) / beamSegments, 2);
      const alpha2 = 0.35 * Math.pow((s + 2) / beamSegments, 2);

      beamColors.push(0.22, 0.74, 0.97, 0.05);
      beamColors.push(0.22, 0.74, 0.97, alpha1);
      beamColors.push(0.22, 0.74, 0.97, alpha2);
    }
    beamGeo.setAttribute("position", new THREE.Float32BufferAttribute(beamVertices, 3));
    beamGeo.setAttribute("color", new THREE.Float32BufferAttribute(beamColors, 4));

    const beamMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const sweepMesh = new THREE.Mesh(beamGeo, beamMat);
    sweepGroup.add(sweepMesh);

    // Sharp leading sweep edge line
    const leadEdgeGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.12, 0),
      new THREE.Vector3(
        Math.cos(beamAngle) * beamRadius,
        0.12,
        Math.sin(beamAngle) * beamRadius,
      ),
    ]);
    const leadEdgeMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
    });
    sweepGroup.add(new THREE.Line(leadEdgeGeo, leadEdgeMat));

    // 4. Station Beacons & Radar Targets
    const beaconObjects: {
      mesh: THREE.Mesh;
      pulseRing: THREE.Mesh;
      node: NodePoint;
      pos: THREE.Vector3;
    }[] = [];

    const centerLat = 26.5;
    const centerLon = 88.5;
    const scaleFactor = 0.75;

    REGION_NODES.forEach((node) => {
      const dx = (node.lon - centerLon) * scaleFactor * 1.1;
      const dz = -(node.lat - centerLat) * scaleFactor * 1.1;
      const y = (node.elev / 2500) * 1.5 + 0.2;

      const colorVal =
        node.risk === "CRITICAL" ? 0xfb7185 : node.risk === "WATCH" ? 0xf5a524 : 0x34d399;

      // Stem from ground to elevated node
      const stemGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(dx, 0.05, dz),
        new THREE.Vector3(dx, y, dz),
      ]);
      const stemMat = new THREE.LineBasicMaterial({
        color: colorVal,
        transparent: true,
        opacity: 0.45,
      });
      radarGroup.add(new THREE.Line(stemGeo, stemMat));

      // Node point sphere
      const sphereGeo = new THREE.SphereGeometry(0.12, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({ color: colorVal });
      const nodeMesh = new THREE.Mesh(sphereGeo, sphereMat);
      nodeMesh.position.set(dx, y, dz);
      radarGroup.add(nodeMesh);

      // Pulsing wave ring around beacon
      const ringGeo = new THREE.RingGeometry(0.15, 0.22, 24);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colorVal,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      });
      const pulseRing = new THREE.Mesh(ringGeo, ringMat);
      pulseRing.position.set(dx, y, dz);
      radarGroup.add(pulseRing);

      beaconObjects.push({
        mesh: nodeMesh,
        pulseRing,
        node,
        pos: new THREE.Vector3(dx, y, dz),
      });
    });

    // Connecting Telemetry Arcs between nearby nodes
    for (let i = 0; i < beaconObjects.length; i++) {
      for (let j = i + 1; j < beaconObjects.length; j++) {
        const p1 = beaconObjects[i].pos;
        const p2 = beaconObjects[j].pos;
        const dist = p1.distanceTo(p2);
        if (dist < 4.2) {
          const mid = p1.clone().lerp(p2, 0.5);
          mid.y += dist * 0.25; // arch upward

          const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
          const pts = curve.getPoints(20);
          const arcGeo = new THREE.BufferGeometry().setFromPoints(pts);
          const arcMat = new THREE.LineBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.18,
          });
          radarGroup.add(new THREE.Line(arcGeo, arcMat));
        }
      }
    }

    // 5. Atmospheric Radar Particle Echoes (Doppler hydrometeor clutter)
    const particleCount = 180;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let p = 0; p < particleCount; p++) {
      const rad = 1.0 + Math.random() * 6.5;
      const angle = Math.random() * Math.PI * 2;
      particlePos[p * 3] = Math.cos(angle) * rad;
      particlePos[p * 3 + 1] = 0.2 + Math.random() * 2.2;
      particlePos[p * 3 + 2] = Math.sin(angle) * rad;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.05,
      transparent: true,
      opacity: 0.6,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    radarGroup.add(particles);

    // Mouse Parallax Interaction
    let targetRotX = 0;
    let targetRotY = 0;
    function onMouseMove(e: MouseEvent) {
      if (!mount) return;
      const rect = mount.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotY = x * 0.35;
      targetRotX = -y * 0.2;
    }
    window.addEventListener("mousemove", onMouseMove);

    // Resize handling
    function handleResize() {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    handleResize();
    const ro = new ResizeObserver(handleResize);
    ro.observe(mount);

    // Animation Loop
    let raf = 0;
    const clock = new THREE.Clock();
    let sweepAngle = 0;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    function animate() {
      raf = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const t = clock.getElapsedTime();

      // Rotate sweep beam
      if (!reduceMotion) {
        sweepAngle += dt * 1.35;
        sweepGroup.rotation.y = sweepAngle;
        const currentDeg = Math.floor(((sweepAngle % (Math.PI * 2)) / (Math.PI * 2)) * 360);
        setAzimuth(currentDeg);
      }

      // Pulse beacon rings
      beaconObjects.forEach((b, idx) => {
        const s = 1.0 + Math.sin(t * 3.5 + idx * 0.8) * 0.55;
        b.pulseRing.scale.set(s, s, s);
        (b.pulseRing.material as THREE.MeshBasicMaterial).opacity = Math.max(
          0.1,
          0.85 - (s - 1.0) * 0.8,
        );
      });

      // Gently rotate particles
      particles.rotation.y = t * 0.04;

      // Mouse damping interpolation
      radarGroup.rotation.y += (targetRotY - radarGroup.rotation.y) * 0.05;
      radarGroup.rotation.x += (targetRotX - radarGroup.rotation.x) * 0.05;

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouseMove);
      ro.disconnect();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative mt-8 overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-b from-panel/90 via-panel-2/95 to-bg p-1 shadow-2xl backdrop-blur-2xl">
      {/* Glow aura */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-crit/10 blur-3xl" />

      {/* 3D Viewport container */}
      <div className="relative h-[420px] w-full overflow-hidden rounded-[22px] sm:h-[480px]">
        {/* ThreeJS Canvas Mount */}
        <div ref={mountRef} className="absolute inset-0 cursor-crosshair" />

        {/* Cyber HUD Overlay: Top Left */}
        <div className="pointer-events-none absolute left-5 top-5 z-20 flex flex-col gap-1.5 font-mono text-[11px]">
          <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-bg/80 px-3 py-1.5 backdrop-blur-md">
            <span className="size-2 animate-ping rounded-full bg-accent" />
            <span className="font-bold tracking-wider text-fg">LIVE C-BAND DOPPLER HUD</span>
            <span className="text-muted">· 5.62 GHz</span>
          </div>
          <div className="flex items-center gap-3 text-muted">
            <span>
              AZ: <strong className="text-accent">{azimuth.toString().padStart(3, "0")}°</strong>
            </span>
            <span>
              EL: <strong className="text-fg">1.4°</strong>
            </span>
            <span>
              SCAN RAD: <strong className="text-fg">250 KM</strong>
            </span>
          </div>
        </div>

        {/* Cyber HUD Overlay: Top Right */}
        <div className="pointer-events-none absolute right-5 top-5 z-20 hidden items-center gap-2 font-mono text-[11px] sm:flex">
          <div className="rounded-xl border border-border/80 bg-panel/85 px-3 py-1.5 backdrop-blur-md">
            <span className="text-muted">ECHOS: </span>
            <span className="font-bold text-safe">NOMINAL</span>
            <span className="mx-2 text-border">|</span>
            <span className="text-muted">CADENCE: </span>
            <span className="font-bold text-fg">600s</span>
          </div>
        </div>

        {/* Center reticle graphic */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-25">
          <div className="size-64 rounded-full border border-dashed border-accent/40" />
          <div className="absolute size-96 rounded-full border border-accent/20" />
        </div>

        {/* Interactive Beacon Pills: Bottom Overlay */}
        <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col gap-2 rounded-2xl border border-border/70 bg-bg/85 p-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <Radio className="size-4 animate-pulse text-accent" />
            <span className="font-mono text-xs font-semibold text-fg">
              Active Sentinel Corridor Array ({REGION_NODES.length} Beacons Synced)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {REGION_NODES.slice(0, 6).map((node) => {
              const tone =
                node.risk === "CRITICAL" ? "crit" : node.risk === "WATCH" ? "watch" : "safe";
              return (
                <button
                  key={node.name}
                  type="button"
                  onClick={() => onSelectStation?.(node.name)}
                  onMouseEnter={() => setHoveredNode(node.name)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-panel px-2.5 py-1 font-mono text-[11px] text-fg transition-all hover:border-accent hover:bg-panel-2 hover:text-accent"
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{
                      background:
                        node.risk === "CRITICAL"
                          ? "#fb7185"
                          : node.risk === "WATCH"
                            ? "#f5a524"
                            : "#34d399",
                    }}
                  />
                  <span>{node.name}</span>
                  <span className="text-[9px] text-muted">{node.elev}m</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Feature & Technical Capabilities Grid */}
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3 sm:p-5">
        <div className="group rounded-2xl border border-border/80 bg-panel-2/60 p-4 transition-all hover:border-accent/50 hover:bg-panel-2">
          <div className="flex items-center justify-between">
            <div className="flex size-8 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
              <Compass className="size-4" />
            </div>
            <span className="font-mono text-[10px] text-muted">RainViewer API</span>
          </div>
          <h4 className="mt-3 font-sans text-sm font-bold text-fg">Continuous Doppler Grid</h4>
          <p className="mt-1 font-mono text-xs leading-relaxed text-muted">
            10-minute automated volumetric composite sweep across Eastern Himalayas with 1 km² radar
            reflectivity resolution.
          </p>
        </div>

        <div className="group rounded-2xl border border-border/80 bg-panel-2/60 p-4 transition-all hover:border-watch/50 hover:bg-panel-2">
          <div className="flex items-center justify-between">
            <div className="flex size-8 items-center justify-center rounded-xl border border-watch/30 bg-watch/10 text-watch">
              <Activity className="size-4" />
            </div>
            <span className="font-mono text-[10px] text-muted">Open-Meteo Land</span>
          </div>
          <h4 className="mt-3 font-sans text-sm font-bold text-fg">Pore-Water Saturation</h4>
          <p className="mt-1 font-mono text-xs leading-relaxed text-muted">
            Tracks sub-surface soil moisture (0–100 cm depth) to quantify hydrological liquefaction
            and shear failure thresholds.
          </p>
        </div>

        <div className="group rounded-2xl border border-border/80 bg-panel-2/60 p-4 transition-all hover:border-crit/50 hover:bg-panel-2">
          <div className="flex items-center justify-between">
            <div className="flex size-8 items-center justify-center rounded-xl border border-crit/30 bg-crit/10 text-crit">
              <ShieldAlert className="size-4" />
            </div>
            <span className="font-mono text-[10px] text-muted">MET Norway IFS</span>
          </div>
          <h4 className="mt-3 font-sans text-sm font-bold text-fg">Lead-Time Projection</h4>
          <p className="mt-1 font-mono text-xs leading-relaxed text-muted">
            4–6 hour advance forecast accumulation model assessing slope shear and flash flood
            trajectory before surface impact.
          </p>
        </div>
      </div>
    </div>
  );
}
