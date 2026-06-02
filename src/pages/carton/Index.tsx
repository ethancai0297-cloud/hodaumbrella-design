import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, FileText, Copy, Trash2, ArrowLeft } from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";
import { AppTabs } from "@/components/AppTabs";
import { ShippingMarkProject } from "@/types/shippingMark";
import { deleteProject, duplicateProject, loadProjects } from "@/lib/markStorage";

export default function CartonIndex() {
  const [projects, setProjects] = useState<ShippingMarkProject[]>([]);
  const navigate = useNavigate();

  const refresh = () => setProjects(loadProjects());
  useEffect(() => { refresh(); }, []);

  const handleDuplicate = (id: string) => {
    const p = duplicateProject(id);
    if (p) navigate(`/carton/editor/${p.id}`);
  };

  const handleDelete = (id: string) => {
    if (!confirm("确定删除此项目?")) return;
    deleteProject(id);
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
            <BrandHeader subtitle="唛头生成系统" />
            <AppTabs />
          </div>
          <Button asChild>
            <Link to="/carton/editor"><Plus className="mr-1 h-4 w-4" />新建唛头</Link>
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
              <FileText className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">暂无项目。点击"新建唛头"开始创建。</p>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <Card key={p.id} className="group flex flex-col p-4 transition hover:shadow-md">
                  <div className="mb-3">
                    <p className="truncate font-semibold">{p.title || "未命名"}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.variants.length} 个款式 · 更新于 {new Date(p.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <p className="mb-4 line-clamp-3 text-xs text-muted-foreground">{p.description}</p>
                  <div className="mt-auto flex gap-1">
                    <Button size="sm" variant="default" className="flex-1" asChild>
                      <Link to={`/carton/editor/${p.id}`}>编辑</Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/carton/batch/${p.id}`}>预览</Link>
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
