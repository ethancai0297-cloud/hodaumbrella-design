import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import type { UmbrellaModelConfig } from "@/3d/models/registry";
import { usePerPanelTextures } from "./usePerPanelTextures";
import { getPanelUv } from "@/3d/uvCorrection";

interface Props {
  config: UmbrellaModelConfig;
  svg: SVGSVGElement | null;
  fabricColor: string;
  showFrame: boolean;
  textureDeps: unknown[];
  debugPanelNumbers?: boolean;
  flipY?: boolean;
}

/**
 * GLB-backed umbrella preview for Folding 21" 8-panel. Loads the GLB,
 * applies per-panel canopy textures generated from the live 2D editor SVG,
 * and leaves all hardware meshes (handle_*, shaft_*, rib_frame*, handle
 * string, root) untouched with their baked materials.
 */
export function GLBUmbrellaModel({
  config,
  svg,
  fabricColor,
  showFrame,
  textureDeps,
  debugPanelNumbers = false,
  flipY = false,
}: Props) {
  const gltf = useGLTF(config.model_file);
  const panelTextures = usePerPanelTextures(svg, config.rib_count, textureDeps, {
    fabricColor,
    debugPanelNumbers,
    flipY,
  });

  // One material instance per 3D panel so selection / color changes on one
  // panel never invalidate the others.
  const panelMaterials = useMemo(() => {
    return Array.from({ length: config.rib_count }, () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        side: THREE.DoubleSide,
        roughness: 0.78,
        metalness: 0.0,
      })
    );
  }, [config.rib_count]);

  // Sync per-panel texture + fabric color through the UV correction map.
  useEffect(() => {
    let bound = 0;
    const hasTextures = panelTextures.length > 0;
    for (let k = 0; k < config.rib_count; k++) {
      const mat = panelMaterials[k];
      if (!hasTextures) {
        // No artwork → pure solid fabric color, no texture, no stripes.
        mat.map = null;
        mat.color.set(fabricColor);
        mat.needsUpdate = true;
        continue;
      }
      const meshName = `canopy_panel_${String(k + 1).padStart(2, "0")}`;
      const uv = getPanelUv(meshName);
      const twoDIndex = uv?.twoDIndex ?? k;
      const tex = panelTextures[twoDIndex] ?? null;
      mat.map = tex;
      mat.color.set(tex ? "#ffffff" : fabricColor);
      mat.needsUpdate = true;
      if (tex) bound++;
    }
    // eslint-disable-next-line no-console
    console.log("[3D] GLB panel materials updated", {
      rib_count: config.rib_count,
      texturesAvailable: panelTextures.length,
      withTexture: bound,
      fabricColor,
    });
  }, [panelTextures, fabricColor, panelMaterials, config.rib_count]);

  // Clone scene so multiple mounts (preview + headless PDF capture) don't
  // share/mutate the same node tree. Auto-normalize: center at origin and
  // scale longest dimension to ~3.2 world units so the configured camera
  // (see UmbrellaScene) frames the umbrella consistently regardless of
  // the GLB's authored size.
  const root = useMemo(() => {
    const cloned = gltf?.scene?.clone(true);
    if (!cloned) return null;
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    cloned.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const targetSize = 3.2;
    cloned.scale.setScalar(targetSize / maxDim);
    return cloned;
  }, [gltf]);

  // Bind canopy panel materials. Strict whitelist: only meshes whose name
  // matches /^canopy_panel_\d+$/ get a generated material. Every other mesh
  // (shaft, handle, handle_string, rib_frame, root groups) keeps the
  // material it shipped with inside the GLB.
  useEffect(() => {
    if (!root) return;
    const meshes: string[] = [];
    const matched: string[] = [];
    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      meshes.push(obj.name);
      const name = obj.name.toLowerCase().replace(/\s+/g, "_");
      const m = name.match(/^canopy_panel_(\d+)$/);
      if (m) {
        const k = parseInt(m[1], 10) - 1;
        if (k >= 0 && k < panelMaterials.length) {
          obj.material = panelMaterials[k];
          obj.castShadow = true;
          obj.receiveShadow = true;
          matched.push(obj.name);
        }
        return;
      }
      if (name.startsWith("rib_frame")) {
        obj.visible = showFrame;
        return;
      }
      // Hardware: keep baked material as-is.
      obj.castShadow = true;
      obj.receiveShadow = true;
    });
    // eslint-disable-next-line no-console
    console.log("[3D] GLB meshes scanned", {
      allMeshes: meshes,
      canopyPanelsBound: matched,
    });
  }, [root, panelMaterials, showFrame]);

  if (!root) return null;
  return <primitive object={root} />;
}

// Preload registered GLB
useGLTF.preload("/models/folding_21in_8panel_standard.glb");
