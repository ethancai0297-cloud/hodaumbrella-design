import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import { Suspense, forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import type { UmbrellaModelConfig } from "@/3d/models/registry";
import { UmbrellaModel } from "./UmbrellaModel";
import { useCanopyTexture } from "./useCanopyTexture";

export type CameraPreset = "perspective" | "top" | "front" | "side" | "bottom";

export interface SceneApi {
  setView: (preset: CameraPreset) => void;
  captureView: (preset: CameraPreset) => Promise<string>;
  setShowFrame: (show: boolean) => void;
}

interface Props {
  config: UmbrellaModelConfig;
  svg: SVGSVGElement | null;
  fabricColor: string;
  capColor?: string;
  showFrame: boolean;
  textureDeps: unknown[];
  background?: string;
}

export const UmbrellaScene = forwardRef<SceneApi, Props>(function UmbrellaScene(
  { config, svg, fabricColor, capColor, showFrame, textureDeps, background = "#f5f7fb" },
  ref
) {
  const texture = useCanopyTexture(svg, textureDeps);
  const apiRef = useRef<InternalApi | null>(null);

  useImperativeHandle(ref, () => ({
    setView: (p) => apiRef.current?.setView(p),
    captureView: async (p) => (await apiRef.current?.captureView(p)) ?? "",
    setShowFrame: () => {
      /* parent owns this prop; no-op here */
    },
  }));

  const radius = (config.canopy_diameter_cm / 2) * 0.1;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      camera={{ position: [radius * 2.4, radius * 1.8, radius * 2.4], fov: 35 }}
      style={{ width: "100%", height: "100%", background }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.55} />
        <directionalLight
          position={[radius * 3, radius * 5, radius * 2]}
          intensity={1.1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <Environment preset="city" />
        <UmbrellaModel
          config={config}
          texture={texture}
          fabricColor={fabricColor}
          capColor={capColor}
          showFrame={showFrame}
        />
        <ContactShadows
          position={[0, -((config.shaft_length_cm) * 0.1) + (config.canopy_height_cm * 0.1 * 0.3) - 0.02, 0]}
          opacity={0.45}
          scale={radius * 4}
          blur={2.4}
          far={radius * 2}
        />
        <SceneController radius={radius} canopyHeight={config.canopy_height_cm * 0.1} register={(api) => (apiRef.current = api)} />
      </Suspense>
    </Canvas>
  );
});

interface InternalApi {
  setView: (preset: CameraPreset) => void;
  captureView: (preset: CameraPreset) => Promise<string>;
}

function SceneController({
  radius,
  canopyHeight,
  register,
}: {
  radius: number;
  canopyHeight: number;
  register: (api: InternalApi) => void;
}) {
  const { camera, gl, scene } = useThree();
  const controlsRef = useRef<any>(null);

  const presets = useMemo<Record<CameraPreset, [THREE.Vector3, THREE.Vector3]>>(() => {
    const target = new THREE.Vector3(0, canopyHeight * 0.4, 0);
    return {
      perspective: [new THREE.Vector3(radius * 2.4, radius * 1.8, radius * 2.4), target],
      top: [new THREE.Vector3(0.001, radius * 4.2, 0), target],
      front: [new THREE.Vector3(0, canopyHeight * 0.4, radius * 4.0), target],
      side: [new THREE.Vector3(radius * 4.0, canopyHeight * 0.4, 0), target],
      bottom: [new THREE.Vector3(0.001, -radius * 3.8, 0), target],
    };
  }, [radius, canopyHeight]);

  useEffect(() => {
    const api: InternalApi = {
      setView: (p) => {
        const [pos, tgt] = presets[p];
        camera.position.copy(pos);
        camera.lookAt(tgt);
        if (controlsRef.current) {
          controlsRef.current.target.copy(tgt);
          controlsRef.current.update();
        }
      },
      captureView: async (p) => {
        const [pos, tgt] = presets[p];
        const prevPos = camera.position.clone();
        const prevTgt = controlsRef.current?.target?.clone();
        camera.position.copy(pos);
        camera.lookAt(tgt);
        camera.updateProjectionMatrix();
        // wait one frame to ensure texture+geometry are uploaded
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        gl.render(scene, camera);
        const url = gl.domElement.toDataURL("image/png");
        if (prevPos) camera.position.copy(prevPos);
        if (prevTgt && controlsRef.current) {
          controlsRef.current.target.copy(prevTgt);
          controlsRef.current.update();
        }
        gl.render(scene, camera);
        return url;
      },
    };
    register(api);
  }, [presets, camera, gl, scene, register]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={radius * 1.4}
      maxDistance={radius * 8}
      target={[0, canopyHeight * 0.4, 0]}
    />
  );
}
