import { ArtworkItem, POUCH_SIZE_CM, PouchView, UmbrellaCategory } from "@/types/design";
import { forwardRef, useImperativeHandle, useRef } from "react";

interface Props {
  category: UmbrellaCategory;
  view: PouchView;
  fabricColor: string;
  artwork: ArtworkItem[];
  onItemSelect?: (id: string) => void;
  onItemChange?: (id: string, patch: { x: number; y: number }) => void;
  size?: number; // rendered height in px
}

// Render the pouch as a dashed-bordered rectangle. In "spread" view, width is
// 2× the front-face width with a center fold line. Artwork x/y are in -1..1
// within the active face (front face). In spread view items are mirrored on
// both halves for preview.
export const PouchCanvas = forwardRef<SVGSVGElement, Props>(function PouchCanvas(
  { category, view, fabricColor, artwork, onItemSelect, onItemChange, size = 520 },
  ref
) {
  const innerRef = useRef<SVGSVGElement>(null);
  useImperativeHandle(ref, () => innerRef.current as SVGSVGElement);

  const cm = POUCH_SIZE_CM[category];
  // 10 svg units per cm for a generous viewBox
  const SCALE = 10;
  const faceW = cm.w * SCALE;
  const faceH = cm.h * SCALE;
  const totalW = view === "spread" ? faceW * 2 : faceW;
  const totalH = faceH;
  const pad = 40;
  const vbW = totalW + pad * 2;
  const vbH = totalH + pad * 2;
  const aspect = vbW / vbH;
  const height = size;
  const width = size * aspect;

  const toSvgPoint = (clientX: number, clientY: number) => {
    const svg = innerRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    return pt.matrixTransform(ctm.inverse());
  };

  const startDrag = (e: React.PointerEvent<SVGGElement>, item: ArtworkItem) => {
    if (!onItemChange) return;
    e.stopPropagation();
    onItemSelect?.(item.id);
    const start = toSvgPoint(e.clientX, e.clientY);
    const startX = item.x;
    const startY = item.y;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const move = (ev: PointerEvent) => {
      const cur = toSvgPoint(ev.clientX, ev.clientY);
      const dx = cur.x - start.x;
      const dy = cur.y - start.y;
      // Drag is relative to face. x normalized by faceW/2, y by faceH/2.
      onItemChange(item.id, {
        x: Math.max(-1.2, Math.min(1.2, startX + dx / (faceW / 2))),
        y: Math.max(-1.2, Math.min(1.2, startY + dy / (faceH / 2))),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const renderArtwork = (faceOffsetX: number) => {
    const baseSize = Math.min(faceW, faceH);
    return artwork.map((item) => {
      const cx = faceOffsetX + (item.x * faceW) / 2;
      const cy = (item.y * faceH) / 2;
      const s = baseSize * 0.6 * item.scale;
      return (
        <g
          key={`${item.id}-${faceOffsetX}`}
          transform={`translate(${cx} ${cy}) rotate(${item.rotation})`}
          onPointerDown={(e) => startDrag(e, item)}
          style={{ cursor: onItemChange ? "move" : undefined, touchAction: "none" }}
        >
          {item.type === "text" && item.text ? (
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily={item.fontFamily || "Inter, sans-serif"}
              fontSize={(item.fontSize || 18) * item.scale * 1.2}
              fontWeight={700}
              fill={item.color || "#ffffff"}
            >
              {item.text}
            </text>
          ) : item.src ? (
            <image
              href={item.src}
              x={-s / 2}
              y={-s / 2}
              width={s}
              height={s}
              preserveAspectRatio={
                item.fitMode === "stretch"
                  ? "none"
                  : item.fitMode === "cover"
                  ? "xMidYMid slice"
                  : "xMidYMid meet"
              }
            />
          ) : null}
        </g>
      );
    });
  };

  // Center the pouch in the viewBox; coordinate origin at pouch top-left.
  const ox = -totalW / 2;
  const oy = -totalH / 2;

  return (
    <svg
      ref={innerRef}
      viewBox={`${-vbW / 2} ${-vbH / 2} ${vbW} ${vbH}`}
      width={width}
      height={height}
      className="select-none"
      style={{ filter: "drop-shadow(0 18px 30px rgba(15,31,61,0.15))" }}
    >
      {/* fabric fill */}
      <rect x={ox} y={oy} width={totalW} height={totalH} fill={fabricColor} rx={6} />

      {/* clip to pouch */}
      <defs>
        <clipPath id="pouch-clip">
          <rect x={ox} y={oy} width={totalW} height={totalH} rx={6} />
        </clipPath>
      </defs>

      <g clipPath="url(#pouch-clip)">
        {view === "spread" ? (
          <>
            {/* front face on left half */}
            {renderArtwork(ox + faceW / 2)}
            {/* mirrored back face on right half */}
            {renderArtwork(ox + faceW + faceW / 2)}
          </>
        ) : (
          renderArtwork(0)
        )}
      </g>

      {/* dashed outline */}
      <rect
        x={ox}
        y={oy}
        width={totalW}
        height={totalH}
        rx={6}
        fill="none"
        stroke="hsl(214 30% 35%)"
        strokeWidth={2}
        strokeDasharray="8 6"
      />

      {/* fold line for spread view */}
      {view === "spread" && (
        <line
          x1={0}
          y1={oy + 8}
          x2={0}
          y2={oy + totalH - 8}
          stroke="hsl(214 20% 55%)"
          strokeWidth={1.2}
          strokeDasharray="4 4"
        />
      )}

      {/* top flap hint line (subtle) */}
      <line
        x1={ox + 6}
        y1={oy + totalH * 0.18}
        x2={ox + totalW - 6}
        y2={oy + totalH * 0.18}
        stroke="hsl(214 20% 60%)"
        strokeWidth={1}
        strokeDasharray="3 4"
        opacity={0.6}
      />

      {/* size label */}
      <text
        x={0}
        y={oy + totalH + 26}
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontSize={12}
        fill="hsl(214 20% 40%)"
      >
        {view === "spread"
          ? `${(cm.w * 2).toFixed(1)} × ${cm.h} cm (spread)`
          : `${cm.w} × ${cm.h} cm (front)`}
      </text>
    </svg>
  );
});
