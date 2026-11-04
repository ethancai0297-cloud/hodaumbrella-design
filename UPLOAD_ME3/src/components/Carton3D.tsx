import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { useEffect, useMemo, useState, Suspense } from "react";
import * as THREE from "three";
import JsBarcode from "jsbarcode";
import { MarkVariant } from "@/types/shippingMark";
import { resolveDims } from "@/lib/meas";

function drawKraft(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#d2a878";
  ctx.fillRect(0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n * 0.9));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * 0.7));
  }
  ctx.putImageData(img, 0, 0);
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = "#6b4a28";
  ctx.lineWidth = 1;
  const fluteSpacing = Math.max(6, Math.round(w / 90));
  for (let x = 0; x < w; x += fluteSpacing) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const grad = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.3,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(60,40,20,0.22)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

const hasText = (v: string | undefined | null): v is string =>
  !!v && String(v).trim().length > 0;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function makeBarcodeCanvas(value: string, height: number, fontSize: number) {
  const c = document.createElement("canvas");
  try {
    JsBarcode(c, value, {
      format: "CODE128",
      height,
      fontSize,
      margin: 4,
      displayValue: true,
      background: "transparent",
      lineColor: "#000",
    });
  } catch {
    return null;
  }
  return c;
}

async function renderFaceTexture(
  variant: MarkVariant,
  side: "main" | "side",
  widthPx: number,
  heightPx: number,
): Promise<HTMLCanvasElement> {
  const c = document.createElement("canvas");
  c.width = Math.max(64, Math.round(widthPx));
  c.height = Math.max(64, Math.round(heightPx));
  const ctx = c.getContext("2d")!;
  drawKraft(ctx, c.width, c.height);

  const v = variant;
  const pad = Math.max(12, Math.min(c.width, c.height) * 0.08);

  const overrideImg =
    side === "main"
      ? v.mainImageDataUrl ?? v.imageDataUrl
      : v.sideImageDataUrl;
  if (overrideImg) {
    try {
      const im = await loadImage(overrideImg);
      const maxW = c.width - pad * 2;
      const maxH = c.height - pad * 2;
      const r = Math.min(maxW / im.width, maxH / im.height);
      const dw = im.width * r;
      const dh = im.height * r;
      ctx.globalCompositeOperation = "multiply";
      ctx.drawImage(im, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
      ctx.globalCompositeOperation = "source-over";
    } catch {
      /* ignore */
    }
    return c;
  }

  const lines: string[] = [];
  if (side === "main") {
    if (hasText(v.customer)) lines.push(v.customer);
    if (hasText(v.orderNo)) lines.push(`ORDER NO. ${v.orderNo}`);
    if (hasText(v.madeIn)) lines.push(v.madeIn);
    if (hasText(v.cartonCount)) lines.push(`CARTON NO.    OF ${v.cartonCount}`);
  } else {
    if (hasText(v.model)) lines.push(`MODELS: ${v.model}`);
    if (hasText(v.colour)) lines.push(`COLOUR : ${v.colour}`);
    if (hasText(v.quantity)) lines.push(`QUANTITY : ${v.quantity}`);
    if (hasText(v.gw)) lines.push(`G.W. : ${v.gw}`);
    if (hasText(v.nw)) lines.push(`N.W. : ${v.nw}`);
    if (hasText(v.meas)) lines.push(`MEAS: ${v.meas}`);
  }

  const barcodeVal = side === "main" ? v.barcode : v.sideBarcode;
  const hasBarcode = hasText(barcodeVal);

  const rowEstimate = Math.max(1, lines.length) + (hasBarcode ? 2.2 : 0);
  const fontSize = Math.max(
    8,
    Math.min(
      (c.height - pad * 2) / (rowEstimate + 1.2),
      (c.width - pad * 2) / (side === "main" ? 16 : 14),
    ),
  );
  const lineHeight = fontSize * 1.3;

  let barcodeCanvas: HTMLCanvasElement | null = null;
  if (hasBarcode) {
    barcodeCanvas = makeBarcodeCanvas(
      barcodeVal!,
      Math.round(fontSize * 2.6),
      Math.round(fontSize * 0.95),
    );
  }
  const barcodeH = barcodeCanvas
    ? Math.min(
        c.height - pad * 2 - lines.length * lineHeight,
        (barcodeCanvas.height * (c.width - pad * 2)) / barcodeCanvas.width,
      )
    : 0;

  const totalH = lines.length * lineHeight + (barcodeH > 0 ? barcodeH + lineHeight * 0.4 : 0);
  let y = (c.height - totalH) / 2 + fontSize;

  ctx.fillStyle = "#000";
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  for (const ln of lines) {
    ctx.fillText(ln, c.width / 2, y, c.width - pad * 2);
    y += lineHeight;
  }

  if (barcodeCanvas && barcodeH > 0) {
    y += lineHeight * 0.2;
    const bw = (barcodeCanvas.width * barcodeH) / barcodeCanvas.height;
    const finalBW = Math.min(bw, c.width - pad * 2);
    const finalBH = (barcodeCanvas.height * finalBW) / barcodeCanvas.width;
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(
      barcodeCanvas,
      (c.width - finalBW) / 2,
      y,
      finalBW,
      finalBH,
    );
    ctx.globalCompositeOperation = "source-over";
  }

  return c;
}

const PX_PER_UNIT = 220;

function useFaceTextures(variant: MarkVariant, L: number, W: number, H: number) {
  const [textures, setTextures] = useState<{
    main: THREE.Texture | null;
    side: THREE.Texture | null;
    plain: THREE.Texture | null;
  }>({ main: null, side: null, plain: null });

  useEffect(() => {
    let disposed = false;
    const toTex = (c: HTMLCanvasElement) => {
      const t = new THREE.CanvasTexture(c);
      t.anisotropy = 8;
      t.needsUpdate = true;
      return t;
    };

    (async () => {
      const mainW = Math.round(L * PX_PER_UNIT);
      const mainH = Math.round(H * PX_PER_UNIT);
      const sideW = Math.round(W * PX_PER_UNIT);
      const sideH = Math.round(H * PX_PER_UNIT);

      const mainCanvas = await renderFaceTexture(variant, "main", mainW, mainH);
      const sideCanvas = await renderFaceTexture(variant, "side", sideW, sideH);

      const plainC = document.createElement("canvas");
      plainC.width = Math.round(L * PX_PER_UNIT);
      plainC.height = Math.round(W * PX_PER_UNIT);
      drawKraft(plainC.getContext("2d")!, plainC.width, plainC.height);

      if (disposed) return;
      setTextures((prev) => {
        prev.main?.dispose();
        prev.side?.dispose();
        prev.plain?.dispose();
        return {
          main: toTex(mainCanvas),
          side: toTex(sideCanvas),
          plain: toTex(plainC),
        };
      });
    })();

    return () => {
      disposed = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    variant.customer, variant.orderNo, variant.madeIn, variant.cartonCount,
    variant.model, variant.colour, variant.quantity, variant.gw, variant.nw, variant.meas,
    variant.barcode, variant.sideBarcode,
    variant.mainImageDataUrl, variant.sideImageDataUrl, variant.imageDataUrl,
    L, W, H,
  ]);

  return textures;
}

function CartonMesh({ variant }: { variant: MarkVariant }) {
  const dims = resolveDims(variant.meas, variant.dimensions);
  const maxD = Math.max(dims.l, dims.w, dims.h);
  const s = 4 / maxD;
  const L = dims.l * s;
  const H = dims.h * s;
  const W = dims.w * s;

  const { main, side, plain } = useFaceTextures(variant, L, W, H);

  const materials = useMemo(() => {
    const make = (tex: THREE.Texture | null) =>
      new THREE.MeshStandardMaterial({
        map: tex ?? undefined,
        color: tex ? 0xffffff : 0xd2a878,
        roughness: 0.95,
        metalness: 0,
        side: THREE.FrontSide,
      });
    return [
      make(side),
      make(side),
      make(plain),
      make(plain),
      make(main),
      make(main),
    ];
  }, [main, side, plain]);

  useEffect(() => {
    return () => {
      materials.forEach((m) => m.dispose());
    };
  }, [materials]);

  return (
    <mesh castShadow receiveShadow material={materials}>
      <boxGeometry args={[L, H, W]} />
    </mesh>
  );
}

interface Props {
  variant: MarkVariant;
  className?: string;
}

export const Carton3D = ({ variant, className }: Props) => {
  return (
    <div
      className={
        className ??
        "h-[480px] w-full overflow-hidden rounded-lg border bg-gradient-to-b from-neutral-100 to-neutral-300"
      }
    >
      <Canvas
        shadows
        camera={{ position: [5, 4, 6], fov: 35 }}
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
      >
        <color attach="background" args={["#e8e8ea"]} />
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.0}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-5, 3, -5]} intensity={0.35} />

        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -3, 0]}
          receiveShadow
        >
          <planeGeometry args={[40, 40]} />
          <shadowMaterial opacity={0.25} />
        </mesh>

        <Suspense fallback={null}>
          <CartonMesh variant={variant} />
          <Environment files="/hdri/empty_warehouse_01_1k.hdr" environmentIntensity={0.4} />
        </Suspense>

        <OrbitControls
          enablePan={false}
          minDistance={4}
          maxDistance={14}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
};
