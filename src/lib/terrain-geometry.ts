import * as THREE from "three";

/** Deterministic wireframe ridge mesh — same shape everywhere it's used. */
export function buildTerrainGeometry(size = 26, seg = 48) {
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
  return geo;
}

/** Height of the ridge surface at a given (x, z), matching buildTerrainGeometry's formula. */
export function terrainHeightAt(x: number, z: number) {
  return Math.sin(x * 0.35) * Math.cos(z * 0.28) * 1.6 + Math.sin((x + z) * 0.12) * 1.1;
}

export function riskTone(total: number) {
  if (total >= 70) return 0xfb7185;
  if (total >= 40) return 0xf5a524;
  return 0x34d399;
}
