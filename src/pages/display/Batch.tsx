import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Box, FileText, LayoutGrid, Printer } from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";
import { AppTabs } from "@/components/AppTabs";
import { DisplayBoxNet } from "@/components/DisplayBoxNet";
import { DisplayBox3D } from "@/components/DisplayBox3D";
import { DisplayBoxProject } from "@/types/displayBox";
import { getDisplayProject } from "@/lib/displayBoxStorage";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function DisplayBatch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<DisplayBoxProject | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"2d" | "3d">("2d");

  useEffect(() => {
    if (!id) return;
    const p = getDisplayProject(id);
    if (!p) { navigate("/display"); return; }
    setProject(p);
  }, [id, navigate]);

  if (!project) return null;

  const handlePrint = () => window.print();

  const exportPDF = async () => {
    if (!sheetRef.current) return;
    setBusy(true);
    try {
      const canvas = await html2canvas(sheetRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
      const pageW = 297;
      const pageH = 210;
      const margin = 10;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height / canvas.width) * imgW;
      const imgData = canvas.toDataURL("image/png");

      if (imgH <= pageH - margin * 2) {
        pdf.addImage(imgData, "PNG", margin, margin, imgW, imgH);
      } else {
        const pxPerMm = canvas.width / imgW;
        const pageInnerH = pageH - margin * 2;
        const pageSliceHpx = pageInnerH * pxPerMm;
        let y = 0;
        while (y < canvas.height) {
          const sliceH = Math.min(pageSliceHpx, canvas.height - y);
          const slice = document.createElement("canvas");
          slice.width = canvas.width;
          slice.height = sliceH;
          slice.getContext("2d")!.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          const sliceData = slice.toDataURL("image/png");
          const sliceMm = sliceH / pxPerMm;
          if (y > 0) pdf.addPage();
          pdf.addImage(sliceData, "PNG", margin, margin, imgW, sliceMm);
          y += sliceH;
        }
      }
      pdf.save(`display-box-${project.title || project.id.slice(0, 6)}.pdf`);
      toast.success("PDF 已导出");
    } catch (e) {
      console.error(e);
      toast.error("PDF 导出失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="no-print border-b bg-card">
        <div className="container flex flex-wrap items-center justify-between gap-2 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/display/editor/${project.id}`}><ArrowLeft className="mr-1 h-4 w-4" />编辑</Link>
            </Button>
            <BrandHeader subtitle={`展示盒 · ${project.title}`} compact />
            <AppTabs />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-md border">
              <Button variant={mode === "2d" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setMode("2d")}>
                <LayoutGrid className="mr-1 h-4 w-4" />2D
              </Button>
              <Button variant={mode === "3d" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setMode("3d")}>
                <Box className="mr-1 h-4 w-4" />3D
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={mode === "3d"}><Printer className="mr-1 h-4 w-4" />打印</Button>
            <Button size="sm" onClick={exportPDF} disabled={busy || mode === "3d"}><FileText className="mr-1 h-4 w-4" />{busy ? "导出中…" : "导出 PDF"}</Button>
          </div>
        </div>
      </header>

      <div className="container py-6">
        <div className="mx-auto max-w-[1100px]">
          {mode === "2d" ? (
            <div ref={sheetRef} className="space-y-6 bg-white p-10 text-black shadow-sm">
              <p className="text-[13px] font-semibold leading-6">
                {project.title} — {project.description}
              </p>
              <p className="text-[11px] uppercase text-neutral-500">
                {project.boxType === "folding" ? "折叠伞盒" : "直伞盒"} ·{" "}
                {project.dimensions.l}×{project.dimensions.w}×{project.dimensions.h} cm
              </p>
              {project.variants.map((v) => (
                <div key={v.id} className="space-y-2">
                  <p className="text-[13px] font-bold">{v.name}</p>
                  <DisplayBoxNet variant={v} dimensions={project.dimensions} />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {project.variants.map((v) => (
                <div key={v.id} className="space-y-2">
                  <p className="text-sm font-bold">{v.name}</p>
                  <DisplayBox3D variant={v} boxType={project.boxType} dimensions={project.dimensions} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
