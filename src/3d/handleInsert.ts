import * as THREE from "three";
import type { HandleInsertFinish, HandleInsertOptions } from "@/types/design";

/**
 * Handle insert ("盖片") of the BSS-ST-1 handle.
 *
 * The GLB carries the insert as its own mesh named `handle_insert`: a
 * 15 × 70 mm curved plate that sits in a recess on one side of the handle.
 * It has no authored UVs, so we project UVs flat onto its face (same idea as
 * the canopy projection) and paint one canvas texture: base color + an
 * optional logo, centered and rotated to run along the handle.
 */

export const HANDLE_INSERT_MESH = /^handle_insert$/i;

/** Canvas resolution: 15 × 70 mm at ~20 px/mm. */
const TEX_W = 300;
const TEX_H = 1400;

const FINISH: Record<HandleInsertFinish, { metalness: number; roughness: number }> = {
  matte: { metalness: 0, roughness: 0.75 },
  gloss: { metalness: 0, roughness: 0.18 },
};

export function findHandleInsert(root: THREE.Object3D): THREE.Mesh | null {
  let found: THREE.Mesh | null = null;
  root.traverse((o) => {
    if (!found && o instanceof THREE.Mesh && HANDLE_INSERT_MESH.test(o.name.trim())) found = o;
  });
  return found;
}

/**
 * Project UVs onto the insert's face, seen from outside the handle.
 * The handle runs along the model's up axis (glTF +Y) → v. The insert sits
 * off-axis; the horizontal direction from the shaft axis to its centroid is
 * its outward normal, and up × outward is "right" for a viewer facing it → u.
 * Works at any rotation of the handle around the shaft.
 */
export function projectInsertUVs(mesh: THREE.Mesh) {
  const geo = mesh.geometry as THREE.BufferGeometry;
  const pos = geo.getAttribute("position");
  const p = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) c.add(p.fromBufferAttribute(pos, i));
  c.divideScalar(pos.count || 1);

  const up = new THREE.Vector3(0, 1, 0);
  const out = new THREE.Vector3(c.x, 0, c.z);
  if (out.lengthSq() < 1e-12) out.set(0, 0, 1);
  out.normalize();
  const right = new THREE.Vector3().crossVectors(up, out).normalize();

  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  const raw = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const u = p.dot(right), v = p.y;
    raw[i * 2] = u; raw[i * 2 + 1] = v;
    minU = Math.min(minU, u); maxU = Math.max(maxU, u);
    minV = Math.min(minV, v); maxV = Math.max(maxV, v);
  }
  const su = maxU - minU || 1, sv = maxV - minV || 1;
  for (let i = 0; i < pos.count; i++) {
    raw[i * 2] = (raw[i * 2] - minU) / su;
    raw[i * 2 + 1] = (raw[i * 2 + 1] - minV) / sv;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(raw, 2));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Paint base color + optional logo into a texture for the insert. */
export async function paintInsertTexture(opts: HandleInsertOptions): Promise<THREE.CanvasTexture> {
  const canvas = document.createElement("canvas");
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = opts.color;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  if (opts.logoSrc) {
    try {
      const img = await loadImage(opts.logoSrc);
      // A wide logo runs along the handle (rotated 90°); a tall one stays upright.
      const rotate = img.width > img.height;
      const boxW = TEX_W * 0.78;
      const boxH = TEX_H * 0.8 * (opts.logoScale ?? 0.6);
      const w = rotate ? img.height : img.width;
      const h = rotate ? img.width : img.height;
      const s = Math.min(boxW / w, boxH / h);
      ctx.save();
      ctx.translate(TEX_W / 2, TEX_H / 2);
      if (rotate) ctx.rotate(-Math.PI / 2);
      const dw = img.width * s, dh = img.height * s;
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
    } catch {
      /* unreadable logo: keep the plain color */
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makeInsertMaterial(finish: HandleInsertFinish = "matte") {
  const f = FINISH[finish] ?? FINISH.matte;
  return new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: f.metalness, roughness: f.roughness });
}

export function applyInsertFinish(mat: THREE.MeshStandardMaterial, finish: HandleInsertFinish = "matte") {
  const f = FINISH[finish] ?? FINISH.matte;
  mat.metalness = f.metalness;
  mat.roughness = f.roughness;
  mat.needsUpdate = true;
}
