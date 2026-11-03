/**
 * Rasterize the live 2D canopy <svg> into a square canvas for use as a
 * three.js texture. Strokes (rib outlines, selection dashes) are stripped
 * and <image href> references are inlined as data: URLs so uploaded
 * artwork survives SVG-as-image rendering.
 */
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

/**
 * Rasterize the live 2D canopy SVG to a square canvas.
 * @param viewBox optional crop, e.g. `-R -R 2R 2R` so the canopy circle exactly fills the canvas.
 */
export async function rasterize(
  svg: SVGSVGElement,
  size: number,
  viewBox?: string,
): Promise<HTMLCanvasElement | null> {
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

    if (viewBox) clone.setAttribute("viewBox", viewBox);
    // Ensure the serialized SVG has explicit width/height so Image rasterizes.
    clone.setAttribute("width", String(size));
    clone.setAttribute("height", String(size));
    if (!clone.getAttribute("xmlns")) {
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }

    const xml = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => resolve(i);
        i.onerror = (e) => {
          // eslint-disable-next-line no-console
          console.warn("[3D] rasterize image.onerror", e);
          reject(e);
        };
        i.src = url;
      });
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      try {
        ctx.getImageData(0, 0, 1, 1); // taint probe
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[3D] rasterize canvas tainted", e);
        return null;
      }
      return c;
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[3D] rasterize failed", err);
    return null;
  }
}
