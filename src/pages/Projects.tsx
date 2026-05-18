import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DesignProject } from "@/types/design";
import { deleteProject, loadProjects } from "@/lib/storage";
import { ArrowLeft, Trash2, Pencil, Plus } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/i18n/i18n";

const Projects = () => {
  const { t } = useI18n();
  const [projects, setProjects] = useState<DesignProject[]>([]);
  useEffect(() => setProjects(loadProjects().sort((a, b) => b.updatedAt - a.updatedAt)), []);

  const handleDelete = (id: string) => {
    if (!confirm(t("proj.deleteConfirm"))) return;
    deleteProject(id);
    setProjects((p) => p.filter((x) => x.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border bg-card">
        <div className="container h-14 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm">
            <ArrowLeft className="h-4 w-4" /> {t("nav.home")}
          </Link>
          <h1 className="font-display font-bold ml-2">{t("proj.title")}</h1>
          <div className="ml-auto flex items-center gap-3">
            <LanguageToggle />
            <Link to="/design">
              <Button size="sm" className="bg-gradient-hero"><Plus className="h-4 w-4 mr-1" /> {t("proj.new")}</Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="container py-10">
        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center">
            <p className="text-muted-foreground">{t("proj.empty")}</p>
            <Link to="/design"><Button className="mt-4 bg-gradient-hero">{t("proj.createFirst")}</Button></Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-5 shadow-soft">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display font-semibold">{p.projectName}</h3>
                    {p.customerName && <p className="text-xs text-muted-foreground">{p.customerName}</p>}
                  </div>
                  <div
                    className="h-8 w-8 rounded-full border border-border"
                    style={{ background: p.fabricColor }}
                  />
                </div>
                <dl className="mt-4 text-xs space-y-1 text-muted-foreground">
                  <div className="flex justify-between"><dt>{t("proj.category")}</dt><dd className="text-foreground">{t(`cat.${p.umbrellaCategory}`)}</dd></div>
                  <div className="flex justify-between"><dt>{t("proj.ribs")}</dt><dd className="text-foreground">{p.ribCount}</dd></div>
                  <div className="flex justify-between"><dt>{t("proj.method")}</dt><dd className="text-foreground">{t(`method.${p.printingMethod}`)}</dd></div>
                  <div className="flex justify-between"><dt>{t("proj.artwork")}</dt><dd className="text-foreground">{p.artworkItems.length} {t("proj.items")}</dd></div>
                </dl>
                <div className="mt-4 flex gap-2">
                  <Link to={`/design/${p.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full"><Pencil className="h-3.5 w-3.5 mr-1" /> {t("proj.open")}</Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">{t("proj.updated")} {new Date(p.updatedAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Projects;
