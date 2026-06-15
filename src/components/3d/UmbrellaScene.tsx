import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import { Suspense, forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import type { UmbrellaModelConfig } from "@/3d/models/registry";
import { UmbrellaModel } from "./UmbrellaModel";
import { useCanopyTexture } from "./useCanopyTexture";
import { GLBUmbrellaModel } from "./GLBUmbrellaModel";

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
  debugPanelNumbers?: boolean;
  textureFlipY?: boolean;
}

export const UmbrellaScene = forwardRef<SceneApi, Props>(function UmbrellaScene(
  { config, svg, fabricColor, capColor, showFrame, textureDeps, background, debugPanelNumbers, textureFlipY },
  ref
) {
  const useGLB = !!config.model_file && config.model_file.toLowerCase().endsWith(".glb");
  // Legacy procedural texture (used only for procedural fallback path)
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
    <div className="w-full h-full bg-gradient-subtle">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ position: [radius * 1.45, radius * 0.4, radius * 1.1], fov: 50 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
        style={{ width: "100%", height: "100%", background: background ?? "transparent" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.35} />
          {/* Key light */}
          <directionalLight
            position={[radius * 3.5, radius * 4.5, radius * 2.5]}
            intensity={1.2}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          {/* Fill light */}
          <directionalLight
            position={[-radius * 3, radius * 2.2, radius * 1.5]}
            intensity={0.4}
          />
          {/* Rim light */}
          <directionalLight
            position={[-radius * 1.5, radius * 3, -radius * 3.5]}
            intensity={0.25}
          />
          <Environment preset="studio" />
          {useGLB ? (
            <GLBUmbrellaModel
              config={config}
              svg={svg}
              fabricColor={fabricColor}
              showFrame={showFrame}
              textureDeps={textureDeps}
              debugPanelNumbers={debugPanelNumbers}
              flipY={textureFlipY}
            />
          ) : (
            <UmbrellaModel
              config={config}
              texture={texture}
              fabricColor={fabricColor}
              capColor={capColor}
              showFrame={showFrame}
            />
          )}
          <ContactShadows
            position={[0, -((config.shaft_length_cm) * 0.1) + (config.canopy_height_cm * 0.1 * 0.3) - 0.05, 0]}
            opacity={0.35}
            scale={radius * 5}
            blur={3.0}
            far={radius * 2.5}
          />
          <SceneController
            radius={radius}
            canopyHeight={config.canopy_height_cm * 0.1}
            register={(api) => (apiRef.current = api)}
          />
        </Suspense>
      </Canvas>
    </div>
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
      // Studio 3/4 side view, slightly below canopy equator (matches reference photo)
      perspective: [new THREE.Vector3(radius * 1.45, radius * 0.4, radius * 1.1), target],
      top: [new THREE.Vector3(0.001, radius * 2.0, 0), target],
      front: [new THREE.Vector3(0, canopyHeight * 0.4, radius * 1.9), target],
      side: [new THREE.Vector3(radius * 1.9, canopyHeight * 0.4, 0), target],
      bottom: [new THREE.Vector3(0.001, -radius * 1.9, 0), target],
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
      enableRotate
      enablePan
      enableZoom
      minDistance={radius * 1.1}
      maxDistance={radius * 8}
      minPolarAngle={0}
      maxPolarAngle={Math.PI}
      target={[0, canopyHeight * 0.4, 0]}
    />
  );
}
