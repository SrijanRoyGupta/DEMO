import { useEffect, useRef } from "react";
import * as THREE from "three";

const SOURCES = [
  { label: "Weather Union", color: 0x38bdf8 },
  { label: "MET Norway", color: 0xf5a524 },
  { label: "Open-Meteo", color: 0x34d399 },
  { label: "RainViewer", color: 0xfb7185 },
  { label: "GloFAS", color: 0xa78bfa },
];

/** Small rotating hub-and-spoke scene: five data sources orbiting the risk engine core. */
export function DataOrbitScene({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
    camera.position.set(0, 2.2, 7);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.55, 1),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.85 }),
    );
    scene.add(core);
    const coreGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5 }),
    );
    scene.add(coreGlow);

    const radius = 2.6;
    const nodes = SOURCES.map((s, i) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 12, 12),
        new THREE.MeshBasicMaterial({ color: s.color }),
      );
      scene.add(mesh);

      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0),
      ]);
      const line = new THREE.Line(
        lineGeo,
        new THREE.LineBasicMaterial({ color: s.color, transparent: true, opacity: 0.35 }),
      );
      scene.add(line);

      return { mesh, line, angle: (i / SOURCES.length) * Math.PI * 2, speed: 0.25 + i * 0.03 };
    });

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

      core.rotation.y += reduceMotion ? 0 : 0.004;
      core.rotation.x += reduceMotion ? 0 : 0.002;

      for (const n of nodes) {
        const a = n.angle + t * n.speed;
        const x = Math.cos(a) * radius;
        const z = Math.sin(a) * radius;
        const y = Math.sin(a * 1.3) * 0.5;
        n.mesh.position.set(x, y, z);
        const pos = n.line.geometry.attributes.position as THREE.BufferAttribute;
        pos.setXYZ(1, x, y, z);
        pos.needsUpdate = true;
      }

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      core.geometry.dispose();
      (core.material as THREE.Material).dispose();
      coreGlow.geometry.dispose();
      (coreGlow.material as THREE.Material).dispose();
      for (const n of nodes) {
        n.mesh.geometry.dispose();
        (n.mesh.material as THREE.Material).dispose();
        n.line.geometry.dispose();
        (n.line.material as THREE.Material).dispose();
      }
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className={className} aria-hidden="true" />;
}
