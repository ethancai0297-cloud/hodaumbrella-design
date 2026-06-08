import { ArtworkItem, DoubleLayerStyle, RibCount, UmbrellaCategory } from "@/types/design";
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
  doubleLayerStyle?: DoubleLayerStyle;
  activeLayer?: "outer" | "inner";
  onInnerPanelClick?: (panel: number) => void;
  onInnerItemSelect?: (id: string) => void;
  onInnerItemChange?: (id: string, patch: { x: number; y: number }) => void;
  // Render variant for export (no vent, single layer)
  forceSingleLayer?: boolean;
  // Color-changing silkscreen preview: when true, all artwork renders as white silhouettes.
  dryMode?: boolean;
  // Fires when the cursor enters/leaves any artwork item (used for hover-triggered color reveal).
  onArtworkHoverChange?: (hovered: boolean) => void;
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
    doubleLayerStyle = "vented",
    activeLayer = "outer",
    onInnerPanelClick,
    onInnerItemSelect,
    onInnerItemChange,
    forceSingleLayer = false,
    dryMode = false,
    onArtworkHoverChange,
  },
  ref
) {
  const innerRef = useRef<SVGSVGElement>(null);
  useImperativeHandle(ref, () => innerRef.current as SVGSVGElement);

  const radius = category === "golf" ? 255 : category === "straight" ? 195 : 178;
  const centerR = radius * 0.022;
  const hasInner = !!innerLayer && !forceSingleLayer;

  // Vented mode: outer full canopy with central vent hole; inner is a small cap on top.
  const ventHoleR = radius * 0.32; // hole punched in outer canopy
  const innerCapR = radius * 0.5; // cap radius — 50% of canopy for a clear tiered vented look

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

  // Render helper for a single layer (panels + artwork + rib lines + selection)
  const renderLayer = (opts: {
    keyPrefix: string;
    outerR: number;
    innerR: number;
    ventHoleR?: number;
    fabric: string;
    pColors?: Record<number, string>;
    art: ArtworkItem[];
    selPanels: number[];
    onClick?: (panel: number) => void;
    interactive: boolean;
    startDrag: ReturnType<typeof makeStartDrag>;
    opacity?: number;
  }) => {
    const {
      keyPrefix,
      outerR,
      innerR,
      ventHoleR: vHole,
      fabric,
      pColors,
      art,
      selPanels,
      onClick,
      interactive,
      startDrag,
      opacity = 1,
    } = opts;
    const stroke = ribStrokeFor(fabric);
    const clipId = `${keyPrefix}-canopy-clip`;
    const maskId = `${keyPrefix}-vent-mask`;
    const useMask = vHole != null && vHole > 0;
    return (
      <g pointerEvents={interactive ? "auto" : "none"} opacity={opacity}>
        <defs>
          {panels.map((i) => (
            <clipPath id={`${keyPrefix}-panel-clip-${i}`} key={i}>
              <path d={panelPath(i, ribCount, outerR, innerR)} />
            </clipPath>
          ))}
          <clipPath id={clipId}>
            <polygon points={polyPoints(ribCount, outerR)} />
          </clipPath>
          {useMask && (
            <mask id={maskId}>
              <polygon points={polyPoints(ribCount, outerR)} fill="white" />
              <circle r={vHole} fill="black" />
            </mask>
          )}
        </defs>
        <g mask={useMask ? `url(#${maskId})` : undefined}>
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
                      filter={dryMode ? "url(#dry-white)" : undefined}
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
                        fill={dryMode ? "#ffffff" : (item.color || "#ffffff")}
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
                        filter={dryMode ? "url(#dry-white)" : undefined}
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
      </g>
    );
  };

  // Build layer render plans
  const outerLayerProps = {
    keyPrefix: "outer",
    outerR: radius,
    innerR: centerR,
    fabric: fabricColor,
    pColors: panelColors,
    art: artwork,
    selPanels: selectedPanels,
    onClick: onPanelClick,
    startDrag: makeStartDrag(onItemChange, onItemSelect, radius),
  };

  let content: React.ReactNode;
  if (hasInner && doubleLayerStyle === "vented") {
    // Outer: full canopy with vent hole; inner: small cap on top
    const innerStartDrag = makeStartDrag(onInnerItemChange, onInnerItemSelect, innerCapR);
    content = (
      <>
        {renderLayer({
          ...outerLayerProps,
          ventHoleR: ventHoleR,
          onClick: activeLayer === "outer" ? onPanelClick : undefined,
          interactive: activeLayer === "outer",
        })}
        {/* shadow ring under cap to imply air gap */}
        <circle r={innerCapR + 4} fill="rgba(0,0,0,0.18)" pointerEvents="none" />
        {renderLayer({
          keyPrefix: "inner",
          outerR: innerCapR,
          innerR: centerR,
          fabric: innerLayer!.fabricColor,
          pColors: innerLayer!.panelColors,
          art: innerLayer!.artwork,
          selPanels: innerLayer!.selectedPanels || [],
          onClick: activeLayer === "inner" ? onInnerPanelClick : undefined,
          interactive: activeLayer === "inner",
          startDrag: innerStartDrag,
        })}
      </>
    );
  } else if (hasInner && doubleLayerStyle === "double") {
    // Two full-size canopies; dim non-active, draw active on top
    const innerStartDrag = makeStartDrag(onInnerItemChange, onInnerItemSelect, radius);
    const innerProps = {
      keyPrefix: "inner",
      outerR: radius,
      innerR: centerR,
      fabric: innerLayer!.fabricColor,
      pColors: innerLayer!.panelColors,
      art: innerLayer!.artwork,
      selPanels: innerLayer!.selectedPanels || [],
      onClick: activeLayer === "inner" ? onInnerPanelClick : undefined,
      interactive: activeLayer === "inner",
      startDrag: innerStartDrag,
    };
    if (activeLayer === "inner") {
      content = (
        <>
          {renderLayer({ ...outerLayerProps, onClick: undefined, interactive: false, opacity: 0.25 })}
          {renderLayer(innerProps)}
        </>
      );
    } else {
      content = (
        <>
          {renderLayer({ ...innerProps, onClick: undefined, interactive: false, opacity: 0.25 })}
          {renderLayer({ ...outerLayerProps, interactive: true })}
        </>
      );
    }
  } else {
    content = renderLayer({ ...outerLayerProps, interactive: true });
  }

  // Center cap is hidden when any image/logo artwork is present on the top layer
  const topArt = hasInner && doubleLayerStyle === "vented" ? innerLayer!.artwork : artwork;
  const hasImg = topArt.some((a) => (a.type === "image" || a.type === "logo") && a.src);

  return (
    <svg
      ref={innerRef}
      viewBox={`-300 -300 600 600`}
      width={size}
      height={size}
      className="select-none"
      style={{ filter: "drop-shadow(0 24px 40px rgba(15,31,61,0.18))" }}
    >
      <defs>
        {/* Color-changing silkscreen: map any non-transparent pixel to white, keep alpha */}
        <filter id="dry-white" x="-10%" y="-10%" width="120%" height="120%">
          <feComponentTransfer>
            <feFuncR type="linear" slope="0" intercept="1" />
            <feFuncG type="linear" slope="0" intercept="1" />
            <feFuncB type="linear" slope="0" intercept="1" />
          </feComponentTransfer>
        </filter>
      </defs>
      {content}
      {!hasImg && <circle r={centerR + 2} fill={capColor} />}
    </svg>
  );
});
