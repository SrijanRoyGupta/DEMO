import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Animated 3D backdrop for the briefing page: a glowing wireframe terrain
 * ridge (stand-in for the Eastern Himalayan corridor) with a handful of
 * pulsing hazard nodes drifting over it, slowly orbited by the camera.
 * Pure three.js, no react-three-fiber — kept as a single self-contained,
 * client-only component so it's cheap to drop into any page.
 */
export function HeroScene({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030712, 0.028);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 5.5, 11);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // --- Terrain: a displaced wireframe plane, lit from below in crit red ---
    const size = 26;
    const seg = 48;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const ridge = Math.sin(x * 0.35) * Math.cos(z * 0.28) * 1.6;
      const swell = Math.sin((x + z) * 0.12) * 1.1;
      pos.setY(i, ridge + swell);
    }
    geo.computeVertexNormals();

    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xfb7185,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
    });
    const terrain = new THREE.Mesh(geo, wireMat);
    terrain.position.y = -1.5;
    scene.add(terrain);

    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    const terrainGlow = new THREE.Mesh(geo, glowMat);
    terrainGlow.position.y = -1.48;
    terrainGlow.scale.set(1.002, 1, 1.002);
    scene.add(terrainGlow);

    // --- Hazard nodes: small glowing points drifting above the ridge ---
    const nodeCount = 7;
    const nodes: { mesh: THREE.Mesh; base: THREE.Vector3; phase: number }[] = [];
    const nodeGeo = new THREE.SphereGeometry(0.09, 12, 12);
    for (let i = 0; i < nodeCount; i++) {
      const tone = i % 3 === 0 ? 0xfb7185 : i % 3 === 1 ? 0xf5a524 : 0x34d399;
      const mat = new THREE.MeshBasicMaterial({ color: tone, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(nodeGeo, mat);
      const base = new THREE.Vector3(
        (Math.random() - 0.5) * size * 0.7,
        0.4 + Math.random() * 1.6,
        (Math.random() - 0.5) * size * 0.7,
      );
      mesh.position.copy(base);
      scene.add(mesh);
      nodes.push({ mesh, base, phase: Math.random() * Math.PI * 2 });
    }

    // Faint starfield for depth
    const starGeo = new THREE.BufferGeometry();
    const starCount = 200;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 40;
      starPos[i * 3 + 1] = Math.random() * 14;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0x8b9cb3, size: 0.035, transparent: true, opacity: 0.5 }),
    );
    scene.add(stars);

    let raf = 0;
    let t = 0;
    const clock = new THREE.Clock();
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

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

    function animate() {
      raf = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      t += reduceMotion ? 0 : dt;

      const angle = t * 0.06;
      camera.position.x = Math.sin(angle) * 11.5;
      camera.position.z = Math.cos(angle) * 11.5;
      camera.position.y = 5.5 + Math.sin(t * 0.15) * 0.4;
      camera.lookAt(0, -0.5, 0);

      for (const n of nodes) {
        const pulse = 0.85 + Math.sin(t * 2 + n.phase) * 0.4;
        n.mesh.scale.setScalar(pulse);
        n.mesh.position.y = n.base.y + Math.sin(t * 0.6 + n.phase) * 0.25;
      }
      stars.rotation.y += reduceMotion ? 0 : 0.0006;

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      geo.dispose();
      nodeGeo.dispose();
      wireMat.dispose();
      glowMat.dispose();
      starGeo.dispose();
      for (const n of nodes) (n.mesh.material as THREE.Material).dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className={className} aria-hidden="true" />;
}
