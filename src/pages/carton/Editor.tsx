import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Box, Eye, Image as ImageIcon, LayoutGrid, Loader2, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";
import { MarkTable } from "@/components/MarkTable";
import { Carton3D } from "@/components/Carton3D";
import { formatMeas, resolveDims, tryParseMeas } from "@/lib/meas";
import { supabase } from "@/integrations/supabase/client";
import {
  MarkVariant,
  ShippingMarkProject,
  createEmptyProject,
  createEmptyVariant,
} from "@/types/shippingMark";
import { getProject, saveProject } from "@/lib/markStorage";
import { toast } from "sonner";

export default function CartonEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<ShippingMarkProject>(() => createEmptyProject());
  const [previewMode, setPreviewMode] = useState<"2d" | "3d">("2d");

  useEffect(() => {
    if (!id) return;
    const p = getProject(id);
    if (p) setProject(p);
  }, [id]);

  const update = (patch: Partial<ShippingMarkProject>) =>
    setProject((p) => ({ ...p, ...patch }));

  const updateVariant = (vid: string, patch: Partial<MarkVariant>) =>
    setProject((p) => ({
      ...p,
      variants: p.variants.map((v) => (v.id === vid ? { ...v, ...patch } : v)),
    }));

  const addVariant = () =>
    setProject((p) => ({ ...p, variants: [...p.variants, createEmptyVariant()] }));

  const removeVariant = (vid: string) =>
    setProject((p) => ({
      ...p,
      variants: p.variants.length > 1 ? p.variants.filter((v) => v.id !== vid) : p.variants,
    }));

  const duplicateVariant = (vid: string) =>
    setProject((p) => {
      const src = p.variants.find((v) => v.id === vid);
      if (!src) return p;
      return { ...p, variants: [...p.variants, { ...src, id: crypto.randomUUID() }] };
    });

  const handleSave = () => {
    saveProject(project);
    toast.success("已保存");
    if (!id) navigate(`/carton/editor/${project.id}`, { replace: true });
  };

  const handlePreview = () => {
    saveProject(project);
    navigate(`/carton/batch/${project.id}`);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const directTargetRef = useRef<{ vid: string; side: "main" | "side" } | null>(null);
  const directInputRef = useRef<HTMLInputElement>(null);

  const openDirectUpload = (vid: string, side: "main" | "side") => {
    directTargetRef.current = { vid, side };
    directInputRef.current?.click();
  };

  const readDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });

  const handleAnalyzeFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("请上传图片文件");
      return;
    }
    setAnalyzing(true);
    try {
      const dataUrl = await readDataUrl(file);
      const { data, error } = await supabase.functions.invoke("analyze-mark", {
        body: { imageDataUrl: dataUrl },
      });
      if (error) throw error;
      const f = (data as any)?.fields ?? {};
      const newVariant: MarkVariant = {
        ...createEmptyVariant(),
        id: crypto.randomUUID(),
        title: f.title || "已识别款式",
        customer: f.customer || "",
        orderNo: f.orderNo || "",
        madeIn: f.madeIn || "",
        cartonCount: f.cartonCount || "",
        model: f.model || "",
        colour: f.colour || "",
        quantity: f.quantity || "",
        gw: f.gw || "",
        nw: f.nw || "",
        meas: f.meas || "",
      };
      setProject((p) => ({
        ...p,
        description: p.description || f.projectDescription || "",
        variants: [...p.variants, newVariant],
      }));
      toast.success("已识别并添加为新款式,请校对");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "识别失败");
    } finally {
      setAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDirectFile = async (file: File) => {
    const target = directTargetRef.current;
    directTargetRef.current = null;
    if (!target) return;
    if (!file.type.startsWith("image/")) {
      toast.error("请上传图片文件");
      return;
    }
    try {
      const dataUrl = await readDataUrl(file);
      updateVariant(
        target.vid,
        target.side === "main"
          ? { mainImageDataUrl: dataUrl }
          : { sideImageDataUrl: dataUrl },
      );
      toast.success(target.side === "main" ? "已上传正唛图片" : "已上传侧唛图片");
    } catch (e: any) {
      toast.error(e?.message || "上传失败");
    } finally {
      if (directInputRef.current) directInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex flex-wrap items-center justify-between gap-2 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/carton"><ArrowLeft className="mr-1 h-4 w-4" />返回</Link>
            </Button>
            <BrandHeader subtitle="编辑唛头" compact />
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleAnalyzeFile(f);
              }}
            />
            <input
              ref={directInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleDirectFile(f);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={analyzing}
            >
              {analyzing ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-4 w-4" />
              )}
              {analyzing ? "识别中…" : "上传图片识别"}
            </Button>
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
                <Input value={project.title} onChange={(e) => update({ title: e.target.value })} placeholder="例如 WIR26-001A" />
              </div>
              <div>
                <Label>说明 / 头部备注</Label>
                <Textarea
                  rows={3}
                  value={project.description}
                  onChange={(e) => update({ description: e.target.value })}
                  placeholder="箱唛说明,例如包装方式、箱规、纸箱要求等"
                />
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
                  <Label>款式标题</Label>
                  <Input value={v.title} onChange={(e) => updateVariant(v.id, { title: e.target.value })} placeholder="例如 黑色款10000支" />
                </div>

                <div className="rounded-md border border-dashed p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-bold uppercase">正唛 (MAIN MARK)</div>
                    {v.mainImageDataUrl ? (
                      <Button size="sm" variant="ghost" onClick={() => updateVariant(v.id, { mainImageDataUrl: undefined })}>
                        移除图片,改用文字
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => openDirectUpload(v.id, "main")}>
                        <ImageIcon className="mr-1 h-4 w-4" />改用图片
                      </Button>
                    )}
                  </div>

                  {v.mainImageDataUrl ? (
                    <img src={v.mainImageDataUrl} alt="main mark" className="mx-auto block max-h-[220px] w-auto max-w-full rounded border bg-white object-contain" />
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <Label>客户 / Customer</Label>
                        <Input value={v.customer} onChange={(e) => updateVariant(v.id, { customer: e.target.value })} />
                      </div>
                      <div>
                        <Label>订单号 (ORDER NO.)</Label>
                        <Input value={v.orderNo} onChange={(e) => updateVariant(v.id, { orderNo: e.target.value })} />
                      </div>
                      <div>
                        <Label>原产地</Label>
                        <Input value={v.madeIn} onChange={(e) => updateVariant(v.id, { madeIn: e.target.value })} />
                      </div>
                      <div>
                        <Label>箱数 (CARTON OF)</Label>
                        <Input value={v.cartonCount} onChange={(e) => updateVariant(v.id, { cartonCount: e.target.value })} placeholder="500" />
                      </div>
                      <div className="col-span-2">
                        <Label>条形码 (Barcode) — 留空则不显示</Label>
                        <Input value={v.barcode ?? ""} onChange={(e) => updateVariant(v.id, { barcode: e.target.value })} placeholder="例如 PO20260001" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-md border border-dashed p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-bold uppercase">侧唛 (SIDE MARK)</div>
                    {v.sideImageDataUrl ? (
                      <Button size="sm" variant="ghost" onClick={() => updateVariant(v.id, { sideImageDataUrl: undefined })}>
                        移除图片,改用文字
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => openDirectUpload(v.id, "side")}>
                        <ImageIcon className="mr-1 h-4 w-4" />改用图片
                      </Button>
                    )}
                  </div>

                  {v.sideImageDataUrl ? (
                    <img src={v.sideImageDataUrl} alt="side mark" className="mx-auto block max-h-[220px] w-auto max-w-full rounded border bg-white object-contain" />
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>型号 (MODELS)</Label>
                        <Input value={v.model} onChange={(e) => updateVariant(v.id, { model: e.target.value })} />
                      </div>
                      <div>
                        <Label>颜色 (COLOUR)</Label>
                        <Input value={v.colour} onChange={(e) => updateVariant(v.id, { colour: e.target.value })} />
                      </div>
                      <div>
                        <Label>数量 (QUANTITY)</Label>
                        <Input value={v.quantity} onChange={(e) => updateVariant(v.id, { quantity: e.target.value })} />
                      </div>
                      <div>
                        <Label>毛重 (G.W.)</Label>
                        <Input value={v.gw} onChange={(e) => updateVariant(v.id, { gw: e.target.value })} />
                      </div>
                      <div>
                        <Label>净重 (N.W.)</Label>
                        <Input value={v.nw} onChange={(e) => updateVariant(v.id, { nw: e.target.value })} />
                      </div>
                      <div>
                        <Label>尺寸 (MEAS)</Label>
                        <Input
                          value={v.meas}
                          onChange={(e) => {
                            const meas = e.target.value;
                            updateVariant(v.id, {
                              meas,
                              dimensions: tryParseMeas(meas) ?? v.dimensions,
                            });
                          }}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>条形码 (Barcode) — 留空则不显示</Label>
                        <Input value={v.sideBarcode ?? ""} onChange={(e) => updateVariant(v.id, { sideBarcode: e.target.value })} placeholder="例如 MX100-BLK" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-md border border-dashed p-3">
                  <div className="mb-2 text-xs font-bold uppercase">
                    箱体尺寸 (3D Carton Dimensions, cm)
                  </div>
                  {(() => {
                    const eff = resolveDims(v.meas, v.dimensions);
                    const setDim = (patch: Partial<typeof eff>) =>
                      updateVariant(v.id, {
                        dimensions: { ...eff, ...patch },
                        meas: formatMeas({ ...eff, ...patch }),
                      });
                    return (
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label>长 L</Label>
                          <Input type="number" value={eff.l} onChange={(e) => setDim({ l: +e.target.value || 0 })} />
                        </div>
                        <div>
                          <Label>宽 W</Label>
                          <Input type="number" value={eff.w} onChange={(e) => setDim({ w: +e.target.value || 0 })} />
                        </div>
                        <div>
                          <Label>高 H</Label>
                          <Input type="number" value={eff.h} onChange={(e) => setDim({ h: +e.target.value || 0 })} />
                        </div>
                      </div>
                    );
                  })()}
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    默认从 MEAS 字段解析,可手动调整;3D 视图按此比例生成箱体。
                  </p>
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
          {previewMode === "2d" ? (
            <Card className="space-y-4 bg-white p-6 text-black">
              <p className="text-[12px] font-semibold">{project.title} {project.description}</p>
              {project.variants.map((v) => (
                <div key={v.id} className="space-y-1">
                  <p className="text-[12px] font-bold">{v.title}：</p>
                  <MarkTable variant={v} />
                </div>
              ))}
            </Card>
          ) : (
            <div className="space-y-4">
              {project.variants.map((v) => (
                <div key={v.id} className="space-y-2">
                  <p className="text-xs font-bold">{v.title}</p>
                  <Card className="bg-white p-4 text-black">
                    <MarkTable variant={v} />
                  </Card>
                  <Carton3D variant={v} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
