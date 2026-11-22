import { useEffect, useRef } from "react";
import * as THREE from "three";

export type ParameterSceneMode =
  | "slope-shear"
  | "caine-threshold"
  | "doppler-radar"
  | "soil-strata"
  | "satellite-orbit";

interface Props {
  mode: ParameterSceneMode;
  className?: string;
}

export function Parameter3DScene({ mode, className }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene & Camera setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030712, 0.032);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 4.5, 9);
    camera.lookAt(0, 0.5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const masterGroup = new THREE.Group();
    scene.add(masterGroup);

    // Dynamic objects cleaned up on mode switch
    const animObjects: { update: (dt: number, t: number) => void }[] = [];

    // --- BUILD SCENE BASED ON ACTIVE MODE ---
    if (mode === "slope-shear") {
      // 1. MOUNTAIN SLOPE SHEAR FAILURE & SLIP PLANE
      camera.position.set(0, 4.2, 8.5);
      camera.lookAt(0, 0, 0);

      // Bedrock stationary wedge (gray wireframe)
      const baseGeo = new THREE.BoxGeometry(6, 1.2, 4);
      const baseMat = new THREE.MeshBasicMaterial({
        color: 0x1e293b,
        wireframe: true,
        transparent: true,
        opacity: 0.6,
      });
      const bedrock = new THREE.Mesh(baseGeo, baseMat);
      bedrock.position.set(0, -1.2, 0);
      masterGroup.add(bedrock);

      // Inclined slope failure plane (35 degrees)
      const slopeGroup = new THREE.Group();
      slopeGroup.rotation.z = -0.42; // ~24 degree incline
      masterGroup.add(slopeGroup);

      // Saturated soil mantle that slips
      const mantleGeo = new THREE.BoxGeometry(4.8, 0.8, 3.2);
      const mantleMat = new THREE.MeshBasicMaterial({
        color: 0xf5a524,
        wireframe: true,
        transparent: true,
        opacity: 0.85,
      });
      const mantle = new THREE.Mesh(mantleGeo, mantleMat);
      mantle.position.set(0, 0.4, 0);
      slopeGroup.add(mantle);

      // Pore-water saturation layer (translucent blue plane)
      const waterGeo = new THREE.PlaneGeometry(4.8, 3.2);
      waterGeo.rotateX(-Math.PI / 2);
      const waterMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      });
      const waterLayer = new THREE.Mesh(waterGeo, waterMat);
      waterLayer.position.set(0, 0.05, 0);
      slopeGroup.add(waterLayer);

      // ResqNet IoT Tilt Sensor on the slope
      const sensorGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.25, 16);
      const sensorMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
      const sensor = new THREE.Mesh(sensorGeo, sensorMat);
      sensor.position.set(0.8, 0.9, 0);
      slopeGroup.add(sensor);

      // Antenna beacon
      const antennaGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0.8, 0.9, 0),
        new THREE.Vector3(0.8, 1.8, 0),
      ]);
      const antenna = new THREE.Line(
        antennaGeo,
        new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 }),
      );
      slopeGroup.add(antenna);

      // Animated shear force vectors (red sliding arrows)
      const arrowGeo = new THREE.ConeGeometry(0.14, 0.4, 8);
      arrowGeo.rotateZ(Math.PI / 2);
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0xfb7185 });
      const shearArrow = new THREE.Mesh(arrowGeo, arrowMat);
      shearArrow.position.set(2.4, 0.4, 0);
      slopeGroup.add(shearArrow);

      let slideOffset = 0;
      animObjects.push({
        update: (dt, t) => {
          // Oscillate soil creeping downward due to pore pressure
          const creep = Math.sin(t * 1.5);
          if (creep > 0.3) {
            slideOffset = (creep - 0.3) * 0.4;
          } else {
            slideOffset = 0;
          }
          mantle.position.x = slideOffset;
          sensor.position.x = 0.8 + slideOffset;
          // Pulse water layer opacity
          waterMat.opacity = 0.3 + Math.sin(t * 2) * 0.2;
        },
      });
    } else if (mode === "caine-threshold") {
      // 2. CAINE (1980) INTENSITY-DURATION STORMBREACH
      camera.position.set(0, 3.8, 8.5);

      // Storm Cloud (volumetric particle clusters)
      const cloudGeo = new THREE.SphereGeometry(1.6, 16, 16);
      const cloudMat = new THREE.MeshBasicMaterial({
        color: 0x24345c,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
      });
      const cloud = new THREE.Mesh(cloudGeo, cloudMat);
      cloud.position.set(0, 2.6, 0);
      cloud.scale.set(2.2, 0.7, 1.4);
      masterGroup.add(cloud);

      // Falling rain particle lines
      const rainCount = 120;
      const rainGeo = new THREE.BufferGeometry();
      const rainPositions = new Float32Array(rainCount * 6);
      for (let r = 0; r < rainCount; r++) {
        const rx = (Math.random() - 0.5) * 4.2;
        const rz = (Math.random() - 0.5) * 2.8;
        const ry = 0.2 + Math.random() * 2.4;
        rainPositions[r * 6] = rx;
        rainPositions[r * 6 + 1] = ry;
        rainPositions[r * 6 + 2] = rz;
        rainPositions[r * 6 + 3] = rx;
        rainPositions[r * 6 + 4] = ry - 0.35; // line segment
        rainPositions[r * 6 + 5] = rz;
      }
      rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
      const rainLines = new THREE.LineSegments(
        rainGeo,
        new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75 }),
      );
      masterGroup.add(rainLines);

      // Caine I-D Threshold Barrier Grid (Pulsing holographic plane)
      const threshGeo = new THREE.PlaneGeometry(5.5, 3.5, 12, 8);
      threshGeo.rotateX(-Math.PI / 2);
      const threshMat = new THREE.MeshBasicMaterial({
        color: 0xfb7185,
        wireframe: true,
        transparent: true,
        opacity: 0.45,
      });
      const threshPlane = new THREE.Mesh(threshGeo, threshMat);
      threshPlane.position.set(0, 0.4, 0);
      masterGroup.add(threshPlane);

      // Accumulation basin below
      const basinGeo = new THREE.BoxGeometry(5.2, 0.3, 3.2);
      const basin = new THREE.Mesh(
        basinGeo,
        new THREE.MeshBasicMaterial({ color: 0x0f172a, wireframe: true, opacity: 0.5 }),
      );
      basin.position.set(0, -0.6, 0);
      masterGroup.add(basin);

      animObjects.push({
        update: (_dt, t) => {
          // Animate falling rain
          const pos = rainGeo.attributes.position as THREE.BufferAttribute;
          for (let r = 0; r < rainCount; r++) {
            let y = pos.getY(r * 2);
            y -= 0.12;
            if (y < -0.4) y = 2.4;
            pos.setY(r * 2, y);
            pos.setY(r * 2 + 1, y - 0.35);
          }
          pos.needsUpdate = true;
          // Pulse Caine threshold plane
          threshMat.opacity = 0.3 + Math.abs(Math.sin(t * 3)) * 0.45;
        },
      });
    } else if (mode === "doppler-radar") {
      // 3. RAINVIEWER C-BAND DOPPLER RADAR SCANNER
      camera.position.set(0, 3.2, 8.2);

      // Radar Pedestal Base
      const baseGeo = new THREE.CylinderGeometry(1.2, 1.5, 0.6, 24);
      const baseMat = new THREE.MeshBasicMaterial({ color: 0x1e3a8a, wireframe: true, opacity: 0.5 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.set(0, -1.2, 0);
      masterGroup.add(base);

      // Rotating Radar Turret & Dish
      const turretGroup = new THREE.Group();
      turretGroup.position.set(0, -0.6, 0);
      masterGroup.add(turretGroup);

      // Parabolic Dish
      const dishGeo = new THREE.SphereGeometry(1.1, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.2);
      const dishMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      });
      const dish = new THREE.Mesh(dishGeo, dishMat);
      dish.rotation.x = Math.PI / 2.6; // tilt upward 20 degrees
      dish.position.set(0, 0.8, 0);
      turretGroup.add(dish);

      // Feedhorn arm
      const hornGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.8, 0),
        new THREE.Vector3(0, 1.2, 0.8),
      ]);
      turretGroup.add(new THREE.Line(hornGeo, new THREE.LineBasicMaterial({ color: 0xf5a524 })));

      // Doppler Microwave Radar Wave Cones
      const coneGroup = new THREE.Group();
      turretGroup.add(coneGroup);

      const rings = 5;
      const waveRings: THREE.Mesh[] = [];
      for (let w = 0; w < rings; w++) {
        const rad = 0.8 + w * 0.9;
        const ringGeo = new THREE.RingGeometry(rad - 0.05, rad + 0.05, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: w % 2 === 0 ? 0x38bdf8 : 0x34d399,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(0, 1.2, 0.8 + w * 0.8);
        coneGroup.add(ring);
        waveRings.push(ring);
      }

      // Reflectivity echo cloud droplets
      const echoCount = 80;
      const echoGeo = new THREE.BufferGeometry();
      const echoPos = new Float32Array(echoCount * 3);
      for (let e = 0; e < echoCount; e++) {
        echoPos[e * 3] = (Math.random() - 0.5) * 5;
        echoPos[e * 3 + 1] = 0.5 + Math.random() * 2.5;
        echoPos[e * 3 + 2] = (Math.random() - 0.5) * 5;
      }
      echoGeo.setAttribute("position", new THREE.BufferAttribute(echoPos, 3));
      const echoPoints = new THREE.Points(
        echoGeo,
        new THREE.PointsMaterial({ color: 0xfb7185, size: 0.08, transparent: true, opacity: 0.8 }),
      );
      masterGroup.add(echoPoints);

      animObjects.push({
        update: (dt, t) => {
          turretGroup.rotation.y += dt * 1.2;
          waveRings.forEach((r, i) => {
            const scale = 1.0 + Math.sin(t * 4 + i) * 0.15;
            r.scale.set(scale, scale, 1);
          });
        },
      });
    } else if (mode === "soil-strata") {
      // 4. SUB-SURFACE SOIL STRATA & PORE-PRESSURE LIQUEFACTION
      camera.position.set(0, 3.6, 7.8);

      const strataHeight = 3.6;
      const strataRadius = 1.4;

      // Layer 1: Topsoil 0-7cm (Organic permeable layer)
      const l1Geo = new THREE.CylinderGeometry(strataRadius, strataRadius, 0.7, 24);
      const l1Mat = new THREE.MeshBasicMaterial({ color: 0x34d399, wireframe: true, opacity: 0.6 });
      const l1 = new THREE.Mesh(l1Geo, l1Mat);
      l1.position.set(0, 1.2, 0);
      masterGroup.add(l1);

      // Layer 2: Root Zone 7-28cm (ISRIC Clay & Loam)
      const l2Geo = new THREE.CylinderGeometry(strataRadius, strataRadius, 1.1, 24);
      const l2Mat = new THREE.MeshBasicMaterial({ color: 0xf5a524, wireframe: true, opacity: 0.7 });
      const l2 = new THREE.Mesh(l2Geo, l2Mat);
      l2.position.set(0, 0.3, 0);
      masterGroup.add(l2);

      // Layer 3: Saturated Subsoil 28-100cm (Liquefaction slip zone)
      const l3Geo = new THREE.CylinderGeometry(strataRadius, strataRadius, 1.4, 24);
      const l3Mat = new THREE.MeshBasicMaterial({ color: 0xfb7185, wireframe: true, opacity: 0.85 });
      const l3 = new THREE.Mesh(l3Geo, l3Mat);
      l3.position.set(0, -0.9, 0);
      masterGroup.add(l3);

      // Infiltrating Water Particles (percolating downward)
      const molecCount = 60;
      const molecGeo = new THREE.BufferGeometry();
      const molecPos = new Float32Array(molecCount * 3);
      for (let m = 0; m < molecCount; m++) {
        const theta = Math.random() * Math.PI * 2;
        const rad = Math.random() * (strataRadius - 0.2);
        molecPos[m * 3] = Math.cos(theta) * rad;
        molecPos[m * 3 + 1] = -1.5 + Math.random() * strataHeight;
        molecPos[m * 3 + 2] = Math.sin(theta) * rad;
      }
      molecGeo.setAttribute("position", new THREE.BufferAttribute(molecPos, 3));
      const molecPoints = new THREE.Points(
        molecGeo,
        new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.09, transparent: true, opacity: 0.9 }),
      );
      masterGroup.add(molecPoints);

      animObjects.push({
        update: (_dt, _t) => {
          const pos = molecGeo.attributes.position as THREE.BufferAttribute;
          for (let m = 0; m < molecCount; m++) {
            let y = pos.getY(m);
            y -= 0.025; // water seepage speed
            if (y < -1.5) y = 1.5;
            pos.setY(m, y);
          }
          pos.needsUpdate = true;
          masterGroup.rotation.y += 0.005;
        },
      });
    } else if (mode === "satellite-orbit") {
      // 5. NASA GPM & COPERNICUS SENTINEL-1 DUAL ORBIT CONSTELLATION
      camera.position.set(0, 4.2, 9.5);

      // Earth Globe (Wireframe Sphere)
      const globeGeo = new THREE.SphereGeometry(2.0, 32, 24);
      const globeMat = new THREE.MeshBasicMaterial({
        color: 0x1e3a8a,
        wireframe: true,
        transparent: true,
        opacity: 0.45,
      });
      const globe = new THREE.Mesh(globeGeo, globeMat);
      masterGroup.add(globe);

      // Equator & Latitude Rings
      const eqGeo = new THREE.BufferGeometry().setFromPoints(
        new THREE.EllipseCurve(0, 0, 2.02, 2.02, 0, Math.PI * 2, false, 0)
          .getPoints(48)
          .map((p) => new THREE.Vector3(p.x, 0, p.y)),
      );
      masterGroup.add(new THREE.Line(eqGeo, new THREE.LineBasicMaterial({ color: 0x38bdf8, opacity: 0.3 })));

      // Orbit 1: NASA GPM (Equatorial inclination)
      const gpmOrbitRadius = 3.6;
      const gpmOrbitGroup = new THREE.Group();
      gpmOrbitGroup.rotation.x = 0.45; // inclination
      masterGroup.add(gpmOrbitGroup);

      const gpmBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.25, 0.25),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
      );
      gpmOrbitGroup.add(gpmBody);

      // GPM Solar panels
      const panelGeo = new THREE.PlaneGeometry(0.7, 0.2);
      const panelMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true });
      const p1 = new THREE.Mesh(panelGeo, panelMat);
      p1.position.set(0.5, 0, 0);
      gpmBody.add(p1);
      const p2 = new THREE.Mesh(panelGeo, panelMat);
      p2.position.set(-0.5, 0, 0);
      gpmBody.add(p2);

      // Orbit 2: Copernicus Sentinel-1 (Polar Sun-Synchronous inclination)
      const s1OrbitRadius = 4.2;
      const s1OrbitGroup = new THREE.Group();
      s1OrbitGroup.rotation.z = 1.35; // polar inclination
      masterGroup.add(s1OrbitGroup);

      const s1Body = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.2, 0.2),
        new THREE.MeshBasicMaterial({ color: 0xf5a524 }),
      );
      s1OrbitGroup.add(s1Body);

      // InSAR Radar Swath Beam (Cone down to earth)
      const swathGeo = new THREE.ConeGeometry(0.8, 1.8, 4, 1, true);
      swathGeo.rotateX(Math.PI);
      const swathMat = new THREE.MeshBasicMaterial({
        color: 0xf5a524,
        wireframe: true,
        transparent: true,
        opacity: 0.25,
      });
      const swathBeam = new THREE.Mesh(swathGeo, swathMat);
      swathBeam.position.set(0, -1.0, 0);
      s1Body.add(swathBeam);

      animObjects.push({
        update: (_dt, t) => {
          // Rotate GPM in Orbit 1
          const a1 = t * 0.8;
          gpmBody.position.set(Math.cos(a1) * gpmOrbitRadius, 0, Math.sin(a1) * gpmOrbitRadius);

          // Rotate Sentinel-1 in Orbit 2
          const a2 = t * 0.65 + 1.5;
          s1Body.position.set(Math.cos(a2) * s1OrbitRadius, 0, Math.sin(a2) * s1OrbitRadius);
          s1Body.lookAt(0, 0, 0);

          globe.rotation.y += 0.003;
        },
      });
    }

    // Mouse Parallax Interaction
    let targetRotX = 0;
    let targetRotY = 0;
    function onMouseMove(e: MouseEvent) {
      if (!mount) return;
      const rect = mount.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotY = x * 0.4;
      targetRotX = -y * 0.25;
    }
    window.addEventListener("mousemove", onMouseMove);

    // Responsive resize
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
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    function animate() {
      raf = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const t = clock.getElapsedTime();

      if (!reduceMotion) {
        animObjects.forEach((obj) => obj.update(dt, t));
      }

      // Smooth damping mouse tilt
      masterGroup.rotation.y += (targetRotY - masterGroup.rotation.y) * 0.05;
      masterGroup.rotation.x += (targetRotX - masterGroup.rotation.x) * 0.05;

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
  }, [mode]);

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-accent/25 bg-panel/85 shadow-2xl backdrop-blur-xl ${className ?? ""}`}>
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -left-16 -top-16 size-48 rounded-full bg-accent/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 size-48 rounded-full bg-crit/10 blur-3xl" />

      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="h-[360px] w-full cursor-grab active:cursor-grabbing sm:h-[420px]" />
    </div>
  );
}

