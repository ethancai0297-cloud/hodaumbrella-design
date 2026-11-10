import { useEffect, useMemo } from "react";
import type { HandleButtonOptions, HandleInsertOptions, MidSectionOptions } from "@/types/design";
import { applyMidZone, findMidSection } from "@/3d/midSection";
import {
  applyInsertFinish,
  findHandleInsert,
  makeInsertMaterial,
  paintInsertTexture,
  projectInsertUVs,
} from "@/3d/handleInsert";
import * as THREE from "three";
import { useGLTF, Html } from "@react-three/drei";
import type { UmbrellaModelConfig } from "@/3d/models/registry";
import { applyCanopyTexture, measureCanopy } from "@/3d/canopyProjection";
import { useCanopyProjectionTexture } from "./useCanopyProjectionTexture";

interface Props {
  config: UmbrellaModelConfig;
  svg: SVGSVGElement | null;
  fabricColor: string;
  showFrame: boolean;
  textureDeps: unknown[];
  debugPanelNumbers?: boolean;
  /** Customization of the handle insert mesh (`handle_insert`), if the GLB has one. */
  handleInsert?: HandleInsertOptions;
  /** Handle body color (mesh `handle`); unset keeps the baked color. */
  handleColor?: string;
  /** Colors of the two-zone middle section (`mid_body` / `mid_accent`), if the GLB has one. */
  midSection?: MidSectionOptions;
  /** Open-button color (mesh `handle_button`), if the GLB has one. Unset = handle color. */
  handleButton?: HandleButtonOptions;
  /** Top cap color (models with other_parts.top_cap_mesh). */
  capColor?: string;
  /** Rib tip color (models with other_parts.tips_mesh). */
  tipColor?: string;
  /** Kept for API compatibility; the projection handles orientation. */
  flipY?: boolean;
  /** Kept for API compatibility; orientation is now computed automatically
   *  from the model's canopy tips (see canopyProjection.ts). */
  modelYawOffsetDeg?: number;
}

/**
 * GLB-backed umbrella preview.
 *
 * The 2D editor is a top-down drawing of the canopy, so instead of relying
 * on the GLB's authored UVs (which are overlapping/mirrored on the folding
 * model), we re-project UVs for every `canopy_panel_*` mesh from the top
 * view and bind ONE texture rasterized from the live 2D SVG. The model is
 * also auto-rotated so its octagon matches the 2D "flat-top" layout.
 * Hardware meshes (handle, shaft, ribs...) keep their baked materials.
 */
