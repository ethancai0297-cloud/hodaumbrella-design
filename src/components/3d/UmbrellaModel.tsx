import { useMemo } from "react";
import * as THREE from "three";
import type { UmbrellaModelConfig } from "@/3d/models/registry";
import { buildCanopyPanelGeometry, buildRibCurve } from "./buildUmbrellaGeometry";

interface Props {
  config: UmbrellaModelConfig;
  texture: THREE.Texture | null;
  fabricColor: string;
  capColor?: string;
  showFrame: boolean;
}

/**
 * Procedural umbrella that mirrors the GLB object structure described in the
 * model registry:  canopy_panel_01..N, top_cap, shaft, rib_frame, rib_tip,
 * handle. When real GLB files are dropped into /public/models/ the loader can
 * be swapped to useGLTF() while keeping the rest of the editor unchanged.
 */
export function UmbrellaModel({ config, texture, fabricColor, capColor, showFrame }: Props) {
  // Convert cm → scene units (1 unit ≈ 10 cm so a 130cm golf canopy ≈ 13 units)
  const S = 0.1;
  const radius = (config.canopy_diameter_cm / 2) * S;
  const canopyH = config.canopy_height_cm * S;
  const shaftLen = config.shaft_length_cm * S;
  const shaftR = (config.shaft_diameter_mm / 2) * 0.01 * S * 10; // mm→cm→units
  const capH = (config.top_cap_dimensions.height_mm || 12) * 0.01 * S * 10;
  const capR = (config.top_cap_dimensions.radius_mm || 10) * 0.01 * S * 10;
  const tipR = (config.rib_tip_dimensions.radius_mm || 4) * 0.01 * S * 10;

  const panels = useMemo(
    () =>
      Array.from({ length: config.rib_count }, (_, i) =>
        buildCanopyPanelGeometry({
          ribIndex: i,
          ribCount: config.rib_count,
          radius,
          height: canopyH,
        })
      ),
    [config.rib_count, radius, canopyH]
  );

  const ribCurves = useMemo(
    () =>
      Array.from({ length: config.rib_count }, (_, i) =>
        buildRibCurve({
          ribIndex: i,
          ribCount: config.rib_count,
          radius,
          height: canopyH,
        })
      ),
    [config.rib_count, radius, canopyH]
  );

  const fabricMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: texture ? "#ffffff" : fabricColor,
      map: texture ?? null,
      side: THREE.DoubleSide,
      roughness: 0.85,
      metalness: 0.0,
    });
    return m;
  }, [texture, fabricColor]);

  return (
    <group name="umbrella_root">
      {/* Canopy panels */}
      <group name="canopy">
        {panels.map((g, i) => (
          <mesh
            key={i}
            name={`canopy_panel_${String(i + 1).padStart(2, "0")}`}
            geometry={g}
            material={fabricMat}
            castShadow
            receiveShadow
          />
        ))}
      </group>

      {/* Top cap */}
      <mesh name="top_cap" position={[0, canopyH + capH * 0.4, 0]}>
        <sphereGeometry args={[capR, 18, 14]} />
        <meshStandardMaterial color={capColor || config.top_cap_color} roughness={0.4} metalness={0.2} />
      </mesh>

      {/* Shaft */}
      <mesh name="shaft" position={[0, canopyH * 0.3 - shaftLen / 2, 0]}>
        <cylinderGeometry args={[shaftR, shaftR, shaftLen, 16]} />
        <meshStandardMaterial color={config.shaft_color} roughness={0.35} metalness={0.55} />
      </mesh>

      {/* Rib frame (visible under canopy when toggled on) */}
      {showFrame && (
        <group name="rib_frame">
          {ribCurves.map((pts, i) => {
            const curve = new THREE.CatmullRomCurve3(pts);
            return (
              <mesh key={i} name={`rib_${i + 1}`}>
                <tubeGeometry args={[curve, 20, shaftR * 0.35, 6, false]} />
                <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.6} />
              </mesh>
            );
          })}
        </group>
      )}

      {/* Rib tips */}
      <group name="rib_tip">
        {ribCurves.map((pts, i) => {
          const tip = pts[pts.length - 1];
          return (
            <mesh key={i} position={[tip.x, tip.y, tip.z]}>
              <sphereGeometry args={[tipR, 10, 8]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
            </mesh>
          );
        })}
      </group>

      {/* Handle */}
      <Handle config={config} bottomY={canopyH * 0.3 - shaftLen} shaftR={shaftR} />
    </group>
  );
}

function Handle({
  config,
  bottomY,
  shaftR,
}: {
  config: UmbrellaModelConfig;
  bottomY: number;
  shaftR: number;
}) {
  const isHook = config.handle_style === "j_hook";
  if (isHook) {
    const r = shaftR * 4;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, bottomY, 0),
      new THREE.Vector3(0, bottomY - r * 0.4, 0),
      new THREE.Vector3(r * 0.3, bottomY - r * 1.1, 0),
      new THREE.Vector3(r * 1.0, bottomY - r * 1.1, 0),
      new THREE.Vector3(r * 1.3, bottomY - r * 0.6, 0),
      new THREE.Vector3(r * 1.1, bottomY - r * 0.05, 0),
    ]);
    return (
      <mesh name="handle">
        <tubeGeometry args={[curve, 32, shaftR * 1.6, 12, false]} />
        <meshStandardMaterial color={config.handle_color} roughness={0.55} metalness={0.05} />
      </mesh>
    );
  }
  const len = shaftR * 14;
  return (
    <mesh name="handle" position={[0, bottomY - len / 2, 0]}>
      <cylinderGeometry args={[shaftR * 2.2, shaftR * 2.6, len, 14]} />
      <meshStandardMaterial color={config.handle_color} roughness={0.65} metalness={0.05} />
    </mesh>
  );
}
