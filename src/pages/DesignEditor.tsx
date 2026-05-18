import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Download,
  FileImage,
  FileText,
  Plus,
  RotateCcw,
  Save,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { UmbrellaCanopy } from "@/components/UmbrellaCanopy";
import { WizardPanel } from "@/components/editor/WizardPanel";
import { ArtworkProperties } from "@/components/editor/ArtworkProperties";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/i18n/i18n";
import {
  ArtworkItem,
  DesignProject,
  FABRIC_PRESETS,
  PrintingMethod,
  RibCount,
  UmbrellaCategory,
} from "@/types/design";
import { getProject, saveProject } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { downloadDataUrl, exportPdfSummary, svgToPngDataUrl } from "@/lib/export";

const SILKSCREEN_LIMITS = [1, 2, 4, 8];

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const DesignEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [project, setProject] = useState<DesignProject>(() => ({
    id: newId(),
    projectName: "Untitled umbrella",
    customerName: "",
    umbrellaCategory: "straight",
    ribCount: 8,
    printingMethod: "silkscreen",
    fabricColor: "#0f1f3d",
    artworkItems: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));

  const [selectedPanels, setSelectedPanels] = useState<number[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);

  // load existing
  useEffect(() => {
    if (id) {
      const p = getProject(id);
      if (p) setProject(p);
    }
  }, [id]);

  // history (simple undo/redo)
  const historyRef = useRef<DesignProject[]>([]);
  const futureRef = useRef<DesignProject[]>([]);

  const updateProject = (patch: Partial<DesignProject> | ((p: DesignProject) => DesignProject)) => {
    setProject((prev) => {
      historyRef.current.push(prev);
      if (historyRef.current.length > 50) historyRef.current.shift();
      futureRef.current = [];
      const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      return { ...next, updatedAt: Date.now() };
    });
  };

  const undo = () => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    futureRef.current.push(project);
    setProject(prev);
  };
  const redo = () => {
    const next = futureRef.current.pop();
    if (!next) return;
    historyRef.current.push(project);
    setProject(next);
  };

  // ensure rib count change clears panel selection that's out of range
  useEffect(() => {
    setSelectedPanels((s) => s.filter((p) => p < project.ribCount));
  }, [project.ribCount]);

  const togglePanel = (i: number) => {
    setSelectedPanels((s) => {
      if (s.includes(i)) return s.filter((p) => p !== i);
      // silkscreen max 8
      const next = [...s, i].sort((a, b) => a - b);
      if (project.printingMethod === "silkscreen" && next.length > 8) {
        toast({ title: "Silkscreen max 8 panels" });
        return s;
      }
      return next;
    });
  };

  const applySelectAll = () => {
    setSelectedPanels(Array.from({ length: project.ribCount }, (_, i) => i));
  };
  const clearSelection = () => setSelectedPanels([]);

  // upload artwork
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleUpload = (file: File) => {
    if (file.size > 12 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 12MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const img = new Image();
      img.onload = () => {
        if (img.width < 600 || img.height < 600) {
          toast({
            title: "Low resolution image",
            description: "For best print quality use 1500px or larger.",
          });
        }
      };
      img.src = src;
      const panels = selectedPanels.length
        ? selectedPanels
        : project.printingMethod === "digital"
        ? Array.from({ length: project.ribCount }, (_, i) => i)
        : [0];
      const item: ArtworkItem = {
        id: newId(),
        type: project.printingMethod === "digital" ? "image" : "logo",
        src,
        fileName: file.name,
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        panels,
        fitMode: "contain",
        printArea: project.printingMethod === "digital" ? "full" : "single",
      };
      updateProject((p) => ({ ...p, artworkItems: [...p.artworkItems, item] }));
      setSelectedItem(item.id);
      toast({ title: "Artwork added" });
    };
    reader.readAsDataURL(file);
  };

  const addText = () => {
    const panels = selectedPanels.length ? selectedPanels : [0];
    const item: ArtworkItem = {
      id: newId(),
      type: "text",
      text: "YOUR TEXT",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: 22,
      color: "#ffffff",
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      panels,
    };
    updateProject((p) => ({ ...p, artworkItems: [...p.artworkItems, item] }));
    setSelectedItem(item.id);
  };

  const updateItem = (itemId: string, patch: Partial<ArtworkItem>) => {
    updateProject((p) => ({
      ...p,
      artworkItems: p.artworkItems.map((a) => (a.id === itemId ? { ...a, ...patch } : a)),
    }));
  };
  const deleteItem = (itemId: string) => {
    updateProject((p) => ({ ...p, artworkItems: p.artworkItems.filter((a) => a.id !== itemId) }));
    setSelectedItem(null);
  };
  const duplicateItem = (itemId: string) => {
    const orig = project.artworkItems.find((a) => a.id === itemId);
    if (!orig) return;
    const copy: ArtworkItem = {
      ...orig,
      id: newId(),
      panels: selectedPanels.length ? selectedPanels : orig.panels,
    };
    updateProject((p) => ({ ...p, artworkItems: [...p.artworkItems, copy] }));
    setSelectedItem(copy.id);
  };
  const centerItem = (itemId: string) => updateItem(itemId, { x: 0, y: 0 });

  const handleSave = () => {
    saveProject(project);
    toast({ title: "Project saved", description: "Stored in your browser." });
  };

  const handleExportPng = async () => {
    if (!svgRef.current) return;
    try {
      const url = await svgToPngDataUrl(svgRef.current, 3);
      downloadDataUrl(url, `${project.projectName.replace(/\s+/g, "_")}.png`);
    } catch (e) {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };
  const handleExportPdf = async () => {
    if (!svgRef.current) return;
    try {
      const url = await svgToPngDataUrl(svgRef.current, 2);
      await exportPdfSummary(project, url);
    } catch (e) {
      toast({ title: "PDF export failed", variant: "destructive" });
    }
  };

  const handleReset = () => {
    if (!confirm("Reset all artwork and panel selection?")) return;
    updateProject((p) => ({ ...p, artworkItems: [] }));
    setSelectedPanels([]);
    setSelectedItem(null);
  };

  const silkscreenWarn = project.printingMethod === "silkscreen";
  const digitalWarn = project.printingMethod === "digital";

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Top bar */}
      <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition flex items-center gap-1.5 text-sm">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <Separator orientation="vertical" className="h-6" />
        <Input
          value={project.projectName}
          onChange={(e) => setProject((p) => ({ ...p, projectName: e.target.value }))}
          className="h-8 max-w-xs font-medium"
        />
        <Input
          placeholder="Customer name (optional)"
          value={project.customerName || ""}
          onChange={(e) => setProject((p) => ({ ...p, customerName: e.target.value }))}
          className="h-8 max-w-xs text-sm"
        />
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={undo} title="Undo"><RotateCcw className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Save</Button>
          <Button size="sm" variant="outline" onClick={handleExportPng}><FileImage className="h-4 w-4 mr-1" /> PNG</Button>
          <Button size="sm" className="bg-gradient-hero" onClick={handleExportPdf}><FileText className="h-4 w-4 mr-1" /> PDF</Button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-[280px_1fr_320px] min-h-0">
        {/* Left sidebar */}
        <aside className="border-r border-border bg-card overflow-y-auto p-5">
          <WizardPanel
            category={project.umbrellaCategory}
            ribCount={project.ribCount}
            method={project.printingMethod}
            onCategory={(v) => updateProject({ umbrellaCategory: v })}
            onRibs={(v) => updateProject({ ribCount: v })}
            onMethod={(v) => updateProject({ printingMethod: v })}
          />

          <Separator className="my-5" />

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Fabric color</h3>
            <div className="grid grid-cols-4 gap-2">
              {FABRIC_PRESETS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => updateProject({ fabricColor: c.value })}
                  title={c.name}
                  className={cn(
                    "h-9 rounded-md border-2 transition",
                    project.fabricColor === c.value ? "border-primary scale-105" : "border-border"
                  )}
                  style={{ background: c.value }}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="color"
                value={project.fabricColor}
                onChange={(e) => updateProject({ fabricColor: e.target.value })}
                className="h-9 w-14 p-1"
              />
              <Input
                value={project.fabricColor}
                onChange={(e) => updateProject({ fabricColor: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
          </section>
        </aside>

        {/* Canvas */}
        <main className="relative overflow-auto bg-gradient-subtle">
          <div className="absolute top-4 left-4 right-4 flex items-center gap-2 z-10">
            <div className="rounded-lg bg-card border border-border shadow-soft px-3 py-2 text-xs flex items-center gap-3">
              <span className="text-muted-foreground">Panels</span>
              <span className="font-semibold">{selectedPanels.length}/{project.ribCount}</span>
              <Separator orientation="vertical" className="h-4" />
              <button onClick={applySelectAll} className="text-primary hover:underline">All</button>
              <button onClick={clearSelection} className="text-muted-foreground hover:text-foreground">Clear</button>
              {project.printingMethod === "silkscreen" && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  {SILKSCREEN_LIMITS.filter((n) => n <= project.ribCount).map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        const step = Math.floor(project.ribCount / n);
                        setSelectedPanels(Array.from({ length: n }, (_, i) => i * step));
                      }}
                      className="rounded px-1.5 py-0.5 bg-muted hover:bg-accent text-foreground"
                    >
                      {n}p
                    </button>
                  ))}
                </>
              )}
            </div>
            <div className="ml-auto rounded-lg bg-card border border-border shadow-soft p-1 flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}><ZoomOut className="h-3.5 w-3.5" /></Button>
              <span className="text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(2, z + 0.1))}><ZoomIn className="h-3.5 w-3.5" /></Button>
              <Separator orientation="vertical" className="h-5" />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleReset} title="Reset"><RotateCcw className="h-3.5 w-3.5" /></Button>
            </div>
          </div>

          <div className="min-h-full grid place-items-center p-12 pt-20">
            <div style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}>
              <UmbrellaCanopy
                ref={svgRef}
                category={project.umbrellaCategory}
                ribCount={project.ribCount}
                fabricColor={project.fabricColor}
                artwork={project.artworkItems}
                selectedPanels={selectedPanels}
                onPanelClick={togglePanel}
                size={620}
              />
            </div>
          </div>

          {(silkscreenWarn || digitalWarn) && (
            <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-warning/40 bg-warning/10 text-foreground text-xs px-3 py-2 flex items-start gap-2">
              <span className="font-semibold text-warning">Note:</span>
              <span>
                {silkscreenWarn
                  ? "Silkscreen is recommended for small-area logo/text — not full-photo artwork. Final artwork must be confirmed by factory designer."
                  : "Digital print is best for photographic / full-surface designs. Upload at 300dpi for sharp production output."}
              </span>
            </div>
          )}
        </main>

        {/* Right sidebar */}
        <aside className="border-l border-border bg-card overflow-y-auto p-5">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">4. Add artwork</h3>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" /> Upload
              </Button>
              <Button variant="outline" size="sm" onClick={addText}>
                <Plus className="h-4 w-4 mr-1" /> Add text
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              PNG, JPG, SVG. Tip: select panels first, then upload to place automatically.
            </p>
          </section>

          <Separator className="my-5" />

          <ArtworkProperties
            method={project.printingMethod}
            items={project.artworkItems}
            selectedItemId={selectedItem}
            onSelect={setSelectedItem}
            onUpdate={updateItem}
            onDelete={deleteItem}
            onDuplicate={duplicateItem}
            onCenter={centerItem}
            selectedPanels={selectedPanels}
            ribCount={project.ribCount}
          />

          <Separator className="my-5" />

          <section className="text-[11px] text-muted-foreground space-y-1.5">
            <div className="font-semibold text-foreground uppercase tracking-wider text-xs mb-1">Production notes</div>
            <p>• Rib count equals panel count for the visual layout.</p>
            <p>• Silkscreen limited to 1, 2, 4 or 8 panels for cost efficiency.</p>
            <p>• Digital print supports single panel or full-canopy cover.</p>
            <p>• This preview is for sales confirmation — colors on final fabric may vary.</p>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default DesignEditor;
