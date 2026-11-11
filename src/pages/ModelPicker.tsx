import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/i18n/i18n";
import { listModels } from "@/3d/models/registry";
import type { UmbrellaCategory } from "@/types/design";

/** Order and copy of the umbrella types offered on the picker. */
const CARDS: { category: UmbrellaCategory; image: string }[] = [
  { category: "folding", image: "/picker/folding.png" },
  { category: "straight", image: "/picker/straight.png" },
  { category: "golf", image: "/picker/golf.png" },
];

/**
 * Step 1 of a new design: pick the umbrella type, then go straight to the
 * 3D editor. Only types that have a 3D model are offered.
 */
const ModelPicker = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const cards = CARDS.filter((c) => listModels().some((m) => m.category === c.category));

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border bg-card">
        <div className="container h-14 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm">
            <ArrowLeft className="h-4 w-4" /> {t("nav.home")}
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <Link to="/projects" className="text-sm text-muted-foreground hover:text-foreground">
              {t("nav.projects")}
            </Link>
            <LanguageToggle />
          </div>
        </div>
      </header>
      <main className="container max-w-6xl py-12">
        <p className="text-sm font-semibold tracking-wider text-primary uppercase">{t("picker.step")}</p>
        <h1 className="font-display text-3xl md:text-4xl font-bold mt-2">{t("picker.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("picker.desc")}</p>
        <div className="grid gap-6 mt-10 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ category, image }) => (
            <button
              key={category}
              onClick={() => navigate(`/design?model=${category}`)}
              className="group text-left rounded-2xl border border-border bg-card shadow-soft hover:shadow-elegant hover:border-primary transition overflow-hidden"
            >
              <div className="h-56 bg-gradient-to-b from-muted/40 to-card flex items-center justify-center p-4">
                <img src={image} alt="" className="max-h-full max-w-full object-contain transition group-hover:scale-105" />
              </div>
              <div className="p-6">
                <div className="font-display text-xl font-semibold">{t(`picker.${category}.title`)}</div>
                <div className="text-sm text-muted-foreground mt-1">{t(`picker.${category}.sub`)}</div>
                <div className="flex flex-wrap gap-2 mt-4 text-xs">
                  {t(`picker.${category}.chips`)
                    .split("|")
                    .map((c) => (
                      <span key={c} className="px-2.5 py-1 rounded-full bg-muted">
                        {c}
                      </span>
                    ))}
                </div>
                <Button asChild className="mt-6 w-full bg-gradient-hero pointer-events-none">
                  <span>
                    {t("picker.start")} <ArrowRight className="ml-1 h-4 w-4" />
                  </span>
                </Button>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ModelPicker;
