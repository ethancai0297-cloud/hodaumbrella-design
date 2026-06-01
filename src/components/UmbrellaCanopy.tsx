import { ArtworkItem, RibCount, UmbrellaCategory } from "@/types/design";
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";

export interface InnerLayerProps {
  fabricColor: string;
  panelColors?: Record<number, string>;
  artwork: ArtworkItem[];
  selectedPanels?: number[];
}

interface Props {
  category: UmbrellaCategory;
  ribCount: RibCount;
  fabricColor: string;
  panelColors?: Record<number, string>;
  capColor?: string;
  artwork: ArtworkItem[];
  selectedPanels: number[];
  onPanelClick?: (panel: number) => void;
  onItemSelect?: (id: string) => void;
  onItemChange?: (id: string, patch: { x: number; y: number }) => void;
  highlightSelection?: boolean;
  size?: number;
  // Double-layer (golf)
  innerLayer?: InnerLayerProps;
  activeLayer?: "outer" | "inner";
  onInnerPanelClick?: (panel: number) => void;
  onInnerItemSelect?: (id: string) => void;
  onInnerItemChange?: (id: string, patch: { x: number; y: number }) => void;
  // Render variant for export (no vent, single layer)
  forceSingleLayer?: boolean;
}

function panelPath(
  index: number,
  count: number,
  outerR: number,
  centerR: number
) {
  const sliceAngle = (Math.PI * 2) / count;
  const ribA = -Math.PI / 2 + (index - 0.5) * sliceAngle;
  const ribB = ribA + sliceAngle;
  const x1 = Math.cos(ribA) * centerR;
  const y1 = Math.sin(ribA) * centerR;
  const x2 = Math.cos(ribA) * outerR;
  const y2 = Math.sin(ribA) * outerR;
  const x3 = Math.cos(ribB) * outerR;
  const y3 = Math.sin(ribB) * outerR;
  const x4 = Math.cos(ribB) * centerR;
  const y4 = Math.sin(ribB) * centerR;
  return `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4} Z`;
}

function panelCentroid(index: number, count: number, outerR: number, centerR: number) {
  const sliceAngle = (Math.PI * 2) / count;
  const mid = -Math.PI / 2 + index * sliceAngle;
  const r = (outerR + centerR) / 2;
  return { x: Math.cos(mid) * r, y: Math.sin(mid) * r, angle: (mid * 180) / Math.PI };
}

function polyPoints(count: number, r: number) {
  return Array.from({ length: count }, (_, i) => {
    const a = -Math.PI / 2 + (i - 0.5) * ((Math.PI * 2) / count);
    return `${Math.cos(a) * r},${Math.sin(a) * r}`;
  }).join(" ");
}

