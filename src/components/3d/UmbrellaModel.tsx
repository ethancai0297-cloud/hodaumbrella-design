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

export function UmbrellaModel({ config, texture, fabricColor, capColor, showFrame }: Props) {
  // Convert cm → scene units (1 unit ≈ 10 cm)
  const S = 0.1;
  const radius = (config.canopy_diameter_cm / 2) * S;
  const canopyH = config.canopy_height_cm * S;
  const shaftLen = config.shaft_length_cm * S;
  const shaftR = (config.shaft_diameter_mm / 2) * 0.01 * S * 10;
  const capH = (config.top_cap_dimensions.height_mm || 12) * 0.01 * S * 10;
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
    return new THREE.MeshStandardMaterial({
      color: texture ? "#ffffff" : fabricColor,
      map: texture ?? null,
      side: THREE.DoubleSide,
      roughness: 0.82,
      metalness: 0.0,
    });
  }, [texture, fabricColor]);

  // Wood-style handle gets warmer, slightly polished look
  const isWood = config.handle_material?.toLowerCase() === "wood";

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

      {/* Tiny dark finial at apex (no big sphere sticking out) */}
      <mesh name="top_cap" position={[0, canopyH + capH * 0.15, 0]}>
        <coneGeometry args={[shaftR * 1.2, capH * 1.4, 14]} />
        <meshStandardMaterial color={capColor || config.top_cap_color} roughness={0.45} metalness={0.25} />
      </mesh>

      {/* Shaft */}
      <mesh name="shaft" position={[0, canopyH * 0.3 - shaftLen / 2, 0]}>
        <cylinderGeometry args={[shaftR, shaftR, shaftLen, 18]} />
        <meshStandardMaterial color={config.shaft_color} roughness={0.35} metalness={0.55} />
      </mesh>

      {/* Rib frame (visible under canopy when toggled on) */}
      {showFrame && (
        <group name="rib_frame">
          {ribCurves.map((pts, i) => {
            const curve = new THREE.CatmullRomCurve3(pts);
            return (
              <mesh key={i} name={`rib_${i + 1}`}>
                <tubeGeometry args={[curve, 24, shaftR * 0.32, 6, false]} />
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
      <Handle
        config={config}
        bottomY={canopyH * 0.3 - shaftLen}
        shaftR={shaftR}
        isWood={isWood}
      />
    </group>
  );
}

function Handle({
  config,
  bottomY,
  shaftR,
  isWood,
}: {
  config: UmbrellaModelConfig;
  bottomY: number;
  shaftR: number;
  isWood: boolean;
}) {
  const woodColor = isWood ? config.handle_color || "#6b3a1a" : config.handle_color;
  const matProps = isWood
    ? { color: woodColor, roughness: 0.55, metalness: 0.05 }
    : { color: config.handle_color, roughness: 0.65, metalness: 0.05 };

  const isHook = config.handle_style === "j_hook";
  if (isHook) {
    const r = shaftR * 4.5;
    // Smoother, more anatomically correct J-hook curve
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, bottomY + shaftR * 0.5, 0),
      new THREE.Vector3(0, bottomY - r * 0.3, 0),
      new THREE.Vector3(0, bottomY - r * 0.9, 0),
      new THREE.Vector3(r * 0.25, bottomY - r * 1.35, 0),
      new THREE.Vector3(r * 0.85, bottomY - r * 1.4, 0),
      new THREE.Vector3(r * 1.3, bottomY - r * 1.05, 0),
      new THREE.Vector3(r * 1.35, bottomY - r * 0.5, 0),
      new THREE.Vector3(r * 1.15, bottomY - r * 0.15, 0),
    ]);
    return (
      <mesh name="handle" castShadow>
        <tubeGeometry args={[curve, 48, shaftR * 1.75, 16, false]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
    );
  }
  const len = shaftR * 14;
  return (
    <mesh name="handle" position={[0, bottomY - len / 2, 0]} castShadow>
      <cylinderGeometry args={[shaftR * 2.2, shaftR * 2.6, len, 16]} />
      <meshStandardMaterial {...matProps} />
    </mesh>
  );
}
