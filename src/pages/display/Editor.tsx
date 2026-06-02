import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Box, Eye, LayoutGrid, Plus, Save, Trash2, Upload, X,
} from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";
import { AppTabs } from "@/components/AppTabs";
import { DisplayBoxNet } from "@/components/DisplayBoxNet";
import { DisplayBox3D } from "@/components/DisplayBox3D";
import {
  BOX_PRESETS, BoxType, DisplayBoxProject, DisplayBoxVariant, FaceKey,
  createEmptyDisplayBoxProject, createEmptyDisplayBoxVariant,
} from "@/types/displayBox";
import { getDisplayProject, saveDisplayProject } from "@/lib/displayBoxStorage";
import { toast } from "sonner";

const FACES: { key: FaceKey; label: string }[] = [
  { key: "front", label: "正面 Front" },
  { key: "back", label: "背面 Back" },
  { key: "left", label: "左侧 Left" },
  { key: "right", label: "右侧 Right" },
  { key: "top", label: "顶面 Top" },
  { key: "bottom", label: "底面 Bottom" },
];

const readDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

export default function DisplayEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<DisplayBoxProject>(() => createEmptyDisplayBoxProject());
  const [previewMode, setPreviewMode] = useState<"2d" | "3d">("2d");

  useEffect(() => {
    if (!id) return;
    const p = getDisplayProject(id);
    if (p) setProject(p);
  }, [id]);

  const update = (patch: Partial<DisplayBoxProject>) =>
    setProject((p) => ({ ...p, ...patch }));

  const updateVariant = (vid: string, patch: Partial<DisplayBoxVariant>) =>
    setProject((p) => ({
      ...p,
      variants: p.variants.map((v) => (v.id === vid ? { ...v, ...patch } : v)),
    }));

  const updateFace = (vid: string, face: FaceKey, dataUrl: string | undefined) =>
    setProject((p) => ({
      ...p,
      variants: p.variants.map((v) =>
        v.id === vid ? { ...v, faces: { ...v.faces, [face]: dataUrl } } : v,
      ),
    }));

  const setBoxType = (t: BoxType) => {
    update({ boxType: t, dimensions: { ...BOX_PRESETS[t] } });
  };

  const addVariant = () =>
    setProject((p) => ({ ...p, variants: [...p.variants, createEmptyDisplayBoxVariant()] }));

  const removeVariant = (vid: string) =>
    setProject((p) => ({
      ...p,
      variants: p.variants.length > 1 ? p.variants.filter((v) => v.id !== vid) : p.variants,
    }));

  const duplicateVariant = (vid: string) =>
    setProject((p) => {
      const src = p.variants.find((v) => v.id === vid);
      if (!src) return p;
      return {
        ...p,
        variants: [...p.variants, { ...src, id: crypto.randomUUID(), faces: { ...src.faces } }],
      };
    });

  const handleSave = () => {
    saveDisplayProject(project);
    toast.success("已保存");
    if (!id) navigate(`/display/editor/${project.id}`, { replace: true });
  };

  const handlePreview = () => {
    saveDisplayProject(project);
    navigate(`/display/batch/${project.id}`);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<{ vid: string; face: FaceKey } | null>(null);

  const openUpload = (vid: string, face: FaceKey) => {
    targetRef.current = { vid, face };
    fileInputRef.current?.click();
  };

  const handleFile = async (file: File) => {
    const target = targetRef.current;
    targetRef.current = null;
    if (!target) return;
    if (!file.type.startsWith("image/")) {
      toast.error("请上传图片文件");
      return;
    }
    try {
      const dataUrl = await readDataUrl(file);
      updateFace(target.vid, target.face, dataUrl);
      toast.success("已上传图片");
    } catch (e: any) {
      toast.error(e?.message || "上传失败");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex flex-wrap items-center justify-between gap-2 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/display"><ArrowLeft className="mr-1 h-4 w-4" />返回</Link>
            </Button>
            <BrandHeader subtitle="编辑展示盒" compact />
            <AppTabs />
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <Button variant="outline" size="sm" onClick={handleSave}><Save className="mr-1 h-4 w-4" />保存</Button>
            <Button size="sm" onClick={handlePreview}><Eye className="mr-1 h-4 w-4" />预览 / 导出</Button>
          </div>
        </div>
      </header>

      <main className="container grid gap-6 py-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">项目信息</h3>
            <div className="space-y-3">
              <div>
                <Label>项目标题</Label>
                <Input value={project.title} onChange={(e) => update({ title: e.target.value })} />
              </div>
              <div>
                <Label>说明</Label>
                <Textarea rows={2} value={project.description} onChange={(e) => update({ description: e.target.value })} />
              </div>
              <div>
                <Label>展示盒类型</Label>
                <div className="mt-1 inline-flex overflow-hidden rounded-md border">
                  {(["folding", "straight"] as BoxType[]).map((t) => (
                    <Button
                      key={t}
                      type="button"
                      variant={project.boxType === t ? "default" : "ghost"}
                      size="sm"
                      className="rounded-none"
                      onClick={() => setBoxType(t)}
                    >
                      {BOX_PRESETS[t].label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>长 L (cm)</Label>
                  <Input type="number" value={project.dimensions.l} onChange={(e) => update({ dimensions: { ...project.dimensions, l: +e.target.value || 0 } })} />
                </div>
                <div>
                  <Label>宽 W (cm)</Label>
                  <Input type="number" value={project.dimensions.w} onChange={(e) => update({ dimensions: { ...project.dimensions, w: +e.target.value || 0 } })} />
                </div>
                <div>
                  <Label>高 H (cm)</Label>
                  <Input type="number" value={project.dimensions.h} onChange={(e) => update({ dimensions: { ...project.dimensions, h: +e.target.value || 0 } })} />
                </div>
              </div>
            </div>
          </Card>

          {project.variants.map((v, i) => (
            <Card key={v.id} className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  款式 {i + 1}
                </h3>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => duplicateVariant(v.id)}>复制</Button>
                  <Button size="sm" variant="ghost" onClick={() => removeVariant(v.id)} disabled={project.variants.length <= 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>款式名称</Label>
                  <Input value={v.name} onChange={(e) => updateVariant(v.id, { name: e.target.value })} />
                </div>

                <div>
                  <Label className="mb-2 block">六面图案 Artwork per Face</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {FACES.map((face) => {
                      const img = v.faces[face.key];
                      return (
                        <div key={face.key} className="rounded-md border p-2">
                          <div className="mb-1 flex items-center justify-between text-[11px] font-bold uppercase">
                            <span>{face.label}</span>
                            {img && (
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => updateFace(v.id, face.key, undefined)}
                                title="清除"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => openUpload(v.id, face.key)}
                            className="flex h-20 w-full items-center justify-center overflow-hidden rounded border border-dashed bg-muted/30 text-xs text-muted-foreground hover:bg-muted"
                          >
                            {img ? (
                              <img src={img} alt={face.label} className="h-full w-full object-cover" />
                            ) : (
                              <span className="flex items-center gap-1"><Upload className="h-3 w-3" />上传</span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          ))}

          <Button variant="outline" className="w-full" onClick={addVariant}>
            <Plus className="mr-1 h-4 w-4" />添加款式
          </Button>
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 lg:h-fit">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">实时预览</h3>
            <div className="inline-flex overflow-hidden rounded-md border">
              <Button variant={previewMode === "2d" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setPreviewMode("2d")}>
                <LayoutGrid className="mr-1 h-4 w-4" />2D
              </Button>
              <Button variant={previewMode === "3d" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setPreviewMode("3d")}>
                <Box className="mr-1 h-4 w-4" />3D
              </Button>
            </div>
          </div>

          <Card className="p-4 text-[11px] uppercase text-muted-foreground">
            展开示意 (Unfolded net) — TOP / FRONT / BOTTOM 居中,LEFT · RIGHT · BACK 分列两侧
          </Card>

          {previewMode === "2d" ? (
            <div className="space-y-4">
              {project.variants.map((v) => (
                <Card key={v.id} className="space-y-2 bg-white p-4 text-black">
                  <p className="text-[12px] font-bold">{v.name}</p>
                  <DisplayBoxNet variant={v} dimensions={project.dimensions} />
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {project.variants.map((v) => (
                <div key={v.id} className="space-y-2">
                  <p className="text-xs font-bold">{v.name}</p>
                  <DisplayBox3D variant={v} boxType={project.boxType} dimensions={project.dimensions} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