export const UmbrellaCanopy = forwardRef<SVGSVGElement, Props>(function UmbrellaCanopy(
  {
    category,
    ribCount,
    fabricColor,
    panelColors,
    capColor = "#111111",
    artwork,
    selectedPanels,
    onPanelClick,
    onItemSelect,
    onItemChange,
    highlightSelection = true,
    size = 560,
    innerLayer,
    activeLayer = "outer",
    onInnerPanelClick,
    onInnerItemSelect,
    onInnerItemChange,
    forceSingleLayer = false,
  },
  ref
) {
  const innerRef = useRef<SVGSVGElement>(null);
  useImperativeHandle(ref, () => innerRef.current as SVGSVGElement);

  const radius = category === "golf" ? 255 : category === "straight" ? 195 : 178;
  const centerR = radius * 0.022;
  const hasInner = !!innerLayer && !forceSingleLayer;
  // outer ring inner edge / inner canopy outer edge (with overlap so inner peeks through)
  const ventInnerR = radius * 0.7; // outer ring stops here
  const innerOuterR = radius * 0.78; // inner canopy extends to here

  const toSvgPoint = (clientX: number, clientY: number) => {
    const svg = innerRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const makeStartDrag =
    (changeCb?: (id: string, patch: { x: number; y: number }) => void, selectCb?: (id: string) => void, layerR = radius) =>
    (
      e: React.PointerEvent<SVGGElement>,
      item: ArtworkItem,
      mode: "full" | "panel",
      panelAngleDeg?: number,
      panelCenter?: { x: number; y: number },
      baseSize?: number
    ) => {
      if (!changeCb) return;
      e.stopPropagation();
      selectCb?.(item.id);
      const start = toSvgPoint(e.clientX, e.clientY);
      const startX = item.x;
      const startY = item.y;
      (e.target as Element).setPointerCapture?.(e.pointerId);
      const move = (ev: PointerEvent) => {
        const cur = toSvgPoint(ev.clientX, ev.clientY);
        let dx = cur.x - start.x;
        let dy = cur.y - start.y;
        if (mode === "full") {
          const a = (-item.rotation * Math.PI) / 180;
          const rx = dx * Math.cos(a) - dy * Math.sin(a);
          const ry = dx * Math.sin(a) + dy * Math.cos(a);
          changeCb(item.id, {
            x: Math.max(-1.5, Math.min(1.5, startX + rx / layerR)),
            y: Math.max(-1.5, Math.min(1.5, startY + ry / layerR)),
          });
        } else {
          const angle = ((panelAngleDeg || 0) * Math.PI) / 180;
          const a = -angle;
          const rx = dx * Math.cos(a) - dy * Math.sin(a);
          const ry = dx * Math.sin(a) + dy * Math.cos(a);
          const bs = baseSize || 1;
          changeCb(item.id, {
            x: Math.max(-2, Math.min(2, startX + rx / bs)),
            y: Math.max(-2, Math.min(2, startY + ry / bs)),
          });
        }
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };

  const startDragOuter = makeStartDrag(onItemChange, onItemSelect, radius);
  const startDragInner = makeStartDrag(onInnerItemChange, onInnerItemSelect, innerOuterR);

  const panels = useMemo(
    () => Array.from({ length: ribCount }, (_, i) => i),
    [ribCount]
  );

  const lightnessOf = (hex: string) => {
    const c = hex.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000;
  };
  const ribStrokeFor = (hex: string) =>
    lightnessOf(hex) > 160 ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.28)";

  const ribStroke = ribStrokeFor(fabricColor);

  // Render helper for a single layer (panels + artwork + rib lines + selection)
  const renderLayer = (opts: {
    keyPrefix: string;
    outerR: number;
    innerR: number;
    fabric: string;
    pColors?: Record<number, string>;
    art: ArtworkItem[];
    selPanels: number[];
    onClick?: (panel: number) => void;
    interactive: boolean;
    startDrag: ReturnType<typeof makeStartDrag>;
  }) => {
    const {
      keyPrefix,
      outerR,
      innerR,
      fabric,
      pColors,
      art,
      selPanels,
      onClick,
      interactive,
      startDrag,
    } = opts;
    const stroke = ribStrokeFor(fabric);
    const clipId = `${keyPrefix}-canopy-clip`;
    return (
      <g pointerEvents={interactive ? "auto" : "none"}>
        <defs>
          {panels.map((i) => (
            <clipPath id={`${keyPrefix}-panel-clip-${i}`} key={i}>
              <path d={panelPath(i, ribCount, outerR, innerR)} />
            </clipPath>
          ))}
          <clipPath id={clipId}>
            <polygon points={polyPoints(ribCount, outerR)} />
          </clipPath>
        </defs>
        {/* base polygon */}
        <polygon points={polyPoints(ribCount, outerR)} fill={fabric} />
        {/* panels */}
        {panels.map((i) => {
          const selected = selPanels.includes(i);
          const fill = pColors?.[i] || fabric;
          return (
            <path
              key={`${keyPrefix}-p-${i}`}
              d={panelPath(i, ribCount, outerR, innerR)}
              fill={fill}
              stroke={stroke}
              strokeWidth={1.2}
              className={onClick ? "cursor-pointer transition-opacity" : ""}
              onClick={() => onClick?.(i)}
              style={{
                opacity: highlightSelection && selPanels.length && !selected ? 0.92 : 1,
              }}
            />
          );
        })}
        {/* artwork */}
        {art.map((item) => {
          if (item.type !== "text" && item.printArea === "full-canopy" && item.src) {
            const fullSize = outerR * 2 * item.scale;
            return (
              <g key={`${keyPrefix}-${item.id}-full`} clipPath={`url(#${clipId})`}>
                <g
                  transform={`rotate(${item.rotation}) translate(${item.x * outerR} ${item.y * outerR})`}
                  onPointerDown={(e) => startDrag(e, item, "full")}
                  style={{ cursor: interactive ? "move" : undefined, touchAction: "none" }}
                >
                  <image
                    href={item.src}
                    x={-fullSize / 2}
                    y={-fullSize / 2}
                    width={fullSize}
                    height={fullSize}
                    preserveAspectRatio={
                      item.fitMode === "stretch"
                        ? "none"
                        : item.fitMode === "contain"
                        ? "xMidYMid meet"
                        : "xMidYMid slice"
                    }
                  />
                </g>
              </g>
            );
          }
          return item.panels.map((pIdx) => {
            const c = panelCentroid(pIdx, ribCount, outerR, innerR);
            const baseSize = outerR * 0.5 * item.scale;
            return (
              <g key={`${keyPrefix}-${item.id}-${pIdx}`} clipPath={`url(#${keyPrefix}-panel-clip-${pIdx})`}>
                <g
                  transform={`translate(${c.x} ${c.y}) rotate(${c.angle + 90 + item.rotation}) translate(${item.x * baseSize} ${item.y * baseSize})`}
                  onPointerDown={(e) => startDrag(e, item, "panel", c.angle + 90 + item.rotation, c, baseSize)}
                  style={{ cursor: interactive ? "move" : undefined, touchAction: "none" }}
                >
                  {item.type === "text" && item.text ? (
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontFamily={item.fontFamily || "Inter, sans-serif"}
                      fontSize={(item.fontSize || 18) * item.scale}
                      fontWeight={700}
                      fill={item.color || "#ffffff"}
                    >
                      {item.text}
                    </text>
                  ) : item.src ? (
                    <image
                      href={item.src}
                      x={-baseSize / 2}
                      y={-baseSize / 2}
                      width={baseSize}
                      height={baseSize}
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
              </g>
            );
          });
        })}
        {/* rib lines */}
        {panels.map((i) => {
          const sliceAngle = (Math.PI * 2) / ribCount;
          const a = -Math.PI / 2 + i * sliceAngle - sliceAngle / 2;
          return (
            <line
              key={`${keyPrefix}-rib-${i}`}
              x1={Math.cos(a) * innerR}
              y1={Math.sin(a) * innerR}
              x2={Math.cos(a) * outerR}
              y2={Math.sin(a) * outerR}
              stroke={stroke}
              strokeWidth={1.5}
            />
          );
        })}
        {/* selection overlay */}
        {highlightSelection &&
          selPanels.map((i) => (
            <path
              key={`${keyPrefix}-sel-${i}`}
              d={panelPath(i, ribCount, outerR, innerR)}
              fill="none"
              stroke="hsl(214 95% 55%)"
              strokeWidth={3}
              strokeDasharray="6 4"
              pointerEvents="none"
            />
          ))}
        {/* outline */}
        <polygon
          points={polyPoints(ribCount, outerR)}
          fill="none"
          stroke={stroke}
          strokeWidth={1.5}
          pointerEvents="none"
        />
      </g>
    );
  };

  return (
    <svg
      ref={innerRef}
      viewBox={`-300 -300 600 600`}
      width={size}
      height={size}
      className="select-none"
      style={{ filter: "drop-shadow(0 24px 40px rgba(15,31,61,0.18))" }}
    >
      {hasInner ? (
        <>
          {/* Inner layer (drawn first, sits under the outer ring) */}
          {renderLayer({
            keyPrefix: "inner",
            outerR: innerOuterR,
            innerR: centerR,
            fabric: innerLayer!.fabricColor,
            pColors: innerLayer!.panelColors,
            art: innerLayer!.artwork,
            selPanels: innerLayer!.selectedPanels || [],
            onClick: activeLayer === "inner" ? onInnerPanelClick : undefined,
            interactive: activeLayer === "inner",
            startDrag: startDragInner,
          })}
          {/* Outer layer rendered as a ring: panels span from ventInnerR to radius */}
          {renderLayer({
            keyPrefix: "outer",
            outerR: radius,
            innerR: ventInnerR,
            fabric: fabricColor,
            pColors: panelColors,
            art: artwork,
            selPanels: selectedPanels,
            onClick: activeLayer === "outer" ? onPanelClick : undefined,
            interactive: activeLayer === "outer",
            startDrag: startDragOuter,
          })}
        </>
      ) : (
        renderLayer({
          keyPrefix: "outer",
          outerR: radius,
          innerR: centerR,
          fabric: fabricColor,
          pColors: panelColors,
          art: artwork,
          selPanels: selectedPanels,
          onClick: onPanelClick,
          interactive: true,
          startDrag: startDragOuter,
        })
      )}

      {/* center cap — hidden when any image/logo artwork is present on the relevant top layer */}
      {(() => {
        const topArt = hasInner ? innerLayer!.artwork : artwork;
        const hasImg = topArt.some((a) => (a.type === "image" || a.type === "logo") && a.src);
        if (hasImg) return null;
        return <circle r={centerR + 2} fill={capColor} />;
      })()}
    </svg>
  );
});
