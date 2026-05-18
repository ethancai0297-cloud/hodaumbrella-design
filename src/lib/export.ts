import jsPDF from "jspdf";
import { DesignProject } from "@/types/design";

export function svgToPngDataUrl(svg: SVGSVGElement, scale = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    const xml = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const w = (svg.viewBox.baseVal.width || svg.clientWidth) * scale;
      const h = (svg.viewBox.baseVal.height || svg.clientHeight) * scale;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no ctx"));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function exportPdfSummary(project: DesignProject, pngDataUrl: string) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();

  pdf.setFillColor(15, 31, 61);
  pdf.rect(0, 0, pageW, 80, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text("Umbrella Render Studio", 40, 38);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.text("Sales preview & quotation summary", 40, 58);

  pdf.setTextColor(20, 24, 30);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(project.projectName, 40, 115);
  if (project.customerName) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(110, 110, 120);
    pdf.text(`Customer: ${project.customerName}`, 40, 132);
  }

  // image
  const imgW = pageW - 80;
  const imgH = imgW;
  try {
    pdf.addImage(pngDataUrl, "PNG", 40, 150, imgW, imgH);
  } catch {}

  let y = 150 + imgH + 30;
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
    "Note: This is a sales preview rendering. Final production artwork, color accuracy and dimensions must be confirmed by the factory designer before mass production.";
  const lines = pdf.splitTextToSize(note, pageW - 80);
  pdf.text(lines, 40, y);

  pdf.save(`${project.projectName.replace(/\s+/g, "_")}_summary.pdf`);
}
