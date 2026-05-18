import jsPDF from "jspdf";
import { DesignProject } from "@/types/design";
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
    ctx.fillStyle = "#0f1f3d";
    ctx.fillRect(0, h, w, footerH);

    // Logo
    try {
      const logo = await loadImage(logoUrl);
      const logoH = footerH * 0.7;
      const logoW = (logo.width / logo.height) * logoH;
      ctx.drawImage(logo, 20 * scale, h + (footerH - logoH) / 2, logoW, logoH);
    } catch {}

    // Company name text
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${Math.round(18 * scale)}px Inter, sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText(COMPANY_NAME, w - 20 * scale, h + footerH / 2 - 10 * scale);
    ctx.font = `400 ${Math.round(11 * scale)}px Inter, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText(COMPANY_TAGLINE, w - 20 * scale, h + footerH / 2 + 12 * scale);

    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
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

export async function exportPdfSummary(project: DesignProject, pngDataUrl: string) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();

  // Header band
  pdf.setFillColor(15, 31, 61);
  pdf.rect(0, 0, pageW, 90, "F");

  const logo = await imageToDataUrl(logoUrl);
  if (logo) {
    const lh = 56;
    const lw = (logo.w / logo.h) * lh;
    try {
      pdf.addImage(logo.data, "PNG", 30, 17, lw, lh);
    } catch {}
  }

  pdf.setTextColor(255, 255, 255);
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

  const imgW = pageW - 80;
  // Preserve the actual aspect ratio of the rendered PNG (it includes a footer band,
  // so it's taller than wide). Using a square box was squishing the umbrella.
  const imgProps = pdf.getImageProperties(pngDataUrl);
  const imgH = (imgProps.height / imgProps.width) * imgW;
  try {
    pdf.addImage(pngDataUrl, "PNG", 40, 160, imgW, imgH);
  } catch {}

  let y = 160 + imgH + 30;
  const rows: [string, string][] = [
    ["Category", project.umbrellaCategory],
    ["Rib / panel count", String(project.ribCount)],
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

  y += 6;
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
  const pageH = pdf.internal.pageSize.getHeight();
  pdf.setDrawColor(220);
  pdf.line(40, pageH - 40, pageW - 40, pageH - 40);
  pdf.setFontSize(9);
  pdf.setTextColor(140);
  pdf.text(COMPANY_NAME, 40, pageH - 24);
  pdf.text(new Date().toLocaleDateString(), pageW - 40, pageH - 24, { align: "right" });

  pdf.save(`${project.projectName.replace(/\s+/g, "_")}_summary.pdf`);
}
