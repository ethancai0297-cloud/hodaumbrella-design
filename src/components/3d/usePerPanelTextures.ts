import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  PANEL_UV_FLIP_X,
  PANEL_UV_FLIP_Y,
  PANEL_UV_ROTATION_DEG,
} from "@/3d/uvCorrection";

/**
 * Rasterize the top-down canopy SVG and unroll each panel wedge into its
 * own rectangular CanvasTexture (length = ribCount). The SVG already
 * encodes selected-panel / per-panel-repeat / full-wrap rendering, so we
 * just need to slice it cleanly per panel.
 *
 * v = 0 → panel apex (center of canopy)
 * v = 1 → panel outer edge (rib tip)
 * u = 0 → left rib
 * u = 1 → right rib
 *
 * Debug mode bypasses the SVG and stamps a large panel number (1..ribCount)
 * on each panel so we can visually verify panel order before trusting
 * real artwork.
 */
export function usePerPanelTextures(
  svg: SVGSVGElement | null,
  ribCount: number,
  deps: unknown[],
  options: {
    fabricColor?: string;
    debugPanelNumbers?: boolean;
    flipY?: boolean;
    panelSize?: number;
    sourceSize?: number;
  } = {},
) {
  const {
    fabricColor = "#cccccc",
    debugPanelNumbers = false,
    flipY = false,
    panelSize = 512,
    sourceSize = 1024,
  } = options;
  const [textures, setTextures] = useState<THREE.CanvasTexture[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ribCount) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      const build = debugPanelNumbers
        ? Promise.resolve(buildDebug(ribCount, panelSize, fabricColor))
        : (svg
            ? buildAll(svg, ribCount, sourceSize, panelSize, fabricColor)
            : Promise.resolve(buildSolid(ribCount, panelSize, fabricColor)));
      void build.then((canvases) => {
        if (!canvases) return;
        setTextures((prev) => {
          const next: THREE.CanvasTexture[] = [];
          for (let i = 0; i < canvases.length; i++) {
            const tex = prev[i] ?? new THREE.CanvasTexture(canvases[i]);
            tex.image = canvases[i];
            tex.flipY = flipY;
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = 8;
            tex.wrapS = THREE.ClampToEdgeWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            tex.needsUpdate = true;
            next.push(tex);
          }
          for (let i = canvases.length; i < prev.length; i++) prev[i].dispose();
          return next;
        });
      });
    }, 140);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svg, ribCount, sourceSize, panelSize, fabricColor, debugPanelNumbers, flipY, ...deps]);

  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);

  return textures;
}

async function buildAll(
  svg: SVGSVGElement,
  ribCount: number,
  sourceSize: number,
  panelSize: number,
  fabricColor: string,
): Promise<HTMLCanvasElement[] | null> {
  const src = await rasterize(svg, sourceSize);
  if (!src) return null;
  const out: HTMLCanvasElement[] = [];
  for (let i = 0; i < ribCount; i++) {
    out.push(unrollPanel(src, i, ribCount, panelSize, fabricColor));
  }
  return out;
}

function buildSolid(ribCount: number, panelSize: number, fabricColor: string) {
  return Array.from({ length: ribCount }, () => solidCanvas(panelSize, fabricColor));
}

function solidCanvas(size: number, color: string) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  return c;
}

