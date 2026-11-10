import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import { useCallback, Suspense, forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import type { UmbrellaModelConfig } from "@/3d/models/registry";
import type { HandleButtonOptions, HandleInsertOptions, MidSectionOptions } from "@/types/design";
import { UmbrellaModel } from "./UmbrellaModel";
import { useCanopyTexture } from "./useCanopyTexture";
import { GLBUmbrellaModel } from "./GLBUmbrellaModel";

export type CameraPreset = "perspective" | "hero" | "top" | "front" | "side" | "bottom" | "handle" | "handleAngle" | "handleFlat";

export interface SceneApi {
  setView: (preset: CameraPreset) => void;
  /** Resolves once the canopy texture has been bound (or after `timeoutMs`). */
  waitReady: (timeoutMs?: number) => Promise<boolean>;
  captureView: (preset: CameraPreset) => Promise<string>;
  setShowFrame: (show: boolean) => void;
}

interface Props {
  config: UmbrellaModelConfig;
  svg: SVGSVGElement | null;
  fabricColor: string;
  capColor?: string;
  handleInsert?: HandleInsertOptions;
  midSection?: MidSectionOptions;
  handleButton?: HandleButtonOptions;
  handleColor?: string;
  tipColor?: string;
  showFrame: boolean;
  textureDeps: unknown[];
  background?: string;
  debugPanelNumbers?: boolean;
  textureFlipY?: boolean;
}

export const UmbrellaScene = forwardRef<SceneApi, Props>(function UmbrellaScene(
  { config, svg, fabricColor, capColor, handleInsert, midSection, handleButton, handleColor, tipColor, showFrame, textureDeps, background, debugPanelNumbers, textureFlipY },
  ref
) {
  const useGLB = !!config.model_file && config.model_file.toLowerCase().endsWith(".glb");
  // Legacy procedural texture (used only for procedural fallback path)
  const texture = useCanopyTexture(svg, textureDeps);
  const apiRef = useRef<InternalApi | null>(null);

  useImperativeHandle(ref, () => ({
    setView: (p) => apiRef.current?.setView(p),
    waitReady: async (ms = 8000) => {
      // The inner controller mounts after Suspense resolves (GLB + HDRI
      // loaded); wait for it before asking about the texture.
      const start = performance.now();
      while (!apiRef.current) {
        if (performance.now() - start > ms) return false;
        await new Promise((r) => setTimeout(r, 100));
      }
      return apiRef.current.waitReady(ms - (performance.now() - start));
    },
    captureView: async (p) => (await apiRef.current?.captureView(p)) ?? "",
    setShowFrame: () => {
      /* parent owns this prop; no-op here */
    },
  }));

  useEffect(() => {
    if (!useGLB) return;
    // eslint-disable-next-line no-console
    console.log("[3D] UmbrellaScene GLB props", {
      modelId: config.model_id,
      hasSvg: !!svg,
      svgOuterHTMLLength: svg?.outerHTML?.length ?? 0,
      svgDataVersion: svg?.getAttribute("data-version") ?? null,
      fabricColor,
      debugPanelNumbers,
      textureDepsLen: textureDeps?.length ?? 0,
    });
  }, [useGLB, config.model_id, svg, fabricColor, debugPanelNumbers, textureDeps]);

  // When the GLB path is active the model is auto-normalized to ~3.2 world
  // units (see GLBUmbrellaModel), so the camera frame is fixed and does
  // NOT scale with config.canopy_diameter_cm.
  const radius = useGLB ? 1.6 : (config.canopy_diameter_cm / 2) * 0.1;
  const canopyHeight = useGLB ? 1.2 : config.canopy_height_cm * 0.1;
  const initialCamera: [number, number, number] = useGLB
    ? [0, 1.2, 4.2]
    : [radius * 1.45, radius * 0.4, radius * 1.1];

  return (
    <div className="w-full h-full bg-gradient-subtle">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ position: initialCamera, fov: 45, near: 0.01, far: 1000 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
        style={{ width: "100%", height: "100%", background: background ?? "transparent" }}
      >
        <Suspense fallback={null}>
          {/* Lighting is tuned so a canopy facing the camera shows the 2D
              swatch color almost 1:1 (canopy material is not tone-mapped). */}
          <hemisphereLight intensity={0.55} color="#ffffff" groundColor="#d9dde4" />
          {/* Key light */}
          <directionalLight
            position={[radius * 3.5, radius * 4.5, radius * 2.5]}
            intensity={0.5}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          {/* Fill light */}
          <directionalLight
            position={[-radius * 3, radius * 2.2, radius * 1.5]}
            intensity={0.2}
          />
          {/* Rim light */}
          <directionalLight
            position={[-radius * 1.5, radius * 3, -radius * 3.5]}
            intensity={0.25}
          />
          {/* Self-hosted HDRI: the drei presets download from a GitHub CDN, which is unreachable from mainland China. */}
          <Environment files="/hdri/studio_small_03_1k.hdr" />
          {useGLB ? (
            <GLBUmbrellaModel
              config={config}
              svg={svg}
              fabricColor={fabricColor}
              showFrame={showFrame}
              textureDeps={textureDeps}
              debugPanelNumbers={debugPanelNumbers}
              handleInsert={handleInsert}
              midSection={midSection}
              handleButton={handleButton}
              handleColor={handleColor}
              capColor={capColor}
              tipColor={tipColor}
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
            name="contact-shadows"
            position={[0, useGLB ? -1.6 : -((config.shaft_length_cm) * 0.1) + (config.canopy_height_cm * 0.1 * 0.3) - 0.05, 0]}
            opacity={0.35}
            scale={radius * 5}
            blur={3.0}
            far={radius * 2.5}
          />
          <SceneController
            radius={radius}
            canopyHeight={canopyHeight}
            useGLB={useGLB}
            autoHandleViews={useGLB && config.handle_camera === "auto"}
            register={(api) => (apiRef.current = api)}
          />
        </Suspense>
      </Canvas>
    </div>
  );
});

interface InternalApi {
  setView: (preset: CameraPreset) => void;
  waitReady: (timeoutMs?: number) => Promise<boolean>;
  captureView: (preset: CameraPreset) => Promise<string>;
}

function SceneController({
  radius,
  canopyHeight,
  useGLB,
  autoHandleViews,
  register,
}: {
  radius: number;
  canopyHeight: number;
  useGLB: boolean;
  autoHandleViews?: boolean;
  register: (api: InternalApi) => void;
}) {
  const { camera, gl, scene, size } = useThree();
  const controlsRef = useRef<any>(null);

  // On-screen pan offset in CSS px (see the pan effect below).
  const panRef = useRef({ x: 0, y: 0 });
  const applyPan = useCallback(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const { x, y } = panRef.current;
    if (!x && !y) cam.clearViewOffset();
    else {
      const w = gl.domElement.clientWidth || 1;
      const h = gl.domElement.clientHeight || 1;
      cam.setViewOffset(w, h, -x, -y, w, h);
    }
    cam.updateProjectionMatrix();
  }, [camera, gl]);
  const resetPan = useCallback(() => {
    panRef.current = { x: 0, y: 0 };
    applyPan();
  }, [applyPan]);

  const presets = useMemo<Record<CameraPreset, [THREE.Vector3, THREE.Vector3]>>(() => {
    if (useGLB) {
      // Normalized GLB model: longest dim ~3.2, centered at origin.
      const target = new THREE.Vector3(0, 0, 0);
      return {
        perspective: [new THREE.Vector3(0, 1.2, 4.2), target],
        // 3/4 view from above-front-right: shows the printed canopy and the
        // umbrella's shape at once. Used as the hero shot in exports.
        hero: [new THREE.Vector3(2.4, 2.9, -3.4), new THREE.Vector3(0, 0.2, 0)],
        // Tiny +Z offset (not +X) so lookAt resolves screen-up to world -Z,
        // which makes the top view match the 2D editor orientation exactly.
        top: [new THREE.Vector3(0, 7.5, 0.001), target],
        front: [new THREE.Vector3(0, 0.4, 4.2), target],
        side: [new THREE.Vector3(4.2, 0.4, 0), target],
        bottom: [new THREE.Vector3(0, -7.5, 0.001), target],
        // Close-up of the handle (BSS-ST-1 insert). The handle sits at the
        // bottom of the normalized model, ~1.14 units below center.
        handle: [new THREE.Vector3(0.3, -0.95, 0.9), new THREE.Vector3(0, -1.08, 0)],
        handleAngle: [new THREE.Vector3(0.85, -0.85, 0.35), new THREE.Vector3(0, -1.08, 0)],
        handleFlat: [new THREE.Vector3(0, -1.1, 1.0), new THREE.Vector3(0, -1.1, 0)],
      };
    }
    const target = new THREE.Vector3(0, canopyHeight * 0.4, 0);
    return {
      perspective: [new THREE.Vector3(radius * 1.45, radius * 0.4, radius * 1.1), target],
      hero: [new THREE.Vector3(radius * 1.3, radius * 1.3, radius * 1.5), target],
      top: [new THREE.Vector3(0.001, radius * 2.0, 0), target],
      front: [new THREE.Vector3(0, canopyHeight * 0.4, radius * 1.9), target],
      side: [new THREE.Vector3(radius * 1.9, canopyHeight * 0.4, 0), target],
      bottom: [new THREE.Vector3(0.001, -radius * 1.9, 0), target],
      handle: [new THREE.Vector3(0.001, -radius * 1.9, 0), target],
      handleAngle: [new THREE.Vector3(0.001, -radius * 1.9, 0), target],
      handleFlat: [new THREE.Vector3(0.001, -radius * 1.9, 0), target],
    };
  }, [radius, canopyHeight, useGLB]);

  // Handle close-ups framed from the handle meshes themselves (models with
  // handle_camera: "auto"). The insert faces away from the shaft axis; the
  // 3/4 view turns to the side so the handle's profile (e.g. the carabiner
  // loop) shows.
  const resolve = useCallback(
    (p: CameraPreset): [THREE.Vector3, THREE.Vector3] => {
      if (!autoHandleViews || !p.startsWith("handle")) return presets[p];
      let body: THREE.Object3D | null = null;
      let insert: THREE.Object3D | null = null;
      scene.traverse((o) => {
        if (!(o as THREE.Mesh).isMesh) return;
        const n = o.name.trim().toLowerCase();
        if (n === "handle") body = o;
        else if (n === "handle_insert") insert = o;
      });
      if (!body) return presets[p];
      const hb = new THREE.Box3().setFromObject(body);
      const tgt = hb.getCenter(new THREE.Vector3());
      const H = hb.max.y - hb.min.y;
      const out = new THREE.Vector3();
      if (insert) {
        // Face the insert: it sits away from the shaft axis.
        const ic = new THREE.Box3().setFromObject(insert).getCenter(new THREE.Vector3());
        out.set(ic.x, 0, ic.z);
      } else {
        // No insert (e.g. J-hook): look across the hook so its profile shows.
        out.set(tgt.x, 0, tgt.z).cross(new THREE.Vector3(0, 1, 0));
      }
      if (out.lengthSq() < 1e-8) out.set(0, 0, 1);
      out.normalize();
      const D = Math.max(0.65, H * 2.2);
      const at = (deg: number, up: number) => {
        const v = out.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (deg * Math.PI) / 180);
        return tgt.clone().addScaledVector(v, D).add(new THREE.Vector3(0, up * D, 0));
      };
      if (p === "handleFlat") return [at(0, 0), tgt];
      if (p === "handleAngle") return [at(-62, 0.12), tgt];
      // Front: insert and button, turned a little so the handle reads in 3D.
      return [at(-25, 0.15), tgt];
    },
    [autoHandleViews, presets, scene]
  );

  useEffect(() => {
    const api: InternalApi = {
      setView: (p) => {
        resetPan();
        const [pos, tgt] = resolve(p);
        camera.position.copy(pos);
        camera.lookAt(tgt);
        if (controlsRef.current) {
          controlsRef.current.target.copy(tgt);
          controlsRef.current.update();
        }
      },
      waitReady: async (timeoutMs = 8000) => {
        const start = performance.now();
        const ready = () => {
          let ok = false;
          scene.traverse((o) => {
            const m = o as THREE.Mesh;
            if (m.isMesh && /canopy/i.test(m.name)) {
              const mat = m.material as THREE.MeshStandardMaterial;
              if (mat?.map) ok = true;
            }
          });
          return ok;
        };
        while (!ready()) {
          if (performance.now() - start > timeoutMs) return false;
          await new Promise((r) => setTimeout(r, 100));
        }
        // one more frame so the texture upload is visible
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        return true;
      },
      captureView: async (p) => {
        const [pos, tgt] = resolve(p);
        const prevPos = camera.position.clone();
        const prevTgt = controlsRef.current?.target?.clone();
        // Exported views are always centered: drop the on-screen pan while capturing.
        const prevPan = { ...panRef.current };
        panRef.current = { x: 0, y: 0 };
        applyPan();
        camera.position.copy(pos);
        camera.lookAt(tgt);
        // Handle close-ups look across the floor: hide the contact shadow so
        // the exported shot is the handle on plain white. (ContactShadows
        // re-shows its group every frame, so hide the plane mesh inside it.)
        const shadow = p.startsWith("handle")
          ? (scene.getObjectByName("contact-shadows")?.children.find((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh | undefined)
          : undefined;
        const shadowWasVisible = shadow?.visible;
        if (shadow) shadow.visible = false;
        // Point the controls at the same target, otherwise their next update
        // swings the camera back to the old target (e.g. handle close-ups).
        if (controlsRef.current) {
          controlsRef.current.target.copy(tgt);
          controlsRef.current.update();
        }
        camera.updateProjectionMatrix();
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        // Render onto white so exported PNGs / PDF cells are not transparent.
        const prevClear = gl.getClearColor(new THREE.Color());
        const prevAlpha = gl.getClearAlpha();
        gl.setClearColor("#ffffff", 1);
        gl.render(scene, camera);
        const url = gl.domElement.toDataURL("image/png");
        gl.setClearColor(prevClear, prevAlpha);
        if (shadow) shadow.visible = shadowWasVisible ?? true;
        if (prevPos) camera.position.copy(prevPos);
        if (prevTgt && controlsRef.current) {
          controlsRef.current.target.copy(prevTgt);
          controlsRef.current.update();
        }
        panRef.current = prevPan;
        applyPan();
        gl.render(scene, camera);
        return url;
      },
    };
    register(api);
  }, [resolve, camera, gl, scene, register, applyPan, resetPan]);

  // Screen-space pan: right-drag (two-finger press-drag on a Mac trackpad) or
  // Shift + drag slides the whole picture without changing the viewing angle.
  // Implemented as a camera view offset, so perspective is untouched; orbit and
  // zoom keep working around the same target.
  useEffect(() => {
    const el = gl.domElement;
    let drag: { id: number; x: number; y: number } | null = null;
    const isPan = (e: PointerEvent) => e.pointerType === "mouse" && (e.button === 2 || (e.button === 0 && e.shiftKey));
    const down = (e: PointerEvent) => {
      if (!isPan(e)) return;
      e.preventDefault();
      e.stopImmediatePropagation(); // keep OrbitControls from rotating
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      e.stopImmediatePropagation();
      panRef.current = { x: panRef.current.x + (e.clientX - drag.x), y: panRef.current.y + (e.clientY - drag.y) };
      drag.x = e.clientX;
      drag.y = e.clientY;
      applyPan();
    };
    const up = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      e.stopImmediatePropagation();
      drag = null;
      el.style.cursor = "";
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };
    const noMenu = (e: Event) => e.preventDefault();
    el.addEventListener("pointerdown", down, { capture: true });
    el.addEventListener("pointermove", move, { capture: true });
    el.addEventListener("pointerup", up, { capture: true });
    el.addEventListener("pointercancel", up, { capture: true });
    el.addEventListener("contextmenu", noMenu);
    return () => {
      el.removeEventListener("pointerdown", down, { capture: true });
      el.removeEventListener("pointermove", move, { capture: true });
      el.removeEventListener("pointerup", up, { capture: true });
      el.removeEventListener("pointercancel", up, { capture: true });
      el.removeEventListener("contextmenu", noMenu);
    };
  }, [gl, applyPan]);

  // Arrow keys pan the picture the same way (angle unchanged); Shift = bigger
  // steps. Ignored while typing in a field.
  useEffect(() => {
    const STEP = 20;
    const onKey = (e: KeyboardEvent) => {
      const dir: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const d = dir[e.key];
      if (!d || e.altKey || e.ctrlKey || e.metaKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.getAttribute("role") === "slider")) return;
      e.preventDefault();
      const s = e.shiftKey ? STEP * 3 : STEP;
      panRef.current = { x: panRef.current.x + d[0] * s, y: panRef.current.y + d[1] * s };
      applyPan();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applyPan]);

  // Keep the pan offset valid when the canvas is resized.
  useEffect(() => {
    applyPan();
  }, [size.width, size.height, applyPan]);

  const orbitTarget: [number, number, number] = useGLB
    ? [0, 0, 0]
    : [0, canopyHeight * 0.4, 0];
  const orbitMin = useGLB ? 0.5 : radius * 0.9;
  const orbitMax = useGLB ? 12 : radius * 8;

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enableRotate
      enablePan={false}
      enableZoom
      minDistance={orbitMin}
      maxDistance={orbitMax}
      minPolarAngle={0}
      maxPolarAngle={Math.PI}
      target={orbitTarget}
    />
  );
}
