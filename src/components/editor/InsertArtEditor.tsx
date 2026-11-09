import { useEffect, useRef, useState } from "react";
import type { HandleInsertOptions } from "@/types/design";
import { INSERT_FRAME, drawInsertArt, loadImage } from "@/3d/handleInsert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/i18n";

/**
 * Small editor for the BSS-ST-1 insert artwork. Shows the 15 × 70 mm plate
 * lying horizontally (canopy end on the left, as in the PDF's horizontal view).
 * Drag the artwork to move it; sliders set size and rotation.
 */
export function InsertArtEditor({
  value,
  onChange,
}: {
  value: HandleInsertOptions;
  onChange: (patch: Partial<HandleInsertOptions>) => void;
}) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const drag = useRef<{ id: number; x: number; y: number; ax: number; ay: number } | null>(null);

  useEffect(() => {
    let alive = true;
    if (!value.logoSrc) {
      setLogo(null);
      return;
    }
    loadImage(value.logoSrc).then(
      (img) => alive && setLogo(img),
      () => alive && setLogo(null)
    );
    return () => {
      alive = false;
    };
  }, [value.logoSrc]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = INSERT_FRAME.w / 2;
    c.height = INSERT_FRAME.h / 2;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
    drawInsertArt(ctx, value, logo);
  }, [value, logo]);

  const clamp = (v: number) => Math.max(-0.5, Math.min(0.5, v));
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, ax: value.artX ?? 0, ay: value.artY ?? 0 };
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const r = e.currentTarget.getBoundingClientRect();
    onChange({
      artX: clamp(d.ax + (e.clientX - d.x) / r.width),
      artY: clamp(d.ay + (e.clientY - d.y) / r.height),
    });
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };

  const scale = value.artScale ?? value.logoScale ?? 0.6;
  const rotation = value.artRotation ?? 0;

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs mb-1.5 block">{t("insert.text")}</Label>
        <div className="flex items-center gap-2">
          <Input
            value={value.text ?? ""}
            maxLength={24}
            placeholder={t("insert.textPlaceholder")}
            onChange={(e) => onChange({ text: e.target.value })}
            className="h-9 text-xs"
          />
          <Input
            type="color"
            aria-label={t("insert.textColor")}
            title={t("insert.textColor")}
            value={value.textColor ?? "#ffffff"}
            onChange={(e) => onChange({ textColor: e.target.value })}
            className="h-9 w-12 p-1 shrink-0"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="text-xs">{t("insert.layout")}</Label>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={() => onChange({ artX: 0, artY: 0, artRotation: 0 })}
          >
            {t("insert.center")}
          </Button>
        </div>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={t("insert.layoutHint")}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="w-full rounded-md border border-border cursor-move touch-none"
          style={{ aspectRatio: `${INSERT_FRAME.w} / ${INSERT_FRAME.h}` }}
        />
        <p className="text-[11px] text-muted-foreground mt-1">{t("insert.layoutHint")}</p>
      </div>

      <div>
        <Label className="text-xs mb-1 block">
          {t("insert.logoSize")} · {Math.round(scale * 100)}%
        </Label>
        <input
          type="range"
          min={0.2}
          max={1.6}
          step={0.05}
          value={scale}
          onChange={(e) => onChange({ artScale: parseFloat(e.target.value) })}
          className="w-full"
        />
      </div>
      <div>
        <Label className="text-xs mb-1 block">
          {t("insert.rotation")} · {Math.round(rotation)}°
        </Label>
        <input
          type="range"
          min={-180}
          max={180}
          step={5}
          value={rotation}
          onChange={(e) => onChange({ artRotation: parseFloat(e.target.value) })}
          className="w-full"
        />
      </div>
    </div>
  );
}
