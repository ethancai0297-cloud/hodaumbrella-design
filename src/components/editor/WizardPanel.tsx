import { cn } from "@/lib/utils";
import { UmbrellaCategory, RibCount, PrintingMethod } from "@/types/design";
import { useI18n } from "@/i18n/i18n";

interface Props {
  category: UmbrellaCategory;
  ribCount: RibCount;
  method: PrintingMethod;
  hasPouch: boolean;
  onCategory: (v: UmbrellaCategory) => void;
  onRibs: (v: RibCount) => void;
  onMethod: (v: PrintingMethod) => void;
  onHasPouch: (v: boolean) => void;
}

const ribs: RibCount[] = [6, 8, 10];

export function WizardPanel({ category, ribCount, method, hasPouch, onCategory, onRibs, onMethod, onHasPouch }: Props) {
  const { t } = useI18n();
  const cats: { id: UmbrellaCategory; label: string; desc: string }[] = [
    { id: "folding", label: t("wiz.folding"), desc: t("wiz.folding.desc") },
    { id: "straight", label: t("wiz.straight"), desc: t("wiz.straight.desc") },
    { id: "golf", label: t("wiz.golf"), desc: t("wiz.golf.desc") },
  ];

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t("wiz.category")}</h3>
        <div className="grid grid-cols-3 gap-2">
          {cats.map((c) => (
            <button
              key={c.id}
              onClick={() => onCategory(c.id)}
              className={cn(
                "rounded-lg border px-3 py-3 text-left transition",
                category === c.id
                  ? "border-primary bg-accent shadow-soft"
                  : "border-border bg-card hover:border-primary/40"
              )}
            >
              <div className="font-display font-semibold text-sm">{c.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{c.desc}</div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t("wiz.ribs")}</h3>
        <div className="grid grid-cols-3 gap-2">
          {ribs.map((r) => (
            <button
              key={r}
              onClick={() => onRibs(r)}
              className={cn(
                "rounded-lg border px-3 py-3 transition font-display font-bold text-lg",
                ribCount === r
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/40"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t("wiz.method")}</h3>
        <div className="grid gap-2">
          <button
            onClick={() => onMethod("silkscreen")}
            className={cn(
              "rounded-lg border px-3 py-3 text-left transition",
              method === "silkscreen" ? "border-primary bg-accent" : "border-border bg-card hover:border-primary/40"
            )}
          >
            <div className="font-display font-semibold text-sm">{t("wiz.silkscreen")}</div>
            <div className="text-[11px] text-muted-foreground">{t("wiz.silkscreen.desc")}</div>
          </button>
          <button
            onClick={() => onMethod("digital")}
            className={cn(
              "rounded-lg border px-3 py-3 text-left transition",
              method === "digital" ? "border-primary bg-accent" : "border-border bg-card hover:border-primary/40"
            )}
          >
            <div className="font-display font-semibold text-sm">{t("wiz.digital")}</div>
            <div className="text-[11px] text-muted-foreground">{t("wiz.digital.desc")}</div>
          </button>
        </div>
      </section>
    </div>
  );
}
