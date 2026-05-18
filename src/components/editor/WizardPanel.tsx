import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { UmbrellaCategory, RibCount, PrintingMethod } from "@/types/design";

interface Props {
  category: UmbrellaCategory;
  ribCount: RibCount;
  method: PrintingMethod;
  onCategory: (v: UmbrellaCategory) => void;
  onRibs: (v: RibCount) => void;
  onMethod: (v: PrintingMethod) => void;
}

const cats: { id: UmbrellaCategory; label: string; desc: string }[] = [
  { id: "folding", label: "Folding", desc: "Compact, travel" },
  { id: "straight", label: "Straight", desc: "Classic stick" },
  { id: "golf", label: "Golf", desc: "Oversized canopy" },
];

const ribs: RibCount[] = [6, 8, 10];

export function WizardPanel({ category, ribCount, method, onCategory, onRibs, onMethod }: Props) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">1. Umbrella category</h3>
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
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">2. Rib / panel count</h3>
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
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">3. Printing method</h3>
        <div className="grid gap-2">
          <button
            onClick={() => onMethod("silkscreen")}
            className={cn(
              "rounded-lg border px-3 py-3 text-left transition",
              method === "silkscreen" ? "border-primary bg-accent" : "border-border bg-card hover:border-primary/40"
            )}
          >
            <div className="font-display font-semibold text-sm">Silkscreen</div>
            <div className="text-[11px] text-muted-foreground">Logos / text on selected panels (1, 2, 4 or 8).</div>
          </button>
          <button
            onClick={() => onMethod("digital")}
            className={cn(
              "rounded-lg border px-3 py-3 text-left transition",
              method === "digital" ? "border-primary bg-accent" : "border-border bg-card hover:border-primary/40"
            )}
          >
            <div className="font-display font-semibold text-sm">Digital print</div>
            <div className="text-[11px] text-muted-foreground">Full image — single panel or full canopy cover.</div>
          </button>
        </div>
      </section>
    </div>
  );
}
