import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/**
 * Rasterize the live UmbrellaCanopy <svg> to a CanvasTexture.
 * The SVG is the same top-down composition used by the 2D editor,
 * so every fabric color, panel color, artwork transform, fit mode and
 * print layout is preserved 1:1 inside the texture. Per-panel UVs in the
 * 3D mesh select the correct wedge of this single shared texture.
 */
export function useCanopyTexture(
  svg: SVGSVGElement | null,
  deps: unknown[],
  size = 1024
) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!svg) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void render(svg, size).then((res) => {
        if (!res) return;
        canvasRef.current = res.canvas;
        setTexture((prev) => {
          const tex = prev ?? new THREE.CanvasTexture(res.canvas);
          tex.image = res.canvas;
          tex.flipY = false;
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 8;
          tex.needsUpdate = true;
          return tex;
        });
      });
    }, 120);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svg, size, ...deps]);

  useEffect(() => () => texture?.dispose(), [texture]);

  return texture;
}

async function render(svg: SVGSVGElement, size: number) {
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
      return { canvas: c };
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return null;
  }
}
