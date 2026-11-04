import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { useEffect, useMemo, useState, Suspense, createContext, useContext } from "react";
import * as THREE from "three";
import { BoxType, DisplayBoxVariant, FaceKey } from "@/types/displayBox";

const PX_PER_UNIT = 24;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function renderFaceCanvas(
  src: string | undefined,
  label: string,
  widthPx: number,
  heightPx: number,
): Promise<HTMLCanvasElement> {
  const c = document.createElement("canvas");
  c.width = Math.max(64, Math.round(widthPx));
  c.height = Math.max(64, Math.round(heightPx));
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, c.width, c.height);

  if (src) {
    try {
      const img = await loadImage(src);
      const ir = img.width / img.height;
      const cr = c.width / c.height;
      let dw: number, dh: number, dx: number, dy: number;
      if (ir > cr) {
        dh = c.height;
        dw = dh * ir;
        dx = (c.width - dw) / 2;
        dy = 0;
      } else {
        dw = c.width;
        dh = dw / ir;
        dx = 0;
        dy = (c.height - dh) / 2;
      }
      ctx.drawImage(img, dx, dy, dw, dh);
    } catch {
      /* ignore */
    }
  } else {
    ctx.fillStyle = "#e5e5e5";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#9a9a9a";
    ctx.font = `bold ${Math.max(14, Math.min(c.width, c.height) / 8)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, c.width / 2, c.height / 2);
  }

  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, c.width - 2, c.height - 2);

  return c;
}

function useFaceTextures(variant: DisplayBoxVariant, L: number, W: number, H: number) {
  const [tex, setTex] = useState<Record<FaceKey, THREE.Texture | null>>({
    front: null, back: null, left: null, right: null, top: null, bottom: null,
  });

  useEffect(() => {
    let disposed = false;
    const toTex = (c: HTMLCanvasElement) => {
      const t = new THREE.CanvasTexture(c);
      t.anisotropy = 8;
      t.needsUpdate = true;
      return t;
    };
    (async () => {
      const px = PX_PER_UNIT;
      const specs: { key: FaceKey; label: string; w: number; h: number }[] = [
        { key: "front", label: "FRONT", w: L * px, h: H * px },
        { key: "back", label: "BACK", w: L * px, h: H * px },
        { key: "left", label: "LEFT", w: W * px, h: H * px },
        { key: "right", label: "RIGHT", w: W * px, h: H * px },
        { key: "top", label: "TOP", w: L * px, h: W * px },
        { key: "bottom", label: "BOTTOM", w: L * px, h: W * px },
      ];
      const out: Record<FaceKey, THREE.Texture | null> = {
        front: null, back: null, left: null, right: null, top: null, bottom: null,
      };
      for (const s of specs) {
        const c = await renderFaceCanvas(variant.faces[s.key], s.label, s.w, s.h);
        if (disposed) return;
        out[s.key] = toTex(c);
      }
      if (disposed) return;
      setTex((prev) => {
        (Object.keys(prev) as FaceKey[]).forEach((k) => prev[k]?.dispose());
        return out;
      });
    })();
    return () => { disposed = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    variant.faces.front, variant.faces.back, variant.faces.left,
    variant.faces.right, variant.faces.top, variant.faces.bottom,
    L, W, H,
  ]);

  return tex;
}

function FoldedUmbrella({ boxType, L, W, H }: { boxType: BoxType; L: number; W: number; H: number }) {
  if (boxType === "folding") {
    const len = L * 0.7;
    const r = Math.min(W, H) * 0.32;
    return (
      <group position={[0, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r, r, len, 24]} />
          <meshStandardMaterial color="#2f2f33" roughness={0.6} metalness={0.05} />
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r * 1.02, r * 0.06, 8, 24]} />
          <meshStandardMaterial color="#1a1a1d" roughness={0.5} />
        </mesh>
      </group>
    );
  }
  const len = L * 0.92;
  const r = Math.min(W, H) * 0.22;
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r, r, len, 24]} />
        <meshStandardMaterial color="#2f2f33" roughness={0.6} metalness={0.05} />
      </mesh>
      <mesh position={[len / 2 + r * 0.6, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[r * 0.5, r * 1.2, 16]} />
        <meshStandardMaterial color="#444" roughness={0.5} />
      </mesh>
      <mesh position={[-len / 2 - r * 0.8, -r * 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r * 0.8, r * 0.25, 10, 16, Math.PI]} />
        <meshStandardMaterial color="#5a3a1f" roughness={0.7} />
      </mesh>
    </group>
  );
}

const DimsCtx = createContext<{ l: number; w: number; h: number }>({ l: 1, w: 1, h: 1 });
const useDimsFromContext = () => useContext(DimsCtx);

function BoxMesh({ variant, boxType }: { variant: DisplayBoxVariant; boxType: BoxType }) {
  return <InnerBox variant={variant} boxType={boxType} />;
}

function InnerBox({ variant, boxType }: { variant: DisplayBoxVariant; boxType: BoxType }) {
  const { l: rawL, w: rawW, h: rawH } = useDimsFromContext();
  const maxD = Math.max(rawL, rawW, rawH);
  const s = 4 / maxD;
  const L = rawL * s;
  const H = rawH * s;
  const W = rawW * s;

  const faces = useFaceTextures(variant, rawL, rawW, rawH);

  const make = (tex: THREE.Texture | null) =>
    new THREE.MeshStandardMaterial({
      map: tex ?? undefined,
      color: 0xffffff,
      roughness: 0.55,
      metalness: 0.02,
      side: THREE.FrontSide,
    });

  const bodyMats = useMemo(
    () => [
      make(faces.right ?? null),
      make(faces.left ?? null),
      make(null),
      make(faces.bottom ?? null),
      make(faces.front ?? null),
      make(faces.back ?? null),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [faces.right, faces.left, faces.bottom, faces.front, faces.back],
  );

  const lidMat = useMemo(() => {
    const tex = faces.top ?? null;
    const m = new THREE.MeshStandardMaterial({
      map: tex ?? undefined,
      color: 0xffffff,
      roughness: 0.55,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    return m;
  }, [faces.top]);

  useEffect(() => () => {
    bodyMats.forEach((m) => m.dispose());
    lidMat.dispose();
  }, [bodyMats, lidMat]);

  return (
    <group>
      <mesh castShadow receiveShadow material={bodyMats}>
        <boxGeometry args={[L, H, W]} />
      </mesh>

      <group position={[0, -H * 0.05, 0]}>
        <FoldedUmbrella boxType={boxType} L={L} W={W} H={H} />
      </group>

      <mesh position={[0, H / 2 + W / 2, -W / 2]} material={lidMat}>
        <planeGeometry args={[L, W]} />
      </mesh>
      <mesh position={[0, H / 2 + W / 2, -W / 2 - 0.002]}>
        <planeGeometry args={[L, W]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.7} side={THREE.FrontSide} />
      </mesh>
    </group>
  );
}

interface Props {
  variant: DisplayBoxVariant;
  boxType: BoxType;
  dimensions: { l: number; w: number; h: number };
  className?: string;
}

export const DisplayBox3D = ({ variant, boxType, dimensions, className }: Props) => {
  const safeDims = {
    l: dimensions.l > 0 ? dimensions.l : 28,
    w: dimensions.w > 0 ? dimensions.w : 12,
    h: dimensions.h > 0 ? dimensions.h : 8,
  };
  return (
    <div
      className={
        className ??
        "h-[480px] w-full overflow-hidden rounded-lg border bg-gradient-to-b from-neutral-100 to-neutral-300"
      }
    >
      <Canvas
        shadows
        camera={{ position: [5, 3.5, 7.5], fov: 35 }}
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
      >
        <color attach="background" args={["#eef0f3"]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 5]} intensity={1.0} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-5, 3, -5]} intensity={0.35} />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]} receiveShadow>
          <planeGeometry args={[40, 40]} />
          <shadowMaterial opacity={0.25} />
        </mesh>

        <Suspense fallback={null}>
          <DimsCtx.Provider value={safeDims}>
            <BoxMesh variant={variant} boxType={boxType} />
          </DimsCtx.Provider>
          <Environment files="/hdri/potsdamer_platz_1k.hdr" environmentIntensity={0.4} />
        </Suspense>

        <OrbitControls enablePan={false} minDistance={4} maxDistance={16} target={[0, 0, 0]} />
      </Canvas>
    </div>
  );
};
