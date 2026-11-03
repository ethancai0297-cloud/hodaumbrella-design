import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { rasterize } from "./rasterizeSvg";
import { canopy2DRadius } from "@/components/UmbrellaCanopy";

/**
 * Rasterize the live 2D canopy SVG into ONE square texture whose bounds are
 * exactly the canopy's circumscribed circle (the 2D SVG viewBox is
 * -300..300 but the canopy only uses radius 178/195/255 depending on
 * category). The GLB canopy panels get UVs projected from the top view
 * (see src/3d/canopyProjection.ts), so this texture maps 1:1 onto the 3D
 * canopy with no per-panel unwrapping.
 *
 * Returns null when there is no SVG yet (caller falls back to solid fabric).
 */
export function useCanopyProjectionTexture(
  svg: SVGSVGElement | null,
  category: string,
  deps: unknown[],
  size = 2048,
): THREE.CanvasTexture | null {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const texRef = useRef<THREE.CanvasTexture | null>(null);
  const timerRef = useRef<number | null>(null);
  const generationRef = useRef(0);

  // Probe the SVG for structural changes so we re-rasterize even when the
  // parent forgets to bump deps.
  const svgVersion = svg
    ? `${svg.childElementCount}:${svg.getAttribute("data-version") ?? svg.innerHTML.length}`
    : "none";

  useEffect(() => {
    if (!svg) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const generation = ++generationRef.current;
    let cancelled = false;
    const R = canopy2DRadius(category);
    const viewBox = `${-R} ${-R} ${2 * R} ${2 * R}`;

    timerRef.current = window.setTimeout(() => {
      void rasterize(svg, size, viewBox).then((canvas) => {
        if (cancelled || generation !== generationRef.current || !canvas) return;
        const tex = texRef.current ?? new THREE.CanvasTexture(canvas);
        tex.image = canvas;
        tex.flipY = true; // canvas top == world -Z (top view "up")
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.needsUpdate = true;
        texRef.current = tex;
        // Same texture object is reused; needsUpdate re-uploads it to the GPU,
        // so materials holding it refresh without any React re-render.
        setTexture(tex);
      });
    }, 60);
    return () => {
      cancelled = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svg, svgVersion, category, size, ...deps]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      generationRef.current += 1;
      texRef.current?.dispose();
      texRef.current = null;
    },
    [],
  );

  return texture;
}
