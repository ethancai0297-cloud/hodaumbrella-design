import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import type { UmbrellaModelConfig } from "@/3d/models/registry";
import { usePerPanelTextures } from "./usePerPanelTextures";
import { PANEL_INDEX_MAP } from "@/3d/uvCorrection";

interface Props {
  config: UmbrellaModelConfig;
  svg: SVGSVGElement | null;
  fabricColor: string;
  showFrame: boolean;
  textureDeps: unknown[];
}

/**
 * GLB-backed umbrella preview. Loads the GLB referenced by
 * config.model_file and applies the per-panel canopy textures generated
 * from the live 2D editor SVG. Hardware (handle_*, shaft_*, rib_frame*,
 * handle string) keeps its baked-in material; only the canopy panels are
 * re-skinned.
 */
export function GLBUmbrellaModel({ config, svg, fabricColor, showFrame, textureDeps }: Props) {
  const gltf = useGLTF(config.model_file);
  const panelTextures = usePerPanelTextures(
    svg,
    config.rib_count,
    textureDeps,
  );

  // Materials are kept stable across renders so three doesn't recompile shaders
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

  // Sync per-panel texture + fabric color
  useEffect(() => {
    for (let k = 0; k < config.rib_count; k++) {
      const mat = panelMaterials[k];
      const twoDIndex = PANEL_INDEX_MAP[k] ?? k;
      const tex = panelTextures[twoDIndex] ?? null;
      mat.map = tex;
      mat.color.set(tex ? "#ffffff" : fabricColor);
      mat.needsUpdate = true;
    }
  }, [panelTextures, fabricColor, panelMaterials, config.rib_count]);

  // Clone the loaded scene so multiple mounts (e.g. preview + headless PDF
  // capture) don't share/mutate the same node tree.
  const root = useMemo(() => gltf?.scene?.clone(true) ?? null, [gltf]);

  // Bind canopy panel materials and toggle the rib frame visibility on the
  // cloned scene. The hardware nodes (handle_01/02, handle string, shaft_01)
  // keep whatever material the GLB shipped with.
  useEffect(() => {
    if (!root) return;
    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const name = obj.name.toLowerCase().replace(/\s+/g, "_");
      const m = name.match(/canopy_panel_(\d+)/);
      if (m) {
        const k = parseInt(m[1], 10) - 1;
        if (k >= 0 && k < panelMaterials.length) {
          obj.material = panelMaterials[k];
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      } else if (name.startsWith("rib_frame")) {
        obj.visible = showFrame;
      } else {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }, [root, panelMaterials, showFrame]);

  if (!root) return null;
  return <primitive object={root} />;
}

// Preload registered GLB
useGLTF.preload("/models/folding_21in_8panel_standard.glb");
