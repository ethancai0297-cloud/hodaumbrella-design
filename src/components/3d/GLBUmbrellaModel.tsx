import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useGLTF, Html } from "@react-three/drei";
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
  // Note: debug numbers are rendered as floating 3D labels (see below), not
  // stamped into the canopy texture. So we never pass debugPanelNumbers
  // through to the texture builder.
  const panelTextures = usePerPanelTextures(svg, config.rib_count, textureDeps, {
    fabricColor,
    debugPanelNumbers: false,
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

  // Clone + normalize scene.
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

  // Bind canopy panel materials + collect per-panel world-space centers for
  // floating debug labels.
  const [panelCenters, setPanelCenters] = useState<
    Array<{ index: number; pos: [number, number, number] }>
  >([]);

  useEffect(() => {
    if (!root) return;
    const meshes: string[] = [];
    const matched: string[] = [];
    const centers: Array<{ index: number; pos: [number, number, number] }> = [];
    // Make sure world matrices reflect the normalization applied above.
    root.updateMatrixWorld(true);
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
          // Compute panel center in world space.
          const box = new THREE.Box3().setFromObject(obj);
          const c = new THREE.Vector3();
          box.getCenter(c);
          centers.push({ index: k + 1, pos: [c.x, c.y, c.z] });
        }
        return;
      }
      if (name.startsWith("rib_frame")) {
        obj.visible = showFrame;
        return;
      }
      obj.castShadow = true;
      obj.receiveShadow = true;
    });
    centers.sort((a, b) => a.index - b.index);
    setPanelCenters(centers);
    // eslint-disable-next-line no-console
    console.log("[3D] GLB meshes scanned", {
      allMeshes: meshes,
      canopyPanelsBound: matched,
      panelCenters: centers,
    });
  }, [root, panelMaterials, showFrame]);

  if (!root) return null;
  return (
    <>
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
    </>
  );
}

// Preload registered GLB
useGLTF.preload("/models/folding_21in_8panel_standard.glb");
