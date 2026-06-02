import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Box as BoxIcon, Copy, Trash2, ArrowLeft } from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";
import { AppTabs } from "@/components/AppTabs";
import { DisplayBoxProject } from "@/types/displayBox";
import {
  deleteDisplayProject,
  duplicateDisplayProject,
  loadDisplayProjects,
} from "@/lib/displayBoxStorage";

export default function DisplayIndex() {
  const [projects, setProjects] = useState<DisplayBoxProject[]>([]);
  const navigate = useNavigate();

  const refresh = () => setProjects(loadDisplayProjects());
  useEffect(() => { refresh(); }, []);

  const handleDuplicate = (id: string) => {
    const p = duplicateDisplayProject(id);
    if (p) navigate(`/display/editor/${p.id}`);
  };

  const handleDelete = (id: string) => {
    if (!confirm("确定删除此展示盒项目?")) return;
    deleteDisplayProject(id);
    refresh();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex flex-wrap items-center justify-between gap-3 py-5">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" />首页</Link>
            </Button>
            <BrandHeader subtitle="展示盒生成系统" />
            <AppTabs />
          </div>
          <Button asChild>
            <Link to="/display/editor"><Plus className="mr-1 h-4 w-4" />新建展示盒</Link>
          </Button>
        </div>
      </header>

      <main className="container py-8">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">最近项目</h2>
            <span className="text-xs text-muted-foreground">本地已保存 {projects.length} 个</span>
          </div>

          {projects.length === 0 ? (
            <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <BoxIcon className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">暂无展示盒项目。点击"新建展示盒"开始创建。</p>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <Card key={p.id} className="group flex flex-col p-4 transition hover:shadow-md">
                  <div className="mb-3">
                    <p className="truncate font-semibold">{p.title || "未命名"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.boxType === "folding" ? "折叠伞盒" : "直伞盒"} ·{" "}
                      {p.dimensions.l}×{p.dimensions.w}×{p.dimensions.h} cm ·{" "}
                      {p.variants.length} 个款式
                    </p>
                  </div>
                  <p className="mb-4 line-clamp-3 text-xs text-muted-foreground">{p.description}</p>
                  <div className="mt-auto flex gap-1">
                    <Button size="sm" variant="default" className="flex-1" asChild>
                      <Link to={`/display/editor/${p.id}`}>编辑</Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/display/batch/${p.id}`}>预览</Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDuplicate(p.id)} title="复制"><Copy className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)} title="删除"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
