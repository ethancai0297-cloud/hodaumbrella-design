import jsPDF from "jspdf";
import { svg2pdf } from "svg2pdf.js";
import { DesignProject, PANEL_LENGTH_CM, PANEL_LENGTH_IN, POUCH_SIZE_CM } from "@/types/design";
import logoUrl from "@/assets/hoda-tuzh-logo.png";

const COMPANY_NAME = "Hoda Umbrella · Tuzh Umbrella";
const COMPANY_TAGLINE = "Umbrella Design Generator";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function svgToPngDataUrl(svg: SVGSVGElement, scale = 2): Promise<string> {
  const xml = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const w = (svg.viewBox.baseVal.width || svg.clientWidth) * scale;
    const h = (svg.viewBox.baseVal.height || svg.clientHeight) * scale;
    const footerH = Math.round(70 * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h + footerH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no ctx");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, w, h);

    // Footer band
    ctx.fillStyle = "#bae0f0";
    ctx.fillRect(0, h, w, footerH);

    // Logo
    try {
      const logo = await loadImage(logoUrl);
      const logoH = footerH * 0.7;
      const logoW = (logo.width / logo.height) * logoH;
      ctx.drawImage(logo, 20 * scale, h + (footerH - logoH) / 2, logoW, logoH);
    } catch {}

    // Company name text
    ctx.fillStyle = "#0f1f3d";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${Math.round(18 * scale)}px Inter, sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText(COMPANY_NAME, w - 20 * scale, h + footerH / 2 - 10 * scale);
    ctx.font = `400 ${Math.round(11 * scale)}px Inter, sans-serif`;
    ctx.fillStyle = "rgba(15,31,61,0.7)";
    ctx.fillText(COMPANY_TAGLINE, w - 20 * scale, h + footerH / 2 + 12 * scale);

    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function svgToImageAndSize(svg: SVGSVGElement): Promise<{ img: HTMLImageElement; w: number; h: number; revoke: () => void }> {
  const xml = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });
  const w = svg.viewBox.baseVal.width || svg.clientWidth;
  const h = svg.viewBox.baseVal.height || svg.clientHeight;
  return { img, w, h, revoke: () => URL.revokeObjectURL(url) };
}

