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

/** Canvas resolution: 20 px/mm. Default plate = BSS-ST-1, 15 × 70 mm. */
const PX_PER_MM = 20;
const TEX_W = 300;
const TEX_H = 1400;

// The insert never shows mirror-like reflections: a highlight would wash out
// the logo/text. Matte vs gloss is a production spec; on screen gloss only gets
// a faint sheen.
const FINISH: Record<HandleInsertFinish, { metalness: number; roughness: number; env: number }> = {
  matte: { metalness: 0, roughness: 0.95, env: 0 },
  gloss: { metalness: 0, roughness: 0.8, env: 0.15 },
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

const imageCache = new Map<string, Promise<HTMLImageElement>>();
export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = imageCache.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    imageCache.set(src, p);
  }
  return p;
}

export interface InsertFrame {
  w: number;
  h: number;
}

/** The insert's horizontal frame: 70 × 15 mm at 20 px/mm (canopy end on the left). */
export const INSERT_FRAME: InsertFrame = { w: TEX_H, h: TEX_W };

/** Horizontal frame for a plate of `sizeMm` (w = across, h = along the handle). */
export function insertFrame(sizeMm?: { w: number; h: number }): InsertFrame {
  if (!sizeMm) return INSERT_FRAME;
  return { w: Math.round(sizeMm.h * PX_PER_MM), h: Math.round(sizeMm.w * PX_PER_MM) };
}

/** Bounding box of the artwork group (logo + text) in frame px, before rotation. */
export function insertArtSize(
  ctx: CanvasRenderingContext2D,
  opts: HandleInsertOptions,
  logo?: HTMLImageElement | null,
  frame: InsertFrame = INSERT_FRAME
) {
  const H = frame.h;
  const scale = opts.artScale ?? opts.logoScale ?? 0.6;
  const unit = H * 0.8 * scale; // logo height / text cap height at scale 1
  const gap = unit * 0.25;
  const logoW = logo ? (unit * logo.width) / Math.max(1, logo.height) : 0;
  let textW = 0;
  const text = (opts.text ?? "").trim();
  if (text) {
    ctx.font = `700 ${unit * 0.8}px Inter, "Helvetica Neue", Arial, sans-serif`;
    textW = ctx.measureText(text).width;
  }
  const w = logoW + (logoW && textW ? gap : 0) + textW;
  return { w, h: unit, unit, gap, logoW, textW, text };
}

/**
 * Draw the plate color and the artwork group into a context whose coordinate
 * system is the horizontal frame (INSERT_FRAME, canopy end on the left).
 */
export function drawInsertArt(
  ctx: CanvasRenderingContext2D,
  opts: HandleInsertOptions,
  logo?: HTMLImageElement | null,
  frame: InsertFrame = INSERT_FRAME
) {
  const { w: W, h: H } = frame;
  ctx.fillStyle = opts.color;
  ctx.fillRect(0, 0, W, H);
  const m = insertArtSize(ctx, opts, logo, frame);
  if (!m.w) return;
  ctx.save();
  ctx.translate(W / 2 + (opts.artX ?? 0) * W, H / 2 + (opts.artY ?? 0) * H);
  ctx.rotate(((opts.artRotation ?? 0) * Math.PI) / 180);
  let x = -m.w / 2;
  if (logo && m.logoW) {
    ctx.drawImage(logo, x, -m.h / 2, m.logoW, m.h);
    x += m.logoW + (m.textW ? m.gap : 0);
  }
  if (m.text) {
    ctx.font = `700 ${m.unit * 0.8}px Inter, "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = opts.textColor ?? "#ffffff";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(m.text, x, 0);
  }
  ctx.restore();
}

/** Paint base color + artwork into the insert texture (vertical, as on the handle). */
export async function paintInsertTexture(
  opts: HandleInsertOptions,
  sizeMm?: { w: number; h: number }
): Promise<THREE.CanvasTexture> {
  const frame = insertFrame(sizeMm);
  const canvas = document.createElement("canvas");
  canvas.width = frame.h;
  canvas.height = frame.w;
  const ctx = canvas.getContext("2d")!;
  let logo: HTMLImageElement | null = null;
  if (opts.logoSrc) {
    try {
      logo = await loadImage(opts.logoSrc);
    } catch {
      logo = null; // unreadable logo: plate color (+ text) only
    }
  }
  // Horizontal frame -> vertical texture: rotate 90° clockwise. The frame's
  // left (canopy end) becomes the top of the insert, its top edge faces the
  // viewer's right, so artwork reads top-to-bottom on the standing handle and
  // upright in the horizontal view.
  ctx.translate(frame.h, 0);
  ctx.rotate(Math.PI / 2);
  drawInsertArt(ctx, opts, logo, frame);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makeInsertMaterial(finish: HandleInsertFinish = "matte") {
  const f = FINISH[finish] ?? FINISH.matte;
  return new THREE.MeshStandardMaterial({
    color: "#ffffff",
    metalness: f.metalness,
    roughness: f.roughness,
    envMapIntensity: f.env,
  });
}

export function applyInsertFinish(mat: THREE.MeshStandardMaterial, finish: HandleInsertFinish = "matte") {
  const f = FINISH[finish] ?? FINISH.matte;
  mat.metalness = f.metalness;
  mat.roughness = f.roughness;
  mat.envMapIntensity = f.env;
  mat.needsUpdate = true;
}
