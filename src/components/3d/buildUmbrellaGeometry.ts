import * as THREE from "three";

/**
 * Build a curved canopy panel that mimics a real umbrella's silhouette:
 *  - each panel bows OUTWARD between adjacent ribs (visible scallops),
 *  - the fabric dips slightly back up at the rib tip (pagoda droop),
 *  - apex tapers to a point.
 *
 * UVs keep the original top-down mapping (0.5 + 0.5·cos(angle)·t, 0.5 + 0.5·sin(angle)·t)
 * so the rasterized SVG continues to land on the correct wedge — the bow only
 * displaces position/normals, never UVs.
 *
 * Coordinate system: canopy lies in the XZ plane, apex on +Y.
 */
export function buildCanopyPanelGeometry(opts: {
  ribIndex: number;
  ribCount: number;
  radius: number;
  height: number;
  radialSegments?: number;
  angularSegments?: number;
}) {
  const {
    ribIndex,
    ribCount,
    radius,
    height,
    radialSegments = 16,
    angularSegments = 10,
  } = opts;

  const slice = (Math.PI * 2) / ribCount;
  const aA = -Math.PI / 2 + (ribIndex - 0.5) * slice;
  const aB = aA + slice;

  const positions: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const rows = radialSegments + 1;
  const cols = angularSegments + 1;

  for (let r = 0; r < rows; r++) {
    const t = r / (rows - 1); // 0 at apex, 1 at rim
    for (let c = 0; c < cols; c++) {
      const s = c / (cols - 1); // 0 at left rib, 1 at right rib
      const angle = aA + (aB - aA) * s;

      // bow(s): 0 at rib edges, 1 mid-panel — drives outward puffing
      const bow = Math.sin(Math.PI * s);
      // droop(t): only kicks in near rim — drives rib-tip dip
      const droop = Math.max(0, t - 0.85) / 0.15; // 0..1 across last 15%

      // Vertical profile
      const yBase = height * Math.cos((t * Math.PI) / 2);
      const yPanelPuff = height * 0.06 * bow * t; // panels swell mid-wedge
      const yTipDip = height * 0.22 * droop; // pagoda dip at rib tip
      const y = yBase - height * 0.08 * t * t + yPanelPuff - yTipDip;

      // Radial profile: mid-panel pushes outward slightly so silhouette scallops
      const rOffset = radius * 0.045 * bow * t;
      const rr = t * radius + rOffset;

      const x = Math.cos(angle) * rr;
      const z = Math.sin(angle) * rr;
      positions.push(x, y, z);

      // UV stays top-down — preserves per-panel artwork alignment
      const u = 0.5 + 0.5 * Math.cos(angle) * t;
      const v = 0.5 + 0.5 * Math.sin(angle) * t;
      uvs.push(u, v);

      // Placeholder normal; recomputed below for accuracy on bowed surface
      normals.push(0, 1, 0);
    }
  }

  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c;
      const b = a + 1;
      const d = a + cols;
      const e = d + 1;
      indices.push(a, d, b);
      indices.push(b, d, e);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

export function buildRibCurve(opts: {
  ribIndex: number;
  ribCount: number;
  radius: number;
  height: number;
}) {
  const { ribIndex, ribCount, radius, height } = opts;
  const slice = (Math.PI * 2) / ribCount;
  // Ribs sit at panel edges (s = 0), which corresponds to (ribIndex - 0.5)·slice
  const angle = -Math.PI / 2 + (ribIndex - 0.5) * slice;
  const pts: THREE.Vector3[] = [];
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const droop = Math.max(0, t - 0.85) / 0.15;
    const y =
      height * Math.cos((t * Math.PI) / 2) -
      height * 0.08 * t * t -
      height * 0.22 * droop;
    const rr = t * radius;
    pts.push(new THREE.Vector3(Math.cos(angle) * rr, y, Math.sin(angle) * rr));
  }
  return pts;
}
