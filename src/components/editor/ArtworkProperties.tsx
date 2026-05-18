import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ArtworkItem, FitMode, PrintingMethod } from "@/types/design";
import { Crop, RotateCw, Trash2, Copy, Maximize, ImageIcon, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/i18n";

interface Props {
  method: PrintingMethod;
  items: ArtworkItem[];
  selectedItemId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<ArtworkItem>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onCenter: (id: string) => void;
  selectedPanels: number[];
  ribCount: number;
}

export function ArtworkProperties({
  method,
  items,
  selectedItemId,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  onCenter,
  selectedPanels,
  ribCount,
}: Props) {
  const { t } = useI18n();
  const item = items.find((i) => i.id === selectedItemId);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t("art.title")}</h3>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("art.empty")}</p>
        ) : (
          <ul className="space-y-1">
            {items.map((it) => (
              <li key={it.id}>
                <button
                  onClick={() => onSelect(it.id)}
                  className={cn(
                    "w-full text-left rounded-md px-2 py-2 text-xs flex items-center gap-2 border transition",
                    selectedItemId === it.id ? "border-primary bg-accent" : "border-border bg-card hover:bg-muted"
                  )}
                >
                  {it.type === "text" ? <Type className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                  <span className="truncate">
                    {it.type === "text" ? `"${it.text || t("art.text")}"` : it.fileName || "Image"}
                  </span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{it.panels.length}p</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {item && (
        <div className="space-y-4 border-t border-border pt-4">
          {item.type === "text" && (
            <>
              <div>
                <Label className="text-xs">{t("art.text")}</Label>
                <Input
                  value={item.text || ""}
                  onChange={(e) => onUpdate(item.id, { text: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">{t("art.fontSize")}</Label>
                  <Input
                    type="number"
                    value={item.fontSize || 18}
                    onChange={(e) => onUpdate(item.id, { fontSize: Number(e.target.value) })}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("art.color")}</Label>
                  <Input
                    type="color"
                    value={item.color || "#ffffff"}
                    onChange={(e) => onUpdate(item.id, { color: e.target.value })}
                    className="h-9 p-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">{t("art.fontFamily")}</Label>
                <select
                  value={item.fontFamily || "Inter, sans-serif"}
                  onChange={(e) => onUpdate(item.id, { fontFamily: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="Inter, sans-serif">Inter</option>
                  <option value="'Plus Jakarta Sans', sans-serif">Plus Jakarta</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="'Courier New', monospace">Courier</option>
                  <option value="Impact, sans-serif">Impact</option>
                </select>
              </div>
            </>
          )}

          {item.type !== "text" && method === "digital" && (
            <>
              <div>
                <Label className="text-xs">{t("art.printMode")}</Label>
                <div className="grid grid-cols-2 gap-1 mt-1">
                  {([
                    { v: "full-canopy", label: t("art.mode.fullCanopy") },
                    { v: "single", label: t("art.mode.perPanel") },
                  ] as { v: "full-canopy" | "single"; label: string }[]).map((m) => {
                    const active =
                      (m.v === "full-canopy" && item.printArea === "full-canopy") ||
                      (m.v === "single" && item.printArea !== "full-canopy");
                    return (
                      <button
                        key={m.v}
                        onClick={() =>
                          onUpdate(item.id, {
                            printArea: m.v,
                            panels:
                              m.v === "full-canopy"
                                ? Array.from({ length: ribCount }, (_, i) => i)
                                : item.panels,
                          })
                        }
                        className={cn(
                          "rounded-md border px-2 py-1.5 text-xs transition text-left",
                          active ? "border-primary bg-accent" : "border-border bg-card hover:bg-muted"
                        )}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {item.printArea === "full-canopy" ? t("art.mode.fullCanopyDesc") : t("art.mode.perPanelDesc")}
                </p>
              </div>
              <div>
                <Label className="text-xs">{t("art.fit")}</Label>
                <div className="grid grid-cols-3 gap-1 mt-1">
                  {(["cover", "contain", "stretch"] as FitMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => onUpdate(item.id, { fitMode: m })}
                      className={cn(
                        "rounded-md border px-2 py-1.5 text-xs capitalize transition",
                        item.fitMode === m ? "border-primary bg-accent" : "border-border bg-card hover:bg-muted"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <Label className="text-xs flex justify-between"><span>{t("art.scale")}</span><span className="text-muted-foreground">{item.scale.toFixed(2)}</span></Label>
            <Slider value={[item.scale]} min={0.2} max={3} step={0.05} onValueChange={(v) => onUpdate(item.id, { scale: v[0] })} />
          </div>
          <div>
            <Label className="text-xs flex justify-between"><span>{t("art.rotation")}</span><span className="text-muted-foreground">{Math.round(item.rotation)}°</span></Label>
            <Slider value={[item.rotation]} min={-180} max={180} step={1} onValueChange={(v) => onUpdate(item.id, { rotation: v[0] })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">{t("art.offsetX")}</Label>
              <Slider value={[item.x]} min={-1} max={1} step={0.02} onValueChange={(v) => onUpdate(item.id, { x: v[0] })} />
            </div>
            <div>
              <Label className="text-xs">{t("art.offsetY")}</Label>
              <Slider value={[item.y]} min={-1} max={1} step={0.02} onValueChange={(v) => onUpdate(item.id, { y: v[0] })} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onCenter(item.id)}>
              <Maximize className="h-3.5 w-3.5 mr-1" /> {t("art.center")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdate(item.id, { panels: selectedPanels.length ? selectedPanels : item.panels })}
            >
              <Crop className="h-3.5 w-3.5 mr-1" /> {t("art.applySel")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => onDuplicate(item.id)}>
              <Copy className="h-3.5 w-3.5 mr-1" /> {t("art.duplicate")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => onUpdate(item.id, { rotation: 0 })}>
              <RotateCw className="h-3.5 w-3.5 mr-1" /> {t("art.resetRot")}
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onDelete(item.id)} className="ml-auto">
              <Trash2 className="h-3.5 w-3.5 mr-1" /> {t("art.delete")}
            </Button>
          </div>

          <div className="text-[11px] text-muted-foreground border-t border-border pt-3">
            {t("art.onPanels")}: {item.panels.length ? item.panels.map((p) => p + 1).join(", ") : "—"} {t("art.of")} {ribCount}
          </div>
        </div>
      )}
    </div>
  );
}