function buildDebug(ribCount: number, panelSize: number, fabricColor: string) {
  const out: HTMLCanvasElement[] = [];
  for (let i = 0; i < ribCount; i++) {
    const c = solidCanvas(panelSize, fabricColor);
    const ctx = c.getContext("2d")!;
    // Apex marker stripe (top of panel UV = v=0)
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(0, 0, panelSize, Math.max(4, panelSize * 0.04));
    // Outer-edge marker (v=1)
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0, panelSize - Math.max(4, panelSize * 0.04), panelSize, panelSize);
    // Number
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = panelSize * 0.03;
    ctx.font = `bold ${Math.floor(panelSize * 0.55)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = String(i + 1);
    ctx.strokeText(label, panelSize / 2, panelSize / 2);
    ctx.fillText(label, panelSize / 2, panelSize / 2);
    out.push(c);
  }
  return out;
}

const XLINK_NS = "http://www.w3.org/1999/xlink";

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    if (url.startsWith("data:")) return url;
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function inlineImages(root: SVGSVGElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("image"));
  await Promise.all(
    imgs.map(async (el) => {
      const href =
        el.getAttribute("href") ||
        el.getAttributeNS(XLINK_NS, "href") ||
        "";
      if (!href || href.startsWith("data:")) return;
      const data = await urlToDataUrl(href);
      if (!data) return;
      el.setAttribute("href", data);
      if (el.hasAttributeNS(XLINK_NS, "href")) {
        el.setAttributeNS(XLINK_NS, "href", data);
      }
    }),
  );
}

async function rasterize(svg: SVGSVGElement, size: number): Promise<HTMLCanvasElement | null> {
  try {
    // Clone and strip strokes so rib/panel outlines from the 2D editor
    // don't bake into the 3D canopy texture as radial lines.
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll("path,line,polyline,polygon,rect,circle,ellipse").forEach((el) => {
      const e = el as SVGElement;
      // Drop selection dashes entirely
      if (e.getAttribute("stroke-dasharray")) {
        e.setAttribute("stroke", "none");
        e.removeAttribute("stroke-dasharray");
      } else if (e.getAttribute("stroke") && e.getAttribute("stroke") !== "none") {
        e.setAttribute("stroke", "none");
      }
      e.removeAttribute("stroke-width");
      if (e.style) {
        e.style.stroke = "none";
        e.style.strokeWidth = "0";
      }
    });

    // Inline every <image href="..."> as a data: URL. SVG-as-image rendering
    // can't reach blob: URLs or cross-origin resources from the parent
    // document context, so without this step uploaded artwork silently
    // disappears from the 3D canopy.
    await inlineImages(clone);

    const xml = new XMLSerializer().serializeToString(clone);
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
 *
 * Pre-fills with fabric color so any sampling miss or wedge-edge bleed
 * shows up as fabric — not as a vertical stripe of an adjacent panel.
 */
function unrollPanel(
  src: HTMLCanvasElement,
  panelIndex: number,
  ribCount: number,
  size: number,
  fabricColor: string,
): HTMLCanvasElement {
  const sliceAngle = (Math.PI * 2) / ribCount;
  const a0 = -Math.PI / 2 + (panelIndex - 0.5) * sliceAngle;

  const S = src.width;
  const cx = S / 2;
  const cy = S / 2;
  const R = S / 2 - 1; // 1-px safety inset to avoid the canvas edge

  const W = size;
  const H = size;

  const srcCtx = src.getContext("2d")!;
  const srcData = srcCtx.getImageData(0, 0, S, S).data;

  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const outCtx = out.getContext("2d")!;

  // Pre-fill with fabric color (opaque) so seam bleed stays inside palette.
  const fabric = parseHex(fabricColor);
  outCtx.fillStyle = fabricColor;
  outCtx.fillRect(0, 0, W, H);

  const outImg = outCtx.getImageData(0, 0, W, H);
  const outData = outImg.data;

  const rot = PANEL_UV_ROTATION_DEG[panelIndex] || 0;
  const flipX = PANEL_UV_FLIP_X[panelIndex] || false;
  const flipY = PANEL_UV_FLIP_Y[panelIndex] || false;

  // Skip the very top apex pixel row (v=0) to avoid singular-point smear.
  // Fill it with the SVG center pixel so the apex looks consistent.
  const centerI = (Math.floor(cy) * S + Math.floor(cx)) * 4;
  const apexR = srcData[centerI];
  const apexG = srcData[centerI + 1];
  const apexB = srcData[centerI + 2];
  const apexA = srcData[centerI + 3];

  // 1-px inset on u to keep sampling strictly inside the wedge.
  const uPad = 0.5 / W;

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      let u = px / (W - 1);
      let v = py / (H - 1);
      if (flipX) u = 1 - u;
      if (flipY) v = 1 - v;
      if (rot) {
        const rad = (rot * Math.PI) / 180;
        const cu = u - 0.5;
        const cv = v - 0.5;
        const ru = Math.cos(rad) * cu - Math.sin(rad) * cv + 0.5;
        const rv = Math.sin(rad) * cu + Math.cos(rad) * cv + 0.5;
        u = ru;
        v = rv;
      }

      const di = (py * W + px) * 4;

      // Apex row: just stamp center pixel, skip warp singularity.
      if (v <= 0.002) {
        outData[di] = apexR;
        outData[di + 1] = apexG;
        outData[di + 2] = apexB;
        outData[di + 3] = apexA || 255;
        continue;
      }

      const uClamped = Math.min(1 - uPad, Math.max(uPad, u));
      const r = v * R;
      const angle = a0 + uClamped * sliceAngle;
      const sx = cx + r * Math.cos(angle);
      const sy = cy + r * Math.sin(angle);

      const ix = sx | 0;
      const iy = sy | 0;
      if (ix < 0 || iy < 0 || ix >= S || iy >= S) {
        outData[di] = fabric.r;
        outData[di + 1] = fabric.g;
        outData[di + 2] = fabric.b;
        outData[di + 3] = 255;
      } else {
        const si = (iy * S + ix) * 4;
        const a = srcData[si + 3];
        if (a < 8) {
          // Transparent source → keep fabric background, don't bleed.
          outData[di] = fabric.r;
          outData[di + 1] = fabric.g;
          outData[di + 2] = fabric.b;
          outData[di + 3] = 255;
        } else {
          outData[di] = srcData[si];
          outData[di + 1] = srcData[si + 1];
          outData[di + 2] = srcData[si + 2];
          outData[di + 3] = 255;
        }
      }
    }
  }
  outCtx.putImageData(outImg, 0, 0);
  return out;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace("#", "");
  const v = m.length === 3
    ? m.split("").map((c) => c + c).join("")
    : m.padEnd(6, "0").slice(0, 6);
  return {
    r: parseInt(v.slice(0, 2), 16) || 0,
    g: parseInt(v.slice(2, 4), 16) || 0,
    b: parseInt(v.slice(4, 6), 16) || 0,
  };
}