export async function svgPairToPngDataUrl(
  outer: SVGSVGElement,
  inner: SVGSVGElement,
  scale = 2
): Promise<string> {
  const a = await svgToImageAndSize(outer);
  const b = await svgToImageAndSize(inner);
  try {
    const gap = 24;
    const labelH = 36;
    const cellW = Math.max(a.w, b.w);
    const cellH = Math.max(a.h, b.h);
    const w = (cellW * 2 + gap) * scale;
    const h = (cellH + labelH) * scale;
    const footerH = Math.round(70 * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h + footerH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no ctx");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#0f1f3d";
    ctx.font = `600 ${Math.round(18 * scale)}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Outside view", (cellW / 2) * scale, (labelH / 2) * scale);
    ctx.fillText("Inside view", (cellW + gap + cellW / 2) * scale, (labelH / 2) * scale);

    ctx.drawImage(a.img, 0, labelH * scale, cellW * scale, cellH * scale);
    ctx.drawImage(b.img, (cellW + gap) * scale, labelH * scale, cellW * scale, cellH * scale);

    ctx.fillStyle = "#bae0f0";
    ctx.fillRect(0, h, w, footerH);
    try {
      const logo = await loadImage(logoUrl);
      const logoH = footerH * 0.7;
      const logoW = (logo.width / logo.height) * logoH;
      ctx.drawImage(logo, 20 * scale, h + (footerH - logoH) / 2, logoW, logoH);
    } catch {}
    ctx.fillStyle = "#0f1f3d";
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    ctx.font = `600 ${Math.round(18 * scale)}px Inter, sans-serif`;
    ctx.fillText(COMPANY_NAME, w - 20 * scale, h + footerH / 2 - 10 * scale);
    ctx.font = `400 ${Math.round(11 * scale)}px Inter, sans-serif`;
    ctx.fillStyle = "rgba(15,31,61,0.7)";
    ctx.fillText(COMPANY_TAGLINE + " — Double-layer outside / inside", w - 20 * scale, h + footerH / 2 + 12 * scale);

    return canvas.toDataURL("image/png");
  } finally {
    a.revoke();
    b.revoke();
  }
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function imageToDataUrl(src: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const img = await loadImage(src);
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    c.getContext("2d")!.drawImage(img, 0, 0);
    return { data: c.toDataURL("image/png"), w: img.width, h: img.height };
  } catch {
    return null;
  }
}

/** One row of the handle-design spec table. `swatch` draws a color chip. */
export interface HandleSpecRow {
  label: string;
  value: string;
  swatch?: string;
}

/** Handle (伞头) page content for the PDF. */
export interface HandleDesignExport {
  title: string;
  front: string;
  angle: string;
  rows: HandleSpecRow[];
  logo?: string;
}

/**
 * Crop the near-white border off a rendered capture so a small subject
 * (e.g. the handle) fills its cell. Keeps `pad` px of white around it.
 */
export async function trimWhite(dataUrl: string, pad = 24): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const k = (y * width + x) * 4;
      if (data[k] < 238 || data[k + 1] < 238 || data[k + 2] < 238) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return dataUrl;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(width, x1 + pad); y1 = Math.min(height, y1 + pad);
  const out = document.createElement("canvas");
  out.width = x1 - x0;
  out.height = y1 - y0;
  const octx = out.getContext("2d")!;
  octx.fillStyle = "#ffffff";
  octx.fillRect(0, 0, out.width, out.height);
  octx.drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}

export async function exportPdfSummary(
  project: DesignProject,
  pngDataUrl: string,
  pouchPngDataUrl?: string,
  innerLayerPngDataUrl?: string,
  threeD?: {
    hero: string;
    top: string;
    front: string;
    side: string;
    modelId: string;
    topCap: string;
    handle: string;
    displayName: string;
    handleInsert?: string;
    handleColor?: string;
    midSection?: string;
  },
  handleDesign?: HandleDesignExport
) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();

  // Header band
  pdf.setFillColor(186, 220, 240);
  pdf.rect(0, 0, pageW, 90, "F");

  const logo = await imageToDataUrl(logoUrl);
  if (logo) {
    const lh = 56;
    const lw = (logo.w / logo.h) * lh;
    try {
      pdf.addImage(logo.data, "PNG", 30, 17, lw, lh);
    } catch {}
  }

  pdf.setTextColor(15, 31, 61);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(COMPANY_NAME, pageW - 30, 45, { align: "right" });
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(COMPANY_TAGLINE + " — Sales preview & quotation", pageW - 30, 65, { align: "right" });

  pdf.setTextColor(20, 24, 30);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(project.projectName, 40, 125);
  if (project.customerName) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(110, 110, 120);
    pdf.text(`Customer: ${project.customerName}`, 40, 142);
  }

  // Specification block first, above the rendering
  let y = project.customerName ? 165 : 150;
  const ribIn = PANEL_LENGTH_IN[project.umbrellaCategory];
  const ribCm = PANEL_LENGTH_CM[project.umbrellaCategory];
  const diaCm = Math.round(ribCm * 2 * 10) / 10;
  const rows: [string, string][] = [
    ["Category", project.umbrellaCategory],
    ["Rib / panel count", String(project.ribCount)],
    ["Rib length", `${ribIn}" (${ribCm} cm)`],
    ["Approx. canopy diameter", `${diaCm} cm`],
    ["Printing method", project.printingMethod],
    ["Fabric color", project.fabricColor],
    ["Artwork items", String(project.artworkItems.length)],
    [
      "Panels used",
      Array.from(new Set(project.artworkItems.flatMap((a) => a.panels)))
        .map((p) => p + 1)
        .sort((a, b) => a - b)
        .join(", ") || "—",
    ],
  ];
  if (project.hasPouch) {
    const ps = POUCH_SIZE_CM[project.umbrellaCategory];
    rows.push(["Pouch (front)", `${ps.w} × ${ps.h} cm`]);
    rows.push(["Pouch (spread)", `${ps.w * 2} × ${ps.h} cm`]);
    rows.push(["Pouch artwork items", String((project.pouchArtwork || []).length)]);
  }


  pdf.setTextColor(20, 24, 30);
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("Specification", 40, y);
  y += 16;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  rows.forEach(([k, v]) => {
    pdf.setTextColor(110, 110, 120);
    pdf.text(k, 40, y);
    pdf.setTextColor(20, 24, 30);
    pdf.text(String(v), 180, y);
    y += 16;
  });

  // Design rendering below specifications
  y += 14;
  if (project.hasDoubleLayer && project.umbrellaCategory === "golf") {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(20, 24, 30);
    pdf.text("Outside view (outer canopy)", 40, y);
    y += 14;
  }
  const imgW = pageW - 80;
  const imgProps = pdf.getImageProperties(pngDataUrl);
  const pageH = pdf.internal.pageSize.getHeight();
  const maxImgH = pageH - y - 70; // leave room for note + footer
  let imgH = (imgProps.height / imgProps.width) * imgW;
  let drawW = imgW;
  if (imgH > maxImgH) {
    imgH = maxImgH;
    drawW = (imgProps.width / imgProps.height) * imgH;
  }
  const drawX = 40 + (imgW - drawW) / 2;
  try {
    pdf.addImage(pngDataUrl, "PNG", drawX, y, drawW, imgH);
  } catch {}
  y += imgH + 18;

  pdf.setFont("helvetica", "italic");
  pdf.setTextColor(110, 110, 120);
  pdf.setFontSize(9);
  const note =
    "Note: This is a sales preview rendering by " +
    COMPANY_NAME +
    ". Final production artwork, color accuracy and dimensions must be confirmed by the factory designer before mass production.";
  const lines = pdf.splitTextToSize(note, pageW - 80);
  pdf.text(lines, 40, y);

  // Footer
  pdf.setDrawColor(220);
  pdf.line(40, pageH - 40, pageW - 40, pageH - 40);
  pdf.setFontSize(9);
  pdf.setTextColor(140);
  pdf.text(COMPANY_NAME, 40, pageH - 24);
  pdf.text(new Date().toLocaleDateString(), pageW - 40, pageH - 24, { align: "right" });

  // Optional second page: pouch preview
  if (pouchPngDataUrl && project.hasPouch) {
    pdf.addPage();
    const ps = POUCH_SIZE_CM[project.umbrellaCategory];
    pdf.setFillColor(186, 220, 240);
    pdf.rect(0, 0, pageW, 60, "F");
    pdf.setTextColor(15, 31, 61);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("Pouch artwork — spread layout", 40, 38);

    pdf.setTextColor(20, 24, 30);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Front face: ${ps.w} × ${ps.h} cm   ·   Spread: ${ps.w * 2} × ${ps.h} cm`, 40, 90);

    const pImgProps = pdf.getImageProperties(pouchPngDataUrl);
    const pImgW = pageW - 80;
    const pImgH = (pImgProps.height / pImgProps.width) * pImgW;
    try {
      pdf.addImage(pouchPngDataUrl, "PNG", 40, 110, pImgW, Math.min(pImgH, pageH - 180));
    } catch {}

    pdf.setDrawColor(220);
    pdf.line(40, pageH - 40, pageW - 40, pageH - 40);
    pdf.setFontSize(9);
    pdf.setTextColor(140);
    pdf.text(COMPANY_NAME, 40, pageH - 24);
    pdf.text(new Date().toLocaleDateString(), pageW - 40, pageH - 24, { align: "right" });
  }

  // Optional inner-layer page (double-layer golf)
  if (innerLayerPngDataUrl && project.hasDoubleLayer && project.umbrellaCategory === "golf") {
    pdf.addPage();
    pdf.setFillColor(186, 220, 240);
    pdf.rect(0, 0, pageW, 60, "F");
    pdf.setTextColor(15, 31, 61);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("Inside view (inner layer) — full canopy", 40, 38);

    pdf.setTextColor(20, 24, 30);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Fabric: ${project.innerLayer?.fabricColor || "—"}`, 40, 90);

    const iProps = pdf.getImageProperties(innerLayerPngDataUrl);
    const iW = pageW - 80;
    const iH = (iProps.height / iProps.width) * iW;
    try {
      pdf.addImage(innerLayerPngDataUrl, "PNG", 40, 110, iW, Math.min(iH, pageH - 180));
    } catch {}

    pdf.setDrawColor(220);
    pdf.line(40, pageH - 40, pageW - 40, pageH - 40);
    pdf.setFontSize(9);
    pdf.setTextColor(140);
    pdf.text(COMPANY_NAME, 40, pageH - 24);
    pdf.text(new Date().toLocaleDateString(), pageW - 40, pageH - 24, { align: "right" });
  }

  // Optional 3D Sales Preview page
  if (threeD) {
    pdf.addPage();
    pdf.setFillColor(186, 220, 240);
    pdf.rect(0, 0, pageW, 60, "F");
    pdf.setTextColor(15, 31, 61);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("3D Sales Preview", 40, 38);

    pdf.setTextColor(20, 24, 30);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(threeD.displayName, 40, 84);

    // Hero 3/4 view on top, then three orthographic-style captures in a row
    const contentW = pageW - 80;
    const heroH = contentW * 0.62;
    const yHero = 96;
    try {
      const props = pdf.getImageProperties(threeD.hero);
      const ratio = props.height / props.width;
      let drawW = contentW;
      let drawH = drawW * ratio;
      if (drawH > heroH) {
        drawH = heroH;
        drawW = drawH / ratio;
      }
      pdf.addImage(threeD.hero, "PNG", 40 + (contentW - drawW) / 2, yHero + (heroH - drawH) / 2, drawW, drawH);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[pdf] hero image failed", e);
    }
    pdf.setFontSize(9);
    pdf.setTextColor(110, 110, 120);
    pdf.text("3D rendering (3/4 view)", pageW / 2, yHero + heroH + 14, { align: "center" });

    const gap = 12;
    const cellW = (contentW - gap * 2) / 3;
    const cellH = cellW * 0.8;
    const labels = ["Top view", "Front view", "Side view"];
    const urls = [threeD.top, threeD.front, threeD.side];
    const yImg = yHero + heroH + 30;
    urls.forEach((u, i) => {
      const x = 40 + i * (cellW + gap);
      try {
        const props = pdf.getImageProperties(u);
        const ratio = props.height / props.width;
        let drawW = cellW;
        let drawH = drawW * ratio;
        if (drawH > cellH) {
          drawH = cellH;
          drawW = drawH / ratio;
        }
        pdf.addImage(u, "PNG", x + (cellW - drawW) / 2, yImg + (cellH - drawH) / 2, drawW, drawH);
      } catch {}
      pdf.text(labels[i], x + cellW / 2, yImg + cellH + 14, { align: "center" });
    });

    // Spec block
    let sy = yImg + cellH + 40;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(20, 24, 30);
    pdf.text("Model details", 40, sy);
    sy += 16;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    const specRows: [string, string][] = [
      ["Model ID", threeD.modelId],
      ["Top cap style", threeD.topCap],
      ["Handle style", threeD.handle],
      ...(threeD.handleColor ? ([["Handle color", threeD.handleColor]] as [string, string][]) : []),
      ...(threeD.handleInsert ? ([["Handle insert", threeD.handleInsert]] as [string, string][]) : []),
      ...(threeD.midSection ? ([["Middle section", threeD.midSection]] as [string, string][]) : []),
    ];
    specRows.forEach(([k, v]) => {
      pdf.setTextColor(110, 110, 120);
      pdf.text(k, 40, sy);
      pdf.setTextColor(20, 24, 30);
      pdf.text(v, 180, sy);
      sy += 14;
    });

    sy += 8;
    pdf.setFont("helvetica", "italic");
    pdf.setTextColor(110, 110, 120);
    pdf.setFontSize(9);
    const disclaimer =
      "The 3D preview is for sales visualization only. Final production details, materials, dimensions and finishing must be confirmed by the factory designer.";
    const dLines = pdf.splitTextToSize(disclaimer, pageW - 80);
    pdf.text(dLines, 40, sy);

    pdf.setDrawColor(220);
    pdf.line(40, pageH - 40, pageW - 40, pageH - 40);
    pdf.setFontSize(9);
    pdf.setTextColor(140);
    pdf.text(COMPANY_NAME, 40, pageH - 24);
    pdf.text(new Date().toLocaleDateString(), pageW - 40, pageH - 24, { align: "right" });
  }

  // Optional handle (伞头) design page: two close-ups + spec table with swatches
  if (handleDesign) {
    pdf.addPage();
    pdf.setFillColor(186, 220, 240);
    pdf.rect(0, 0, pageW, 60, "F");
    pdf.setTextColor(15, 31, 61);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("Handle Design", 40, 38);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(20, 24, 30);
    pdf.text(handleDesign.title, 40, 84);

    const contentW = pageW - 80;
    const gap = 16;
    const cellW = (contentW - gap) / 2;
    const cellH = 330;
    const yImg = 100;
    const shots: [string, string][] = [
      [handleDesign.front, "Front (insert & open button)"],
      [handleDesign.angle, "3/4 view"],
    ];
    shots.forEach(([u, label], i) => {
      const x = 40 + i * (cellW + gap);
      pdf.setDrawColor(230);
      pdf.roundedRect(x, yImg, cellW, cellH, 6, 6, "S");
      try {
        const props = pdf.getImageProperties(u);
        const ratio = props.height / props.width;
        let drawW = cellW - 20;
        let drawH = drawW * ratio;
        if (drawH > cellH - 20) {
          drawH = cellH - 20;
          drawW = drawH / ratio;
        }
        pdf.addImage(u, "PNG", x + (cellW - drawW) / 2, yImg + (cellH - drawH) / 2, drawW, drawH);
      } catch {}
      pdf.setFontSize(9);
      pdf.setTextColor(110, 110, 120);
      pdf.text(label, x + cellW / 2, yImg + cellH + 14, { align: "center" });
    });

    let sy = yImg + cellH + 44;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(20, 24, 30);
    pdf.text("Handle specification", 40, sy);
    sy += 18;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    const hexToRgb = (h: string) => {
      const m = h.replace("#", "");
      const v = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
      return [0, 2, 4].map((k) => parseInt(v.slice(k, k + 2), 16) || 0) as [number, number, number];
    };
    handleDesign.rows.forEach((r) => {
      pdf.setTextColor(110, 110, 120);
      pdf.text(r.label, 40, sy);
      let vx = 200;
      if (r.swatch) {
        const [cr, cg, cb] = hexToRgb(r.swatch);
        pdf.setFillColor(cr, cg, cb);
        pdf.setDrawColor(180);
        pdf.roundedRect(vx, sy - 9, 22, 12, 2, 2, "FD");
        vx += 30;
      }
      pdf.setTextColor(20, 24, 30);
      pdf.text(r.value, vx, sy);
      sy += 20;
    });

    if (handleDesign.logo) {
      sy += 6;
      pdf.setTextColor(110, 110, 120);
      pdf.text("Insert logo artwork", 40, sy);
      try {
        const props = pdf.getImageProperties(handleDesign.logo);
        const ratio = props.height / props.width;
        let w = 140, h = w * ratio;
        if (h > 70) { h = 70; w = h / ratio; }
        // mid-grey backdrop so both light and dark logos stay visible
        pdf.setFillColor(138, 143, 153);
        pdf.rect(200, sy - 12, w + 12, h + 12, "F");
        pdf.addImage(handleDesign.logo, "PNG", 200 + 6, sy - 6, w, h);
        sy += h + 10;
      } catch {}
    }

    sy += 16;
    pdf.setFont("helvetica", "italic");
    pdf.setTextColor(110, 110, 120);
    pdf.setFontSize(9);
    const note =
      "Colors on screen are indicative. Final handle, insert and middle-section colors are matched to physical samples before production.";
    pdf.text(pdf.splitTextToSize(note, pageW - 80), 40, Math.min(sy, pageH - 60));

    pdf.setDrawColor(220);
    pdf.line(40, pageH - 40, pageW - 40, pageH - 40);
    pdf.setFontSize(9);
    pdf.setTextColor(140);
    pdf.text(COMPANY_NAME, 40, pageH - 24);
    pdf.text(new Date().toLocaleDateString(), pageW - 40, pageH - 24, { align: "right" });
  }

  pdf.save(`${project.projectName.replace(/\s+/g, "_")}_summary.pdf`);
}

