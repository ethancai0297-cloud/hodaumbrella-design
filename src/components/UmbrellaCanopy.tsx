import { ArtworkItem, RibCount, UmbrellaCategory } from "@/types/design";
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";

interface Props {
  category: UmbrellaCategory;
  ribCount: RibCount;
  fabricColor: string;
  artwork: ArtworkItem[];
  selectedPanels: number[];
  onPanelClick?: (panel: number) => void;
  onItemSelect?: (id: string) => void;
  onItemChange?: (id: string, patch: { x: number; y: number }) => void;
  highlightSelection?: boolean;
  size?: number;
}

// Build panel polygon points (top view) — straight edges between rib tips
// so 6 ribs render as a hexagon, 8 as octagon, 10 as decagon.
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

export const UmbrellaCanopy = forwardRef<SVGSVGElement, Props>(function UmbrellaCanopy(
  { category, ribCount, fabricColor, artwork, selectedPanels, onPanelClick, highlightSelection = true, size = 560 },
  ref
) {
  // category affects visual radius
  const radius = category === "golf" ? 250 : category === "straight" ? 220 : 200;
  const centerR = radius * 0.022;

  const panels = useMemo(
    () => Array.from({ length: ribCount }, (_, i) => i),
    [ribCount]
  );

  const isLight = useMemo(() => {
    // crude lightness test
    const c = fabricColor.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 160;
  }, [fabricColor]);

  const ribStroke = isLight ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.28)";

  return (
    <svg
      ref={ref}
      viewBox={`-300 -300 600 600`}
      width={size}
      height={size}
      className="select-none"
      style={{ filter: "drop-shadow(0 24px 40px rgba(15,31,61,0.18))" }}
    >
      <defs>
        <radialGradient id="canopyShine" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <radialGradient id="canopyShade" cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
        </radialGradient>
        {panels.map((i) => (
          <clipPath id={`panel-clip-${i}`} key={i}>
            <path d={panelPath(i, ribCount, radius, centerR)} />
          </clipPath>
        ))}
        <clipPath id="canopy-clip">
          <polygon
            points={Array.from({ length: ribCount }, (_, i) => {
              const a = -Math.PI / 2 + (i - 0.5) * ((Math.PI * 2) / ribCount);
              return `${Math.cos(a) * radius},${Math.sin(a) * radius}`;
            }).join(" ")}
          />
        </clipPath>
      </defs>

      {/* polygon outline of full canopy (hexagon/octagon/decagon) */}
      {(() => {
        const pts = Array.from({ length: ribCount }, (_, i) => {
          const a = -Math.PI / 2 + (i - 0.5) * ((Math.PI * 2) / ribCount);
          return `${Math.cos(a) * radius},${Math.sin(a) * radius}`;
        }).join(" ");
        return <polygon points={pts} fill={fabricColor} />;
      })()}
      {/* panels */}
      {panels.map((i) => {
        const selected = selectedPanels.includes(i);
        return (
          <path
            key={i}
            d={panelPath(i, ribCount, radius, centerR)}
            fill={fabricColor}
            stroke={ribStroke}
            strokeWidth={1.2}
            className={onPanelClick ? "cursor-pointer transition-opacity" : ""}
            onClick={() => onPanelClick?.(i)}
            style={{
              opacity: highlightSelection && selectedPanels.length && !selected ? 0.92 : 1,
            }}
          />
        );
      })}

      {/* artwork */}
      {artwork.map((item) => {
        // Full-canopy continuous wrap: render once across the whole canopy
        if (item.type !== "text" && item.printArea === "full-canopy" && item.src) {
          const fullSize = radius * 2 * item.scale;
          return (
            <g key={`${item.id}-full`} clipPath="url(#canopy-clip)">
              <g transform={`rotate(${item.rotation}) translate(${item.x * radius} ${item.y * radius})`}>
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
        // Per-panel placement (silkscreen logos, repeated digital, text)
        return item.panels.map((pIdx) => {
          const c = panelCentroid(pIdx, ribCount, radius, centerR);
          const baseSize = radius * 0.5 * item.scale;
          return (
            <g key={`${item.id}-${pIdx}`} clipPath={`url(#panel-clip-${pIdx})`}>
              <g
                transform={`translate(${c.x} ${c.y}) rotate(${c.angle + 90 + item.rotation}) translate(${item.x * baseSize} ${item.y * baseSize})`}
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

      {/* rib lines on top */}
      {panels.map((i) => {
        const sliceAngle = (Math.PI * 2) / ribCount;
        const a = -Math.PI / 2 + i * sliceAngle - sliceAngle / 2;
        return (
          <line
            key={`rib-${i}`}
            x1={Math.cos(a) * centerR}
            y1={Math.sin(a) * centerR}
            x2={Math.cos(a) * radius}
            y2={Math.sin(a) * radius}
            stroke={ribStroke}
            strokeWidth={1.5}
          />
        );
      })}

      {/* selection overlay */}
      {highlightSelection &&
        selectedPanels.map((i) => (
          <path
            key={`sel-${i}`}
            d={panelPath(i, ribCount, radius, centerR)}
            fill="none"
            stroke="hsl(214 95% 55%)"
            strokeWidth={3}
            strokeDasharray="6 4"
            pointerEvents="none"
          />
        ))}

      {/* canopy outline only — no shine/shade so uploaded artwork shows true colors */}
      {(() => {
        const pts = Array.from({ length: ribCount }, (_, i) => {
          const a = -Math.PI / 2 + (i - 0.5) * ((Math.PI * 2) / ribCount);
          return `${Math.cos(a) * radius},${Math.sin(a) * radius}`;
        }).join(" ");
        return <polygon points={pts} fill="none" stroke={ribStroke} strokeWidth={1.5} pointerEvents="none" />;
      })()}
      {/* center cap — small tip cover */}
      <circle r={centerR + 2} fill={isLight ? "#1a1a1a" : "#0f1f3d"} />
      <circle r={centerR} fill={isLight ? "#444" : "#1f56c3"} />
    </svg>
  );
});
