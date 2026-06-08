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
  FileCode,
  FileImage,
  FileText,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UmbrellaCanopy } from "@/components/UmbrellaCanopy";
import { PouchCanvas } from "@/components/PouchCanvas";
import { WizardPanel } from "@/components/editor/WizardPanel";
import { ArtworkProperties } from "@/components/editor/ArtworkProperties";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/i18n/i18n";
import {
  ArtworkItem,
  DesignProject,
  FABRIC_PRESETS,
  POUCH_SIZE_CM,
  PouchView,
  PrintingMethod,
  RibCount,
  UmbrellaCategory,
} from "@/types/design";
import { getProject, saveProject } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { downloadDataUrl, exportAiFile, exportPdfSummary, svgPairToPngDataUrl, svgToPngDataUrl } from "@/lib/export";
import { PantoneInput } from "@/components/editor/PantoneInput";

const SILKSCREEN_LIMITS = [1, 2, 4, 8];

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const DesignEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useI18n();
  const [project, setProject] = useState<DesignProject>(() => ({
    id: newId(),
    projectName: "Untitled umbrella",
    customerName: "",
    umbrellaCategory: "straight",
    ribCount: 8,
    printingMethod: "silkscreen",
    fabricColor: "#0f1f3d",
    panelColors: {},
    capColor: "#111111",
    artworkItems: [],
    hasPouch: false,
    pouchArtwork: [],
    pouchView: "spread",
    hasDoubleLayer: false,
    innerLayer: { fabricColor: "#f5f6f8", panelColors: {}, artworkItems: [] },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));

  const [selectedPanels, setSelectedPanels] = useState<number[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [activeSurface, setActiveSurface] = useState<"canopy" | "inner" | "pouch">("canopy");
  const [dryToggle, setDryToggle] = useState<"auto" | "dry" | "wet">("auto");
  const [canopyHover, setCanopyHover] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const pouchSvgRef = useRef<SVGSVGElement>(null);
  const innerOnlySvgRef = useRef<SVGSVGElement>(null);

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
    setProject((p) => {
      const prune = (m?: Record<number, string>) => {
        if (!m) return m;
        const stale = Object.keys(m).filter((k) => Number(k) >= p.ribCount);
        if (!stale.length) return m;
        const next = { ...m };
        stale.forEach((k) => delete next[Number(k)]);
        return next;
      };
      const nextPanelColors = prune(p.panelColors);
      const nextInner = p.innerLayer
        ? { ...p.innerLayer, panelColors: prune(p.innerLayer.panelColors) }
        : p.innerLayer;
      if (nextPanelColors === p.panelColors && nextInner === p.innerLayer) return p;
      return { ...p, panelColors: nextPanelColors, innerLayer: nextInner };
    });
  }, [project.ribCount]);

  const togglePanel = (i: number) => {
    setSelectedPanels((s) => {
      if (s.includes(i)) return s.filter((p) => p !== i);
      const next = [...s, i].sort((a, b) => a - b);
      if ((project.printingMethod === "silkscreen" || project.printingMethod === "color-change") && next.length > 8) {
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

  const DEFAULT_INNER = { fabricColor: "#f5f6f8", panelColors: {}, artworkItems: [] };

  const currentItems: ArtworkItem[] =
    activeSurface === "pouch"
      ? project.pouchArtwork || []
      : activeSurface === "inner"
      ? project.innerLayer?.artworkItems || []
      : project.artworkItems;

  const setItems = (updater: (items: ArtworkItem[]) => ArtworkItem[]) => {
    updateProject((p) => {
      if (activeSurface === "pouch") {
        return { ...p, pouchArtwork: updater(p.pouchArtwork || []) };
      }
      if (activeSurface === "inner") {
        const inner = p.innerLayer || DEFAULT_INNER;
        return { ...p, innerLayer: { ...inner, artworkItems: updater(inner.artworkItems) } };
      }
      return { ...p, artworkItems: updater(p.artworkItems) };
    });
  };

  // upload artwork
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleUpload = (file: File) => {
    if (file.size > 12 * 1024 * 1024) {
      toast({ title: t("art.tooLarge"), description: t("art.tooLargeDesc"), variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const img = new Image();
      img.onload = () => {
        if (img.width < 600 || img.height < 600) {
          toast({
            title: t("art.lowRes"),
            description: t("art.lowResDesc"),
          });
        }
      };
      img.src = src;
      const isDigital = project.printingMethod === "digital";
      const panels = selectedPanels.length ? selectedPanels : [0];
      const item: ArtworkItem = {
        id: newId(),
        type: isDigital ? "image" : "logo",
        src,
        fileName: file.name,
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        panels,
        fitMode: isDigital ? "contain" : "contain",
        printArea: "single",
      };
      setItems((items) => [...items, item]);
      setSelectedItem(item.id);
      toast({ title: t("art.added") });
    };
    reader.readAsDataURL(file);
  };

  // Combo: upload logo and immediately add a text item on the same panels
  const comboFileInputRef = useRef<HTMLInputElement>(null);
  const handleUploadCombo = (file: File) => {
    if (file.size > 12 * 1024 * 1024) {
      toast({ title: t("art.tooLarge"), description: t("art.tooLargeDesc"), variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const isDigital = project.printingMethod === "digital";
      const panels = selectedPanels.length
        ? selectedPanels
        : isDigital
        ? Array.from({ length: project.ribCount }, (_, i) => i)
        : [0];
      const logoItem: ArtworkItem = {
        id: newId(),
        type: isDigital ? "image" : "logo",
        src,
        fileName: file.name,
        x: 0,
        y: -0.25,
        scale: 0.9,
        rotation: 0,
        panels,
        fitMode: "contain",
        printArea: "single",
      };
      const textItem: ArtworkItem = {
        id: newId(),
        type: "text",
        text: "YOUR COMPANY",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 18,
        color: "#ffffff",
        x: 0,
        y: 0.35,
        scale: 1,
        rotation: 0,
        panels,
      };
      setItems((items) => [...items, logoItem, textItem]);
      setSelectedItem(textItem.id);
      toast({ title: t("art.comboAdded") });
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
    setItems((items) => [...items, item]);
    setSelectedItem(item.id);
  };

  const updateItem = (itemId: string, patch: Partial<ArtworkItem>) => {
    setItems((items) => items.map((a) => (a.id === itemId ? { ...a, ...patch } : a)));
  };
  const deleteItem = (itemId: string) => {
    setItems((items) => items.filter((a) => a.id !== itemId));
    setSelectedItem(null);
  };
  const duplicateItem = (itemId: string) => {
    const orig = currentItems.find((a) => a.id === itemId);
    if (!orig) return;
    const copy: ArtworkItem = {
      ...orig,
      id: newId(),
      panels: selectedPanels.length ? selectedPanels : orig.panels,
    };
    setItems((items) => [...items, copy]);
    setSelectedItem(copy.id);
  };
  const centerItem = (itemId: string) => updateItem(itemId, { x: 0, y: 0 });

  const handleSave = () => {
    saveProject(project);
    toast({ title: t("editor.saved"), description: t("editor.savedDesc") });
  };

  const handleExportPng = async () => {
    if (!svgRef.current) return;
    try {
      const isDouble = project.hasDoubleLayer && project.umbrellaCategory === "golf" && innerOnlySvgRef.current;
      const url = isDouble
        ? await svgPairToPngDataUrl(svgRef.current, innerOnlySvgRef.current!, 3)
        : await svgToPngDataUrl(svgRef.current, 3);
      const suffix = isDouble ? "_outside_inside" : "";
      downloadDataUrl(url, `${project.projectName.replace(/\s+/g, "_")}${suffix}.png`);
    } catch (e) {
      toast({ title: t("editor.exportFail"), variant: "destructive" });
    }
  };
  const handleExportPdf = async () => {
    if (!svgRef.current) return;
    try {
      const url = await svgToPngDataUrl(svgRef.current, 2);
      const pouchUrl =
        project.hasPouch && pouchSvgRef.current
          ? await svgToPngDataUrl(pouchSvgRef.current, 2)
          : undefined;
      const innerUrl =
        project.hasDoubleLayer && project.umbrellaCategory === "golf" && innerOnlySvgRef.current
          ? await svgToPngDataUrl(innerOnlySvgRef.current, 2)
          : undefined;
      await exportPdfSummary(project, url, pouchUrl, innerUrl);
    } catch (e) {
      toast({ title: t("editor.pdfFail"), variant: "destructive" });
    }
  };
  const handleExportAi = async () => {
    if (!svgRef.current) return;
    try {
      const innerSvg =
        project.hasDoubleLayer && project.umbrellaCategory === "golf" ? innerOnlySvgRef.current : null;
      await exportAiFile(
        project,
        svgRef.current,
        project.hasPouch ? pouchSvgRef.current : null,
        innerSvg
      );
    } catch (e) {
      toast({ title: t("editor.aiFail"), variant: "destructive" });
    }
  };

  const [resetOpen, setResetOpen] = useState(false);
  const doReset = () => {
    if (activeSurface === "pouch") {
      updateProject((p) => ({ ...p, pouchArtwork: [] }));
    } else if (activeSurface === "inner") {
      updateProject((p) => ({
        ...p,
        innerLayer: { ...(p.innerLayer || DEFAULT_INNER), artworkItems: [] },
      }));
      setSelectedPanels([]);
    } else {
      updateProject((p) => ({ ...p, artworkItems: [], panelColors: {} }));
      setSelectedPanels([]);
    }
    setSelectedItem(null);
    setResetOpen(false);
  };

  const silkscreenWarn = project.printingMethod === "silkscreen" || project.printingMethod === "color-change";
  const digitalWarn = project.printingMethod === "digital";
  const colorChangeHint = project.printingMethod === "color-change";

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Top bar */}
      <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition flex items-center gap-1.5 text-sm">
          <ArrowLeft className="h-4 w-4" /> {t("nav.home")}
        </Link>
        <Separator orientation="vertical" className="h-6" />
        <Input
          value={project.projectName}
          onChange={(e) => setProject((p) => ({ ...p, projectName: e.target.value }))}
          className="h-8 max-w-xs font-medium"
        />
        <Input
          placeholder={t("editor.customer")}
          value={project.customerName || ""}
          onChange={(e) => setProject((p) => ({ ...p, customerName: e.target.value }))}
          className="h-8 max-w-xs text-sm"
        />
        <div className="ml-auto flex items-center gap-2">
          <LanguageToggle />
          <Button size="sm" variant="ghost" onClick={undo}><RotateCcw className="h-4 w-4 mr-1" /> {t("editor.undo")}</Button>
          <Button size="sm" variant="ghost" onClick={() => setResetOpen(true)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4 mr-1" /> {t("editor.reset")}</Button>
          <Button size="sm" variant="outline" onClick={handleSave}><Save className="h-4 w-4 mr-1" /> {t("editor.save")}</Button>
          <Button size="sm" variant="outline" onClick={handleExportPng}><FileImage className="h-4 w-4 mr-1" /> {t("editor.png")}</Button>
          <Button size="sm" variant="outline" onClick={handleExportAi}><FileCode className="h-4 w-4 mr-1" /> {t("editor.ai")}</Button>
          <Button size="sm" className="bg-gradient-hero" onClick={handleExportPdf}><FileText className="h-4 w-4 mr-1" /> {t("editor.pdf")}</Button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-[280px_1fr_320px] min-h-0">
        {/* Left sidebar */}
        <aside className="border-r border-border bg-card overflow-y-auto p-5">
          <WizardPanel
            category={project.umbrellaCategory}
            ribCount={project.ribCount}
            method={project.printingMethod}
            hasPouch={!!project.hasPouch}
            hasDoubleLayer={!!project.hasDoubleLayer}
            doubleLayerStyle={project.doubleLayerStyle || "vented"}
            onCategory={(v) => {
              updateProject((p) => ({
                ...p,
                umbrellaCategory: v,
                hasDoubleLayer: v === "golf" ? p.hasDoubleLayer : false,
              }));
              if (v !== "golf" && activeSurface === "inner") setActiveSurface("canopy");
            }}
            onRibs={(v) => updateProject({ ribCount: v })}
            onMethod={(v) => updateProject({ printingMethod: v })}
            onHasPouch={(v) => {
              updateProject({ hasPouch: v, pouchArtwork: project.pouchArtwork || [], pouchView: project.pouchView || "spread" });
              if (!v && activeSurface === "pouch") setActiveSurface("canopy");
            }}
            onHasDoubleLayer={(v) => {
              updateProject((p) => ({
                ...p,
                hasDoubleLayer: v,
                doubleLayerStyle: p.doubleLayerStyle || "vented",
                innerLayer: p.innerLayer || DEFAULT_INNER,
              }));
              if (!v && activeSurface === "inner") setActiveSurface("canopy");
            }}
            onDoubleLayerStyle={(v) => updateProject({ doubleLayerStyle: v })}
          />


          <Separator className="my-5" />

          {(() => {
            const isInner = activeSurface === "inner";
            const isPouch = activeSurface === "pouch";
            const layerFabric = isInner
              ? project.innerLayer?.fabricColor || "#f5f6f8"
              : project.fabricColor;
            const layerPanelColors = isInner
              ? project.innerLayer?.panelColors
              : project.panelColors;
            const hasPanelOverrides = !!layerPanelColors && Object.keys(layerPanelColors).length > 0;

            const applyColor = (hex: string) => {
              if (isPouch) {
                updateProject({ fabricColor: hex });
                return;
              }
              if (selectedPanels.length) {
                updateProject((p) => {
                  if (isInner) {
                    const inner = p.innerLayer || DEFAULT_INNER;
                    const next = { ...(inner.panelColors || {}) };
                    selectedPanels.forEach((i) => { next[i] = hex; });
                    return { ...p, innerLayer: { ...inner, panelColors: next } };
                  }
                  const next = { ...(p.panelColors || {}) };
                  selectedPanels.forEach((i) => { next[i] = hex; });
                  return { ...p, panelColors: next };
                });
              } else if (isInner) {
                updateProject((p) => ({
                  ...p,
                  innerLayer: { ...(p.innerLayer || DEFAULT_INNER), fabricColor: hex },
                }));
              } else {
                updateProject({ fabricColor: hex });
              }
            };

            const resetPanels = () => {
              if (isInner) {
                updateProject((p) => ({
                  ...p,
                  innerLayer: { ...(p.innerLayer || DEFAULT_INNER), panelColors: {} },
                }));
              } else {
                updateProject({ panelColors: {} });
              }
            };

            const activeColor = selectedPanels.length
              ? (layerPanelColors?.[selectedPanels[0]] || layerFabric)
              : layerFabric;

            return (
              <section>
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("fabric.title")}
                    {isInner && <span className="ml-1 text-primary normal-case">· {t("surface.inner")}</span>}
                  </h3>
                  {hasPanelOverrides && !isPouch && (
                    <button onClick={resetPanels} className="text-[11px] text-primary hover:underline">
                      {t("fabric.resetPanels")}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mb-2">
                  {isPouch
                    ? t("fabric.applyToAll")
                    : selectedPanels.length
                    ? t("fabric.applyToSelected").replace("{n}", String(selectedPanels.length))
                    : t("fabric.applyToAll")}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {FABRIC_PRESETS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => applyColor(c.value)}
                      title={t(`color.${c.name}`)}
                      className={cn(
                        "h-9 rounded-md border-2 transition",
                        activeColor === c.value ? "border-primary scale-105" : "border-border"
                      )}
                      style={{ background: c.value }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="color"
                    value={activeColor}
                    onChange={(e) => applyColor(e.target.value)}
                    className="h-9 w-14 p-1"
                  />
                  <Input
                    value={activeColor}
                    onChange={(e) => applyColor(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="mt-2">
                  <PantoneInput
                    label={t("fabric.pantone") || "Pantone code"}
                    onChange={(hex) => applyColor(hex)}
                  />
                </div>
              </section>
            );
          })()}

          <Separator className="my-5" />

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t("cap.title")}</h3>
            <div className="grid grid-cols-4 gap-2">
              {FABRIC_PRESETS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => updateProject({ capColor: c.value })}
                  title={t(`color.${c.name}`)}
                  className={cn(
                    "h-9 rounded-md border-2 transition",
                    (project.capColor || "#111111") === c.value ? "border-primary scale-105" : "border-border"
                  )}
                  style={{ background: c.value }}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="color"
                value={project.capColor || "#111111"}
                onChange={(e) => updateProject({ capColor: e.target.value })}
                className="h-9 w-14 p-1"
              />
              <Input
                value={project.capColor || "#111111"}
                onChange={(e) => updateProject({ capColor: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
          </section>
        </aside>

        {/* Canvas */}
        <main className="relative overflow-auto bg-gradient-subtle">
          <div className="absolute top-4 left-4 right-4 flex items-center gap-2 z-10">
            <div className="rounded-lg bg-card border border-border shadow-soft px-3 py-2 text-xs flex items-center gap-3">
              <span className="text-muted-foreground">{t("canvas.panels")}</span>
              <span className="font-semibold">{selectedPanels.length}/{project.ribCount}</span>
              <Separator orientation="vertical" className="h-4" />
              <button onClick={applySelectAll} className="text-primary hover:underline">{t("canvas.all")}</button>
              <button onClick={clearSelection} className="text-muted-foreground hover:text-foreground">{t("canvas.clear")}</button>
              {(project.printingMethod === "silkscreen" || project.printingMethod === "color-change") && (
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
            </div>
          </div>

          {project.printingMethod === "color-change" && activeSurface !== "pouch" && (
            <div className="absolute top-16 right-4 z-10 rounded-lg bg-card border border-border shadow-soft p-1 flex items-center gap-1 text-xs">
              {(["auto", "dry", "wet"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setDryToggle(m)}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition",
                    dryToggle === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {t(`canvas.${m}`)}
                </button>
              ))}
            </div>
          )}

          {(project.hasPouch || (project.hasDoubleLayer && project.umbrellaCategory === "golf")) && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 rounded-lg bg-card border border-border shadow-soft p-1 flex items-center gap-1 text-xs">
              <button
                onClick={() => { setActiveSurface("canopy"); setSelectedItem(null); setSelectedPanels([]); }}
                className={cn(
                  "px-3 py-1.5 rounded-md transition",
                  activeSurface === "canopy" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                {t("surface.canopy")}
              </button>
              {project.hasDoubleLayer && project.umbrellaCategory === "golf" && (
                <button
                  onClick={() => { setActiveSurface("inner"); setSelectedItem(null); setSelectedPanels([]); }}
                  className={cn(
                    "px-3 py-1.5 rounded-md transition",
                    activeSurface === "inner" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {t("surface.inner")}
                </button>
              )}
              {project.hasPouch && (
                <button
                  onClick={() => { setActiveSurface("pouch"); setSelectedItem(null); setSelectedPanels([]); }}
                  className={cn(
                    "px-3 py-1.5 rounded-md transition",
                    activeSurface === "pouch" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {t("surface.pouch")}
                </button>
              )}
              {activeSurface === "pouch" && (
                <>
                  <Separator orientation="vertical" className="h-5 mx-1" />
                  <button
                    onClick={() => updateProject({ pouchView: "spread" })}
                    className={cn(
                      "px-2 py-1 rounded text-[11px] transition",
                      (project.pouchView || "spread") === "spread" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {t("pouch.spread")}
                  </button>
                  <button
                    onClick={() => updateProject({ pouchView: "front" })}
                    className={cn(
                      "px-2 py-1 rounded text-[11px] transition",
                      project.pouchView === "front" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {t("pouch.front")}
                  </button>
                </>
              )}
            </div>
          )}

          <div className="min-h-full grid place-items-center p-12 pt-20">
            <div style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}>
              <div
                style={{ display: activeSurface === "pouch" ? "none" : "block" }}
                onMouseEnter={() => setCanopyHover(true)}
                onMouseLeave={() => setCanopyHover(false)}
              >
                <UmbrellaCanopy
                  ref={svgRef}
                  category={project.umbrellaCategory}
                  ribCount={project.ribCount}
                  fabricColor={project.fabricColor}
                  panelColors={project.panelColors}
                  capColor={project.capColor}
                  artwork={project.artworkItems}
                  selectedPanels={activeSurface === "canopy" ? selectedPanels : []}
                  onPanelClick={activeSurface === "canopy" ? togglePanel : undefined}
                  onItemSelect={(id) => setSelectedItem(id)}
                  onItemChange={(id, patch) =>
                    activeSurface === "canopy" && updateItem(id, patch)
                  }
                  size={620}
                  dryMode={
                    project.printingMethod === "color-change" &&
                    (dryToggle === "dry" || (dryToggle === "auto" && !canopyHover))
                  }
                  innerLayer={
                    project.hasDoubleLayer && project.umbrellaCategory === "golf"
                      ? {
                          fabricColor: project.innerLayer?.fabricColor || "#f5f6f8",
                          panelColors: project.innerLayer?.panelColors,
                          artwork: project.innerLayer?.artworkItems || [],
                          selectedPanels: activeSurface === "inner" ? selectedPanels : [],
                        }
                      : undefined
                  }
                  doubleLayerStyle={project.doubleLayerStyle || "vented"}
                  activeLayer={activeSurface === "inner" ? "inner" : "outer"}
                  onInnerPanelClick={activeSurface === "inner" ? togglePanel : undefined}
                  onInnerItemSelect={(id) => setSelectedItem(id)}
                  onInnerItemChange={(id, patch) =>
                    activeSurface === "inner" && updateItem(id, patch)
                  }
                />
              </div>
              {project.hasPouch && (
                <div style={{ display: activeSurface === "pouch" ? "block" : "none" }}>
                  <PouchCanvas
                    ref={pouchSvgRef}
                    category={project.umbrellaCategory}
                    view={project.pouchView || "spread"}
                    fabricColor={project.fabricColor}
                    artwork={project.pouchArtwork || []}
                    onItemSelect={(id) => setSelectedItem(id)}
                    onItemChange={(id, patch) =>
                      activeSurface === "pouch" && updateItem(id, patch)
                    }
                    size={520}
                  />
                </div>
              )}
            </div>
          </div>


          {/* Hidden inner-export canopy. Vented = render full composition (both layers).
              Full double = render inner layer alone as a full canopy. */}
          {project.hasDoubleLayer && project.umbrellaCategory === "golf" && (
            <div style={{ position: "absolute", left: -99999, top: -99999, pointerEvents: "none" }} aria-hidden>
              {(project.doubleLayerStyle || "vented") === "vented" ? (
                <UmbrellaCanopy
                  ref={innerOnlySvgRef}
                  category={project.umbrellaCategory}
                  ribCount={project.ribCount}
                  fabricColor={project.fabricColor}
                  panelColors={project.panelColors}
                  capColor={project.capColor}
                  artwork={project.artworkItems}
                  innerLayer={{
                    fabricColor: project.innerLayer?.fabricColor || "#f5f6f8",
                    panelColors: project.innerLayer?.panelColors,
                    artwork: project.innerLayer?.artworkItems || [],
                  }}
                  doubleLayerStyle="vented"
                  selectedPanels={[]}
                  highlightSelection={false}
                  size={620}
                />
              ) : (
                <UmbrellaCanopy
                  ref={innerOnlySvgRef}
                  category={project.umbrellaCategory}
                  ribCount={project.ribCount}
                  fabricColor={project.innerLayer?.fabricColor || "#f5f6f8"}
                  panelColors={project.innerLayer?.panelColors}
                  capColor={project.capColor}
                  artwork={project.innerLayer?.artworkItems || []}
                  selectedPanels={[]}
                  highlightSelection={false}
                  size={620}
                />
              )}
            </div>
          )}




          {(silkscreenWarn || digitalWarn) && (
            <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-warning/40 bg-warning/10 text-foreground text-xs px-3 py-2 flex flex-col gap-1">
              <div className="flex items-start gap-2">
                <span className="font-semibold text-warning">{t("canvas.note")}</span>
                <span>{silkscreenWarn ? t("canvas.warn.silk") : t("canvas.warn.digital")}</span>
              </div>
              {colorChangeHint && (
                <div className="text-muted-foreground">{t("canvas.colorChangeHint")}</div>
              )}
            </div>
          )}
        </main>

        {/* Right sidebar */}
        <aside className="border-l border-border bg-card overflow-y-auto p-5">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t("art.add")}</h3>
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
            <input
              ref={comboFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadCombo(f);
                e.target.value = "";
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" /> {t("art.upload")}
              </Button>
              <Button variant="outline" size="sm" onClick={addText}>
                <Plus className="h-4 w-4 mr-1" /> {t("art.addText")}
              </Button>
            </div>
            <Button
              variant="default"
              size="sm"
              className="w-full mt-2 bg-gradient-hero"
              onClick={() => comboFileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-1" /> {t("art.combo")}
            </Button>
            <p className="text-[11px] text-muted-foreground mt-2">
              {t("art.uploadTip")}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {t("art.comboTip")}
            </p>
          </section>

          <Separator className="my-5" />

          <ArtworkProperties
            method={activeSurface === "pouch" ? "silkscreen" : project.printingMethod}
            items={currentItems}
            selectedItemId={selectedItem}
            onSelect={setSelectedItem}
            onUpdate={updateItem}
            onDelete={deleteItem}
            onDuplicate={duplicateItem}
            onCenter={centerItem}
            selectedPanels={activeSurface === "pouch" ? [] : selectedPanels}
            ribCount={activeSurface === "pouch" ? 1 : project.ribCount}
          />


          <Separator className="my-5" />

          <section className="text-[11px] text-muted-foreground space-y-1.5">
            <div className="font-semibold text-foreground uppercase tracking-wider text-xs mb-1">{t("notes.title")}</div>
            <p>• {t("notes.1")}</p>
            <p>• {t("notes.2")}</p>
            <p>• {t("notes.3")}</p>
            <p>• {t("notes.4")}</p>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default DesignEditor;
