import { cn } from "@/lib/utils";
import { UmbrellaCategory, RibCount, PrintingMethod, DoubleLayerStyle } from "@/types/design";
import { useI18n } from "@/i18n/i18n";

interface Props {
  category: UmbrellaCategory;
  ribCount: RibCount;
  method: PrintingMethod;
  hasPouch: boolean;
  hasDoubleLayer: boolean;
  doubleLayerStyle: DoubleLayerStyle;
  onCategory: (v: UmbrellaCategory) => void;
  onRibs: (v: RibCount) => void;
  onMethod: (v: PrintingMethod) => void;
  onHasPouch: (v: boolean) => void;
  onHasDoubleLayer: (v: boolean) => void;
  onDoubleLayerStyle: (v: DoubleLayerStyle) => void;
  /** Sections to show (default: all). */
  only?: ("category" | "ribs" | "method" | "extras")[];
}

const ribs: RibCount[] = [6, 7, 8, 10];

export function WizardPanel({
  category,
  ribCount,
  method,
  hasPouch,
  hasDoubleLayer,
  doubleLayerStyle,
  onCategory,
  onRibs,
  onMethod,
  onHasPouch,
  onHasDoubleLayer,
  onDoubleLayerStyle,
  only,
}: Props) {
  const show = (s: "category" | "ribs" | "method" | "extras") => !only || only.includes(s);
  const { t } = useI18n();
  const cats: { id: UmbrellaCategory; label: string; desc: string }[] = [
    { id: "folding", label: t("wiz.folding"), desc: t("wiz.folding.desc") },
    { id: "straight", label: t("wiz.straight"), desc: t("wiz.straight.desc") },
    { id: "golf", label: t("wiz.golf"), desc: t("wiz.golf.desc") },
  ];

  const Toggle = ({
    on,
    onClick,
    title,
    desc,
  }: {
    on: boolean;
    onClick: () => void;
    title: string;
    desc: string;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border px-3 py-3 text-left transition flex items-center gap-3",
        on ? "border-primary bg-accent" : "border-border bg-card hover:border-primary/40"
      )}
    >
      <div className={cn("h-5 w-9 rounded-full relative transition", on ? "bg-primary" : "bg-muted")}>
        <div
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-card shadow-soft transition",
            on ? "left-[18px]" : "left-0.5"
          )}
        />
      </div>
      <div className="flex-1">
        <div className="font-display font-semibold text-sm">{title}</div>
        <div className="text-[11px] text-muted-foreground">{desc}</div>
      </div>
    </button>
  );

  return (
    <div className="space-y-6">
      {show("category") && (
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
      )}

      {show("ribs") && (
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t("wiz.ribs")}</h3>
        <div className="grid grid-cols-4 gap-2">
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
      )}

      {show("method") && (
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
          <button
            onClick={() => onMethod("color-change")}
            className={cn(
              "rounded-lg border px-3 py-3 text-left transition",
              method === "color-change" ? "border-primary bg-accent" : "border-border bg-card hover:border-primary/40"
            )}
          >
            <div className="font-display font-semibold text-sm">{t("wiz.colorChange")}</div>
            <div className="text-[11px] text-muted-foreground">{t("wiz.colorChange.desc")}</div>
          </button>
        </div>
      </section>
      )}

      {show("extras") && (
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t("wiz.pouch")}</h3>
        <Toggle
          on={hasPouch}
          onClick={() => onHasPouch(!hasPouch)}
          title={t("wiz.pouch.add")}
          desc={t("wiz.pouch.desc")}
        />
      </section>
      )}
    </div>
  );
}