export function GLBUmbrellaModel({
  config,
  svg,
  fabricColor,
  showFrame,
  textureDeps,
  debugPanelNumbers = false,
  handleInsert,
  midSection,
  handleColor,
  handleButton,
  capColor,
  tipColor,
}: Props) {
  const gltf = useGLTF(config.model_file);
  const texture = useCanopyProjectionTexture(svg, config.category, textureDeps);

  // Fallback material (no SVG yet): solid fabric color.
  const solidMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: fabricColor,
        side: THREE.DoubleSide,
        roughness: 0.95,
        metalness: 0,
        envMapIntensity: 0.15,
        toneMapped: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => {
    solidMaterial.color.set(fabricColor);
    solidMaterial.needsUpdate = true;
  }, [solidMaterial, fabricColor]);

  // Clone + normalize: scale longest dimension to ~3.2 units, put the
  // canopy center on the Y axis, then project UVs. Done once per GLB.
  const { root, panelCenters, canopyMaterial } = useMemo(() => {
    const cloned = gltf?.scene?.clone(true);
    if (!cloned) return { root: null, panelCenters: [], canopyMaterial: null };

    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    cloned.scale.setScalar(3.2 / maxDim);
    cloned.updateMatrixWorld(true);

    // Center: XZ on the canopy, Y on the whole umbrella.
    const canopy = measureCanopy(cloned);
    const full = new THREE.Box3().setFromObject(cloned).getCenter(new THREE.Vector3());
    cloned.position.set(-canopy.center.x, -full.y, -canopy.center.z);
    cloned.updateMatrixWorld(true);

    // Placeholder texture; the real one is swapped in below.
    const placeholder = new THREE.CanvasTexture(document.createElement("canvas"));
    const result = applyCanopyTexture(cloned, placeholder, {
      align: "flat-top",
      panelCount: config.panel_count || 8,
      rotateModel: true,
      material: () =>
        new THREE.MeshStandardMaterial({
          color: "#ffffff",
          side: THREE.DoubleSide,
          roughness: 0.95,
          metalness: 0,
          // Keep printed colors faithful to the 2D swatches: no ACES tone
          // mapping on the canopy and only a touch of the bright studio HDRI.
          envMapIntensity: 0.15,
          toneMapped: false,
        }),
    });
    placeholder.dispose();

    const centers: Array<{ index: number; pos: [number, number, number] }> = [];
    cloned.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.castShadow = true;
      obj.receiveShadow = true;
      const m = obj.name.toLowerCase().replace(/\s+/g, "_").match(/^canopy_panel_(\d+)$/);
      if (m) {
        const c = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
        centers.push({ index: parseInt(m[1], 10), pos: [c.x, c.y, c.z] });
      }
    });
    centers.sort((a, b) => a.index - b.index);
    // eslint-disable-next-line no-console
    console.log("[3D] GLB prepared", {
      model: config.model_id,
      panels: result.panels.length,
      modelYawDeg: result.modelYawDeg,
    });
    return {
      root: cloned,
      panelCenters: centers,
      canopyMaterial: result.material as THREE.MeshStandardMaterial,
    };
  }, [gltf, config.model_id, config.panel_count]);

  // Bind the live texture (or solid color) to the canopy panels.
  useEffect(() => {
    if (!root || !canopyMaterial) return;
    const mat = texture ? canopyMaterial : solidMaterial;
    if (texture) {
      canopyMaterial.map = texture;
      canopyMaterial.needsUpdate = true;
    }
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh && /canopy/i.test(obj.name)) obj.material = mat;
    });
  }, [root, canopyMaterial, solidMaterial, texture]);

  // Handle insert (BSS-ST-1 盖片): projected UVs + painted color/logo texture.
  const insert = useMemo(() => {
    if (!root) return null;
    const mesh = findHandleInsert(root);
    if (!mesh) return null;
    projectInsertUVs(mesh);
    const material = makeInsertMaterial();
    mesh.material = material;
    return { mesh, material };
  }, [root]);

  useEffect(() => {
    if (!insert || !handleInsert) return;
    let cancelled = false;
    applyInsertFinish(insert.material, handleInsert.finish);
    const size = config.handle_insert
      ? { w: config.handle_insert.width_mm, h: config.handle_insert.length_mm }
      : undefined;
    paintInsertTexture(handleInsert, size).then((tex) => {
      if (cancelled) {
        tex.dispose();
        return;
      }
      const old = insert.material.map;
      insert.material.map = tex;
      insert.material.needsUpdate = true;
      old?.dispose();
    });
    return () => {
      cancelled = true;
    };
  }, [insert, handleInsert?.color, handleInsert?.finish, handleInsert?.logoSrc, handleInsert?.logoScale, handleInsert?.text, handleInsert?.textColor, handleInsert?.artX, handleInsert?.artY, handleInsert?.artScale, handleInsert?.artRotation, config.handle_insert?.width_mm, config.handle_insert?.length_mm]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle body (mesh `handle`): own material so its color can change.
  const handleBody = useMemo(() => {
    if (!root) return null;
    let found: { material: THREE.MeshStandardMaterial; baked: THREE.Color } | null = null;
    root.traverse((o) => {
      if (found || !(o instanceof THREE.Mesh) || o.name.trim().toLowerCase() !== "handle") return;
      const src = (Array.isArray(o.material) ? o.material[0] : o.material) as THREE.MeshStandardMaterial;
      const material = src.clone();
      o.material = material;
      found = { material, baked: material.color.clone() };
    });
    return found as { material: THREE.MeshStandardMaterial; baked: THREE.Color } | null;
  }, [root]);
  // Models with a fixed frame color (straight 23") default the handle to the
  // configured handle color instead of the baked one.
  const handleDefault = config.frame_color ? config.handle_color : undefined;
  useEffect(() => {
    if (!handleBody) return;
    const c = handleColor ?? handleDefault;
    if (c) handleBody.material.color.set(c);
    else handleBody.material.color.copy(handleBody.baked);
    handleBody.material.needsUpdate = true;
  }, [handleBody, handleColor, handleDefault]);

  // Frame hardware in a fixed color (frame_color), with the rib tips and top
  // cap as separately colored parts (other_parts). Each gets its own material.
  const parts = useMemo(() => {
    if (!root || !config.frame_color) return null;
    const norm = (n: string) => n.trim().toLowerCase().replace(/\s+/g, "_");
    const tipsName = config.other_parts?.tips_mesh ? norm(config.other_parts.tips_mesh) : null;
    const capName = config.other_parts?.top_cap_mesh ? norm(config.other_parts.top_cap_mesh) : null;
    const tips: THREE.MeshStandardMaterial[] = [];
    const cap: THREE.MeshStandardMaterial[] = [];
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const n = norm(o.name);
      if (/canopy/.test(n) || n.startsWith("handle") || n.startsWith("mid_")) return;
      const src = (Array.isArray(o.material) ? o.material[0] : o.material) as THREE.MeshStandardMaterial;
      const m = src.clone();
      m.color.set(config.frame_color!);
      m.metalness = 0;
      m.roughness = 0.6;
      o.material = m;
      if (n === tipsName) tips.push(m);
      else if (n === capName) cap.push(m);
    });
    return { tips, cap };
  }, [root, config.frame_color, config.other_parts]);
  useEffect(() => {
    if (!parts) return;
    const set = (ms: THREE.MeshStandardMaterial[], c?: string) =>
      ms.forEach((m) => {
        m.color.set(c || config.frame_color!);
        m.needsUpdate = true;
      });
    set(parts.tips, tipColor);
    set(parts.cap, capColor);
  }, [parts, tipColor, capColor, config.frame_color]);

  // Middle section (中段): two independently colored zones, default = handle color.
  const mid = useMemo(() => (root ? findMidSection(root) : null), [root]);
  useEffect(() => {
    if (!mid) return;
    applyMidZone(mid.body, midSection?.bodyColor, "matte", handleColor);
    applyMidZone(mid.accent, midSection?.accentColor, midSection?.accentFinish === "gloss" ? "gloss" : "matte", handleColor);
  }, [mid, midSection?.bodyColor, midSection?.accentColor, midSection?.accentFinish, handleColor]);

  // Open button (mesh `handle_button`): own color, default = handle color.
  const button = useMemo(
    () => (root && config.handle_button ? findMidSection(root, config.handle_button.mesh.toLowerCase(), "\u0000").body : null),
    [root, config.handle_button],
  );
  useEffect(() => {
    if (!button) return;
    applyMidZone(button, handleButton?.color, handleButton?.finish === "gloss" ? "gloss" : "matte", handleColor);
  }, [button, handleButton?.color, handleButton?.finish, handleColor]);

  // Frame visibility.
  useEffect(() => {
    if (!root) return;
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.name.toLowerCase().startsWith("rib_frame")) obj.visible = showFrame;
    });
  }, [root, showFrame]);

  if (!root) return null;
  return (
    <group>
      <primitive object={root} />
      {debugPanelNumbers &&
        panelCenters.map(({ index, pos }) => (
          <Html
            key={index}
            position={pos}
            center
            distanceFactor={6}
            zIndexRange={[100, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div
              style={{
                background: "#ffffff",
                color: "#000000",
                border: "2px solid #000000",
                borderRadius: "9999px",
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "sans-serif",
                fontWeight: 700,
                fontSize: 18,
                lineHeight: 1,
                boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                userSelect: "none",
              }}
            >
              {index}
            </div>
          </Html>
        ))}
    </group>
  );
}

// Preload registered GLBs
useGLTF.preload("/models/folding_21in_8panel_standard.glb");
useGLTF.preload("/models/folding_21in_6panel_standard.glb");
useGLTF.preload("/models/straight_23in_8panel_standard.glb");
useGLTF.preload("/models/golf_30in_8panel_standard.glb");
