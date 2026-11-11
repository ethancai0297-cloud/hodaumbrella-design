import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  Box,
  Camera,
  Eye,
  EyeOff,
  Square,
  HelpCircle,
  ChevronDown,
  MousePointer2,
  MousePointerClick,
  CircleDot,
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
import { InsertArtEditor } from "@/components/editor/InsertArtEditor";
import { WizardPanel } from "@/components/editor/WizardPanel";
import { ArtworkProperties } from "@/components/editor/ArtworkProperties";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/i18n/i18n";
import {
  ArtworkItem,
  DEFAULT_HANDLE_INSERT,
  DesignProject,
  FABRIC_PRESETS,
  HANDLE_COLOR_PRESETS,
  HANDLE_INSERT_PRESETS,
  HANDLE_INSERT_SIZE_MM,
  HandleInsertFinish,
  normalizeFinish,
  HandleInsertOptions,
  MID_SECTION_PRESETS,
  MidSectionOptions,
  HandleButtonOptions,
  POUCH_SIZE_CM,
  PouchView,
  PrintingMethod,
  RibCount,
  UmbrellaCategory,
} from "@/types/design";
import { getProject, saveProject } from "@/lib/storage";
import { cn } from "@/lib/utils";
import {
  downloadDataUrl,
  exportAiFile,
  exportPdfSummary,
  HandleDesignExport,
  rotate90ccw,
  svgPairToPngDataUrl,
  svgToPngDataUrl,
  trimWhite,
} from "@/lib/export";
import { PantoneInput } from "@/components/editor/PantoneInput";
import { findModel, listModels } from "@/3d/models/registry";
import { UmbrellaScene, type SceneApi, type CameraPreset } from "@/components/3d/UmbrellaScene";

const SILKSCREEN_LIMITS = [1, 2, 4, 8];
/** Native pixel size of the 2D canopy SVG; it is scaled down to fit the viewport. */
const CANVAS_SIZE = 620;

/**
 * Default rotation for new panel artwork: 180° makes it read upright when the
 * open umbrella is seen from outside (top of the logo toward the top cap),
 * which is how it shows on the 3D model.
 */
