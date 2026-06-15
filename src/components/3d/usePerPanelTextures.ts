import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  PANEL_UV_FLIP_X,
  PANEL_UV_FLIP_Y,
  PANEL_UV_ROTATION_DEG,
} from "@/3d/uvCorrection";

/**
 * Rasterize the top-down canopy SVG and unroll each panel wedge into its
 * own rectangular CanvasTexture. The result is a fixed-length array of
 * CanvasTextures (length = ribCount). Each texture is sized so panel
 * geometry UVs in [0,1]² fill the panel.
 *
 * v = 0 → panel apex (center of canopy)
 * v = 1 → panel outer edge (rib tip)
 * u = 0 → left rib
 * u = 1 → right rib
 *
 * Per-panel UV rotation/flip is applied here, controlled by
 * PANEL_UV_ROTATION_DEG / PANEL_UV_FLIP_X / PANEL_UV_FLIP_Y so it can be
 * tuned without editing the GLB.
 */
export function usePerPanelTextures(
  svg: SVGSVGElement | null,
  ribCount: number,
  deps: unknown[],
  panelSize = 512,
  sourceSize = 1024,
) {
  const [textures, setTextures] = useState<THREE.CanvasTexture[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!svg || !ribCount) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void buildAll(svg, ribCount, sourceSize, panelSize).then((canvases) => {
        if (!canvases) return;
        setTextures((prev) => {
          // Reuse existing textures when count matches
          const next: THREE.CanvasTexture[] = [];
          for (let i = 0; i < canvases.length; i++) {
            const tex = prev[i] ?? new THREE.CanvasTexture(canvases[i]);
            tex.image = canvases[i];
            tex.flipY = false;
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = 8;
            tex.wrapS = THREE.ClampToEdgeWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            tex.needsUpdate = true;
            next.push(tex);
          }
          // Dispose extras if ribCount shrank
          for (let i = canvases.length; i < prev.length; i++) prev[i].dispose();
          return next;
        });
      });
    }, 140);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svg, ribCount, sourceSize, panelSize, ...deps]);

  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);

  return textures;
}

async function buildAll(
  svg: SVGSVGElement,
  ribCount: number,
  sourceSize: number,
  panelSize: number,
): Promise<HTMLCanvasElement[] | null> {
  const src = await rasterize(svg, sourceSize);
  if (!src) return null;
  const out: HTMLCanvasElement[] = [];
  for (let i = 0; i < ribCount; i++) {
    out.push(unrollPanel(src, i, ribCount, panelSize));
  }
  return out;
}

async function rasterize(svg: SVGSVGElement, size: number): Promise<HTMLCanvasElement | null> {
  try {
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = url;
      });
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      return c;
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return null;
  }
}

/**
 * Unroll a single wedge from the top-down raster into an upright rectangle.
 *
 * The 2D editor's panel `i` spans angular range
 *   a0 = -π/2 + (i - 0.5) * sliceAngle
 *   a1 = a0 + sliceAngle
 * (matches src/components/UmbrellaCanopy.tsx::panelPath).
 */
function unrollPanel(
  src: HTMLCanvasElement,
  panelIndex: number,
  ribCount: number,
  size: number,
): HTMLCanvasElement {
  const sliceAngle = (Math.PI * 2) / ribCount;
  const a0 = -Math.PI / 2 + (panelIndex - 0.5) * sliceAngle;

  const S = src.width;
  const cx = S / 2;
  const cy = S / 2;
  const R = S / 2;

  // Rect canvas: width = arc at outer edge, height = radius.
  const W = size;
  const H = size;

  const srcCtx = src.getContext("2d")!;
  const srcData = srcCtx.getImageData(0, 0, S, S).data;

  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const outCtx = out.getContext("2d")!;
  const outImg = outCtx.createImageData(W, H);
  const outData = outImg.data;

  const rot = PANEL_UV_ROTATION_DEG[panelIndex] || 0;
  const flipX = PANEL_UV_FLIP_X[panelIndex] || false;
  const flipY = PANEL_UV_FLIP_Y[panelIndex] || false;

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      // Apply correction in output space
      let u = px / (W - 1);
      let v = py / (H - 1);
      if (flipX) u = 1 - u;
      if (flipY) v = 1 - v;
      // Rotate UV around (0.5, 0.5)
      if (rot) {
        const rad = (rot * Math.PI) / 180;
        const cu = u - 0.5;
        const cv = v - 0.5;
        const ru = Math.cos(rad) * cu - Math.sin(rad) * cv + 0.5;
        const rv = Math.sin(rad) * cu + Math.cos(rad) * cv + 0.5;
        u = ru;
        v = rv;
      }

      // v=0 apex (r=0), v=1 outer edge (r=R)
      const r = v * R;
      const angle = a0 + u * sliceAngle;
      const sx = cx + r * Math.cos(angle);
      const sy = cy + r * Math.sin(angle);

      const ix = sx | 0;
      const iy = sy | 0;
      const di = (py * W + px) * 4;
      if (ix < 0 || iy < 0 || ix >= S || iy >= S) {
        outData[di] = 0;
        outData[di + 1] = 0;
        outData[di + 2] = 0;
        outData[di + 3] = 0;
      } else {
        const si = (iy * S + ix) * 4;
        outData[di] = srcData[si];
        outData[di + 1] = srcData[si + 1];
        outData[di + 2] = srcData[si + 2];
        outData[di + 3] = srcData[si + 3];
      }
    }
  }
  outCtx.putImageData(outImg, 0, 0);
  return out;
}
