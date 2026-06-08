import * as THREE from "three";

/**
 * Build a curved canopy panel (a slice of the dome). Returns a BufferGeometry
 * whose UVs map back to a square top-down texture of the entire canopy, so a
 * single shared texture serves all panels at the correct wedge.
 *
 * Coordinate system: canopy lies in the XZ plane, apex on +Y.
 *  - rasterized SVG: x_svg right, y_svg down  → UV: (0.5 + 0.5·cos(θ_svg)·t, 0.5 + 0.5·sin(θ_svg)·t)
 *  - 3D: angle θ measured from +X around +Y, panel between [θA, θB].
 *  - SVG panel angles are measured with -PI/2 + index·slice. We feed the same
 *    θ here so UV picks the same wedge of the texture as is drawn on screen.
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
    radialSegments = 10,
    angularSegments = 6,
  } = opts;

  const slice = (Math.PI * 2) / ribCount;
  // Match SVG convention: angle = -PI/2 + (i - 0.5)·slice for left edge.
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
    // Dome profile: apex high, rim slightly drooped below 0. Cosine arc.
    const y = height * Math.cos((t * Math.PI) / 2) - height * 0.15 * Math.pow(t, 2);
    const rr = t * radius;
    for (let c = 0; c < cols; c++) {
      const s = c / (cols - 1);
      const angle = aA + (aB - aA) * s;
      const x = Math.cos(angle) * rr;
      const z = Math.sin(angle) * rr;
      positions.push(x, y, z);
      // UV in [0,1] from top-down texture; θ matches SVG angle directly.
      const u = 0.5 + 0.5 * Math.cos(angle) * t;
      const v = 0.5 + 0.5 * Math.sin(angle) * t;
      uvs.push(u, v);
      // Approximate outward/upward normal
      const n = new THREE.Vector3(x * 0.3, height + 0.1, z * 0.3).normalize();
      normals.push(n.x, n.y, n.z);
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
  const angle = -Math.PI / 2 + ribIndex * slice;
  const pts: THREE.Vector3[] = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = height * Math.cos((t * Math.PI) / 2) - height * 0.15 * Math.pow(t, 2);
    const rr = t * radius;
    pts.push(new THREE.Vector3(Math.cos(angle) * rr, y, Math.sin(angle) * rr));
  }
  return pts;
}