const PANEL_UPRIGHT = 180;

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const DesignEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useI18n();
  const [params] = useSearchParams();
  const pickedCategory = params.get("model") as UmbrellaCategory | null;
  const [project, setProject] = useState<DesignProject>(() => ({
    id: newId(),
    projectName: "Untitled umbrella",
    customerName: "",
    umbrellaCategory: pickedCategory ?? "straight",
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
  // Fit the 2D canvas into whatever space the center column has (minus the
  // floating toolbar), so it is always fully visible and centered. The zoom
  // buttons multiply on top of this fit scale.
  const mainRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth - 48;
      const h = el.clientHeight - 64 - 96; // toolbar + bottom note
      setFitScale(Math.max(0.3, Math.min(1, w / CANVAS_SIZE, h / CANVAS_SIZE)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [activeSurface, setActiveSurface] = useState<"canopy" | "inner" | "pouch">("canopy");
  const [dryToggle, setDryToggle] = useState<"auto" | "dry" | "wet">("auto");
  const [artworkHover, setArtworkHover] = useState(false);
  // Panel selection mode in the 3D editor: 单片 / 多片 / 全部
  const [selMode, setSelMode] = useState<"single" | "multi" | "all">("single");
  const [hoverPanel, setHoverPanel] = useState<number | null>(null);
  // True while exporting: hides selection / hover highlights from the canopy texture.
  const [exporting, setExporting] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [capOpen, setCapOpen] = useState(false);
  // First-visit coach marks: 0 = hidden, 1..3 = step
  const [guideStep, setGuideStep] = useState(0);
  // Design option groups: canopy (伞面) vs handle (伞头, only for models with handle parts)
  const [designTab, setDesignTab] = useState<"canopy" | "handle">("canopy");
  const [showFrame, setShowFrame] = useState(true);
  const [headlessCapture, setHeadlessCapture] = useState<null | {
    resolve: (api: SceneApi | null) => void;
  }>(null);
  const sceneRef = useRef<SceneApi | null>(null);
  const headlessSceneRef = useRef<SceneApi | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [svgEl, setSvgEl] = useState<SVGSVGElement | null>(null);
  const setCanopySvg = (el: SVGSVGElement | null) => {
    (svgRef as React.MutableRefObject<SVGSVGElement | null>).current = el;
    setSvgEl(el);
  };
  const pouchSvgRef = useRef<SVGSVGElement>(null);
  const innerOnlySvgRef = useRef<SVGSVGElement>(null);

  const model3d = findModel(project.umbrellaCategory, project.ribCount);
  // The editor is 3D-first: the canopy is always edited on the 3D model. Only
  // surfaces without a 3D model (pouch, golf inner layer) fall back to flat editing.
  const viewMode: "2d" | "3d" = model3d && activeSurface === "canopy" ? "3d" : "2d";
  const ribOptions = listModels()
    .filter((m) => m.category === project.umbrellaCategory)
    .map((m) => m.panel_count as RibCount)
    .sort((a, b) => b - a);
  /** Panel facing the default camera; new artwork lands here when nothing is selected. */
  const frontPanel = Math.floor(project.ribCount / 2);

  // load existing
  useEffect(() => {
    if (id) {
      const p = getProject(id);
      // Golf double layer was retired; old projects open as single layer.
      if (p) setProject({ ...p, hasDoubleLayer: false });
    }
  }, [id]);

  // (data-version stamping moved into UmbrellaCanopy so it runs in the
  // same paint as the SVG content update — no race with the 3D rasterize.)

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
  const handlePanelClick = (i: number) => {
    if (selMode === "single") {
      setSelectedPanels([i]);
      return;
    }
    if (selMode === "all") setSelMode("multi");
    togglePanel(i);
  };
  const chooseSelMode = (m: "single" | "multi" | "all") => {
    setSelMode(m);
    if (m === "all") applySelectAll();
    else if (m === "single") setSelectedPanels((s) => s.slice(0, 1));
  };

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

  // Handle insert (BSS-ST-1 盖片) customization
  const insert: HandleInsertOptions = { ...DEFAULT_HANDLE_INSERT, ...project.handleInsert };
  const updateInsert = (patch: Partial<HandleInsertOptions>) =>
    updateProject({ handleInsert: { ...insert, ...patch } });
  // Middle section (中段): body + accent colors; undefined = same as handle
  const mid: MidSectionOptions = project.midSection ?? {};
  const updateMid = (patch: Partial<MidSectionOptions>) =>
    updateProject({ midSection: { ...mid, ...patch } });
  // Open button (folding carabiner handle); undefined color = same as handle
  const button: HandleButtonOptions = project.handleButton ?? {};
  const updateButton = (patch: Partial<HandleButtonOptions>) =>
    updateProject({ handleButton: { ...button, ...patch } });
  const insertSizeMm = model3d?.handle_insert
    ? { w: model3d.handle_insert.width_mm, h: model3d.handle_insert.length_mm }
    : HANDLE_INSERT_SIZE_MM;
  const handleColor = project.handleColor ?? model3d?.handle_color ?? "#1a1a1a";
  const hasHandleDesign = !!(model3d?.handle_insert || model3d?.mid_section || model3d?.handle_button || model3d?.other_parts);
  const otherParts = model3d?.other_parts;
  const showHandleTab = hasHandleDesign && designTab === "handle";
  const openDesignTab = (tab: "canopy" | "handle") => {
    setDesignTab(tab);
    setSelectedItem(null);
    if (tab === "handle") {
      // The handle only exists in 3D: frame it.
      setActiveSurface("canopy");
      setTimeout(() => sceneRef.current?.setView("handle"), 100);
    } else {
      sceneRef.current?.setView("perspective");
    }
  };
  const insertLogoInputRef = useRef<HTMLInputElement>(null);
  const handleInsertLogo = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: t("insert.logoTooLarge"), variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateInsert({ logoSrc: String(reader.result), logoFileName: file.name });
    reader.readAsDataURL(file);
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
      const panels = selectedPanels.length ? selectedPanels : [frontPanel];
      const item: ArtworkItem = {
        id: newId(),
        type: isDigital ? "image" : "logo",
        src,
        fileName: file.name,
        x: 0,
        y: 0,
        scale: 1,
        rotation: PANEL_UPRIGHT,
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
        : [frontPanel];
      const logoItem: ArtworkItem = {
        id: newId(),
        type: isDigital ? "image" : "logo",
        src,
        fileName: file.name,
        x: 0,
        y: -0.25,
        scale: 0.9,
        rotation: PANEL_UPRIGHT,
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
        rotation: PANEL_UPRIGHT,
        panels,
      };
      setItems((items) => [...items, logoItem, textItem]);
      setSelectedItem(textItem.id);
      toast({ title: t("art.comboAdded") });
    };
    reader.readAsDataURL(file);
  };

  const addText = () => {
    const panels = selectedPanels.length ? selectedPanels : [frontPanel];
    const item: ArtworkItem = {
      id: newId(),
      type: "text",
      text: "YOUR TEXT",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: 22,
      color: "#ffffff",
      x: 0,
      y: 0,
      scale: 0.6,
      rotation: PANEL_UPRIGHT,
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

  /** Run an export with selection / hover highlights removed from the canopy. */
  const withCleanCanvas = async (run: () => Promise<void>) => {
    setExporting(true);
    setHoverPanel(null);
    // let React re-render the SVG and the 3D texture re-rasterize
    await new Promise((r) => setTimeout(r, 700));
    try {
      await run();
    } finally {
      setExporting(false);
    }
  };

  const handleExportPng = () => withCleanCanvas(async () => {
    try {
      if (viewMode === "3d" && sceneRef.current) {
        if (showHandleTab) {
          const url = await trimWhite(await sceneRef.current.captureView("handle"), 40);
          downloadDataUrl(url, `${project.projectName.replace(/\s+/g, "_")}_handle.png`);
          return;
        }
        const url = await sceneRef.current.captureView("hero");
        downloadDataUrl(url, `${project.projectName.replace(/\s+/g, "_")}_3d.png`);
        return;
      }
      if (!svgRef.current) return;
      const isDouble = project.hasDoubleLayer && project.umbrellaCategory === "golf" && innerOnlySvgRef.current;
      const url = isDouble
        ? await svgPairToPngDataUrl(svgRef.current, innerOnlySvgRef.current!, 3)
        : await svgToPngDataUrl(svgRef.current, 3);
      const suffix = isDouble ? "_outside_inside" : "";
      downloadDataUrl(url, `${project.projectName.replace(/\s+/g, "_")}${suffix}.png`);
    } catch (e) {
      toast({ title: t("editor.exportFail"), variant: "destructive" });
    }
  });

  const acquireSceneApi = async (): Promise<SceneApi | null> => {
    if (sceneRef.current && viewMode === "3d") return sceneRef.current;
    if (!model3d) return null;
    return await new Promise<SceneApi | null>((resolve) => {
      setHeadlessCapture({ resolve });
    });
  };

  const handleExportPdf = () => withCleanCanvas(async () => {
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

      let threeD:
        | {
            hero: string;
            lowTilt?: string;
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
          }
        | undefined;
      let handleDesign: HandleDesignExport | undefined;
      if (model3d) {
        const api = await acquireSceneApi();
        if (api) {
          // wait until the canopy texture (rasterized from the 2D SVG) is bound
          await api.waitReady();
          const hero = await api.captureView("hero");
          const top = await api.captureView("top");
          const front = await api.captureView("front");
          const side = await api.captureView("side");
          const lowTilt = await trimWhite(await api.captureView("lowTilt"), 20);
          if (hasHandleDesign) {
            const front = await trimWhite(await api.captureView("handle"));
            const angle = await trimWhite(await api.captureView("handleAngle"));
            const flat = model3d.handle_insert
              ? await rotate90ccw(await trimWhite(await api.captureView("handleFlat"), 20))
              : undefined;
            handleDesign = model3d.other_parts
              ? {
                  title: model3d.handle_style,
                  heading: "Handle & Parts",
                  frontLabel: "Handle",
                  front,
                  angle,
                  colors: [
                    ["Handle", handleColor],
                    ["Rib tips", project.tipColor ?? model3d.frame_color ?? "#1a1a1a"],
                    ["Top cap", project.capColor ?? model3d.frame_color ?? "#1a1a1a"],
                    ["Ribs & shaft", model3d.frame_color ?? "#1a1a1a"],
                  ],
                }
              : { title: model3d.handle_style, front, angle, flat };
          }
          threeD = {
            hero,
            top,
            front,
            side,
            lowTilt,
            modelId: model3d.model_id,
            topCap: model3d.top_cap_style,
            handle: model3d.handle_style,
            displayName: model3d.display_name,
            handleInsert: model3d.handle_insert
              ? `${insertSizeMm.w}×${insertSizeMm.h} mm · ${insert.color} · ${normalizeFinish(insert.finish)}${
                  insert.logoFileName ? ` · logo: ${insert.logoFileName}` : " · no logo"
                }`
              : undefined,
            handleColor: hasHandleDesign ? handleColor : undefined,
            midSection: model3d.mid_section
              ? `body ${mid.bodyColor ?? "same as handle"} · accent ${mid.accentColor ?? "same as handle"}${
                  mid.accentColor ? ` (${normalizeFinish(mid.accentFinish)})` : ""
                }`
              : undefined,
          };
        }
        setHeadlessCapture(null);
      }

      await exportPdfSummary(project, url, pouchUrl, innerUrl, threeD, handleDesign);
    } catch (e) {
      toast({ title: t("editor.pdfFail"), variant: "destructive" });
      setHeadlessCapture(null);
    }
  });
  const handleExportAi = () => withCleanCanvas(async () => {
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
  });

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

  // ---------- first-visit guide ----------
  const GUIDE_KEY = "urs:guideDone";
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const finishGuide = () => {
    setGuideStep(0);
    try {
      localStorage.setItem(GUIDE_KEY, "1");
    } catch {
      /* storage unavailable */
    }
  };
  useEffect(() => {
    if (id || !model3d) return;
    let done = false;
    try {
      done = localStorage.getItem(GUIDE_KEY) === "1";
    } catch {
      /* storage unavailable */
    }
    if (!done) setGuideStep(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (guideStep === 1 && selectedPanels.length) setGuideStep(2);
  }, [selectedPanels, guideStep]);
  const artCount = project.artworkItems.length;
  const artCountRef = useRef(artCount);
  useEffect(() => {
    if (guideStep === 3 && artCount > artCountRef.current) finishGuide();
    artCountRef.current = artCount;
  }, [artCount]); // eslint-disable-line react-hooks/exhaustive-deps
  const [guidePos, setGuidePos] = useState<{ left: number; top: number; hand?: { x: number; y: number } } | null>(null);
  useLayoutEffect(() => {
    if (!guideStep) return setGuidePos(null);
    const place = () => {
      if (guideStep === 1) {
        const r = mainRef.current?.getBoundingClientRect();
        if (!r) return;
        const hand = { x: r.left + r.width * 0.5, y: r.top + r.height * 0.62 };
        setGuidePos({ left: hand.x + 70, top: hand.y - 70, hand });
      } else {
        const r = (guideStep === 2 ? step2Ref : step3Ref).current?.getBoundingClientRect();
        if (!r) return;
        setGuidePos({ left: r.right + 16, top: r.top + 4 });
      }
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [guideStep]);

  const stepNum = (n: number, on: boolean) => (
    <span
      className={cn(
        "h-[22px] w-[22px] shrink-0 rounded-full text-[12px] font-bold inline-flex items-center justify-center text-white",
        on ? "bg-primary" : "bg-slate-300"
      )}
    >
      {n}
    </span>
  );
  const cardCls = (on: boolean) =>
    cn("rounded-xl border p-4 transition", on ? "border-2 border-[#1f56c3] bg-[#f6f9ff]" : "border-border bg-card");
  const isPouchSurface = activeSurface === "pouch";
  const noneSelected = selectedPanels.length === 0;
  const methodKey =
    project.printingMethod === "digital" ? "wiz.digital" : project.printingMethod === "color-change" ? "wiz.colorChange" : "wiz.silkscreen";
  const wizardProps = {
    category: project.umbrellaCategory,
    ribCount: project.ribCount,
    method: project.printingMethod,
    hasPouch: !!project.hasPouch,
    hasDoubleLayer: !!project.hasDoubleLayer,
    doubleLayerStyle: project.doubleLayerStyle || ("vented" as const),
    onCategory: (v: UmbrellaCategory) => updateProject({ umbrellaCategory: v }),
    onRibs: (v: RibCount) => updateProject({ ribCount: v }),
    onMethod: (v: PrintingMethod) => updateProject({ printingMethod: v }),
    onHasPouch: (v: boolean) => {
      updateProject({ hasPouch: v, pouchArtwork: project.pouchArtwork || [], pouchView: project.pouchView || "spread" });
      if (!v && activeSurface === "pouch") setActiveSurface("canopy");
    },
    onHasDoubleLayer: (v: boolean) => {
      updateProject((p) => ({
        ...p,
        hasDoubleLayer: v,
        doubleLayerStyle: p.doubleLayerStyle || "vented",
        innerLayer: p.innerLayer || DEFAULT_INNER,
      }));
      if (!v && activeSurface === "inner") setActiveSurface("canopy");
    },
    onDoubleLayerStyle: (v: "vented" | "double") => updateProject({ doubleLayerStyle: v }),
  };

  return (
    <div className="h-screen bg-muted/30 flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
        <Link to="/design" className="text-muted-foreground hover:text-foreground transition flex items-center gap-1.5 text-sm whitespace-nowrap">
          <ArrowLeft className="h-4 w-4" /> {t("ed.changeModel")}
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
          {model3d && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                openDesignTab("canopy");
                setGuideStep(1);
              }}
            >
              <HelpCircle className="h-4 w-4 mr-1" /> {t("ed.help")}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={undo}><RotateCcw className="h-4 w-4 mr-1" /> {t("editor.undo")}</Button>
          <Button size="sm" variant="ghost" onClick={() => setResetOpen(true)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4 mr-1" /> {t("editor.reset")}</Button>
          <Button size="sm" variant="outline" onClick={handleSave}><Save className="h-4 w-4 mr-1" /> {t("editor.save")}</Button>
          <Button size="sm" variant="outline" onClick={handleExportPng}><FileImage className="h-4 w-4 mr-1" /> {t("editor.png")}</Button>
          <Button size="sm" variant="outline" onClick={handleExportAi}><FileCode className="h-4 w-4 mr-1" /> {t("editor.ai")}</Button>
          <Button size="sm" className="bg-gradient-hero" onClick={handleExportPdf}><FileText className="h-4 w-4 mr-1" /> {t("editor.pdf")}</Button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-[320px_1fr] xl:grid-cols-[340px_1fr] min-h-0">
        {/* Left sidebar */}
        <aside className="border-r border-border bg-card overflow-y-auto p-5">
          {hasHandleDesign && (
            <div role="tablist" aria-label={t("tab.label")} className="grid grid-cols-2 gap-1 p-1 mb-5 rounded-lg bg-muted">
              {(["canopy", "handle"] as const).map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={designTab === tab}
                  onClick={() => openDesignTab(tab)}
                  className={cn(
                    "h-9 rounded-md text-sm font-medium transition",
                    designTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}

                >
                  {t(tab === "handle" && otherParts ? "tab.other" : `tab.${tab}`)}
                </button>
              ))}
            </div>
          )}

          {!showHandleTab && (<div className="space-y-3">
          {ribOptions.length > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
              <span>{t("ed.ribs")}</span>
              <div className="flex bg-muted rounded-md p-0.5">
                {ribOptions.map((n) => (
                  <button
                    key={n}
                    onClick={() => updateProject({ ribCount: n })}
                    className={cn(
                      "px-3 py-1 rounded transition",
                      project.ribCount === n ? "bg-card shadow-sm text-foreground font-medium" : "hover:text-foreground"
                    )}
                  >
                    {t(n === 8 ? "ed.ribsStandard" : "ed.ribsN").replace("{n}", String(n))}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isPouchSurface && (
            <div ref={step1Ref} className={cardCls(noneSelected || guideStep === 1)}>
              <div className="flex items-center gap-2 font-semibold text-sm">{stepNum(1, true)}{t("ed.step1")}</div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {(["single", "multi", "all"] as const).map((m) => {
                  const Icon = m === "single" ? MousePointer2 : m === "multi" ? MousePointerClick : CircleDot;
                  return (
                    <button
                      key={m}
                      onClick={() => chooseSelMode(m)}
                      className={cn(
                        "rounded-lg bg-card py-2 text-center transition",
                        selMode === m
                          ? "border-2 border-[#1f56c3] text-[#1f56c3]"
                          : "border border-border text-muted-foreground hover:border-[#1f56c3]/50"
                      )}
                    >
                      <Icon className="h-4 w-4 mx-auto" />
                      <div className="text-xs mt-1 font-medium">{t(`ed.mode.${m}`)}</div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{t(`ed.mode.${selMode}.tip`)}</p>
              <div className="flex items-center gap-2 mt-3">
                <span
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium",
                    noneSelected ? "bg-card border border-border text-muted-foreground" : "bg-[#e8f0ff] text-[#1f56c3]"
                  )}
                >
                  {noneSelected
                    ? t("ed.noneSelected")
                    : t("ed.selected").replace("{n}", String(selectedPanels.length)).replace("{t}", String(project.ribCount))}
                </span>
                {!noneSelected && (
                  <button
                    onClick={() => {
                      clearSelection();
                      if (selMode === "all") setSelMode("multi");
                    }}
                    className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                  >
                    {t("ed.clear")}
                  </button>
                )}
              </div>
            </div>
          )}

          <div ref={step2Ref} className={cardCls(guideStep === 2)}>
          <div className="flex items-center gap-2 font-semibold text-sm mb-3">{stepNum(2, !noneSelected || isPouchSurface)}{t("ed.step2")}</div>
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
              if (guideStep === 2) setGuideStep(3);
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
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <p className="text-[11px] text-muted-foreground">
                    {isInner && <span className="text-primary">{t("surface.inner")} · </span>}
                    {isPouch
                      ? t("fabric.applyToAll")
                      : selectedPanels.length
                      ? t("fabric.applyToSelected").replace("{n}", String(selectedPanels.length))
                      : t("ed.step2.locked")}
                  </p>
                  {hasPanelOverrides && !isPouch && (
                    <button onClick={resetPanels} className="text-[11px] text-primary hover:underline whitespace-nowrap">
                      {t("fabric.resetPanels")}
                    </button>
                  )}
                </div>
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

          {!otherParts && !isPouchSurface && (<>
          <Separator className="my-4" />

          <section>
            <button className="w-full flex items-center gap-2 text-xs font-semibold text-muted-foreground" onClick={() => setCapOpen((o) => !o)}>
              {t("cap.title")}
              <span className="ml-auto h-4 w-4 rounded border border-border" style={{ background: project.capColor || "#111111" }} />
              <ChevronDown className={cn("h-4 w-4 transition", capOpen && "rotate-180")} />
            </button>
            {capOpen && (<div className="mt-2">
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
            </div>)}
          </section>
          </>)}
          </div>

          <div ref={step3Ref} className={cardCls(guideStep === 3)}>
            <div className="flex items-center gap-2 font-semibold text-sm">{stepNum(3, true)}{t("ed.step3")}</div>
            <p className="text-xs text-muted-foreground mt-1 mb-3 leading-relaxed">{t("ed.step3.tip")}</p>
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
              <Button variant="outline" size="sm" className="bg-card" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" /> {t("art.upload")}
              </Button>
              <Button variant="outline" size="sm" className="bg-card" onClick={addText}>
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
            <p className="text-[11px] text-muted-foreground mt-2">{t("art.uploadTip")}</p>
            {currentItems.length > 0 && (
              <div className="mt-4">
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
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <button className="w-full flex items-center gap-2 font-semibold text-sm" onClick={() => setMethodOpen((o) => !o)}>
              {stepNum(4, true)}
              {t("ed.step4")}
              <span className="ml-auto text-xs font-normal text-muted-foreground">{t(methodKey)}</span>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition", methodOpen && "rotate-180")} />
            </button>
            {methodOpen && (
              <div className="mt-4">
                <WizardPanel {...wizardProps} only={["method"]} />
                {(silkscreenWarn || digitalWarn) && (
                  <div className="mt-3 rounded-lg border border-warning/40 bg-warning/10 text-foreground text-[11px] px-3 py-2 space-y-1">
                    <div>
                      <span className="font-semibold text-warning">{t("canvas.note")} </span>
                      {silkscreenWarn ? t("canvas.warn.silk") : t("canvas.warn.digital")}
                    </div>
                    {colorChangeHint && <div className="text-muted-foreground">{t("canvas.colorChangeHint")}</div>}
                  </div>
                )}
                <div className="mt-3 text-[11px] text-muted-foreground space-y-1">
                  <p>• {t("notes.1")}</p>
                  <p>• {t("notes.2")}</p>
                  <p>• {t("notes.3")}</p>
                  <p>• {t("notes.4")}</p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <button className="w-full flex items-center gap-2 font-semibold text-sm" onClick={() => setExtrasOpen((o) => !o)}>
              {stepNum(5, true)}
              {t("ed.step5")}
              <ChevronDown className={cn("ml-auto h-4 w-4 text-muted-foreground transition", extrasOpen && "rotate-180")} />
            </button>
            {extrasOpen && (
              <div className="mt-4">
                <WizardPanel {...wizardProps} only={["extras"]} />
              </div>
            )}
          </div>
          </div>)}

          {showHandleTab && (
            <section>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("handle.title")}</h3>
                {project.handleColor && (
                  <button
                    onClick={() => updateProject({ handleColor: undefined })}
                    className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground hover:bg-muted transition"
                  >
                    {t("handle.reset")}
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3">{t(otherParts ? "handle.descSimple" : "handle.desc")}</p>
              <div className="grid grid-cols-4 gap-2">
                {HANDLE_COLOR_PRESETS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => updateProject({ handleColor: c.value })}
                    title={t(`color.${c.name}`)}
                    aria-label={c.name}
                    className={cn(
                      "h-9 rounded-md border-2 transition",
                      handleColor === c.value ? "border-primary scale-105" : "border-border"
                    )}
                    style={{ background: c.value }}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  type="color"
                  value={handleColor}
                  onChange={(e) => updateProject({ handleColor: e.target.value })}
                  className="h-9 w-14 p-1"
                />
                <Input
                  value={handleColor}
                  onChange={(e) => updateProject({ handleColor: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </section>
          )}

          {showHandleTab && otherParts && (
            <>
              {([
                ["tips", "tips.title", "tips.desc", project.tipColor, (v?: string) => updateProject({ tipColor: v })],
                ["cap", "cap.titleTop", null, project.capColor, (v?: string) => updateProject({ capColor: v })],
              ] as const).map(([key, title, desc, raw, set]) => {
                const value = raw || model3d?.frame_color || "#1a1a1a";
                return (
                  <div key={key}>
                    <Separator className="my-5" />
                    <section>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t(title)}</h3>
                      {desc && <p className="text-xs text-muted-foreground mb-3">{t(desc)}</p>}
                      <div className={cn("grid grid-cols-4 gap-2", !desc && "mt-2")}>
                        {MID_SECTION_PRESETS.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => set(c.value)}
                            title={t(`color.${c.name}`)}
                            aria-label={c.name}
                            className={cn(
                              "h-9 rounded-md border-2 transition",
                              value === c.value ? "border-primary scale-105" : "border-border"
                            )}
                            style={{ background: c.value }}
                          />
                        ))}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Input type="color" value={value} onChange={(e) => set(e.target.value)} className="h-9 w-14 p-1" />
                        <Input value={value} onChange={(e) => set(e.target.value)} className="h-9 text-xs" />
                      </div>
                    </section>
                  </div>
                );
              })}
            </>
          )}

          {showHandleTab && model3d?.handle_insert && (
            <>
              <Separator className="my-5" />
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("insert.title")}</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {t("insert.desc")} {insertSizeMm.w} × {insertSizeMm.h} mm
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {HANDLE_INSERT_PRESETS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => updateInsert({ color: c.value })}
                      title={t(`color.${c.name}`)}
                      aria-label={c.name}
                      className={cn(
                        "h-9 rounded-md border-2 transition",
                        insert.color === c.value ? "border-primary scale-105" : "border-border"
                      )}
                      style={{ background: c.value }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="color"
                    value={insert.color}
                    onChange={(e) => updateInsert({ color: e.target.value })}
                    className="h-9 w-14 p-1"
                  />
                  <Input
                    value={insert.color}
                    onChange={(e) => updateInsert({ color: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <Label className="text-xs mt-4 mb-2 block">{t("insert.finish")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["matte", "gloss"] as HandleInsertFinish[]).map((f) => (
                    <Button
                      key={f}
                      size="sm"
                      variant={normalizeFinish(insert.finish) === f ? "default" : "outline"}
                      onClick={() => updateInsert({ finish: f })}
                    >
                      {t(`insert.finish.${f}`)}
                    </Button>
                  ))}
                </div>

                <Label className="text-xs mt-4 mb-2 block">{t("insert.logo")}</Label>
                <input
                  ref={insertLogoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleInsertLogo(f);
                    e.target.value = "";
                  }}
                />
                {insert.logoSrc ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <img src={insert.logoSrc} alt="" className="h-9 w-9 object-contain rounded border border-border bg-muted" />
                      <span className="text-xs truncate flex-1">{insert.logoFileName}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={t("insert.removeLogo")}
                        onClick={() => updateInsert({ logoSrc: undefined, logoFileName: undefined })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="w-full" onClick={() => insertLogoInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-1" /> {t("insert.uploadLogo")}
                  </Button>
                )}
                <div className="mt-4">
                  <InsertArtEditor value={insert} onChange={updateInsert} sizeMm={insertSizeMm} />
                </div>
              </section>
            </>
          )}

          {showHandleTab && model3d?.mid_section && (
            <>
              <Separator className="my-5" />
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("mid.title")}</h3>
                <p className="text-xs text-muted-foreground mb-3">{t("mid.desc")}</p>
                {([
                  ["bodyColor", "mid.body"],
                  ["accentColor", "mid.accent"],
                ] as const).map(([key, label]) => {
                  const value = mid[key];
                  return (
                    <div key={key} className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs">{t(label)}</Label>
                        <button
                          onClick={() => updateMid({ [key]: undefined })}
                          className={cn(
                            "text-xs px-2 py-0.5 rounded border transition",
                            value ? "border-border text-muted-foreground hover:bg-muted" : "border-primary text-primary"
                          )}
                        >
                          {t("mid.sameAsHandle")}
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {MID_SECTION_PRESETS.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => updateMid({ [key]: c.value })}
                            title={t(`color.${c.name}`)}
                            aria-label={c.name}
                            className={cn(
                              "h-9 rounded-md border-2 transition",
                              value === c.value ? "border-primary scale-105" : "border-border"
                            )}
                            style={{ background: c.value }}
                          />
                        ))}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Input
                          type="color"
                          value={value ?? handleColor}
                          onChange={(e) => updateMid({ [key]: e.target.value })}
                          className="h-9 w-14 p-1"
                        />
                        <Input
                          value={value ?? ""}
                          placeholder={t("mid.sameAsHandle")}
                          onChange={(e) => updateMid({ [key]: e.target.value || undefined })}
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                  );
                })}
                <Label className="text-xs mb-2 block">{t("mid.accentFinish")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["matte", "gloss"] as HandleInsertFinish[]).map((f) => (
                    <Button
                      key={f}
                      size="sm"
                      variant={normalizeFinish(mid.accentFinish) === f ? "default" : "outline"}
                      onClick={() => updateMid({ accentFinish: f })}
                    >
                      {t(`insert.finish.${f}`)}
                    </Button>
                  ))}
                </div>
              </section>
            </>
          )}
          {showHandleTab && model3d?.handle_button && (
            <>
              <Separator className="my-5" />
              <section>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("button.title")}</h3>
                  <button
                    onClick={() => updateButton({ color: undefined })}
                    className={cn(
                      "text-xs px-2 py-0.5 rounded border transition",
                      button.color ? "border-border text-muted-foreground hover:bg-muted" : "border-primary text-primary"
                    )}
                  >
                    {t("mid.sameAsHandle")}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{t("button.desc")}</p>
                <div className="grid grid-cols-4 gap-2">
                  {MID_SECTION_PRESETS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => updateButton({ color: c.value })}
                      title={t(`color.${c.name}`)}
                      aria-label={c.name}
                      className={cn(
                        "h-9 rounded-md border-2 transition",
                        button.color === c.value ? "border-primary scale-105" : "border-border"
                      )}
                      style={{ background: c.value }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="color"
                    value={button.color ?? handleColor}
                    onChange={(e) => updateButton({ color: e.target.value })}
                    className="h-9 w-14 p-1"
                  />
                  <Input
                    value={button.color ?? ""}
                    placeholder={t("mid.sameAsHandle")}
                    onChange={(e) => updateButton({ color: e.target.value || undefined })}
                    className="h-9 text-xs"
                  />
                </div>
                {button.color && (
                  <>
                    <Label className="text-xs mt-4 mb-2 block">{t("button.finish")}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["matte", "gloss"] as HandleInsertFinish[]).map((f) => (
                        <Button
                          key={f}
                          size="sm"
                          variant={normalizeFinish(button.finish) === f ? "default" : "outline"}
                          onClick={() => updateButton({ finish: f })}
                        >
                          {t(`insert.finish.${f}`)}
                        </Button>
                      ))}
                    </div>
                  </>
                )}
              </section>
            </>
          )}
        </aside>


        {/* Canvas */}
        <main ref={mainRef} className="relative overflow-hidden bg-gradient-subtle min-h-0">
          {viewMode === "2d" && (
            <div className="absolute top-4 right-4 z-10 rounded-lg bg-card border border-border shadow-soft p-1 flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}><ZoomOut className="h-3.5 w-3.5" /></Button>
              <span className="text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(2, z + 0.1))}><ZoomIn className="h-3.5 w-3.5" /></Button>
            </div>
          )}

          {project.printingMethod === "color-change" && activeSurface !== "pouch" && (
            <div className="absolute top-16 right-4 z-20 rounded-lg bg-card border border-border shadow-soft p-1 flex items-center gap-1 text-xs">
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
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 rounded-lg bg-card border border-border shadow-soft p-1 flex items-center gap-1 text-xs">
              <button
                onClick={() => { setActiveSurface("canopy"); setSelectedItem(null); setSelectedPanels([]); setDesignTab("canopy"); }}
                className={cn(
                  "px-3 py-1.5 rounded-md transition",
                  activeSurface === "canopy" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                {t("surface.canopy")}
              </button>
              {project.hasDoubleLayer && project.umbrellaCategory === "golf" && (
                <button
                  onClick={() => { setActiveSurface("inner"); setSelectedItem(null); setSelectedPanels([]); setDesignTab("canopy"); }}
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
                  onClick={() => { setActiveSurface("pouch"); setSelectedItem(null); setSelectedPanels([]); setDesignTab("canopy"); }}
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

          <div
            className="absolute inset-0 pt-16 grid place-items-center overflow-hidden"
            style={{ display: viewMode === "2d" ? "grid" : "none" }}
          >
            <div
              style={{ transform: `scale(${zoom * fitScale})`, transformOrigin: "center" }}
            >
              <div
                style={{ display: activeSurface === "pouch" ? "none" : "block" }}
              >
                <UmbrellaCanopy
                  ref={setCanopySvg}
                  category={project.umbrellaCategory}
                  ribCount={project.ribCount}
                  fabricColor={project.fabricColor}
                  panelColors={project.panelColors}
                  capColor={project.capColor}
                  artwork={project.artworkItems}
                  selectedPanels={activeSurface === "canopy" ? selectedPanels : []}
                  onPanelClick={activeSurface === "canopy" ? handlePanelClick : undefined}
                  hoverPanel={viewMode === "3d" && !showHandleTab ? hoverPanel : null}
                  highlightSelection={!exporting && !showHandleTab}
                  onItemSelect={(id) => setSelectedItem(id)}
                  onItemChange={(id, patch) =>
                    activeSurface === "canopy" && updateItem(id, patch)
                  }
                  size={CANVAS_SIZE}
                  onArtworkHoverChange={setArtworkHover}
                  dryMode={
                    project.printingMethod === "color-change" &&
                    (dryToggle === "dry" || (dryToggle === "auto" && !artworkHover))
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
                  onInnerPanelClick={activeSurface === "inner" ? handlePanelClick : undefined}
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

          {/* (2D canopy SVG above is left mounted via display:none in 3D mode
              so the texture rasterizer can keep reading it.) */}

          {/* 3D preview */}
          {viewMode === "3d" && (
            <div className="absolute inset-0">
              {model3d ? (
                <>
                  <UmbrellaScene
                    ref={(api) => { sceneRef.current = api; }}
                    config={model3d}
                    svg={svgEl}
                    fabricColor={project.fabricColor}
                    capColor={project.capColor}
                    handleInsert={model3d.handle_insert ? insert : undefined}
                    midSection={model3d.mid_section ? mid : undefined}
                handleButton={model3d.handle_button ? button : undefined}
                tipColor={otherParts ? project.tipColor : undefined}
                    handleColor={hasHandleDesign ? project.handleColor : undefined}
                    showFrame={showFrame}
                    interaction={
                      showHandleTab
                        ? undefined
                        : {
                            category: project.umbrellaCategory,
                            ribCount: project.ribCount,
                            items: project.artworkItems,
                            selectedItemId: selectedItem,
                            onPanelClick: handlePanelClick,
                            onHoverPanel: setHoverPanel,
                            onItemSelect: setSelectedItem,
                            onItemChange: updateItem,
                          }
                    }
                    textureDeps={[
                      project.fabricColor,
                      project.capColor,
                      project.panelColors,
                      project.artworkItems,
                      project.innerLayer,
                      project.ribCount,
                      project.umbrellaCategory,
                      project.printingMethod,
                      project.hasDoubleLayer,
                      project.doubleLayerStyle,
                      dryToggle,
                      selectedPanels,
                      activeSurface,
                      hoverPanel,
                      exporting,
                      showHandleTab,
                    ]}
                  />
                  <div className="absolute top-4 right-4 z-10 rounded-lg bg-card/95 border border-border shadow-soft p-1 flex items-center gap-1 text-xs">
                    {(["perspective", "top", "front", "side", ...(hasHandleDesign ? ["handle"] : [])] as CameraPreset[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => sceneRef.current?.setView(p)}
                        className="px-2.5 py-1 rounded-md text-muted-foreground hover:bg-muted transition"
                      >
                        {t(`threeD.${p === "perspective" ? "reset" : p}`)}
                      </button>
                    ))}
                    <Separator orientation="vertical" className="h-5 mx-1" />
                    <button
                      onClick={() => setShowFrame((v) => !v)}
                      className="px-2.5 py-1 rounded-md text-muted-foreground hover:bg-muted transition flex items-center gap-1"
                    >
                      {showFrame ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {showFrame ? t("threeD.hideFrame") : t("threeD.showFrame")}
                    </button>
                  </div>
                  {!showHandleTab && (
                    <>
                      <span
                        className={cn(
                          "absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm",
                          noneSelected ? "bg-card border border-border text-muted-foreground" : "bg-[#e8f0ff] text-[#1f56c3]"
                        )}
                      >
                        {noneSelected
                          ? t("ed.noneSelected")
                          : t("ed.selected").replace("{n}", String(selectedPanels.length)).replace("{t}", String(project.ribCount))}
                      </span>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-card/95 border border-border rounded-full px-5 py-2 text-xs text-muted-foreground shadow-sm whitespace-nowrap pointer-events-none">
                        {t(selectedItem ? "ed.hintItem" : "ed.hint")}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="h-full grid place-items-center p-12">
                  <div className="max-w-md text-center rounded-xl border border-border bg-card p-8 shadow-soft">
                    <Box className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-foreground">{t("threeD.unavailable")}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Headless offscreen 3D scene used to capture PDF screenshots when
              the user clicks "PDF" while still in 2D mode. */}
          {headlessCapture && model3d && (
            <div
              style={{ position: "fixed", left: -99999, top: -99999, width: 1000, height: 800, pointerEvents: "none" }}
              aria-hidden
            >
              <UmbrellaScene
                ref={(api) => {
                  if (!api) {
                    headlessSceneRef.current = null;
                    return;
                  }
                  if (headlessCapture && headlessSceneRef.current !== api) {
                    headlessSceneRef.current = api;
                    headlessCapture.resolve(api);
                  }
                }}
                config={model3d}
                svg={svgEl}
                fabricColor={project.fabricColor}
                capColor={project.capColor}
                handleInsert={model3d.handle_insert ? insert : undefined}
                midSection={model3d.mid_section ? mid : undefined}
                handleButton={model3d.handle_button ? button : undefined}
                tipColor={otherParts ? project.tipColor : undefined}
                    handleColor={hasHandleDesign ? project.handleColor : undefined}
                showFrame={showFrame}
                textureDeps={[project]}
              />
            </div>
          )}


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




        </main>

      </div>

      {guideStep > 0 && guidePos && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {guidePos.hand && (
            <div className="absolute" style={{ left: guidePos.hand.x, top: guidePos.hand.y }}>
              <span className="absolute w-12 h-12 -left-6 -top-6 rounded-full bg-[#1f56c3]/40 animate-ping" />
              <span className="absolute w-5 h-5 -left-2.5 -top-2.5 rounded-full bg-[#1f56c3] border-2 border-white shadow" />
              <MousePointer2 className="absolute left-1 top-1 h-8 w-8 text-[#0f2a5c] fill-white drop-shadow" />
            </div>
          )}
          <div
            className="absolute pointer-events-auto bg-[#0f2a5c] text-white rounded-xl shadow-lg px-4 py-3 w-[270px]"
            style={{ left: guidePos.left, top: guidePos.top }}
          >
            <div className="absolute -left-2 top-6 w-4 h-4 bg-[#0f2a5c] rotate-45" />
            <div className="relative">
              <div className="text-[11px] text-white/60">{t("guide.of").replace("{n}", String(guideStep))}</div>
              <div className="font-semibold mt-0.5">{t(`guide.${guideStep}.title`)}</div>
              <div className="text-xs text-white/80 mt-1">{t(`guide.${guideStep}.body`)}</div>
              <div className="flex justify-between items-center mt-3 text-xs">
                <button className="text-white/60 hover:text-white" onClick={finishGuide}>
                  {t("guide.skip")}
                </button>
                <button
                  className="px-3 py-1 rounded-md bg-white text-[#0f2a5c] font-medium"
                  onClick={() => (guideStep >= 3 ? finishGuide() : setGuideStep(guideStep + 1))}
                >
                  {t("guide.ok")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("editor.resetTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("editor.resetBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("editor.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={doReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("editor.reset")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DesignEditor;