// Export a vector Illustrator-compatible file (.ai). Illustrator opens
// PDF-compatible files saved with the .ai extension natively, so we embed
// the live SVG as vectors using svg2pdf.js. This preserves crisp paths,
// text and logos for the fabric supplier.
export async function exportAiFile(
  project: DesignProject,
  svg: SVGSVGElement,
  pouchSvg?: SVGSVGElement | null,
  innerSvg?: SVGSVGElement | null
) {
  // Clone so we don't disturb the on-screen SVG
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const vb = svg.viewBox.baseVal;
  const width = vb && vb.width ? vb.width : svg.clientWidth || 600;
  const height = vb && vb.height ? vb.height : svg.clientHeight || 600;

  const margin = 36;
  const footerH = 56;
  const pageW = width + margin * 2;
  const pageH = height + margin * 2 + footerH;

  const pdf = new jsPDF({
    unit: "pt",
    format: [pageW, pageH],
    orientation: pageW > pageH ? "landscape" : "portrait",
  });

  await svg2pdf(clone, pdf, {
    x: margin,
    y: margin,
    width,
    height,
  });

  // Spec footer
  const ribIn = PANEL_LENGTH_IN[project.umbrellaCategory];
  const ribCm = PANEL_LENGTH_CM[project.umbrellaCategory];
  const footerY = margin + height + 18;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(20, 24, 30);
  const outerTitle = project.hasDoubleLayer && project.umbrellaCategory === "golf"
    ? `${project.projectName} — outside view (outer canopy)`
    : project.projectName;
  pdf.text(outerTitle, margin, footerY);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(80, 80, 90);
  const specLine = `${project.umbrellaCategory} · ${project.ribCount} ribs · rib length ${ribIn}" (${ribCm} cm) · ${project.printingMethod}`;
  pdf.text(specLine, margin, footerY + 14);
  pdf.setTextColor(140);
  pdf.text(COMPANY_NAME, margin, footerY + 28);
  pdf.text(new Date().toLocaleDateString(), pageW - margin, footerY + 28, { align: "right" });

  // Optional second page: pouch vector
  if (pouchSvg && project.hasPouch) {
    const pClone = pouchSvg.cloneNode(true) as SVGSVGElement;
    const pvb = pouchSvg.viewBox.baseVal;
    const pw = pvb && pvb.width ? pvb.width : pouchSvg.clientWidth || 400;
    const ph = pvb && pvb.height ? pvb.height : pouchSvg.clientHeight || 600;
    const pPageW = pw + margin * 2;
    const pPageH = ph + margin * 2 + footerH;
    pdf.addPage([pPageW, pPageH], pPageW > pPageH ? "landscape" : "portrait");
    await svg2pdf(pClone, pdf, { x: margin, y: margin, width: pw, height: ph });
    const ps = POUCH_SIZE_CM[project.umbrellaCategory];
    const fY = margin + ph + 18;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(20, 24, 30);
    pdf.text(`${project.projectName} — pouch`, margin, fY);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 90);
    pdf.text(`front ${ps.w} × ${ps.h} cm · spread ${ps.w * 2} × ${ps.h} cm`, margin, fY + 14);
    pdf.setTextColor(140);
    pdf.text(COMPANY_NAME, margin, fY + 28);
  }

  // Optional inner-layer vector page
  if (innerSvg && project.hasDoubleLayer && project.umbrellaCategory === "golf") {
    const iClone = innerSvg.cloneNode(true) as SVGSVGElement;
    const ivb = innerSvg.viewBox.baseVal;
    const iw = ivb && ivb.width ? ivb.width : innerSvg.clientWidth || 600;
    const ih = ivb && ivb.height ? ivb.height : innerSvg.clientHeight || 600;
    const iPageW = iw + margin * 2;
    const iPageH = ih + margin * 2 + footerH;
    pdf.addPage([iPageW, iPageH], iPageW > iPageH ? "landscape" : "portrait");
    await svg2pdf(iClone, pdf, { x: margin, y: margin, width: iw, height: ih });
    const fY = margin + ih + 18;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(20, 24, 30);
    pdf.text(`${project.projectName} — inside view (inner layer)`, margin, fY);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 90);
    pdf.text(`golf · ${project.ribCount} ribs · inner fabric ${project.innerLayer?.fabricColor || "—"}`, margin, fY + 14);
    pdf.setTextColor(140);
    pdf.text(COMPANY_NAME, margin, fY + 28);
  }

  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  try {
    downloadDataUrl(url, `${project.projectName.replace(/\s+/g, "_")}.ai`);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
