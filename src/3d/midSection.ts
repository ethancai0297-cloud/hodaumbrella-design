import * as THREE from "three";
import type { HandleInsertFinish, MidSectionOptions } from "@/types/design";

/**
 * Middle section (中段 / open button) above the BSS-ST-1 handle.
 * The GLB carries it as two meshes, `mid_body` and `mid_accent`, whose baked
 * material matches the handle. Each zone gets its own material clone so its
 * color can be set independently; an unset color restores the baked one.
 */
export interface MidSectionZone {
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  baked: { color: THREE.Color; metalness: number; roughness: number };
}

const FINISH: Record<HandleInsertFinish, { metalness: number; roughness: number }> = {
  matte: { metalness: 0, roughness: 0.75 },
  gloss: { metalness: 0, roughness: 0.18 },
  metal: { metalness: 1, roughness: 0.32 },
};

export function findMidSection(root: THREE.Object3D, bodyName = "mid_body", accentName = "mid_accent") {
  let body: MidSectionZone | null = null;
  let accent: MidSectionZone | null = null;
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const n = o.name.trim().toLowerCase();
    if (n !== bodyName && n !== accentName) return;
    const src = (Array.isArray(o.material) ? o.material[0] : o.material) as THREE.MeshStandardMaterial;
    const material = (src?.clone?.() as THREE.MeshStandardMaterial) ?? new THREE.MeshStandardMaterial();
    o.material = material;
    const zone: MidSectionZone = {
      mesh: o,
      material,
      baked: { color: material.color.clone(), metalness: material.metalness, roughness: material.roughness },
    };
    if (n === bodyName) body = zone;
    else accent = zone;
  });
  return { body: body as MidSectionZone | null, accent: accent as MidSectionZone | null };
}

/**
 * @param fallbackColor used when the zone has no color of its own (the
 *        customer's handle color), keeping the baked handle-like finish.
 */
export function applyMidZone(
  zone: MidSectionZone | null,
  color?: string,
  finish?: HandleInsertFinish,
  fallbackColor?: string
) {
  if (!zone) return;
  const m = zone.material;
  if (!color && fallbackColor) {
    m.color.set(fallbackColor);
    m.metalness = zone.baked.metalness;
    m.roughness = zone.baked.roughness;
  } else if (color) {
    m.color.set(color);
    const f = FINISH[finish ?? "matte"] ?? FINISH.matte;
    m.metalness = f.metalness;
    m.roughness = f.roughness;
  } else {
    m.color.copy(zone.baked.color);
    m.metalness = zone.baked.metalness;
    m.roughness = zone.baked.roughness;
  }
  m.needsUpdate = true;
}
